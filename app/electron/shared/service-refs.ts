// Pure helpers (no Node / Electron imports) shared by the main process and the renderer.
// Services in a project can reference each other's *actual* ports with `{{slug.port}}`, `{{slug.url}}`
// and `{{slug.host}}` (e.g. `VITE_API_URL={{api.url}}`), so a port shift never breaks a dependent service.

export interface ServiceRef {
  service_id: string;
  name: string;
  /** The port the service asks for; the allocator may run it on another one. */
  port: number | null;
}

export const REF_FIELDS = ["port", "url", "host"] as const;
export type RefField = (typeof REF_FIELDS)[number];

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "service";
}

/** One unique slug per name, in order. Duplicates get `-2`, `-3`, ... */
export function assignServiceSlugs(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    used.add(slug);
    return slug;
  });
}

export function localUrl(port: number) {
  return `http://localhost:${port}`;
}

// `{{port}}`, `{{api.url}}`. Deliberately narrow so Go/Docker templates like `{{.Names}}` are left alone.
const TEMPLATE_RE = /\{\{\s*(?:([a-z0-9-]+)\.)?([a-z]+)\s*\}\}/gi;

export interface TemplateContext {
  /** Slug of the service being started, for bare `{{port}}` / `{{url}}` references. */
  self: string;
  /** slug -> service name + the port it will actually run on. */
  services: Map<string, { name: string; port: number | null }>;
}

export interface TemplateResult {
  value: string;
  /** Slugs of *other* services this text depends on. */
  refs: string[];
  errors: string[];
}

export function resolveTemplate(text: string, ctx: TemplateContext): TemplateResult {
  const refs = new Set<string>();
  const errors: string[] = [];
  const value = text.replace(TEMPLATE_RE, (whole, slugRaw: string | undefined, fieldRaw: string) => {
    const field = fieldRaw.toLowerCase();
    const slug = slugRaw?.toLowerCase();
    const known = (REF_FIELDS as readonly string[]).includes(field);
    if (!slug && !known) return whole; // not ours
    const target = slug ?? ctx.self;
    const svc = ctx.services.get(target);
    if (!svc) {
      if (slug) errors.push(`Unknown service "${slug}" in ${whole}. Available: ${[...ctx.services.keys()].join(", ")}`);
      return whole;
    }
    if (!known) {
      errors.push(`Unknown field "${field}" in ${whole}. Use port, url or host.`);
      return whole;
    }
    if (svc.port == null) {
      errors.push(`${whole}: "${svc.name}" has no port. Set a port on that service first.`);
      return whole;
    }
    if (target !== ctx.self) refs.add(target);
    if (field === "port") return String(svc.port);
    if (field === "host") return `localhost:${svc.port}`;
    return localUrl(svc.port);
  });
  return { value, refs: [...refs], errors };
}

// Env names that hold a full URL (`NEXT_PUBLIC_API_URL`, `APP_URL`, `CORS_URLS`, `ALLOWED_ORIGIN`).
const URL_ENV_KEY_RE = /(^|_)(URLS?|URIS?|ORIGINS?|ENDPOINTS?)$/i;
// `{{slug.host}}` not already behind a scheme (`http://{{api.host}}` is left alone).
const BARE_HOST_REF_RE = /(?<!:\/\/)\{\{\s*([a-z0-9-]+\.)?host\s*\}\}/gi;

/**
 * A URL-valued env var built from `{{slug.host}}` gets `localhost:3000` with no scheme, which breaks CORS
 * origins and makes fetch/axios treat the API URL as relative. For such names, `host` references become `url`.
 */
export function envTemplateFor(key: string, value: string): string {
  if (!URL_ENV_KEY_RE.test(key)) return value;
  return value.replace(BARE_HOST_REF_RE, (_whole, slugDot: string | undefined) => `{{${slugDot ?? ""}url}}`);
}

/**
 * requested port -> port it actually runs on, for the services of a project that were moved. A requested port
 * claimed by several services that landed on different ports is ambiguous and left out.
 */
