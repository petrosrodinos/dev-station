import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import treeKill from "tree-kill";
import type { LogLine, PackageManager, ProcessEvent, ProcessInfo, ServiceSpec } from "../shared/contract";
import { IpcErrorCodes, ProcessStatuses } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";
import { childEnv } from "../utils/platform";
import { workspaceConfig } from "./workspace-config";

// Process Manager (Spec §9). Project services run as child processes owned by the main process.
// Script-based commands are built here from detected package.json scripts; free-form commands
// must be approved once per device before they run (they may come from another team member).

const MAX_LOG_LINES = 4000;
const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\])(?::\d{2,5})?[^\s"'`)\]]*)/i;
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(\x07|\x1b\\)/g;
const SCRIPT_NAME_RE = /^[A-Za-z0-9:_.@/-]{1,100}$/;

interface Managed {
  info: ProcessInfo;
  child: ChildProcess | null;
  logs: LogLine[];
  stopping: boolean;
  pending: LogLine[];
  flushTimer: NodeJS.Timeout | null;
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

class ProcessManager {
  private procs = new Map<string, Managed>();
  private emit: (e: ProcessEvent) => void = () => {};

  setEmitter(fn: (e: ProcessEvent) => void) {
    this.emit = fn;
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
    if (!workspaceConfig.isCommandApproved(projectId, command)) {
      throw new IpcError(`This service runs a custom command that has not been approved on this device: ${command}`, IpcErrorCodes.COMMAND_NOT_APPROVED);
    }
    return command;
  }

  approveCommand(projectId: string, command: string) {
    workspaceConfig.approveCommand(projectId, command.trim());
  }

  start(projectId: string, spec: ServiceSpec): ProcessInfo {
    const key = `${projectId}:${spec.service_id}`;
    const existing = this.procs.get(key);
    if (existing?.child && existing.info.status === ProcessStatuses.RUNNING) return existing.info;

    const cwd = workspaceConfig.resolveInProject(projectId, spec.cwd || ".");
    if (!fs.existsSync(cwd)) throw new IpcError(`Working directory does not exist: ${spec.cwd}`);
    const command = this.resolveCommand(projectId, spec, cwd);

    const env = childEnv(spec.env);
    const child = spawn(command, { cwd, env, shell: true, windowsHide: true, detached: process.platform !== "win32" });

    const managed: Managed = existing ?? { info: {} as ProcessInfo, child: null, logs: [], stopping: false, pending: [], flushTimer: null };
    managed.child = child;
    managed.stopping = false;
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
      url: spec.url,
      env_keys: Object.keys(spec.env ?? {}),
    };
    this.procs.set(key, managed);
    this.append(managed, "system", `$ ${command}  (cwd: ${spec.cwd || "."})`);
    this.emit({ type: "status", process: managed.info });

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

  private finish(managed: Managed, code: number) {
    if (managed.info.status !== ProcessStatuses.RUNNING) return;
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

  async stopAll() {
    await Promise.all([...this.procs.keys()].map((k) => this.stop(k)));
  }
}

export const processManager = new ProcessManager();
