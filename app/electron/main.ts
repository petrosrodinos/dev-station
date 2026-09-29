import { app, BrowserWindow, Menu, net, protocol, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerIpc } from "./ipc/register";
import { setTrustedSenderCheck } from "./ipc/handle";
import { agentManager } from "./managers/agent-manager";
import { floatingPanelManager } from "./managers/floating-panel-manager";
import { previewManager } from "./managers/preview-manager";
import { processManager } from "./managers/process-manager";
import { terminalManager } from "./managers/terminal-manager";
import { logger } from "./utils/logger";
import { IpcChannels } from "./shared/contract";

// Electron main process: window lifecycle, custom app:// protocol for the packaged renderer,
// navigation lockdown, IPC registration and orderly shutdown of every child process.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(__dirname, "../dist");
const APP_SCHEME = "app";
const APP_ORIGIN = `${APP_SCHEME}://devstation`;
const SHUTDOWN_TIMEOUT_MS = 5000;

protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

// Development only: expose the Chrome DevTools Protocol for automated UI checks.
if (!app.isPackaged && process.env.DEV_STATION_REMOTE_DEBUGGING_PORT) {
  app.commandLine.appendSwitch("remote-debugging-port", process.env.DEV_STATION_REMOTE_DEBUGGING_PORT);
}

if (!app.requestSingleInstanceLock()) app.quit();

let mainWindow: BrowserWindow | null = null;

function isTrustedUrl(url: string | undefined) {
  if (!url) return false;
  if (DEV_SERVER_URL) return url.startsWith(DEV_SERVER_URL);
  return url.startsWith(`${APP_ORIGIN}/`);
}

function serveRenderer() {
  // SPA-aware static server for the packaged renderer (keeps BrowserRouter working).
  protocol.handle(APP_SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    const requested = path.normalize(path.join(RENDERER_DIST, decodeURIComponent(pathname)));
    const safe = requested.startsWith(RENDERER_DIST) ? requested : path.join(RENDERER_DIST, "index.html");
    const hasExt = path.extname(safe) !== "";
    const target = hasExt ? safe : path.join(RENDERER_DIST, "index.html");
    return net.fetch(pathToFileURL(target).toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#07080a",
    title: "Dev Station",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      // Automated UI checks (dev only) need frames even when the window is in the background.
      backgroundThrottling: !process.env.DEV_STATION_REMOTE_DEBUGGING_PORT,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  previewManager.attach(mainWindow);
  mainWindow.on("focus", () => previewManager.reloadActive());
  // Keeps the renderer's toggle button in sync even when full screen is entered/left natively
  // (e.g. the macOS green traffic-light button), not just via our own IPC toggle.
  mainWindow.on("enter-full-screen", () => mainWindow?.webContents.send(IpcChannels.APP_FULLSCREEN_CHANGE, true));
  mainWindow.on("leave-full-screen", () => mainWindow?.webContents.send(IpcChannels.APP_FULLSCREEN_CHANGE, false));

  // Only our renderer may navigate the window; external links go to the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });

  if (DEV_SERVER_URL) void mainWindow.loadURL(DEV_SERVER_URL);
  else void mainWindow.loadURL(`${APP_ORIGIN}/`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("web-contents-created", (_e, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

// Windows attributes toast notifications to this id; without it they are dropped or mislabeled.
if (process.platform === "win32") app.setAppUserModelId("dev.logiqdev.devstation");

app.whenReady().then(() => {
  if (process.platform !== "darwin") Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === "clipboard-sanitized-write"));
  setTrustedSenderCheck((event) => isTrustedUrl(event.senderFrame?.url));
  if (!DEV_SERVER_URL) serveRenderer();
  floatingPanelManager.configure(APP_ORIGIN, DEV_SERVER_URL, isTrustedUrl);
  registerIpc();
  createWindow();
  logger.info(`Dev Station ${app.getVersion()} started`);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let shuttingDown = false;
app.on("before-quit", (event) => {
  if (shuttingDown) return;
  shuttingDown = true;
  event.preventDefault();

  // A hung or throwing child must never leave a windowless zombie holding the single-instance lock.
  const forceExit = setTimeout(() => app.exit(0), SHUTDOWN_TIMEOUT_MS);
  const attempt = (label: string, fn: () => void) => {
    try {
      fn();
    } catch (e) {
      logger.error(`Error during shutdown (${label})`, e);
    }
  };

  attempt("previews", () => previewManager.destroyAll());
  attempt("floating panels", () => floatingPanelManager.closeAll());
  attempt("agents", () => agentManager.stopAll());
  attempt("terminals", () => terminalManager.killAll());
  processManager
    .stopAll()
    .catch((e) => logger.error("Error stopping processes", e))
    .finally(() => {
      clearTimeout(forceExit);
      app.exit(0);
    });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (err) => logger.error("Uncaught exception", err));
process.on("unhandledRejection", (err) => logger.error("Unhandled rejection", err));
