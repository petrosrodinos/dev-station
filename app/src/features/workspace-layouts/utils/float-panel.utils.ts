import { getBridge } from "@/lib/desktop";
import { useLayoutStore } from "@/stores/layout";
import type { FloatingPanelBounds } from "../interfaces/workspace-layouts.interfaces";

export interface FloatPanelRequest {
  panelId: string;
  componentType: string;
  params: Record<string, unknown>;
  title: string;
  /** Floating window to add the panel to; a new window is opened when omitted. */
  windowId?: string;
}

/** Floats a dock panel into a floating window and records it in the layout store, so its dock hides it. */
export const floatPanel = ({ windowId = crypto.randomUUID(), panelId, componentType, params, title }: FloatPanelRequest) => {
  void getBridge().layout.openFloatingPanel({ panelId, componentType, params, title, windowId });
  useLayoutStore.getState().addFloating({ panelId, componentType, params, title, windowId, bounds: { x: 0, y: 0, width: 640, height: 480 } });
};

export interface FloatingWindowSummary {
  windowId: string;
  label: string;
}

/** One entry per floating window, labelled from its first panel (plus a count when it hosts more). */
export const listFloatingWindows = (floating: FloatingPanelBounds[]): FloatingWindowSummary[] => {
  const panelsByWindow = new Map<string, FloatingPanelBounds[]>();
  for (const entry of floating) {
    if (!entry.windowId) continue;
    panelsByWindow.set(entry.windowId, [...(panelsByWindow.get(entry.windowId) ?? []), entry]);
  }
  return [...panelsByWindow.entries()].map(([windowId, panels], index) => {
    const [first] = panels;
    const more = panels.length - 1;
    const name = first.title ?? "Floating panel";
    return { windowId, label: `Window ${index + 1}: ${name}${more > 0 ? ` +${more}` : ""}` };
  });
};
