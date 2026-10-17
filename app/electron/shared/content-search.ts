// Pure helpers around ripgrep, the engine behind "Find in Files": the argument list for a query and the
// parser for its `--json` output. Kept free of Electron / child_process so it can be unit tested.

export interface MatchQuery {
  query: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  include: string;
  exclude: string;
}

export interface LineMatch {
  line: number;
  column: number;
  length: number;
  preview: string;
  previewStart: number;
}

/** Folders never searched, even when a project does not gitignore them. */
const ALWAYS_IGNORED = [".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage", "out", ".venv", "__pycache__", "target"];

const PREVIEW_BEFORE = 40;
const PREVIEW_AFTER = 160;

const splitGlobs = (input: string) =>
  input
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

/**
 * Arguments for `rg`. Globs are applied in order, later ones winning, so the user's include / exclude
 * globs can override the default ignores. Searches the cwd, so paths come back relative to the project.
 */
export function buildRgArgs(q: MatchQuery, extra: string[] = []): string[] {
  const args = ["--hidden", "--max-filesize", "2M", "--no-messages"];
  for (const dir of ALWAYS_IGNORED) args.push("--glob", `!${dir}`);
  for (const g of splitGlobs(q.include)) args.push("--glob", g);
  for (const g of splitGlobs(q.exclude)) args.push("--glob", g.startsWith("!") ? g.slice(1) : `!${g}`);
  args.push(q.caseSensitive ? "--case-sensitive" : "--ignore-case");
  if (!q.regex) args.push("--fixed-strings");
  if (q.wholeWord) args.push("--word-regexp");
  args.push(...extra, "--regexp", q.query);
  return args;
}

/** ripgrep's `--replace` reads `$1` / `${name}` even with --fixed-strings, so a literal replacement escapes its `$`. */
export const rgReplacement = (replacement: string, regex: boolean) => (regex ? replacement : replacement.replace(/\$/g, "$$$$"));

/** rg reports `./dir/file` (or `.\dir\file` on Windows). */
export const normalizeRgPath = (p: string) => p.replace(/\\/g, "/").replace(/^\.\//, "");

/** Submatch offsets are UTF-8 bytes; the editor and the previews count UTF-16 characters. */
const charOffset = (text: string, byteOffset: number) => Buffer.from(text, "utf8").subarray(0, byteOffset).toString("utf8").length;

/** Parses one line of `rg --json` output; returns the file's matches for "match" events, else null. */
export function parseRgMatch(jsonLine: string): { path: string; matches: LineMatch[] } | null {
  interface RgMatchEvent {
    type?: string;
    data?: { path?: { text?: string }; lines?: { text?: string }; line_number?: number; submatches?: { start: number; end: number }[] };
  }
  let event: RgMatchEvent;
  try {
    event = JSON.parse(jsonLine);
  } catch {
    return null;
  }
  if (event.type !== "match") return null;
  const { path, lines, line_number: lineNumber, submatches } = event.data ?? {};
  // `bytes` instead of `text` means the line is not valid UTF-8; there is nothing sensible to show or jump to.
  if (typeof path?.text !== "string" || typeof lines?.text !== "string" || typeof lineNumber !== "number") return null;
  const text = lines.text.replace(/\r?\n$/, "");
  const firstText = text.length - text.trimStart().length;
  const matches: LineMatch[] = [];
  for (const sm of submatches ?? []) {
    const column = charOffset(lines.text, sm.start);
    const length = charOffset(lines.text, sm.end) - column;
    if (length <= 0) continue;
    const from = Math.min(column, Math.max(firstText, column - PREVIEW_BEFORE));
    const to = Math.min(text.length, column + length + PREVIEW_AFTER);
    matches.push({ line: lineNumber, column, length, preview: text.slice(from, to), previewStart: column - from });
  }
  return { path: normalizeRgPath(path.text), matches };
}
