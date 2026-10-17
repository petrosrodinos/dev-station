import { spawn } from "node:child_process";
import fs from "node:fs";
import type { ContentFileResult, ContentReplaceResult, ContentSearchOptions, ContentSearchResult } from "../shared/contract";
import { buildRgArgs, normalizeRgPath, parseRgMatch, rgReplacement, type LineMatch } from "../shared/content-search";
import { IpcError } from "../ipc/ipc-error";
import { looksBinary } from "./filesystem-manager";
import { workspaceConfig } from "./workspace-config";

// Content Search Manager. "Find in Files" and replace, powered by ripgrep (the engine VS Code uses): it honors
// .gitignore, skips binary files, and searches in parallel.

const MAX_MATCHES = 5000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SEARCH_TIMEOUT_MS = 30_000;
const REPLACE_CONCURRENCY = 6;

/** The bundled binary. Inside a packaged app it lives next to the asar, not in it, or it could not be executed. */
async function ripgrepPath(): Promise<string> {
  try {
    const { rgPath } = await import("@vscode/ripgrep");
    return rgPath.replace(/app\.asar(?![.\w])/, "app.asar.unpacked");
  } catch {
    throw new IpcError("The search engine (ripgrep) is not available in this build.");
  }
}

interface RgRun {
  stdout: Buffer;
  /** True when the caller stopped the run early (match cap reached). */
  stopped: boolean;
}

class ContentSearchManager {
  /** Runs rg in the project root. `onLine` may return true to stop early. Exit code 1 (no matches) is not an error. */
  private async run(root: string, args: string[], onLine?: (line: string) => boolean | void, target = "."): Promise<RgRun> {
    const bin = await ripgrepPath();
    return new Promise((resolve, reject) => {
      // An explicit target matters: without a path rg would read stdin instead of searching the folder.
      const child = spawn(bin, [...args, "--", target], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      const chunks: Buffer[] = [];
      let pending = "";
      let stopped = false;
      let stderr = "";
      const timer = setTimeout(() => child.kill(), SEARCH_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        if (stopped) return;
        if (!onLine) return void chunks.push(chunk);
        pending += chunk.toString("utf8");
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (line && onLine(line)) {
            stopped = true;
            child.kill();
            return;
          }
        }
      });
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(new IpcError(`Could not start the search: ${e.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (!stopped && code === 2 && !chunks.length && !pending && stderr) {
          // e.g. "regex parse error: …" — the first line says what is wrong.
          return reject(new IpcError(stderr.split("\n").find((l) => l.trim())?.trim() ?? "Invalid search."));
        }
        resolve({ stdout: Buffer.concat(chunks), stopped });
      });
    });
  }

  async search(projectId: string, options: ContentSearchOptions): Promise<ContentSearchResult> {
    const root = workspaceConfig.projectRoot(projectId);
    const byFile = new Map<string, LineMatch[]>();
    let total = 0;
    let truncated = false;

    const { stopped } = await this.run(root, buildRgArgs(options, ["--json"]), (line) => {
      const parsed = parseRgMatch(line);
      if (!parsed?.matches.length) return;
      const room = MAX_MATCHES - total;
      const taken = parsed.matches.slice(0, room);
      byFile.set(parsed.path, [...(byFile.get(parsed.path) ?? []), ...taken]);
      total += taken.length;
      return total >= MAX_MATCHES;
    });
    truncated = stopped;

    const files: ContentFileResult[] = [...byFile].map(([path, matches]) => ({ path, matches }));
    files.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));
    return { files, totalMatches: total, truncated };
  }

  /** Text files only: skips anything binary or too large, like the search does. */
  private async readText(abs: string): Promise<Buffer | null> {
    try {
      const stat = await fs.promises.stat(abs);
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
      const buffer = await fs.promises.readFile(abs);
      return looksBinary(buffer) ? null : buffer;
    } catch {
      return null;
    }
  }

  async replace(projectId: string, options: ContentSearchOptions, replacement: string, paths: string[]): Promise<ContentReplaceResult> {
    const root = workspaceConfig.projectRoot(projectId);
    let filesChanged = 0;
    let replacements = 0;

    // ripgrep prints the whole file with the replacement applied (--passthru); writing that output back keeps
    // the match semantics (and `$1` / `${name}` groups) identical to what the search showed.
    const rewrite = async (rel: string) => {
      const abs = workspaceConfig.resolveInProject(projectId, rel);
      const original = await this.readText(abs);
      if (!original) return;
      // Explicit file targets bypass ignore rules and globs, so only this one file is searched.
      const scoped = { ...options, include: "", exclude: "" };
      const target = normalizeRgPath(rel);

      let count = 0;
      await this.run(
        root,
        buildRgArgs(scoped, ["--json"]),
        (line) => {
          const parsed = parseRgMatch(line);
          if (parsed) count += parsed.matches.length;
        },
        target,
      );
      if (!count) return;
      const { stdout } = await this.run(root, buildRgArgs(scoped, ["--passthru", "--no-line-number", "--no-filename", "--replace", rgReplacement(replacement, options.regex)]), undefined, target);
      if (!stdout.length || stdout.equals(original)) return;
      await fs.promises.writeFile(abs, stdout);
      filesChanged++;
      replacements += count;
    };

    const queue = [...paths];
    await Promise.all(
      Array.from({ length: Math.min(REPLACE_CONCURRENCY, queue.length) }, async () => {
        for (let rel = queue.shift(); rel !== undefined; rel = queue.shift()) await rewrite(rel);
      }),
    );
    return { filesChanged, replacements };
  }
}

export const contentSearchManager = new ContentSearchManager();
