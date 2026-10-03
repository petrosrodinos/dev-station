import { BrowserWindow, screen, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IpcChannels, type FloatingPanelClosedEvent, type OpenFloatingPanelInput } from "../shared/contract";

// Real-OS-window floating panels (docking system §C): each floated dock panel gets its own
// BrowserWindow loading this same renderer bundle at a bare `/floating` route (no shell chrome),
// so it participates in the app's existing IPC/query/auth machinery with no separate bootstrap.
// Existing IPC events already broadcast to every open BrowserWindow (see ipc/register.ts's
// `broadcast`), and the trusted-origin check is per-URL not per-window, so this needs no changes
// to the security model — only window lifecycle + bounds tracking.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;

class FloatingPanelManager {
  private readonly windows = new Map<string, BrowserWindow>();
  private appOrigin = "";
  private devServerUrl: string | undefined;
  private isTrustedUrl: (url: string | undefined) => boolean = () => false;

  configure(appOrigin: string, devServerUrl: string | undefined, isTrustedUrl: (url: string | undefined) => boolean) {
    this.appOrigin = appOrigin;
    this.devServerUrl = devServerUrl;
    this.isTrustedUrl = isTrustedUrl;
  }

  open(input: OpenFloatingPanelInput) {
    this.close(input.panelId); // re-floating an already-floating panel replaces its window

    const display = screen.getPrimaryDisplay();
    const bounds = {
      x: input.bounds?.x ?? Math.round(display.bounds.x + (display.bounds.width - DEFAULT_WIDTH) / 2),
      y: input.bounds?.y ?? Math.round(display.bounds.y + (display.bounds.height - DEFAULT_HEIGHT) / 2),
      width: input.bounds?.width ?? DEFAULT_WIDTH,
      height: input.bounds?.height ?? DEFAULT_HEIGHT,
    };

    const win = new BrowserWindow({
      ...bounds,
      minWidth: 320,
      minHeight: 200,
      title: input.title,
      backgroundColor: "#07080a",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
      },
    });

    const query = new URLSearchParams({
      panelId: input.panelId,
      componentType: input.componentType,
      params: JSON.stringify(input.params),
      title: input.title,
    });
    const target = new URL("/floating", this.devServerUrl ?? this.appOrigin);
    target.search = query.toString();
    void win.loadURL(target.toString());

    // Same navigation lockdown as the main window: only our own renderer may navigate here.
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
      return { action: "deny" };
    });
    win.webContents.on("will-navigate", (event, url) => {
      if (!this.isTrustedUrl(url)) {
        event.preventDefault();
        if (/^https?:\/\//.test(url)) void shell.openExternal(url);
      }
    });

    win.on("closed", () => {
      this.windows.delete(input.panelId);
      const finalBounds = this.toFloatingBounds(win) ?? { ...bounds };
      this.emitClosed({ panelId: input.panelId, bounds: finalBounds });
    });

    this.windows.set(input.panelId, win);
  }

  close(panelId: string) {
    const win = this.windows.get(panelId);
    if (win && !win.isDestroyed()) win.close();
  }

  closeAll() {
    for (const panelId of [...this.windows.keys()]) this.close(panelId);
  }

  private toFloatingBounds(win: BrowserWindow) {
    if (win.isDestroyed()) return null;
    const b = win.getBounds();
    const displayId = screen.getDisplayMatching(b).id;
    return { x: b.x, y: b.y, width: b.width, height: b.height, displayId };
  }

  private emitClosed(event: FloatingPanelClosedEvent) {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(IpcChannels.LAYOUT_FLOATING_CLOSED, event);
    }
  }
}

export const floatingPanelManager = new FloatingPanelManager();
