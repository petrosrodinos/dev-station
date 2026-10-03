export interface FloatingPanel {
  panelId: string;
  componentType: string;
  params: Record<string, unknown>;
  title: string;
}

interface WindowEntry<Win> {
  win: Win;
  panels: FloatingPanel[];
}

/** Which dock panels live in which floating window. Free of Electron imports so it can be unit-tested. */
export class FloatingWindowRegistry<Win> {
  private readonly windows = new Map<string, WindowEntry<Win>>();
  private readonly owner = new Map<string, string>();

  has(windowId: string) {
    return this.windows.has(windowId);
  }

  windowIds() {
    return [...this.windows.keys()];
  }

  window(windowId: string): Win | undefined {
    return this.windows.get(windowId)?.win;
  }

  panelsOf(windowId: string): FloatingPanel[] {
    return [...(this.windows.get(windowId)?.panels ?? [])];
  }

  windowOf(panelId: string): string | undefined {
    return this.owner.get(panelId);
  }

  register(windowId: string, win: Win) {
    this.windows.set(windowId, { win, panels: [] });
  }

  /**
   * Adds the panel to a window, taking it out of the window that held it. Returns that previous window
   * when it was a different one, so the caller can refresh it.
   */
  place(windowId: string, panel: FloatingPanel): string | undefined {
    const entry = this.windows.get(windowId);
    if (!entry) throw new Error(`Unknown floating window ${windowId}`);
    const previous = this.owner.get(panel.panelId);
    if (previous !== undefined) this.remove(previous, panel.panelId);
    entry.panels.push(panel);
    this.owner.set(panel.panelId, windowId);
    return previous !== undefined && previous !== windowId ? previous : undefined;
  }

  /** Takes a panel out of its window and returns that window's id. */
  unplace(panelId: string): string | undefined {
    const windowId = this.owner.get(panelId);
    if (windowId !== undefined) this.remove(windowId, panelId);
    return windowId;
  }

  /** Forgets a window and returns the panels it still held. */
  drop(windowId: string): FloatingPanel[] {
    const entry = this.windows.get(windowId);
    if (!entry) return [];
    this.windows.delete(windowId);
    for (const panel of entry.panels) this.owner.delete(panel.panelId);
    return entry.panels;
  }

  private remove(windowId: string, panelId: string) {
    const entry = this.windows.get(windowId);
    if (entry) entry.panels = entry.panels.filter((panel) => panel.panelId !== panelId);
    this.owner.delete(panelId);
  }
}
