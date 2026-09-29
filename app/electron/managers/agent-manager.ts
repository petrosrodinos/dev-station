import { app } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as pty from "node-pty";
import type { AgentAdapterInfo, AgentChanges, AgentRuntimeStatus, AgentSessionInfo, AgentStatusEvent, AgentType, PtyDataEvent, StartAgentInput } from "../shared/contract";
import { AgentRuntimeStatuses, IpcErrorCodes } from "../shared/contract";
import { agentAdapters } from "../agents/adapters";
import type { AgentAdapter } from "../agents/agent-adapter";
import { isSubmit, resumesWork } from "../agents/agent-activity";
import { IpcError } from "../ipc/ipc-error";
import { childEnv, isWindows, which } from "../utils/platform";
import { Scrollback } from "../utils/scrollback";
import { logger } from "../utils/logger";
import { gitManager } from "./git-manager";
import { workspaceConfig } from "./workspace-config";

// AI Agent Manager (Spec §12/§13). Each session is the agent's real CLI running in a PTY; the UI
// attaches an embedded terminal. Status is inferred from the process lifecycle, output idleness,
// an optional adapter-specific signal, and Git working-tree changes.

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(\x07|\x1b\\)|\x1b[()][A-Z0-9]|\x1b[=>]/g;
const CHANGE_POLL_MS = 10_000;
const TITLE_POLL_MS = 5_000;
const TRANSCRIPT_TAIL_BYTES = 512 * 1024;
const BRACKETED_PASTE_DELAY_MS = 2500;

interface ManagedAgent {
  info: AgentSessionInfo;
  input: StartAgentInput;
  adapter: AgentAdapter;
  pty: pty.IPty | null;
  scrollback: Scrollback;
  recent: string;
  idleTimer: NodeJS.Timeout | null;
  changeTimer: NodeJS.Timeout | null;
  titleTimer: NodeJS.Timeout | null;
  transcriptStamp: string;
  lastUserInputAt: number;
  /** Last time the user pressed Enter in the agent's terminal. */
  lastSubmitAt: number;
  /** When the agent last went idle; output after this only counts as work under `resumesWork`. */
  awaitingSince: number;
  stopping: boolean;
}

class AgentManager {
  private sessions = new Map<string, ManagedAgent>();
  private idleThresholdMs = 45_000;
  private onData: (e: PtyDataEvent) => void = () => {};
  private onStatus: (e: AgentStatusEvent) => void = () => {};

  setEmitters(onData: (e: PtyDataEvent) => void, onStatus: (e: AgentStatusEvent) => void) {
    this.onData = onData;
    this.onStatus = onStatus;
  }

  setIdleThreshold(seconds: number) {
    this.idleThresholdMs = Math.min(Math.max(seconds, 10), 600) * 1000;
  }

  private logDir() {
    return path.join(app.getPath("userData"), "agent-sessions");
  }

  private async resolveExecutable(type: AgentType) {
    const adapter = agentAdapters[type];
    const configured = workspaceConfig.settings.agent_executables[type];
    const exe = configured || adapter.defaultExecutable;
    return { adapter, executable: exe, resolved: await which(exe) };
  }

  async adapters(): Promise<AgentAdapterInfo[]> {
    return Promise.all(
      (Object.keys(agentAdapters) as AgentType[]).map(async (type) => {
        const { adapter, executable, resolved } = await this.resolveExecutable(type);
        return { type, name: adapter.name, executable, resolved_path: resolved, available: !!resolved };
      }),
    );
  }

  list(): AgentSessionInfo[] {
    return [...this.sessions.values()].map((s) => s.info);
  }

  private get(id: string) {
    const s = this.sessions.get(id);
    if (!s) throw new IpcError("Agent session is not running on this device.");
    return s;
  }

