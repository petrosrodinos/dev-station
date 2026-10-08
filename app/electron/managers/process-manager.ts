import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import treeKill from "tree-kill";
import type { EnvOverrideSource, EnvRuntimeOverride, LogLine, PackageManager, ProcessEvent, ProcessInfo, ServiceSpec } from "../shared/contract";
import { EnvOverrideSources, IpcErrorCodes, ProcessStatuses } from "../shared/contract";
import { appendScriptArgs, assignServiceSlugs, envTemplateFor, followPortShifts, localUrl, portFlagFor, portShifts, resolveTemplate, slugToEnvSegment, type ServiceRef, type TemplateContext } from "../shared/service-refs";
import { IpcError } from "../ipc/ipc-error";
import { childEnv } from "../utils/platform";
import { readServiceEnv } from "./detection-manager";
import { findFreePort, isPortFree } from "../utils/port-allocator";
import { logger } from "../utils/logger";
import { forgetService, recordService, reapLeftoverServices } from "./service-ledger";
import { workspaceConfig } from "./workspace-config";

// Process Manager (Spec §9). Project services run as child processes owned by the main process.
// Script-based commands are built here from detected package.json scripts; free-form commands
// must be approved once per device before they run (they may come from another team member).
//
// Ports: several projects (and several services of one project) often want the same port. On start we
// allocate a free port for every service of the project, hand it over as PORT / a framework flag, and
// resolve `{{service.port}}` / `{{service.url}}` references so dependents follow the shift.

