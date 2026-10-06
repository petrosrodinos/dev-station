// Mirrors the main-process rule in electron/utils/preview-url.ts (only local dev servers can be embedded).
// Main re-checks every URL, so this only decides what the address bar accepts.
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Turns what the user typed ("3000", "localhost:5173/docs", "http://127.0.0.1:4000") into an allowed URL, or null. */
export function normalizePreviewUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^\d{2,5}$/.test(trimmed) ? `http://localhost:${trimmed}` : /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  return ALLOWED_HOSTS.has(parsed.hostname) ? parsed.href : null;
}
