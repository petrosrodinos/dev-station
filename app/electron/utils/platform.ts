import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const isWindows = process.platform === "win32";

export function defaultShell(): string {
  if (isWindows) {
    const pwsh = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    return fs.existsSync(pwsh) ? pwsh : process.env.ComSpec || "cmd.exe";
  }
  return process.env.SHELL || (process.platform === "darwin" ? "/bin/zsh" : "/bin/bash");
}

const whichCache = new Map<string, string | null>();

/** Resolves an executable on PATH (`where` / `which`). Absolute paths are checked directly. */
export function which(executable: string): Promise<string | null> {
  // Normalize user-entered paths to native separators — e.g. cmd.exe misreads "C:/…" in its own
  // command line as switches.
  if (path.isAbsolute(executable)) {
    const native = path.normalize(executable);
    return Promise.resolve(fs.existsSync(native) ? native : null);
  }
  if (whichCache.has(executable)) return Promise.resolve(whichCache.get(executable) ?? null);

  return new Promise((resolve) => {
    const cmd = isWindows ? "where.exe" : "which";
    execFile(cmd, [executable], { windowsHide: true, timeout: 5000 }, (error, stdout) => {
      if (error) {
        whichCache.set(executable, null);
        return resolve(null);
      }
      const candidates = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      // Prefer real executables over shims on Windows so node-pty can spawn them without a shell.
      const preferred = isWindows ? candidates.find((c) => c.toLowerCase().endsWith(".exe")) ?? candidates.find((c) => /\.(cmd|bat)$/i.test(c)) ?? null : candidates[0] ?? null;
      whichCache.set(executable, preferred);
      resolve(preferred);
    });
  });
}

export function clearWhichCache() {
  whichCache.clear();
}

/** Environment passed to child processes: inherit the user's env, force colour, never prompt on a TTY for git. */
export function childEnv(extra?: Record<string, string> | null): NodeJS.ProcessEnv {
  return {
    ...process.env,
    FORCE_COLOR: "1",
    ...(extra ?? {}),
  };
}

export function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
