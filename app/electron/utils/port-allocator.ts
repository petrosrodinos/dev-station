import net from "node:net";

// Free-port probing. Binds (then immediately releases) the port on every common local address, because a
// dev server bound to 0.0.0.0 or ::1 does not always block a bind on 127.0.0.1 (notably on Windows).
// `::1` is probed explicitly: a server bound to `localhost` (Vite's default) listens there only, and a bind on `::` still succeeds.

const PROBE_HOSTS = ["127.0.0.1", "0.0.0.0", "::", "::1"];
const MAX_PORT = 65535;

function probe(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (err: NodeJS.ErrnoException) => {
      // Only "taken / forbidden" counts as busy — e.g. IPv6 being unavailable must not.
      resolve(err.code !== "EADDRINUSE" && err.code !== "EACCES");
    });
    server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
  });
}

export async function isPortFree(port: number): Promise<boolean> {
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) return false;
  for (const host of PROBE_HOSTS) if (!(await probe(port, host))) return false;
  return true;
}

export interface FindPortOptions {
  isFree?: (port: number) => Promise<boolean>;
  /** Ports that must not be handed out (already reserved for another service). */
  isReserved?: (port: number) => boolean;
  /** How many ports above `preferred` to try before giving up. */
  span?: number;
}

/** First usable port at or above `preferred`. Throws when the range is exhausted. */
export async function findFreePort(preferred: number, opts: FindPortOptions = {}): Promise<number> {
  const isFree = opts.isFree ?? isPortFree;
  const span = opts.span ?? 300;
  const last = Math.min(preferred + span, MAX_PORT);
  for (let port = Math.max(preferred, 1); port <= last; port++) {
    if (opts.isReserved?.(port)) continue;
    if (await isFree(port)) return port;
  }
  throw new Error(`No free port found between ${preferred} and ${last}.`);
}

/** Polls until `port` can be bound again (e.g. after the process that held it was killed). False on timeout. */
export async function waitForPortFree(port: number, timeoutMs: number, intervalMs = 100): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await isPortFree(port)) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