const MAX_LOG_LINES = 4000;
const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(?::\d{2,5})?[^\s"'`)\]]*)/i;
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(\x07|\x1b\\)/g;
const SCRIPT_NAME_RE = /^[A-Za-z0-9:_.@/-]{1,100}$/;
const PORT_IN_USE_RE = /EADDRINUSE|address already in use|port \d+ is (?:already )?in use/i;

interface Managed {
  info: ProcessInfo;
  child: ChildProcess | null;
  logs: LogLine[];
  stopping: boolean;
  pending: LogLine[];
  flushTimer: NodeJS.Timeout | null;
  /** service_id -> port, for the other services this process references (env / command templates). */
  usedPorts: Map<string, number>;
  hintedPortInUse: boolean;
  /** Env values this process got that differ from its .env files (kept in the main process, shown in the env editor). */
  envOverrides: { key: string; value: string; source: EnvOverrideSource }[];
}

function runScriptCommand(pm: PackageManager, script: string) {
  switch (pm) {
    case "yarn":
      return `yarn ${script}`;
    case "pnpm":
      return `pnpm run ${script}`;
    case "bun":
      return `bun run ${script}`;
    default:
      return `npm run ${script}`;
  }
}

const projectOf = (key: string) => key.slice(0, key.indexOf(":"));

class ProcessManager {
  private procs = new Map<string, Managed>();
  private starting = new Map<string, Promise<ProcessInfo>>();
  /** key -> port held for that service, so references stay stable across restarts. */
  private reservations = new Map<string, number>();
  private allocLock: Promise<unknown> = Promise.resolve();
  /** Set once the app starts closing: no service may start after this, or it would outlive the app. */
  private closing = false;
  /** Leftovers from an earlier run are cleaned up before any service may start. */
  private ready: Promise<void> = Promise.resolve();
  private emit: (e: ProcessEvent) => void = () => {};

  /** Call once, after the single-instance lock is held (a second instance must never touch the first one's services). */
  init() {
    this.ready = reapLeftoverServices().catch((error) => logger.error("Could not clean up services left by an earlier run", error));
  }

  setEmitter(fn: (e: ProcessEvent) => void) {
    this.emit = fn;
  }

  /** What the running services of `projectId` started in `dir` received instead of their .env values. */
  envOverridesFor(projectId: string, dir: string): EnvRuntimeOverride[] {
    const out: EnvRuntimeOverride[] = [];
    for (const p of this.procs.values()) {
      if (p.info.project_id !== projectId || p.info.status !== ProcessStatuses.RUNNING) continue;
      if (path.resolve(p.info.cwd) !== path.resolve(dir)) continue;
      for (const o of p.envOverrides) out.push({ ...o, service_id: p.info.service_id, service_name: p.info.name });
    }
    return out;
  }

  list(): ProcessInfo[] {
    return [...this.procs.values()].map((p) => p.info);
  }

  logs(key: string): LogLine[] {
    return this.procs.get(key)?.logs ?? [];
  }

  /** Builds and validates the command for a service. Returns the exact string that will run. */
  private resolveCommand(projectId: string, spec: ServiceSpec, cwd: string): string {
    if (spec.script) {
      if (!SCRIPT_NAME_RE.test(spec.script)) throw new IpcError(`Invalid script name: ${spec.script}`);
      const pkgFile = `${cwd}/package.json`;
      let scripts: Record<string, string> = {};
      try {
        scripts = JSON.parse(fs.readFileSync(pkgFile, "utf8")).scripts ?? {};
      } catch {
        throw new IpcError(`No package.json found in ${spec.cwd}`);
      }
      if (!scripts[spec.script]) throw new IpcError(`Script "${spec.script}" does not exist in ${spec.cwd}/package.json`);
      return runScriptCommand(spec.package_manager ?? "npm", spec.script);
    }

    const command = spec.command?.trim();
    if (!command) throw new IpcError("Service has neither a script nor a command.");
    if (/[\r\n\0]/.test(command) || command.length > 2000) throw new IpcError("Invalid command.");
    // Approval is on the template as written (`--port {{port}}`), so a port shift never re-asks.
    if (!workspaceConfig.isCommandApproved(projectId, command)) {
      throw new IpcError(`This service runs a custom command that has not been approved on this device: ${command}`, IpcErrorCodes.COMMAND_NOT_APPROVED);
    }
    return command;
  }

  approveCommand(projectId: string, command: string) {
    workspaceConfig.approveCommand(projectId, command.trim());
  }

  start(projectId: string, spec: ServiceSpec): Promise<ProcessInfo> {
    if (this.closing) return Promise.reject(new IpcError("Dev Station is closing."));
    const key = `${projectId}:${spec.service_id}`;
    const existing = this.procs.get(key);
    if (existing?.child && existing.info.status === ProcessStatuses.RUNNING) return Promise.resolve(existing.info);
    const inflight = this.starting.get(key);
    if (inflight) return inflight;
    const run = this.launch(projectId, spec, key).finally(() => this.starting.delete(key));
    this.starting.set(key, run);
    return run;
  }

  private async launch(projectId: string, spec: ServiceSpec, key: string): Promise<ProcessInfo> {
    await this.ready;
    const existing = this.procs.get(key);
    const cwd = workspaceConfig.resolveInProject(projectId, spec.cwd || ".");
    if (!fs.existsSync(cwd)) throw new IpcError(`Working directory does not exist: ${spec.cwd}`);
    const baseCommand = this.resolveCommand(projectId, spec, cwd);

    // --- ports & references ---------------------------------------------------------------------
    // The started service's own definition wins over what the sibling list says about it.
    const refs: ServiceRef[] = spec.siblings.filter((r) => r.service_id !== spec.service_id);
    refs.push({ service_id: spec.service_id, name: spec.name, port: spec.port });
    const slugs = assignServiceSlugs(refs.map((r) => r.name));
    const selfSlug = slugs[refs.length - 1];

    const allocation = await this.withAllocLock(() => this.allocatePorts(projectId, spec.service_id, refs));
    const ownPort = allocation.get(spec.service_id) ?? null;
    // Checked after the last await: from here to the spawn and registration below nothing can interleave with stopAll.
    if (this.closing) throw new IpcError("Dev Station is closing.");

    const ctx: TemplateContext = { self: selfSlug, services: new Map() };
    const idOfSlug = new Map<string, string>();
    refs.forEach((r, i) => {
      ctx.services.set(slugs[i], { name: r.name, port: allocation.get(r.service_id) ?? null });
      idOfSlug.set(slugs[i], r.service_id);
    });

    // --- env ------------------------------------------------------------------------------------
    const auto: Record<string, string> = {};
    if (ownPort) {
      auto.PORT = String(ownPort);
      auto.DEV_STATION_PORT = String(ownPort);
    }
    for (const [slug, svc] of ctx.services) {
      if (svc.port == null) continue;
      auto[`DEV_STATION_${slugToEnvSegment(slug)}_PORT`] = String(svc.port);
      auto[`DEV_STATION_${slugToEnvSegment(slug)}_URL`] = localUrl(svc.port);
    }
    const errors: string[] = [];
    const dependsOn = new Set<string>();
    const userEnv: Record<string, string> = {};
    const templated: string[] = [];
    for (const [k, v] of Object.entries(spec.env ?? {})) {
      // A name picked from a .env file with no value set here must not blank out the file's own value.
      if (v === "") continue;
      const template = envTemplateFor(k, v);
      if (template !== v) templated.push(`${k}: ${v} is a URL variable, using ${template} so it includes http://`);
      const r = resolveTemplate(template, ctx);
      errors.push(...r.errors.map((e) => `${k}: ${e}`));
      r.refs.forEach((x) => dependsOn.add(x));
      userEnv[k] = r.value;
      if (r.value !== v) templated.push(`${k}=${r.value}`);
    }

    // --- command --------------------------------------------------------------------------------
    let command = baseCommand;
    if (!spec.script) {
      const r = resolveTemplate(baseCommand, ctx);
      errors.push(...r.errors);
      r.refs.forEach((x) => dependsOn.add(x));
      command = r.value;
    }
    if (errors.length) throw new IpcError(errors.join("\n"));
    if (ownPort) command = this.withPortFlag(spec, cwd, command, ownPort);

    const usedPorts = new Map<string, number>();
    for (const slug of dependsOn) {
      const id = idOfSlug.get(slug);
      const port = ctx.services.get(slug)?.port;
      if (id && port != null) usedPorts.set(id, port);
    }

    // --- .env files follow port shifts -----------------------------------------------------------
    // The project's own .env files hardcode `localhost:<port>` (APP_URL, API_URL, CORS_URLS...). When a service
    // was moved to another port, override those values in the child env with the real port. Process env wins
    // over .env files in dotenv, Next, Vite and Nest, so the app sees the shifted URL. Keys set here win.
    const shifted = refs.map((r) => ({ id: r.service_id, port: r.port, actual: allocation.get(r.service_id) ?? null }));
    const shifts = portShifts(shifted);
    const followed: Record<string, string> = {};
    if (shifts.size) {
      const fileValues = readServiceEnv(cwd, `${command} ${this.scriptText(spec, cwd)}`);
      for (const [k, v] of Object.entries(followPortShifts(fileValues, shifts))) {
        if (k in userEnv) continue;
        followed[k] = v;
        templated.push(`${k}=${v} (from .env, follows the port shift)`);
      }
      // Track the siblings these values point at, so this service is flagged for restart if they move again.
      const values = Object.values(followed);
      for (const s of shifted) {
        if (s.id === spec.service_id || s.actual == null || usedPorts.has(s.id)) continue;
        if (values.some((v) => v.includes(`:${s.actual}`))) usedPorts.set(s.id, s.actual);
      }
    }

    // --- spawn ----------------------------------------------------------------------------------
    const env = childEnv({ ...auto, ...followed, ...userEnv });
    const child = spawn(command, { cwd, env, shell: true, windowsHide: true, detached: process.platform !== "win32" });

    const managed: Managed = existing ?? { info: {} as ProcessInfo, child: null, logs: [], stopping: false, pending: [], flushTimer: null, usedPorts, hintedPortInUse: false, envOverrides: [] };
    managed.child = child;
    managed.stopping = false;
    managed.usedPorts = usedPorts;
    managed.envOverrides = [
      ...Object.entries(followed).map(([key, value]) => ({ key, value, source: EnvOverrideSources.PORT_SHIFT })),
      ...Object.entries(userEnv).map(([key, value]) => ({ key, value, source: EnvOverrideSources.SERVICE_ENV })),
    ];
    managed.hintedPortInUse = false;
    managed.info = {
      key,
      project_id: projectId,
      service_id: spec.service_id,
      name: spec.name,
      pid: child.pid ?? null,
      command,
      cwd,
      status: ProcessStatuses.RUNNING,
      started_at: new Date().toISOString(),
      exited_at: null,
      exit_code: null,
      url: ownPort ? localUrl(ownPort) : spec.url,
      env_keys: Object.keys(userEnv),
      port: ownPort,
      requested_port: spec.port,
      needs_restart: false,
    };
    this.procs.set(key, managed);
    if (child.pid) recordService(key, child.pid);
    this.append(managed, "system", `$ ${command}  (cwd: ${spec.cwd || "."})`);
    if (ownPort && spec.port && ownPort !== spec.port) this.append(managed, "system", `Port ${spec.port} is taken — running on ${ownPort} instead (PORT=${ownPort}).`);
    else if (ownPort) this.append(managed, "system", `Port ${ownPort} (PORT=${ownPort})`);
    for (const line of templated) this.append(managed, "system", `env ${line}`);
    this.emit({ type: "status", process: managed.info });
    this.markStaleDependents(projectId, spec.service_id, ownPort);

    const onData = (stream: "stdout" | "stderr") => (buf: Buffer) => {
      for (const raw of buf.toString().split(/\r?\n/)) {
        if (!raw) continue;
        const text = raw.replace(ANSI_RE, "");
        const url = text.match(URL_RE)?.[1];
        if (url && !managed.info.url?.startsWith(url.replace(/\/$/, ""))) {
          managed.info = { ...managed.info, url: url.replace(/\/$/, "") };
          this.emit({ type: "status", process: managed.info });
        }
        this.append(managed, stream, text);
        if (!managed.hintedPortInUse && PORT_IN_USE_RE.test(text)) {
          managed.hintedPortInUse = true;
          this.append(
            managed,
            "system",
            "The port is still in use. This app probably ignores the PORT variable and hardcodes its port — read process.env.PORT in its code, or use a custom command with --port {{port}}.",
          );
        }
      }
    };
    child.stdout?.on("data", onData("stdout"));
    child.stderr?.on("data", onData("stderr"));

    child.on("error", (err) => {
      this.append(managed, "system", `Failed to start: ${err.message}`);
      this.finish(managed, 1);
    });
    child.on("exit", (code) => this.finish(managed, code ?? 0));

    return managed.info;
  }

  /** Serializes allocation so two services starting at once cannot both probe the same port as free. */
  private withAllocLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.allocLock.then(fn, fn);
    this.allocLock = run.catch(() => undefined);
    return run;
  }

  private projectHasRunning(projectId: string): boolean {
    for (const p of this.procs.values()) if (p.info.project_id === projectId && p.info.status === ProcessStatuses.RUNNING) return true;
    return false;
  }

  /**
   * Picks a port for every service of the project that has one. Reservations are kept while the project is
   * active so a restart keeps its port; once a project is idle its reservations are released so its ports
   * are not blocked for other projects.
   */
  private async allocatePorts(projectId: string, startingServiceId: string, refs: ServiceRef[]): Promise<Map<string, number>> {
    const keyOf = (id: string) => `${projectId}:${id}`;
    const known = new Set(refs.map((r) => keyOf(r.service_id)));
    const activeProjects = new Set<string>([projectId]);
    for (const p of this.procs.values()) if (p.info.status === ProcessStatuses.RUNNING) activeProjects.add(p.info.project_id);
    const projectIdle = !this.projectHasRunning(projectId);

    for (const key of [...this.reservations.keys()]) {
      if (this.procs.get(key)?.info.status === ProcessStatuses.RUNNING) continue;
      const proj = projectOf(key);
      const release = proj === projectId ? projectIdle || !known.has(key) : !activeProjects.has(proj);
      if (release) this.reservations.delete(key);
    }

    const heldByOthers = (port: number, forKey: string) => {
      for (const [key, p] of this.reservations) if (p === port && key !== forKey) return true;
      return false;
    };

    // The service being started claims its port first, then its siblings in order.
    const ordered = [...refs].sort((a, b) => Number(b.service_id === startingServiceId) - Number(a.service_id === startingServiceId));
    const result = new Map<string, number>();
    for (const ref of ordered) {
      if (!ref.port) continue;
      const key = keyOf(ref.service_id);
      const running = this.procs.get(key);
      if (running?.info.status === ProcessStatuses.RUNNING && running.info.port) {
        result.set(ref.service_id, running.info.port);
        this.reservations.set(key, running.info.port);
        continue;
      }
      const held = this.reservations.get(key);
      const port =
        held && !heldByOthers(held, key) && (await isPortFree(held)) ? held : await findFreePort(ref.port, { isReserved: (p) => heldByOthers(p, key) });
      this.reservations.set(key, port);
      result.set(ref.service_id, port);
    }
    return result;
  }

  /** The package.json script body a script service runs (`next dev -p 3001`), or "" for custom commands. */
  private scriptText(spec: ServiceSpec, cwd: string): string {
    if (!spec.script) return "";
    try {
      return JSON.parse(fs.readFileSync(`${cwd}/package.json`, "utf8")).scripts?.[spec.script] ?? "";
    } catch {
      return "";
    }
  }

  /** Appends the framework's port flag when the script is a known dev server that ignores PORT. */
  private withPortFlag(spec: ServiceSpec, cwd: string, command: string, port: number): string {
    if (spec.script) {
      const scriptText = this.scriptText(spec, cwd);
      if (!scriptText) return command;
      return appendScriptArgs(command, spec.package_manager, portFlagFor(scriptText, port));
    }
    const flag = portFlagFor(command, port);
    return flag ? `${command} ${flag}` : command;
  }

  /** Flags running services of the project that were started against an older port of `serviceId`. */
  private markStaleDependents(projectId: string, serviceId: string, port: number | null) {
    if (port == null) return;
    for (const other of this.procs.values()) {
      if (other.info.project_id !== projectId || other.info.status !== ProcessStatuses.RUNNING || other.info.service_id === serviceId) continue;
      const used = other.usedPorts.get(serviceId);
      if (used === undefined || used === port) continue;
      other.usedPorts.set(serviceId, port);
      other.info = { ...other.info, needs_restart: true };
      this.append(other, "system", `A service this one references now runs on port ${port} (was ${used}). Restart this service to pick it up.`);
      this.emit({ type: "status", process: other.info });
    }
  }

  private finish(managed: Managed, code: number) {
    if (managed.info.status !== ProcessStatuses.RUNNING) return;
    if (managed.info.pid) forgetService(managed.info.key, managed.info.pid);
    const status = managed.stopping || code === 0 ? ProcessStatuses.STOPPED : ProcessStatuses.CRASHED;
    this.append(managed, "system", status === ProcessStatuses.CRASHED ? `Process crashed (exit code ${code})` : `Process exited (${code})`);
    managed.child = null;
    managed.info = { ...managed.info, status, pid: null, exit_code: code, exited_at: new Date().toISOString() };
    this.flush(managed);
    this.emit({ type: "status", process: managed.info });
  }

  private append(managed: Managed, stream: LogLine["stream"], text: string) {
    const line: LogLine = { stream, text, at: Date.now() };
    managed.logs.push(line);
    if (managed.logs.length > MAX_LOG_LINES) managed.logs.splice(0, managed.logs.length - MAX_LOG_LINES);
    managed.pending.push(line);
    // Batch log events so a chatty dev server doesn't flood the renderer.
    if (!managed.flushTimer) managed.flushTimer = setTimeout(() => this.flush(managed), 80);
  }

  private flush(managed: Managed) {
    if (managed.flushTimer) clearTimeout(managed.flushTimer);
    managed.flushTimer = null;
    if (!managed.pending.length) return;
    const lines = managed.pending;
    managed.pending = [];
    this.emit({ type: "log", process: managed.info, lines });
  }

  stop(key: string): Promise<void> {
    const managed = this.procs.get(key);
    if (!managed?.child?.pid) return Promise.resolve();
    managed.stopping = true;
    const pid = managed.child.pid;
    return new Promise((resolve) => {
      treeKill(pid, "SIGTERM", () => {
        // Escalate if the tree ignores SIGTERM.
        setTimeout(() => {
          if (managed.child && managed.info.status === ProcessStatuses.RUNNING) treeKill(pid, "SIGKILL");
          resolve();
        }, 1500);
      });
    });
  }

  async restart(projectId: string, spec: ServiceSpec) {
    const key = `${projectId}:${spec.service_id}`;
    await this.stop(key);
    await new Promise((r) => setTimeout(r, 300));
    return this.start(projectId, spec);
  }

  /** Stops every service, including ones still being launched, and refuses new starts from now on. */
  async stopAll() {
    this.closing = true;
    await Promise.allSettled([...this.starting.values()]);
    await Promise.all([...this.procs.keys()].map((k) => this.stop(k)));
  }
}

export const processManager = new ProcessManager();
