import { execFile } from "node:child_process";
import treeKill from "tree-kill";
import type { PortKillResult } from "../shared/contract";

// Frees TCP ports by terminating whatever process is listening on them (e.g. orphaned dev servers).
// Never touches Dev Station itself or system pids.

const run = (file: string, args: string[]): Promise<string> =>
  new Promise((resolve) => {
    execFile(file, args, { windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (_err, stdout) => resolve(String(stdout ?? "")));
  });

/** pids listening on `port`, parsed from `netstat -ano` (Windows) or `lsof` (macOS / Linux). */
export async function findListeningPids(port: number): Promise<number[]> {
  const pids = new Set<number>();
  if (process.platform === "win32") {
    const out = await run("netstat", ["-ano", "-p", "TCP"]);
    for (const line of out.split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      // Proto  Local  Foreign  State  PID
      if (cols.length < 5 || !/^LISTENING$/i.test(cols[3])) continue;
      if (!cols[1].endsWith(`:${port}`)) continue;
      pids.add(Number(cols[4]));
    }
  } else {
    const out = await run("lsof", ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"]);
    for (const l of out.split(/\r?\n/)) if (l.trim()) pids.add(Number(l.trim()));
  }
  return [...pids].filter((pid) => Number.isInteger(pid) && pid > 4 && pid !== process.pid);
}

const kill = (pid: number, signal: "SIGTERM" | "SIGKILL") => new Promise<void>((resolve) => treeKill(pid, signal, () => resolve()));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function killPorts(ports: number[]): Promise<PortKillResult[]> {
  const results: PortKillResult[] = [];
  for (const port of [...new Set(ports)]) {
    const pids = await findListeningPids(port);
    for (const pid of pids) await kill(pid, "SIGTERM");
    let remaining = pids.length ? await findListeningPids(port) : [];
    if (remaining.length) {
      await sleep(600);
      remaining = await findListeningPids(port);
      for (const pid of remaining) await kill(pid, "SIGKILL");
      if (remaining.length) {
        await sleep(300);
        remaining = await findListeningPids(port);
      }
    }
    results.push({ port, pids, freed: remaining.length === 0 });
  }
  return results;
}
