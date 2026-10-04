import { clipboard, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { EditorTarget, FileContent, FileEntry } from "../shared/contract";
import { EditorTargets } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";
import { isWindows, toPosix, which } from "../utils/platform";
import { workspaceConfig } from "./workspace-config";

// Filesystem Manager (Spec §11). Browsing, hand-off, and lightweight in-app editing for text files.

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage", "out", ".venv", "__pycache__", "target"]);
const MAX_SEARCH_RESULTS = 200;
const MAX_SEARCH_VISITS = 50_000;
const MAX_EDITABLE_BYTES = 5 * 1024 * 1024; // 5 MB — larger files go to Cursor / VS Code instead.

/** Heuristic binary sniff: a NUL byte in the first few KB means "don't try to edit this as text". */
function looksBinary(buffer: Buffer): boolean {
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i++) if (buffer[i] === 0) return true;
  return false;
}

// eslint-disable-next-line no-control-regex
const INVALID_NAME_CHARS = /[<>:"|?*\x00-\x1f]/;

/** Validates a user-typed path (or single name) and returns its normalized segments. */
function nameSegments(input: string, allowNested: boolean): string[] {
  const segments = input.trim().replace(/\\/g, "/").split("/").filter(Boolean);
  if (!segments.length) throw new IpcError("Enter a name.");
  if (!allowNested && segments.length > 1) throw new IpcError("A name cannot contain slashes.");
  for (const seg of segments) {
    if (seg === "." || seg === ".." || seg.toLowerCase() === ".git") throw new IpcError(`"${seg}" is not allowed as a name.`);
    if (INVALID_NAME_CHARS.test(seg) || /[. ]$/.test(seg)) throw new IpcError(`"${seg}" contains characters that are not allowed.`);
  }
  return segments;
}

class FilesystemManager {
  private async assertMissing(abs: string, rel: string) {
    const exists = await fs.promises.stat(abs).then(() => true, () => false);
    if (exists) throw new IpcError(`"${rel}" already exists.`);
  }

  private childPath(projectId: string, input: string) {
    const rel = nameSegments(input, true).join("/");
    return { rel, abs: workspaceConfig.resolveInProject(projectId, rel) };
  }

  async createFile(projectId: string, input: string): Promise<string> {
    const { rel, abs } = this.childPath(projectId, input);
    await this.assertMissing(abs, rel);
    await fs.promises.mkdir(path.dirname(abs), { recursive: true });
    await fs.promises.writeFile(abs, "", { flag: "wx" });
    return rel;
  }

  async createFolder(projectId: string, input: string): Promise<string> {
    const { rel, abs } = this.childPath(projectId, input);
    await this.assertMissing(abs, rel);
    await fs.promises.mkdir(abs, { recursive: true });
    return rel;
  }

  async rename(projectId: string, rel: string, newName: string): Promise<string> {
    if (!rel) throw new IpcError("The project root cannot be renamed.");
    const from = workspaceConfig.resolveInProject(projectId, rel);
    const [name] = nameSegments(newName, false);
    const to = path.join(path.dirname(from), name);
    const nextRel = toPosix(path.relative(workspaceConfig.projectRoot(projectId), to));
    workspaceConfig.resolveInProject(projectId, nextRel);
    // A case-only rename resolves to the same entry on case-insensitive filesystems, so it is not a collision.
    if (from.toLowerCase() !== to.toLowerCase()) await this.assertMissing(to, nextRel);
    await fs.promises.rename(from, to).catch(() => {
      throw new IpcError(`Could not rename "${rel}".`);
    });
    return nextRel;
  }

  async move(projectId: string, rel: string, destDir: string): Promise<string> {
    if (!rel) throw new IpcError("The project root cannot be moved.");
    const root = workspaceConfig.projectRoot(projectId);
    const from = workspaceConfig.resolveInProject(projectId, rel);
    const dest = workspaceConfig.resolveInProject(projectId, destDir);
    const to = path.join(dest, path.basename(from));
    const nextRel = toPosix(path.relative(root, to));
    if (path.resolve(to) === path.resolve(from)) return rel;
    const intoSelf = path.relative(from, dest);
    if (!intoSelf.startsWith("..") && !path.isAbsolute(intoSelf)) throw new IpcError("A folder cannot be moved into itself.");
    const destStat = await fs.promises.stat(dest).catch(() => null);
    if (!destStat?.isDirectory()) throw new IpcError("The destination is not a folder.");
    await this.assertMissing(to, nextRel);
    await fs.promises.rename(from, to).catch(() => {
      throw new IpcError(`Could not move "${rel}".`);
    });
    return nextRel;
  }

  async importExternal(projectId: string, destDir: string, sources: string[]): Promise<string[]> {
    const root = workspaceConfig.projectRoot(projectId);
    const dest = workspaceConfig.resolveInProject(projectId, destDir);
    const destStat = await fs.promises.stat(dest).catch(() => null);
    if (!destStat?.isDirectory()) throw new IpcError("The destination is not a folder.");
    const created: string[] = [];
    for (const source of sources) {
      if (!path.isAbsolute(source)) throw new IpcError("Dropped item has no usable path.");
      const stat = await fs.promises.stat(source).catch(() => null);
      if (!stat || !(stat.isFile() || stat.isDirectory())) throw new IpcError(`Cannot read "${path.basename(source)}".`);
      const to = path.join(dest, path.basename(source));
      const nextRel = toPosix(path.relative(root, to));
      const back = path.relative(source, to);
      if (stat.isDirectory() && !back.startsWith("..") && !path.isAbsolute(back)) throw new IpcError("A folder cannot be copied into itself.");
      await this.assertMissing(to, nextRel);
      await fs.promises
        .cp(source, to, { recursive: true, errorOnExist: true, filter: (src) => path.basename(src) !== ".git" || src === source })
        .catch(() => {
          throw new IpcError(`Could not copy "${path.basename(source)}".`);
        });
      created.push(nextRel);
    }
    return created;
  }

  async delete(projectId: string, rel: string): Promise<void> {
    if (!rel) throw new IpcError("The project root cannot be deleted.");
    const abs = workspaceConfig.resolveInProject(projectId, rel);
    await shell.trashItem(abs).catch(() => {
      throw new IpcError(`Could not move "${rel}" to the trash.`);
    });
  }

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

  async readFile(projectId: string, rel: string): Promise<FileContent> {
    const abs = workspaceConfig.resolveInProject(projectId, rel);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(abs);
    } catch {
      throw new IpcError(`Cannot read file: ${rel}`);
    }
    if (!stat.isFile()) throw new IpcError(`Not a file: ${rel}`);
    if (stat.size > MAX_EDITABLE_BYTES) throw new IpcError("This file is too large to edit here (over 5 MB). Open it in Cursor or VS Code instead.");

    const buffer = await fs.promises.readFile(abs);
    if (looksBinary(buffer)) throw new IpcError("This looks like a binary file and can't be edited here.");
    return { content: buffer.toString("utf8") };
  }

  async writeFile(projectId: string, rel: string, content: string): Promise<void> {
    const abs = workspaceConfig.resolveInProject(projectId, rel);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(abs);
    } catch {
      throw new IpcError(`Cannot save file: ${rel}`);
    }
    if (!stat.isFile()) throw new IpcError(`Not a file: ${rel}`);
    if (Buffer.byteLength(content, "utf8") > MAX_EDITABLE_BYTES) throw new IpcError("This file is too large to save here (over 5 MB).");

    await fs.promises.writeFile(abs, content, "utf8");
  }
}

export const filesystemManager = new FilesystemManager();
