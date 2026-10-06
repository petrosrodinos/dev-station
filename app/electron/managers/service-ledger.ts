import { app } from "electron";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import treeKill from "tree-kill";
import { logger } from "../utils/logger";

// Services are children of Dev Station, and Windows does not end children when their parent dies, so a
// crash or a Task Manager kill would leave them running and invisible. Every running service is recorded in
// a ledger file, and two safety nets use it:
//  - a watchdog (a detached Node process started by this run) kills the recorded services within about a
//    second of Dev Station going away. A normal quit has already removed their entries by then.
//  - on launch, leftovers from a run whose watchdog did not finish are killed, but only when the PID still
//    belongs to a process that started around the time it was recorded (PIDs get reused).

interface LedgerEntry {
  key: string;
  pid: number;
  started_at: number;
}

const START_TIME_TOLERANCE_MS = 10_000;

// Runs under Electron's Node mode (ELECTRON_RUN_AS_NODE). Argv: [app pid, ledger path].
const WATCHDOG_SCRIPT = `
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const appPid = Number(process.argv[1]);
const ledger = process.argv[2];
const alive = (pid) => {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
};
const killTree = (pid) => new Promise((resolve) => {
  if (process.platform === "win32") return execFile("taskkill", ["/pid", String(pid), "/T", "/F"], () => resolve());
  try { process.kill(-pid, "SIGKILL"); } catch (e) { try { process.kill(pid, "SIGKILL"); } catch (e2) {} }
  resolve();
});
const timer = setInterval(async () => {
  if (alive(appPid)) return;
  clearInterval(timer);
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(ledger, "utf8")); } catch (e) {}
  for (const entry of entries) if (alive(entry.pid)) await killTree(entry.pid);
  try { fs.rmSync(ledger, { force: true }); } catch (e) {}
  process.exit(0);
}, 1000);
`;

let watchdog: ChildProcess | null = null;

const ledgerPath = () => path.join(app.getPath("userData"), "running-services.json");

function readLedger(): LedgerEntry[] {
  try {
    return JSON.parse(fs.readFileSync(ledgerPath(), "utf8")) as LedgerEntry[];
  } catch {
    return [];
  }
}

function writeLedger(entries: LedgerEntry[]) {
  try {
    if (entries.length) fs.writeFileSync(ledgerPath(), JSON.stringify(entries));
    else fs.rmSync(ledgerPath(), { force: true });
  } catch (error) {
    logger.error("Could not update the running-services record", error);
  }
}

function ensureWatchdog() {
  if (watchdog) return;
  const child = spawn(process.execPath, ["-e", WATCHDOG_SCRIPT, String(process.pid), ledgerPath()], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  child.on("exit", () => {
    if (watchdog === child) watchdog = null;
  });
  watchdog = child;
}

/** A service started: record its PID so it is cleaned up even if Dev Station dies without stopping it. */
export function recordService(key: string, pid: number) {
  writeLedger([...readLedger().filter((e) => e.key !== key), { key, pid, started_at: Date.now() }]);
  ensureWatchdog();
}

/** A service exited on its own or was stopped. The PID check keeps a late exit from erasing a newer run. */
export function forgetService(key: string, pid: number) {
  writeLedger(readLedger().filter((e) => !(e.key === key && e.pid === pid)));
}

function processStartTime(pid: number): Promise<number | null> {
  return new Promise((resolve) => {
    const [command, args] =
      process.platform === "win32"
        ? ["powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`]]
        : ["ps", ["-o", "lstart=", "-p", String(pid)]];
    execFile(command, args, { windowsHide: true, timeout: 10_000 }, (error, stdout) => {
      if (error) return resolve(null);
      const time = Date.parse(stdout.trim());
      resolve(Number.isNaN(time) ? null : time);
    });
  });
}

function killTree(pid: number): Promise<void> {
  return new Promise((resolve) => treeKill(pid, "SIGKILL", () => resolve()));
}

/** Kills services left behind by an earlier run whose watchdog did not clean them up. */
export async function reapLeftoverServices(): Promise<void> {
  const leftovers = readLedger();
  if (!leftovers.length) return;
  writeLedger([]);
  for (const entry of leftovers) {
    const started = await processStartTime(entry.pid);
    if (started === null || Math.abs(started - entry.started_at) > START_TIME_TOLERANCE_MS) continue;
    logger.warn(`Stopping a service left running by an earlier session (${entry.key}, pid ${entry.pid})`);
    await killTree(entry.pid);
  }
}
