// Pure .env parsing / writing (no Node / Electron imports). Edits keep the file's comments, blank lines, order,
// `export` prefixes and quoting for untouched variables, so saving from the editor makes a minimal diff.

export const ENV_FILE_NAME_RE = /^\.env(\..+)?$/;
export const ENV_TEMPLATE_FILE_RE = /\.(example|sample|template|dist|defaults)$/i;
export const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;

interface EntryLine {
  kind: "entry";
  key: string;
  value: string;
  /** Original text of the line(s), reused verbatim when the value is unchanged. */
  raw: string;
  exported: boolean;
}
interface OtherLine {
  kind: "other";
  raw: string;
}
type EnvLine = EntryLine | OtherLine;

export interface ParsedEnv {
  lines: EnvLine[];
  /** Line ending used by the file, kept on write. */
  eol: "\n" | "\r\n";
}

const ENTRY_RE = /^(\s*)(export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.*)$/;

function unquote(rest: string): { value: string; complete: boolean } {
  const quote = rest[0];
  if (quote === '"' || quote === "'" || quote === "`") {
    const end = findClosingQuote(rest, quote);
    if (end === -1) return { value: rest.slice(1), complete: false };
    const inner = rest.slice(1, end);
    return { value: quote === '"' ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") : inner, complete: true };
  }
  return { value: rest.replace(/\s+#.*$/, "").trim(), complete: true };
}

function findClosingQuote(text: string, quote: string): number {
  for (let i = 1; i < text.length; i++) {
    if (text[i] === "\\" && quote === '"') {
      i++;
      continue;
    }
    if (text[i] === quote) return i;
  }
  return -1;
}

export function parseEnv(text: string): ParsedEnv {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const rows = text.split(/\r?\n/);
  if (rows.length && rows[rows.length - 1] === "") rows.pop();
  const lines: EnvLine[] = [];
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i].match(ENTRY_RE);
    if (!m) {
      lines.push({ kind: "other", raw: rows[i] });
      continue;
    }
    let rest = m[4];
    let raw = rows[i];
    let parsed = unquote(rest);
    // A quoted value may span several lines (`KEY="line1\nline2"` written literally).
    while (!parsed.complete && i + 1 < rows.length) {
      i++;
      raw += eol + rows[i];
      rest += "\n" + rows[i];
      parsed = unquote(rest);
    }
    lines.push({ kind: "entry", key: m[3], value: parsed.value, raw, exported: !!m[2] });
  }
  return { lines, eol };
}

export function envEntries(parsed: ParsedEnv): { key: string; value: string }[] {
  // Last declaration wins, like dotenv; report each key once at its first position.
  const values = new Map<string, string>();
  for (const l of parsed.lines) if (l.kind === "entry") values.set(l.key, l.value);
  const seen = new Set<string>();
  const out: { key: string; value: string }[] = [];
  for (const l of parsed.lines) {
    if (l.kind !== "entry" || seen.has(l.key)) continue;
    seen.add(l.key);
    out.push({ key: l.key, value: values.get(l.key) ?? "" });
  }
  return out;
}

/** Quotes a value only when it would not survive unquoted (spaces at the edges, `#`, quotes, newlines). */
export function formatEnvValue(value: string): string {
  if (!/[\s#"'`\\]/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/**
 * Writes `entries` (the editor's full list, in order) over the parsed file: unchanged variables keep their
 * original line, changed ones are rewritten in place, removed ones (and their duplicates) are dropped, new ones
 * are appended. Comments and blank lines stay where they were.
 */
export function serializeEnv(parsed: ParsedEnv, entries: { key: string; value: string }[]): string {
  const wanted = new Map(entries.map((e) => [e.key, e.value]));
  const effective = new Map(envEntries(parsed).map((e) => [e.key, e.value]));
  const written = new Set<string>();
  const out: string[] = [];
  for (const l of parsed.lines) {
    if (l.kind === "other") {
      out.push(l.raw);
      continue;
    }
    if (!wanted.has(l.key) || written.has(l.key)) continue;
    written.add(l.key);
    const value = wanted.get(l.key)!;
    // Keep the original line only when it already carries the effective value (not a shadowed duplicate).
    const untouched = value === effective.get(l.key) && value === l.value;
    out.push(untouched ? l.raw : `${l.exported ? "export " : ""}${l.key}=${formatEnvValue(value)}`);
  }
  const added = entries.filter((e) => !written.has(e.key));
  if (added.length && out.length && out[out.length - 1].trim() !== "") out.push("");
  for (const e of added) out.push(`${e.key}=${formatEnvValue(e.value)}`);
  return out.length ? out.join(parsed.eol) + parsed.eol : "";
}