  async start(input: StartAgentInput): Promise<AgentSessionInfo> {
    const existing = this.sessions.get(input.session_id);
    if (existing?.info.alive) return existing.info;
    if (input.idle_threshold_seconds) this.setIdleThreshold(input.idle_threshold_seconds);

    const cwd = workspaceConfig.projectRoot(input.project_id);
    const { adapter, executable, resolved } = await this.resolveExecutable(input.agent_type);
    if (!resolved) {
      throw new IpcError(`${adapter.name} was not found (looked for "${executable}"). Install it or set its path in Settings → AI.`, IpcErrorCodes.AGENT_NOT_FOUND);
    }

    // .cmd/.bat shims need cmd.exe; never splice the prompt into a shell string — paste it instead.
    const needsShell = isWindows && /\.(cmd|bat)$/i.test(resolved);
    const promptViaPaste = needsShell && !!input.prompt;
    const transcript = adapter.transcriptPath?.(cwd, input.session_id);
    const sessionArgs = adapter.sessionArgs?.(input.session_id, !!transcript && fs.existsSync(transcript)) ?? [];
    const args = needsShell ? ["/d", "/s", "/c", resolved, ...sessionArgs, ...adapter.buildArgs(null)] : [...sessionArgs, ...adapter.buildArgs(input.prompt)];
    const file = needsShell ? process.env.ComSpec || "cmd.exe" : resolved;

    const env = childEnv({ ...input.env, DEV_STATION_SESSION_ID: input.session_id, DEV_STATION_PROJECT_ID: input.project_id }) as Record<string, string>;
    const proc = pty.spawn(file, args, { name: "xterm-256color", cols: input.cols ?? 120, rows: input.rows ?? 32, cwd, env });

    const managed: ManagedAgent = existing ?? {
      info: {} as AgentSessionInfo,
      input,
      adapter,
      pty: null,
      scrollback: new Scrollback(),
      recent: "",
      idleTimer: null,
      changeTimer: null,
      titleTimer: null,
      transcriptStamp: "",
      lastUserInputAt: 0,
      lastSubmitAt: 0,
      awaitingSince: 0,
      stopping: false,
    };
    managed.pty = proc;
    managed.input = input;
    managed.adapter = adapter;
    managed.stopping = false;
    managed.info = {
      id: input.session_id,
      project_id: input.project_id,
      agent_type: input.agent_type,
      name: input.name,
      status: AgentRuntimeStatuses.RUNNING,
      pid: proc.pid,
      command: [path.basename(resolved), ...adapter.buildArgs(input.prompt ? "<prompt>" : null)].join(" "),
      cwd,
      started_at: new Date().toISOString(),
      ended_at: null,
      exit_code: null,
      changes: existing?.info.changes ?? { files_changed: 0, additions: 0, deletions: 0 },
      alive: true,
      agent_title: existing?.info.agent_title ?? null,
    };
    this.sessions.set(input.session_id, managed);
    this.transition(managed, AgentRuntimeStatuses.RUNNING, null);

    proc.onData((data) => this.handleData(managed, data));
    proc.onExit(({ exitCode }) => this.handleExit(managed, exitCode));

    if (promptViaPaste && input.prompt) {
      setTimeout(() => {
        if (managed.pty === proc && managed.info.alive) proc.write(`\x1b[200~${input.prompt}\x1b[201~\r`);
      }, BRACKETED_PASTE_DELAY_MS);
    }

    managed.changeTimer = setInterval(() => void this.pollChanges(managed), CHANGE_POLL_MS);
    if (transcript && adapter.parseTitle) {
      managed.titleTimer = setInterval(() => void this.pollTitle(managed), TITLE_POLL_MS);
    }
    this.armIdle(managed);
    logger.info(`Agent session ${input.session_id} started (${adapter.name}, pid ${proc.pid})`);
    return managed.info;
  }

  private handleData(managed: ManagedAgent, data: string) {
    managed.scrollback.push(data);
    const text = data.replace(ANSI_RE, "");
    managed.recent = (managed.recent + text).slice(-4000);
    this.onData({ id: managed.info.id, data });

    if (managed.info.status === AgentRuntimeStatuses.AWAITING_INPUT) {
      const hinted = managed.adapter.inferStatus?.(text) ?? null;
      // Idle redraws (resize, status line, focus) keep the session idle — no new "finished" announcement.
      if (!resumesWork({ awaitingSince: managed.awaitingSince, lastSubmitAt: managed.lastSubmitAt, now: Date.now(), hinted })) return;
      this.transition(managed, AgentRuntimeStatuses.RUNNING);
    }
    this.armIdle(managed);
  }

