import { app } from "electron";
import { autoUpdater, type ProgressInfo, type UpdateInfo } from "electron-updater";
import { logger } from "../utils/logger";
import { AppUpdateStates, type AppUpdateStatus } from "../shared/contract";

// Windows-only auto-update via electron-updater (GitHub Releases provider, configured through
// electron-builder's `publish` config in package.json — Spec §
// docs/superpowers/specs/2026-09-29-app-distribution-and-updates-design.md).
// Checks are a no-op in dev (unpackaged) builds, where there is no app-update.yml to read.

const INITIAL_CHECK_DELAY_MS = 10_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

class UpdateManager {
  private status: AppUpdateStatus = { state: AppUpdateStates.IDLE };
  private emit: ((status: AppUpdateStatus) => void) | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private started = false;

  init(emit: (status: AppUpdateStatus) => void) {
    this.emit = emit;
    if (this.started || !app.isPackaged) return;
    this.started = true;

    // Stage updates in the background; the renderer shows an Install / Skip banner once downloaded.
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("checking-for-update", () => this.set({ state: AppUpdateStates.CHECKING }));
    autoUpdater.on("update-available", (info: UpdateInfo) => this.set({ state: AppUpdateStates.AVAILABLE, version: info.version }));
    autoUpdater.on("update-not-available", () => this.set({ state: AppUpdateStates.NOT_AVAILABLE }));
    autoUpdater.on("download-progress", (p: ProgressInfo) => this.set({ state: AppUpdateStates.DOWNLOADING, percent: Math.round(p.percent) }));
    autoUpdater.on("update-downloaded", (info: UpdateInfo) => this.set({ state: AppUpdateStates.DOWNLOADED, version: info.version }));
    autoUpdater.on("error", (error: Error) => {
      logger.error("Auto-update error", error);
      this.set({ state: AppUpdateStates.ERROR, error: error.message });
    });

    setTimeout(() => void this.check(), INITIAL_CHECK_DELAY_MS);
    this.interval = setInterval(() => void this.check(), CHECK_INTERVAL_MS);
  }

  private set(status: AppUpdateStatus) {
    this.status = status;
    this.emit?.(status);
  }

  getStatus(): AppUpdateStatus {
    return this.status;
  }

  async check() {
    if (!app.isPackaged) return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.error("Update check failed", error);
    }
  }

  async download() {
    if (!app.isPackaged) return;
    await autoUpdater.downloadUpdate();
  }

  install() {
    if (!app.isPackaged) return;
    autoUpdater.quitAndInstall();
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}

export const updateManager = new UpdateManager();
