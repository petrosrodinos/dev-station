import type { SkillKind } from "../shared/contract";

// Pure parsing helpers for the skill formats the agent CLIs use. No fs / electron imports so the
// node:test runner can load this file directly.

export interface ParsedSkillFile {
  name: string;
  description: string;
  body: string;
  meta: Record<string, string>;
}

const BOM = String.fromCharCode(0xfeff);
const stripBom = (text: string) => (text.startsWith(BOM) ? text.slice(1) : text);
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) return v.slice(1, -1);
  return v;
}

/**
 * Minimal YAML-frontmatter reader: `key: value`, quoted values, `key: >` / `key: |` block scalars,
 * `key:` followed by `- item` lists, and `[a, b]` inline lists. Everything is flattened to strings —
 * skills only need to display it, never interpret it.
 */
export function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const clean = stripBom(raw);
  const match = FRONTMATTER.exec(clean);
  if (!match) return { meta: {}, body: clean };

  const meta: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv || /^\s/.test(line)) continue;
    const key = kv[1];
    const rest = kv[2].trim();

    if (rest === "" || /^[>|][+-]?$/.test(rest)) {
      const folded = rest.startsWith(">");
      const parts: string[] = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "" || /^-\s/.test(lines[i + 1]))) {
        i++;
        const next = lines[i].trim();
        if (next) parts.push(next.replace(/^-\s+/, ""));
      }
      meta[key] = rest === "" ? parts.join(", ") : parts.join(folded ? " " : "\n");
    } else if (rest.startsWith("[") && rest.endsWith("]")) {
      meta[key] = rest
        .slice(1, -1)
        .split(",")
        .map((p) => unquote(p))
        .filter(Boolean)
        .join(", ");
    } else {
      meta[key] = unquote(rest);
    }
  }
  return { meta, body: clean.slice(match[0].length).replace(/^\r?\n/, "") };
}

function firstLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(/^#+\s*/, "").trim();
    if (t) return t.slice(0, 300);
  }
  return "";
}

/** Markdown skill / command / rule / context file with optional frontmatter. */
export function parseMarkdownSkill(raw: string, fallbackName: string): ParsedSkillFile {
  const { meta, body } = parseFrontmatter(raw);
  const name = (meta.name || meta.title || "").trim() || fallbackName;
  const description = (meta.description || meta["argument-hint"] || "").trim() || firstLine(body);
  return { name, description, body, meta };
}

/** Gemini CLI custom command: a TOML file with `description` and a (multi-line) `prompt`. */
export function parseGeminiToml(raw: string, fallbackName: string): ParsedSkillFile | null {
  const text = stripBom(raw).replace(/\r\n/g, "\n");
  const readString = (key: string): string | null => {
    const multi = new RegExp(`^${key}\\s*=\\s*("""|''')([\\s\\S]*?)\\1`, "m").exec(text);
    if (multi) return multi[2].replace(/^\n/, "");
    const basic = new RegExp(`^${key}\\s*=\\s*"((?:[^"\\\\\\n]|\\\\.)*)"`, "m").exec(text);
    if (basic) return basic[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const literal = new RegExp(`^${key}\\s*=\\s*'([^'\\n]*)'`, "m").exec(text);
    return literal ? literal[1] : null;
  };
  const prompt = readString("prompt");
  if (prompt === null) return null;
  const description = (readString("description") ?? "").trim() || firstLine(prompt);
  return { name: fallbackName, description, body: prompt, meta: {} };
}

/** Files that describe a project rather than a task; they are shown, but under their own kind. */
const CONTEXT_FILES = new Set(["agents.md", "gemini.md", "claude.md", "copilot-instructions.md"]);
export const isContextFile = (fileName: string) => CONTEXT_FILES.has(fileName.toLowerCase());

const NOISE_FILES = /^(readme|changelog|license|licence|contributing|code_of_conduct|security)(\.[a-z]+)?$/i;
export const isNoiseFile = (fileName: string) => NOISE_FILES.test(fileName);

/** `name.prompt.md` / `name.md` / `name.mdc` / `name.toml` -> `name`. */
export function stripSkillExtension(fileName: string): string {
  return fileName.replace(/\.prompt\.md$/i, "").replace(/\.(mdc|md|toml)$/i, "") || fileName;
}

export function defaultKindForFile(fileName: string): SkillKind {
  if (isContextFile(fileName)) return "context";
  if (/^skill\.md$/i.test(fileName)) return "skill";
  if (/\.mdc$/i.test(fileName)) return "rule";
  if (/\.toml$/i.test(fileName)) return "command";
  return "doc";
}