  private armIdle(managed: ManagedAgent) {
    if (managed.idleTimer) clearTimeout(managed.idleTimer);
    managed.idleTimer = setTimeout(() => {
      if (!managed.info.alive || managed.info.status !== AgentRuntimeStatuses.RUNNING) return;
      const hinted = managed.adapter.inferStatus?.(managed.recent) ?? null;
      if (hinted === AgentRuntimeStatuses.RUNNING) return this.armIdle(managed);
      this.transition(managed, AgentRuntimeStatuses.AWAITING_INPUT);
    }, this.idleThresholdMs);
  }

  private handleExit(managed: ManagedAgent, exitCode: number) {
    if (managed.idleTimer) clearTimeout(managed.idleTimer);
    if (managed.changeTimer) clearInterval(managed.changeTimer);
    this.stopTitlePolling(managed);
    managed.pty = null;
    const status: AgentRuntimeStatus = managed.stopping ? AgentRuntimeStatuses.STOPPED : exitCode === 0 ? AgentRuntimeStatuses.FINISHED : AgentRuntimeStatuses.CRASHED;
    managed.info = { ...managed.info, alive: false, pid: null, exit_code: exitCode, ended_at: new Date().toISOString() };
    void this.pollChanges(managed).finally(() => {
      this.transition(managed, status);
      this.persistScrollback(managed);
    });
  }

  private async pollChanges(managed: ManagedAgent) {
    try {
      const changes: AgentChanges = await gitManager.changeSummary(await gitManager.toplevel(managed.info.cwd));
      const prev = managed.info.changes;
      if (changes.files_changed !== prev.files_changed || changes.additions !== prev.additions || changes.deletions !== prev.deletions) {
        managed.info = { ...managed.info, changes };
        this.onStatus({ session: managed.info, previous: managed.info.status });
      }
    } catch {
      /* not a git repo — no change tracking */
    }
  }

  private stopTitlePolling(managed: ManagedAgent) {
    if (managed.titleTimer) clearInterval(managed.titleTimer);
    managed.titleTimer = null;
    void this.pollTitle(managed);
  }

