import { BrowserWindow, session, shell, WebContentsView } from "electron";
import { IpcError } from "../ipc/ipc-error";
import { IpcChannels, IpcErrorCodes, type PreviewBounds, type PreviewState } from "../shared/contract";
import { logger } from "../utils/logger";
import { isPreviewUrlAllowed } from "../utils/preview-url";

// Owns one sandboxed WebContentsView per project that embeds a localhost dev service.
// Views are created lazily, kept alive while hidden, and only the active one is attached to the window.

const PARTITION = "persist:preview";
const ERR_ABORTED = -3;

interface Entry {
  view: WebContentsView;
  requestedUrl: string;
  error: string | null;
}

const isHttp = (url: string) => /^https?:\/\//i.test(url);
const portOf = (url: string) => {
  try {
    const u = new URL(url);
    return u.port || (u.protocol === "https:" ? "443" : "80");
  } catch {
    return null;
  }
};

class PreviewManager {
  private window: BrowserWindow | null = null;
  private readonly views = new Map<string, Entry>();
  private activeId: string | null = null;
  private sessionConfigured = false;

  attach(window: BrowserWindow) {
    this.window = window;
    window.on("closed", () => {
      this.destroyAll();
      if (this.window === window) this.window = null;
    });
  }

  show(projectId: string, url: string, bounds: PreviewBounds) {
    this.assertAllowed(url);
    const window = this.requireWindow();
    const entry = this.ensure(projectId);

    if (this.activeId && this.activeId !== projectId) this.detach(this.activeId);
    this.activeId = projectId;
    entry.view.setBounds(this.normalize(bounds));
    window.contentView.addChildView(entry.view); // re-adding an attached view just moves it to the top

    const wc = entry.view.webContents;
    if (entry.requestedUrl !== url || !wc.getURL()) this.loadInto(entry, url);
    else this.emitState(projectId);
  }

  hide(projectId: string) {
    this.detach(projectId);
    if (this.activeId === projectId) this.activeId = null;
  }

  setBounds(projectId: string, bounds: PreviewBounds) {
    this.views.get(projectId)?.view.setBounds(this.normalize(bounds));
  }

  navigate(projectId: string, action: "back" | "forward" | "reload") {
    const wc = this.views.get(projectId)?.view.webContents;
    if (!wc) return;
    if (action === "reload") wc.reload();
    else if (action === "back" && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
    else if (action === "forward" && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  }

  load(projectId: string, url: string) {
    this.assertAllowed(url);
    this.loadInto(this.ensure(projectId), url);
  }

  destroy(projectId: string) {
    const entry = this.views.get(projectId);
    if (!entry) return;
    this.detach(projectId);
    this.views.delete(projectId);
    if (this.activeId === projectId) this.activeId = null;
    if (!entry.view.webContents.isDestroyed()) entry.view.webContents.close();
  }

  destroyAll() {
    for (const id of [...this.views.keys()]) this.destroy(id);
  }

  /** Opens/closes a detached DevTools window for the previewed view; returns the new open state. */
  toggleDevTools(projectId: string): boolean {
    const wc = this.views.get(projectId)?.view.webContents;
    if (!wc || wc.isDestroyed()) return false;
    if (wc.isDevToolsOpened()) {
      wc.closeDevTools();
      return false;
    }
    wc.openDevTools({ mode: "detach" });
    return true;
  }

  /** Window regained focus: pick up changes made while the user was in the editor. */
  reloadActive() {
    if (this.activeId) this.reload(this.activeId);
  }

  /** A service of this project (re)started. When the service URL is known, only reload if its port matches. */
  reloadProject(projectId: string, serviceUrl?: string | null) {
    const entry = this.views.get(projectId);
    if (!entry) return;
    if (serviceUrl) {
      const port = portOf(serviceUrl);
      if (port && port !== portOf(entry.requestedUrl) && port !== portOf(entry.view.webContents.getURL())) return;
    }
    this.reload(projectId);
  }

  // Internals -------------------------------------------------------------------

  private reload(projectId: string) {
    const wc = this.views.get(projectId)?.view.webContents;
    if (wc && !wc.isDestroyed() && wc.getURL()) wc.reload();
  }

  private loadInto(entry: Entry, url: string) {
    entry.requestedUrl = url;
    entry.error = null;
    // Failures are reported through did-fail-load; this only stops an unhandled rejection.
    entry.view.webContents.loadURL(url).catch(() => undefined);
  }

  private assertAllowed(url: string) {
    if (!isPreviewUrlAllowed(url)) {
      throw new IpcError("Only localhost URLs can be previewed. Open other links in your browser.", IpcErrorCodes.PREVIEW_URL_NOT_ALLOWED);
    }
  }

  private requireWindow() {
    if (!this.window || this.window.isDestroyed()) throw new IpcError("Main window is not available.");
    return this.window;
  }

  private normalize(b: PreviewBounds) {
    return { x: Math.round(b.x), y: Math.round(b.y), width: Math.max(0, Math.round(b.width)), height: Math.max(0, Math.round(b.height)) };
  }

  private detach(projectId: string) {
    const entry = this.views.get(projectId);
    if (!entry || !this.window || this.window.isDestroyed()) return;
    try {
      this.window.contentView.removeChildView(entry.view);
    } catch {
      // not attached
    }
  }

  private configureSession() {
    if (this.sessionConfigured) return;
    this.sessionConfigured = true;
    const ses = session.fromPartition(PARTITION);
    ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
  }

  private ensure(projectId: string): Entry {
    const existing = this.views.get(projectId);
    if (existing) return existing;

    this.configureSession();
    const view = new WebContentsView({
      webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false },
    });
    const entry: Entry = { view, requestedUrl: "", error: null };
    this.views.set(projectId, entry);
    const wc = view.webContents;

    const guard = (event: { preventDefault: () => void }, url: string) => {
      if (isPreviewUrlAllowed(url)) return;
      event.preventDefault();
      if (isHttp(url)) void shell.openExternal(url);
    };
    wc.on("will-navigate", (event, url) => guard(event, url));
    wc.on("will-redirect", (event, url) => guard(event, url));
    wc.setWindowOpenHandler(({ url }) => {
      if (isHttp(url)) void shell.openExternal(url);
      return { action: "deny" };
    });

    const emit = () => this.emitState(projectId);
    wc.on("did-start-loading", () => {
      entry.error = null;
      emit();
    });
    wc.on("did-stop-loading", emit);
    wc.on("did-navigate", emit);
    wc.on("did-navigate-in-page", emit);
    wc.on("page-title-updated", emit);
    wc.on("did-fail-load", (_e, code, description, validatedUrl, isMainFrame) => {
      if (!isMainFrame || code === ERR_ABORTED) return;
      entry.error = `${description} (${code})`;
      logger.warn(`Preview failed to load ${validatedUrl}: ${description}`);
      emit();
    });

    return entry;
  }

  private emitState(projectId: string) {
    const entry = this.views.get(projectId);
    if (!entry || !this.window || this.window.isDestroyed()) return;
    const wc = entry.view.webContents;
    if (wc.isDestroyed()) return;
    const state: PreviewState = {
      projectId,
      url: wc.getURL() || entry.requestedUrl,
      title: wc.getTitle(),
      loading: wc.isLoading(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
      error: entry.error,
    };
    this.window.webContents.send(IpcChannels.PREVIEW_STATE, state);
  }
}

export const previewManager = new PreviewManager();
