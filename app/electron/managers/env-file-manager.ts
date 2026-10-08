import fs from "node:fs";
import path from "node:path";
import type { EnvFileContent, EnvFileSummary, EnvVariable } from "../shared/contract";
import { IpcErrorCodes } from "../shared/contract";
import { ENV_FILE_NAME_RE, ENV_KEY_RE, ENV_TEMPLATE_FILE_RE, envEntries, parseEnv, serializeEnv } from "../shared/env-file";
import { IpcError } from "../ipc/ipc-error";
import { toPosix } from "../utils/platform";
import { processManager } from "./process-manager";
import { workspaceConfig } from "./workspace-config";

// Env File Manager: lists, reads and edits a project's `.env*` files for the Overview env editor. Values only
// travel between this process and the local renderer; they are never part of anything synced to the API.

const IGNORED_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "target", "vendor", "__pycache__"]);
const MAX_DEPTH = 3;
const MAX_FILES = 200;
const MAX_VISITS = 5_000;
const MAX_ENV_BYTES = 1024 * 1024;

function fileOrder(a: EnvFileSummary, b: EnvFileSummary) {
  if (a.dir !== b.dir) return a.dir === "." ? -1 : b.dir === "." ? 1 : a.dir.localeCompare(b.dir);
  if (a.is_template !== b.is_template) return a.is_template ? 1 : -1;
  return a.name === ".env" ? -1 : b.name === ".env" ? 1 : a.name.localeCompare(b.name);
}

class EnvFileManager {
  listFiles(projectId: string): EnvFileSummary[] {
    const root = workspaceConfig.projectRoot(projectId);
    const out: EnvFileSummary[] = [];
    let visits = 0;
    const walk = (dir: string, depth: number) => {
      if (out.length >= MAX_FILES || visits++ > MAX_VISITS) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (e.isFile() && ENV_FILE_NAME_RE.test(e.name)) {
          const rel = toPosix(path.relative(root, path.join(dir, e.name)));
          out.push({ path: rel, dir: toPosix(path.relative(root, dir)) || ".", name: e.name, is_template: ENV_TEMPLATE_FILE_RE.test(e.name) });
        } else if (e.isDirectory() && depth < MAX_DEPTH && !e.name.startsWith(".") && !IGNORED_DIRS.has(e.name)) {
          walk(path.join(dir, e.name), depth + 1);
        }
      }
    };
    walk(root, 0);
    return out.sort(fileOrder);
  }

  readFile(projectId: string, relPath: string): EnvFileContent {
    const file = this.resolveEnvFile(projectId, relPath);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      throw new IpcError("This .env file no longer exists.");
    }
    if (stat.size > MAX_ENV_BYTES) throw new IpcError("This .env file is too large to edit here. Open it in your editor.");
    const variables = envEntries(parseEnv(fs.readFileSync(file, "utf8")));
    const values = new Map(variables.map((v) => [v.key, v.value]));
    const isTemplate = ENV_TEMPLATE_FILE_RE.test(path.basename(file));
    // Show what running services really got for this file's variables (port shifts, Dev Station env settings).
    const overrides = isTemplate
      ? []
      : processManager.envOverridesFor(projectId, path.dirname(file)).filter((o) => values.has(o.key) && values.get(o.key) !== o.value);
    return { path: toPosix(relPath), variables, overrides, mtime_ms: stat.mtimeMs };
  }

  writeFile(projectId: string, relPath: string, variables: EnvVariable[], mtimeMs: number): EnvFileContent {
    const file = this.resolveEnvFile(projectId, relPath);
    const seen = new Set<string>();
    for (const v of variables) {
      if (!ENV_KEY_RE.test(v.key)) throw new IpcError(`"${v.key}" is not a valid variable name.`, IpcErrorCodes.VALIDATION);
      if (seen.has(v.key)) throw new IpcError(`${v.key} is listed twice.`, IpcErrorCodes.VALIDATION);
      seen.add(v.key);
    }
    let current = "";
    try {
      const stat = fs.statSync(file);
      if (Math.abs(stat.mtimeMs - mtimeMs) > 1) {
        throw new IpcError("This file changed on disk since you opened it. Reload it and apply your changes again.", IpcErrorCodes.FILE_CHANGED);
      }
      current = fs.readFileSync(file, "utf8");
    } catch (error) {
      if (error instanceof IpcError) throw error;
      throw new IpcError("This .env file no longer exists.");
    }
    fs.writeFileSync(file, serializeEnv(parseEnv(current), variables), "utf8");
    return this.readFile(projectId, relPath);
  }

  /** Only `.env*` files inside the project (symlinks resolved) can be read or written through this manager. */
  private resolveEnvFile(projectId: string, relPath: string): string {
    if (!ENV_FILE_NAME_RE.test(path.basename(relPath))) throw new IpcError("Only .env files can be edited here.", IpcErrorCodes.VALIDATION);
    const file = workspaceConfig.resolveInProject(projectId, relPath);
    let real = file;
    try {
      real = fs.realpathSync(file);
    } catch {
      return file;
    }
    const root = fs.realpathSync(workspaceConfig.projectRoot(projectId));
    const relative = path.relative(root, real);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new IpcError("Path is outside the project directory.", IpcErrorCodes.PATH_OUTSIDE_PROJECT);
    }
    return file;
  }
}

export const envFileManager = new EnvFileManager();