  /** Follows the agent CLI's own conversation title by reading the tail of its transcript when it changes. */
  private async pollTitle(managed: ManagedAgent) {
    const { adapter, info } = managed;
    const file = adapter.transcriptPath?.(info.cwd, info.id);
    if (!file || !adapter.parseTitle) return;
    try {
      const stat = await fs.promises.stat(file);
      const stamp = `${stat.mtimeMs}:${stat.size}`;
      if (stamp === managed.transcriptStamp) return;
      managed.transcriptStamp = stamp;

      const length = Math.min(stat.size, TRANSCRIPT_TAIL_BYTES);
      const handle = await fs.promises.open(file, "r");
      let tail: string;
      try {
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, stat.size - length);
        tail = buffer.toString("utf8");
      } finally {
        await handle.close();
      }

      const title = adapter.parseTitle(tail)?.slice(0, 120) ?? null;
      if (!title || title === managed.info.agent_title) return;
      managed.info = { ...managed.info, agent_title: title };
      this.onStatus({ session: managed.info, previous: managed.info.status });
    } catch {
      /* transcript not written yet (or unreadable) — try again on the next tick */
    }
  }

  private transition(managed: ManagedAgent, status: AgentRuntimeStatus, previous: AgentRuntimeStatus | null = managed.info.status) {
    if (status === AgentRuntimeStatuses.AWAITING_INPUT && previous !== status) managed.awaitingSince = Date.now();
    managed.info = { ...managed.info, status };
    this.onStatus({ session: managed.info, previous });
  }

  write(id: string, data: string) {
    const s = this.get(id);
    if (!s.pty) return;
    s.lastUserInputAt = Date.now();
    if (isSubmit(data)) s.lastSubmitAt = s.lastUserInputAt;
    s.pty.write(data);
  }

  resize(id: string, cols: number, rows: number) {
    const s = this.sessions.get(id);
    if (s?.pty) s.pty.resize(cols, rows);
  }

  stop(id: string) {
    const s = this.sessions.get(id);
    if (!s?.pty) return;
    s.stopping = true;
    s.pty.kill();
  }

  async restart(id: string): Promise<AgentSessionInfo> {
    const s = this.get(id);
    if (s.pty) {
      s.stopping = true;
      const proc = s.pty;
      await new Promise<void>((resolve) => {
        const done = proc.onExit(() => {
          done.dispose();
          resolve();
        });
        proc.kill();
        setTimeout(resolve, 3000);
      });
    }
    s.scrollback.push("\r\n\x1b[2m— session restarted —\x1b[0m\r\n");
    return this.start({ ...s.input, prompt: null });
  }

  forget(id: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    if (s.pty) {
      s.stopping = true;
      s.pty.kill();
    }
    if (s.titleTimer) clearInterval(s.titleTimer);
    this.persistScrollback(s);
    this.sessions.delete(id);
  }

  async scrollback(id: string): Promise<string> {
    const s = this.sessions.get(id);
    if (s) return s.scrollback.toString();
    try {
      return await fs.promises.readFile(path.join(this.logDir(), `${path.basename(id)}.log`), "utf8");
    } catch {
      return "";
    }
  }

  private persistScrollback(s: ManagedAgent) {
    try {
      fs.mkdirSync(this.logDir(), { recursive: true });
      fs.writeFileSync(path.join(this.logDir(), `${path.basename(s.info.id)}.log`), s.scrollback.toString());
    } catch (error) {
      logger.warn("Could not persist agent scrollback", error);
    }
  }

  /** Opens the agent in a standalone OS terminal, continuing the latest conversation in that directory. */
  async openExternal(id: string) {
    const s = this.sessions.get(id);
    const projectId = s?.input.project_id;
    if (!s || !projectId) throw new IpcError("Session not found on this device.");
    const { adapter, resolved } = await this.resolveExecutable(s.input.agent_type);
    if (!resolved) throw new IpcError(`${adapter.name} executable not found.`);
    const cwd = workspaceConfig.projectRoot(projectId);
    const args = adapter.resumeArgs();

    if (isWindows) {
      const wt = await which("wt.exe");
      if (wt) spawn(wt, ["-d", cwd, resolved, ...args], { detached: true, stdio: "ignore", windowsHide: false }).unref();
      else spawn(process.env.ComSpec || "cmd.exe", ["/c", "start", "", "/D", cwd, "cmd", "/k", resolved, ...args], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "darwin") {
      const q = (v: string) => `'${v.replace(/'/g, `'\\''`)}'`;
      const shellCmd = `cd ${q(cwd)} && ${[resolved, ...args].map(q).join(" ")}`;
      const script = `tell application "Terminal" to do script ${JSON.stringify(shellCmd)}`;
      spawn("osascript", ["-e", script, "-e", 'tell application "Terminal" to activate'], { detached: true, stdio: "ignore" }).unref();
    } else {
      const term = (await which("x-terminal-emulator")) ?? (await which("gnome-terminal")) ?? (await which("konsole"));
      if (!term) throw new IpcError("No terminal emulator found.");
      spawn(term, ["-e", resolved, ...args], { cwd, detached: true, stdio: "ignore" }).unref();
    }
  }

  stopAll() {
    for (const s of this.sessions.values()) {
      if (s.pty) {
        s.stopping = true;
        try {
          s.pty.kill();
        } catch (error) {
          logger.warn(`Could not kill agent session ${s.info.id}`, error);
        }
      }
      if (s.titleTimer) clearInterval(s.titleTimer);
      this.persistScrollback(s);
    }
  }
}

export const agentManager = new AgentManager();
