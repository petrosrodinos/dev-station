import crypto from "node:crypto";
import path from "node:path";
import * as pty from "node-pty";
import type { PtyDataEvent, PtyExitEvent, TerminalInfo } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";
import { childEnv } from "../utils/platform";
import { Scrollback } from "../utils/scrollback";
import { workspaceConfig } from "./workspace-config";

// Terminal Manager (Spec §10): interactive shells scoped to a project's working directory.

interface ManagedTerminal {
  info: TerminalInfo;
  pty: pty.IPty;
  scrollback: Scrollback;
}

const MAX_TERMINALS = 32;

class TerminalManager {
  private terms = new Map<string, ManagedTerminal>();
  private onData: (e: PtyDataEvent) => void = () => {};
  private onExit: (e: PtyExitEvent) => void = () => {};

  setEmitters(onData: (e: PtyDataEvent) => void, onExit: (e: PtyExitEvent) => void) {
    this.onData = onData;
    this.onExit = onExit;
  }

  list(): TerminalInfo[] {
    return [...this.terms.values()].map((t) => t.info);
  }

  create(projectId: string, cols = 100, rows = 30): TerminalInfo {
    if (this.terms.size >= MAX_TERMINALS) throw new IpcError("Too many open terminals — close some first.");
    const cwd = workspaceConfig.projectRoot(projectId);
    const shell = workspaceConfig.shell();
    const id = crypto.randomUUID();
    const proc = pty.spawn(shell, [], { name: "xterm-256color", cols, rows, cwd, env: childEnv() as Record<string, string> });
    const count = this.list().filter((t) => t.project_id === projectId).length + 1;

    const managed: ManagedTerminal = {
      pty: proc,
      scrollback: new Scrollback(500_000),
      info: { id, project_id: projectId, title: `${path.basename(shell).replace(/\.exe$/i, "")} ${count}`, shell, cwd, pid: proc.pid, alive: true, created_at: new Date().toISOString() },
    };
    this.terms.set(id, managed);

    proc.onData((data) => {
      managed.scrollback.push(data);
      this.onData({ id, data });
    });
    proc.onExit(({ exitCode }) => {
      managed.info = { ...managed.info, alive: false };
      this.onExit({ id, exit_code: exitCode });
    });
    return managed.info;
  }

  private get(id: string) {
    const t = this.terms.get(id);
    if (!t) throw new IpcError("Terminal not found");
    return t;
  }

  write(id: string, data: string) {
    const t = this.get(id);
    if (t.info.alive) t.pty.write(data);
  }

  resize(id: string, cols: number, rows: number) {
    const t = this.get(id);
    if (t.info.alive) t.pty.resize(cols, rows);
  }

  scrollback(id: string) {
    return this.get(id).scrollback.toString();
  }

  kill(id: string) {
    const t = this.terms.get(id);
    if (!t) return;
    this.terms.delete(id);
    if (!t.info.alive) return;
    try {
      t.pty.kill();
    } catch {
      /* already exited or ConPTY teardown failed — nothing left to clean up */
    }
  }

  killAll() {
    for (const id of [...this.terms.keys()]) this.kill(id);
  }
}

export const terminalManager = new TerminalManager();
