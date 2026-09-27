import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

// Small file + console logger for the main process. Log file lives in userData/logs/main.log.

let stream: fs.WriteStream | null = null;

function getStream() {
  if (stream) return stream;
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    stream = fs.createWriteStream(path.join(dir, "main.log"), { flags: "a" });
  } catch {
    stream = null;
  }
  return stream;
}

function write(level: string, message: string, extra?: unknown) {
  const detail = extra instanceof Error ? `${extra.message}\n${extra.stack ?? ""}` : extra !== undefined ? JSON.stringify(extra) : "";
  const line = `${new Date().toISOString()} [${level}] ${message}${detail ? ` ${detail}` : ""}`;
  if (level === "ERROR") console.error(line);
  else console.log(line);
  getStream()?.write(`${line}\n`);
}

export const logger = {
  info: (message: string, extra?: unknown) => write("INFO", message, extra),
  warn: (message: string, extra?: unknown) => write("WARN", message, extra),
  error: (message: string, extra?: unknown) => write("ERROR", message, extra),
};
