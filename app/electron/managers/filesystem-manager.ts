import { clipboard, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { EditorTarget, FileEntry } from "../shared/contract";
import { EditorTargets } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";
import { isWindows, toPosix, which } from "../utils/platform";
import { workspaceConfig } from "./workspace-config";

// Filesystem Manager (Spec §11). Browsing and hand-off only — Dev Station is not an editor.

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage", "out", ".venv", "__pycache__", "target"]);
const MAX_SEARCH_RESULTS = 200;
const MAX_SEARCH_VISITS = 50_000;

class FilesystemManager {
  async list(projectId: string, relDir: string): Promise<FileEntry[]> {
    const root = workspaceConfig.projectRoot(projectId);
    const dir = workspaceConfig.resolveInProject(projectId, relDir);
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      throw new IpcError(`Cannot read directory: ${relDir || "."}`);
    }
    return entries
      .filter((e) => e.name !== ".git")
      .map((e) => ({ name: e.name, path: toPosix(path.relative(root, path.join(dir, e.name))), type: e.isDirectory() ? ("dir" as const) : ("file" as const) }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) : a.type === "dir" ? -1 : 1));
  }

  async search(projectId: string, query: string): Promise<FileEntry[]> {
    const root = workspaceConfig.projectRoot(projectId);
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: FileEntry[] = [];
    const queue = [root];
    let visits = 0;
    while (queue.length && results.length < MAX_SEARCH_RESULTS && visits < MAX_SEARCH_VISITS) {
      const dir = queue.shift()!;
      let entries: fs.Dirent[] = [];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        visits++;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!IGNORED_DIRS.has(e.name)) queue.push(full);
          continue;
        }
        const rel = toPosix(path.relative(root, full));
        if (rel.toLowerCase().includes(q)) results.push({ name: e.name, path: rel, type: "file" });
        if (results.length >= MAX_SEARCH_RESULTS) break;
      }
    }
    return results.sort((a, b) => a.path.length - b.path.length);
  }

  reveal(projectId: string, rel: string) {
    shell.showItemInFolder(workspaceConfig.resolveInProject(projectId, rel));
  }

  async openExternal(projectId: string, rel: string) {
    const err = await shell.openPath(workspaceConfig.resolveInProject(projectId, rel));
    if (err) throw new IpcError(err);
  }

  async openInEditor(projectId: string, editor: EditorTarget, rel?: string) {
    const root = workspaceConfig.projectRoot(projectId);
    const target = rel ? workspaceConfig.resolveInProject(projectId, rel) : root;
    if (editor === EditorTargets.DEFAULT) return this.openExternal(projectId, rel ?? ".");

    const configured = workspaceConfig.settings.editor_executables[editor];
    const exe = configured || (editor === EditorTargets.CURSOR ? "cursor" : "code");
    const resolved = await which(exe);
    if (!resolved) throw new IpcError(`${editor === EditorTargets.CURSOR ? "Cursor" : "VS Code"} was not found on PATH. Set its path in Settings → General.`);

    // Open the project folder, and the file within it when one was chosen.
    const args = rel ? [root, "--goto", target] : [root];
    const needsShell = isWindows && /\.(cmd|bat)$/i.test(resolved);
    if (needsShell && args.some((a) => /[&|<>^%"!]/.test(a))) {
      throw new IpcError("This path contains characters that cannot be passed safely to the editor launcher.");
    }
    const child = needsShell
      ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", resolved, ...args], { detached: true, stdio: "ignore", windowsHide: true })
      : spawn(resolved, args, { detached: true, stdio: "ignore" });
    child.unref();
  }

  copyPath(projectId: string, rel: string) {
    const abs = workspaceConfig.resolveInProject(projectId, rel);
    clipboard.writeText(abs);
    return abs;
  }
}

export const filesystemManager = new FilesystemManager();