export function portShifts(services: { port: number | null; actual: number | null }[]): Map<number, number> {
  const byRequested = new Map<number, Set<number>>();
  for (const s of services) {
    if (s.port == null || s.actual == null) continue;
    byRequested.set(s.port, (byRequested.get(s.port) ?? new Set()).add(s.actual));
  }
  const shifts = new Map<number, number>();
  for (const [requested, actual] of byRequested) {
    const [only] = actual;
    if (actual.size === 1 && only !== requested) shifts.set(requested, only);
  }
  return shifts;
}

const LOCAL_PORT_RE = /\b(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})\b/g;

/**
 * Rewrites `localhost:<requested>` in .env values to the port the service really got, so hardcoded URLs in a
 * project's own .env files (`APP_URL=http://localhost:3001`) follow a port shift. Returns only changed keys.
 */
export function followPortShifts(values: Record<string, string>, shifts: Map<number, number>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!shifts.size) return out;
  for (const [key, value] of Object.entries(values)) {
    if (key === "PORT") continue;
    const next = value.replace(LOCAL_PORT_RE, (whole, host: string, port: string) => {
      const to = shifts.get(Number(port));
      return to == null ? whole : `${host}:${to}`;
    });
    if (next !== value) out[key] = next;
  }
  return out;
}

/** Slugs referenced (as `{{slug.x}}`) in a text — used by the UI to show what a service depends on. */
export function referencedSlugs(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(TEMPLATE_RE)) if (m[1]) out.add(m[1].toLowerCase());
  return [...out];
}

const ALREADY_PINNED_RE = /(^|\s)(--port|-p)([\s=]|$)|\bPORT=/;
// Dev servers whose CLI keeps the last value of a repeated flag, so an appended port flag overrides one the
// script already pins (`next dev -p 3001 -p 3003` listens on 3003).
const LAST_FLAG_WINS_RE = /\b(next|storybook|vite|webpack\s+serve|webpack-dev-server)\b/;
// Commands that fan out to several processes — a port flag would land on the wrong one.
const FAN_OUT_RE = /&&|;|\bconcurrently\b|\bturbo\b|\bnpm-run-all\b|\brun-p\b|\bnx\b|\blerna\b/;

/**
 * The CLI flag that makes a known dev server listen on `port` (most read `PORT`, but Vite, Next and Storybook
 * only take a flag). A pinned port is overridden where the CLI lets a later flag win; otherwise empty when the
 * script is unknown, already pins a port, or fans out to several commands.
 */
export function portFlagFor(scriptCommand: string, port: number): string {
  if (!scriptCommand || FAN_OUT_RE.test(scriptCommand)) return "";
  if (ALREADY_PINNED_RE.test(scriptCommand) && !LAST_FLAG_WINS_RE.test(scriptCommand)) return "";
  if (/\bstorybook\b/.test(scriptCommand)) return `-p ${port}`;
  if (/\bnext\b/.test(scriptCommand)) return `-p ${port}`;
  if (/\bng\s+serve\b/.test(scriptCommand)) return `--port ${port}`;
  if (/\bastro\b/.test(scriptCommand)) return `--port ${port}`;
  if (/\b(webpack\s+serve|webpack-dev-server)\b/.test(scriptCommand)) return `--port ${port}`;
  if (/\bvite\b/.test(scriptCommand)) return `--port ${port} --strictPort`;
  return "";
}

/** Appends extra args to a package-manager script invocation (`npm run x -- --port 1`). */
export function appendScriptArgs(runCommand: string, packageManager: string | null, args: string): string {
  if (!args) return runCommand;
  return packageManager === "npm" || !packageManager ? `${runCommand} -- ${args}` : `${runCommand} ${args}`;
}

/** `Api Server` -> `DEV_STATION_API_SERVER` (env-var-safe form of a slug). */
export function slugToEnvSegment(slug: string): string {
  return slug.toUpperCase().replace(/-/g, "_");
}
