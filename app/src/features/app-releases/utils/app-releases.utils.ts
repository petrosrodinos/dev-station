/** Maps Electron's `process.platform` to the platform key used by the /app-releases API (Windows only for now). */
export const toReleasePlatform = (platform: NodeJS.Platform): string | null => (platform === "win32" ? "win" : null);
