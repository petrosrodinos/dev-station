/** Only local dev servers may be embedded in the preview panel. */
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function isPreviewUrlAllowed(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  return ALLOWED_HOSTS.has(parsed.hostname);
}
