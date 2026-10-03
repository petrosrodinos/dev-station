import { BrowserWindow, screen, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ICON_PATH } from "../utils/app-icon";
import {
  IpcChannels,
  type FloatingPanelClosedEvent,
  type FloatingWindowBounds,
  type FloatingWindowSnapshot,
  type OpenFloatingPanelInput,
} from "../shared/contract";
import { FloatingWindowRegistry } from "./floating-window-registry";

// Floating panels (docking system §C): each floating window is a BrowserWindow loading this same renderer
// bundle at `/floating?windowId=...`, and it can host several dock panels. The registry is the source of
// truth for which panel lives in which window; the renderer mirrors it from full snapshots sent only to that
// window. Existing IPC events still broadcast to every window, and the trusted-origin check is per-URL, so
// the security model is unchanged.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;

class FloatingPanelManager {
  private readonly registry = new FloatingWindowRegistry<BrowserWindow>();
  private readonly lastBounds = new Map<string, FloatingWindowBounds>();
  private appOrigin = "";
  private devServerUrl: string | undefined;
  private isTrustedUrl: (url: string | undefined) => boolean = () => false;

  configure(appOrigin: string, devServerUrl: string | undefined, isTrustedUrl: (url: string | undefined) => boolean) {
    this.appOrigin = appOrigin;
    this.devServerUrl = devServerUrl;
    this.isTrustedUrl = isTrustedUrl;
  }

  open(input: OpenFloatingPanelInput) {
    const { windowId } = input;
    if (!this.registry.has(windowId)) this.createWindow(windowId, input);

    const previous = this.registry.place(windowId, {
      panelId: input.panelId,
      componentType: input.componentType,
      params: input.params,
      title: input.title,
    });
    if (previous !== undefined) {
      if (this.registry.panelsOf(previous).length === 0) this.closeWindow(previous);
      else this.pushState(previous);
    }
    this.pushState(windowId);
  }

  closePanel(panelId: string) {
    const windowId = this.registry.unplace(panelId);
    if (windowId === undefined) return;
    this.emitClosed({ panelId, bounds: this.boundsOf(windowId) });
    if (this.registry.panelsOf(windowId).length === 0) this.closeWindow(windowId);
    else this.pushState(windowId);
  }

  getWindow(windowId: string): FloatingWindowSnapshot {
    return { windowId, panels: this.registry.panelsOf(windowId) };
  }

  closeAll() {
    for (const windowId of this.registry.windowIds()) this.closeWindow(windowId);
  }

  private createWindow(windowId: string, input: OpenFloatingPanelInput) {
    const display = screen.getPrimaryDisplay();
    const initial: FloatingWindowBounds = {
      x: input.bounds?.x ?? Math.round(display.bounds.x + (display.bounds.width - DEFAULT_WIDTH) / 2),
      y: input.bounds?.y ?? Math.round(display.bounds.y + (display.bounds.height - DEFAULT_HEIGHT) / 2),
      width: input.bounds?.width ?? DEFAULT_WIDTH,
      height: input.bounds?.height ?? DEFAULT_HEIGHT,
    };

    const win = new BrowserWindow({
      ...initial,
      minWidth: 320,
      minHeight: 200,
      title: input.title,
      icon: APP_ICON_PATH,
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

    const target = new URL("/floating", this.devServerUrl ?? this.appOrigin);
    target.search = new URLSearchParams({ windowId }).toString();
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

    this.lastBounds.set(windowId, initial);
    win.on("close", () => this.lastBounds.set(windowId, this.boundsOf(windowId)));
    win.on("closed", () => this.handleWindowClosed(windowId));
    this.registry.register(windowId, win);
  }

  private handleWindowClosed(windowId: string) {
    const bounds = this.boundsOf(windowId);
    this.lastBounds.delete(windowId);
    for (const panel of this.registry.drop(windowId)) this.emitClosed({ panelId: panel.panelId, bounds });
  }

  private closeWindow(windowId: string) {
    const win = this.registry.window(windowId);
    if (win && !win.isDestroyed()) win.close();
  }

  private pushState(windowId: string) {
    const win = this.registry.window(windowId);
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IpcChannels.LAYOUT_FLOATING_WINDOW_CHANGED, this.getWindow(windowId));
  }

  private boundsOf(windowId: string): FloatingWindowBounds {
    const win = this.registry.window(windowId);
    const live = win ? this.toFloatingBounds(win) : null;
    return live ?? this.lastBounds.get(windowId) ?? { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  private toFloatingBounds(win: BrowserWindow): FloatingWindowBounds | null {
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
