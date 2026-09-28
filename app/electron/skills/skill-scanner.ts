import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { SkillDetail, SkillKind, SkillProvider, SkillScope, SkillSummary } from "../shared/contract";
import { defaultKindForFile, isNoiseFile, parseGeminiToml, parseMarkdownSkill, stripSkillExtension, type ParsedSkillFile } from "./skill-parsers.ts";

// Discovers skill files on disk. Read-only: nothing here writes, and every returned path is a file
// that was found by walking a known location, never a path supplied by the renderer.

export const MAX_SKILL_BYTES = 256 * 1024;
const MAX_CUSTOM_FILES = 500;
const MAX_CUSTOM_DEPTH = 4;
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage", "out", ".venv", "__pycache__", "target"]);

type Layout =
  /** `<dir>/<name>/SKILL.md` */
  | "skill-dirs"
  /** `<dir>/*.md` (also `*.mdc`, `*.prompt.md`) */
  | "md-files"
  /** `<dir>/*.toml` Gemini commands, nested folders become `a:b` names */
  | "toml-files"
  /** a single named file */
  | "file";

interface Location {
  provider: SkillProvider;
  scope: Exclude<SkillScope, "custom">;
  rel: string;
  layout: Layout;
  kind: SkillKind;
}

const loc = (provider: SkillProvider, scope: Location["scope"], rel: string, layout: Layout, kind: SkillKind): Location => ({ provider, scope, rel, layout, kind });

/** Built-in locations, relative to the user's home directory. */
const USER_LOCATIONS: Location[] = [
  loc("claude", "user", ".claude/skills", "skill-dirs", "skill"),
  loc("claude", "user", ".claude/commands", "md-files", "command"),
  loc("claude", "user", ".claude/CLAUDE.md", "file", "context"),
  loc("cursor", "user", ".cursor/skills", "skill-dirs", "skill"),
  loc("cursor", "user", ".cursor/commands", "md-files", "command"),
  loc("codex", "user", ".codex/skills", "skill-dirs", "skill"),
  loc("codex", "user", ".codex/prompts", "md-files", "command"),
  loc("codex", "user", ".codex/AGENTS.md", "file", "context"),
  loc("gemini", "user", ".gemini/commands", "toml-files", "command"),
  loc("gemini", "user", ".gemini/GEMINI.md", "file", "context"),
  loc("generic", "user", ".agents/skills", "skill-dirs", "skill"),
];

/** Built-in locations, relative to a project root. */
const PROJECT_LOCATIONS: Location[] = [
  loc("claude", "project", ".claude/skills", "skill-dirs", "skill"),
  loc("claude", "project", ".claude/commands", "md-files", "command"),
  loc("claude", "project", "CLAUDE.md", "file", "context"),
  loc("cursor", "project", ".cursor/skills", "skill-dirs", "skill"),
  loc("cursor", "project", ".cursor/rules", "md-files", "rule"),
  loc("cursor", "project", ".cursor/commands", "md-files", "command"),
  loc("codex", "project", ".codex/skills", "skill-dirs", "skill"),
  loc("codex", "project", ".codex/prompts", "md-files", "command"),
  loc("codex", "project", "AGENTS.md", "file", "context"),
  loc("gemini", "project", ".gemini/commands", "toml-files", "command"),
  loc("gemini", "project", "GEMINI.md", "file", "context"),
  loc("copilot", "project", ".github/prompts", "md-files", "command"),
  loc("copilot", "project", ".github/copilot-instructions.md", "file", "context"),
  loc("generic", "project", ".agents/skills", "skill-dirs", "skill"),
];

export interface ScanRoots {
  home: string;
  projectRoot: string | null;
  customFolders: string[];
}

export interface ScanResult {
  skills: SkillSummary[];
  scanned: string[];
}

/** Stable across rescans so the UI can keep a selection: hash of the file path (+ fragment for multi-skill files). */
const makeId = (filePath: string) => crypto.createHash("sha1").update(path.resolve(filePath).toLowerCase()).digest("hex").slice(0, 16);

function statOrNull(p: string): fs.Stats | null {
  try {
    return fs.statSync(p); // follows symlinks: ~/.claude/skills entries are commonly links
  } catch {
    return null;
  }
}

function listDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Reads a text file up to the size limit. Returns null for unreadable or binary files. */
export function readSkillFile(file: string): { raw: string; size: number; truncated: boolean } | null {
  let fd: number | null = null;
  try {
    const size = fs.statSync(file).size;
    fd = fs.openSync(file, "r");
    const length = Math.min(size, MAX_SKILL_BYTES);
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, 0);
    if (buffer.subarray(0, 8000).includes(0)) return null;
    return { raw: buffer.toString("utf8"), size, truncated: size > MAX_SKILL_BYTES };
  } catch {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

interface Candidate {
  file: string;
  provider: SkillProvider;
  scope: SkillScope;
  kind: SkillKind;
  fallbackName: string;
}

function toSummary(c: Candidate): { summary: SkillSummary; parsed: ParsedSkillFile } | null {
  const read = readSkillFile(c.file);
  if (!read) return null;
  const parsed = /\.toml$/i.test(c.file) ? parseGeminiToml(read.raw, c.fallbackName) : parseMarkdownSkill(read.raw, c.fallbackName);
  if (!parsed) return null;
  return {
    parsed,
    summary: {
      id: makeId(c.file),
      name: parsed.name,
      description: parsed.description,
      provider: c.provider,
      scope: c.scope,
      kind: c.kind,
      path: c.file,
      size_bytes: read.size,
      meta: parsed.meta,
    },
  };
}

function collectLocation(base: string, l: Location): Candidate[] {
  const target = path.join(base, l.rel);
  const st = statOrNull(target);
  if (!st) return [];
  const make = (file: string, fallbackName: string, kind: SkillKind = l.kind): Candidate => ({ file, provider: l.provider, scope: l.scope, kind, fallbackName });

  if (l.layout === "file") return st.isFile() ? [make(target, stripSkillExtension(path.basename(target)))] : [];
  if (!st.isDirectory()) return [];

  const out: Candidate[] = [];
  if (l.layout === "skill-dirs") {
    for (const entry of listDir(target)) {
      if (entry.name.startsWith(".") && entry.name !== ".system") continue;
      const dir = path.join(target, entry.name);
      if (!statOrNull(dir)?.isDirectory()) continue;
      const file = path.join(dir, "SKILL.md");
      if (statOrNull(file)?.isFile()) out.push(make(file, entry.name));
    }
    return out;
  }

  const wantToml = l.layout === "toml-files";
  const walk = (dir: string, prefix: string, depth: number) => {
    for (const entry of listDir(dir)) {
      const full = path.join(dir, entry.name);
      const s = statOrNull(full);
      if (!s) continue;
      if (s.isDirectory()) {
        // Gemini commands nest: commands/git/commit.toml is `/git:commit`; Cursor/Claude commands nest too.
        if (depth < 3 && !IGNORED_DIRS.has(entry.name)) walk(full, `${prefix}${entry.name}:`, depth + 1);
      } else if (s.isFile()) {
        const isMd = /\.(md|mdc)$/i.test(entry.name);
        const isToml = /\.toml$/i.test(entry.name);
        if ((wantToml && isToml) || (!wantToml && isMd)) out.push(make(full, `${prefix}${stripSkillExtension(entry.name)}`));
      }
    }
  };
  walk(target, "", 0);
  return out;
}

/** Custom folders: any SKILL.md is a skill; other markdown / TOML files are listed as documents. */
function collectCustom(folder: string): Candidate[] {
  const out: Candidate[] = [];
  const walk = (dir: string, depth: number) => {
    if (out.length >= MAX_CUSTOM_FILES) return;
    for (const entry of listDir(dir)) {
      if (out.length >= MAX_CUSTOM_FILES) return;
      const full = path.join(dir, entry.name);
      // Symlinked directories are not followed here: an arbitrary folder could loop or escape.
      if (entry.isDirectory()) {
        if (depth < MAX_CUSTOM_DEPTH && !IGNORED_DIRS.has(entry.name)) walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || !/\.(md|mdc|toml)$/i.test(entry.name) || isNoiseFile(entry.name)) continue;
      const isSkill = /^skill\.md$/i.test(entry.name);
      const fallbackName = isSkill ? path.basename(dir) : stripSkillExtension(entry.name);
      out.push({ file: full, provider: "generic", scope: "custom", kind: defaultKindForFile(entry.name), fallbackName });
    }
  };
  if (statOrNull(folder)?.isDirectory()) walk(folder, 0);
  return out;
}

export interface ScannedSkill {
  summary: SkillSummary;
  parsed: ParsedSkillFile;
}

export function scanSkills(roots: ScanRoots): { entries: ScannedSkill[]; scanned: string[] } {
  const candidates: Candidate[] = [];
  const scanned: string[] = [];

  for (const l of USER_LOCATIONS) {
    scanned.push(path.join(roots.home, l.rel));
    candidates.push(...collectLocation(roots.home, l));
  }
  if (roots.projectRoot) {
    for (const l of PROJECT_LOCATIONS) {
      scanned.push(path.join(roots.projectRoot, l.rel));
      candidates.push(...collectLocation(roots.projectRoot, l));
    }
  }
  for (const folder of roots.customFolders) {
    scanned.push(folder);
    candidates.push(...collectCustom(folder));
  }

  // The same file can be reached from two places (a custom folder pointing at ~/.claude/skills);
  // the built-in provider location wins because it carries the right provider and scope.
  const seen = new Set<string>();
  const entries: ScannedSkill[] = [];
  for (const c of candidates) {
    const id = makeId(c.file);
    if (seen.has(id)) continue;
    seen.add(id);
    const result = toSummary(c);
    if (result) entries.push(result);
  }
  entries.sort((a, b) => a.summary.name.localeCompare(b.summary.name, undefined, { sensitivity: "base" }));
  return { entries, scanned };
}

export function toDetail(entry: ScannedSkill): SkillDetail {
  // Re-read from disk so the reader never shows a stale copy of a file that was edited since the scan.
  const fresh = readSkillFile(entry.summary.path);
  if (!fresh) return { ...entry.summary, body: entry.parsed.body, truncated: false };
  const reparsed = /\.toml$/i.test(entry.summary.path) ? parseGeminiToml(fresh.raw, entry.summary.name) : parseMarkdownSkill(fresh.raw, entry.summary.name);
  return { ...entry.summary, size_bytes: fresh.size, body: reparsed?.body ?? entry.parsed.body, truncated: fresh.truncated };
}
