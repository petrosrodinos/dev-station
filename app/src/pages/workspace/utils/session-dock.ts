import { create } from "zustand";
import type { DockviewApi, DockviewGroupPanel } from "dockview-react";

export const sessionPanelId = (sessionId: string) => `session:${sessionId}`;

export type SessionSplitDirection = "right" | "bottom";
type DropPosition = "top" | "bottom" | "left" | "right" | "center";

/** The AI panel's terminal dock, registered by `SessionTerminalStage` so tab menus and tab drags can reach it. */
let current: DockviewApi | null = null;

export const registerSessionDock = (api: DockviewApi | null) => {
  current = api;
};

/**
 * Splits a session out of its tab group into a new pane beside it. A session that is alone in its group
 * has nothing to split from, so it is moved next to another group instead.
 * Returns false when there was nothing to do.
 */
export const splitSession = (sessionId: string, direction: SessionSplitDirection): boolean => {
  const api = current;
  const panel = api?.getPanel(sessionPanelId(sessionId));
  if (!api || !panel || api.panels.length < 2) return false;
  try {
    if (panel.group.panels.length > 1) {
      panel.api.moveTo({ group: panel.group, position: direction });
      return true;
    }
    const target = api.groups.find((g) => g.id !== panel.group.id);
    if (!target) return false;
    panel.api.moveTo({ group: target, position: direction });
    return true;
  } catch (error) {
    console.error("Failed to split the session terminal", error);
    return false;
  }
};

/** Viewport-space rectangle of the area a dragged tab would land in. */
export interface DropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DropTarget {
  group: DockviewGroupPanel;
  position: DropPosition;
  rect: DropRect;
}

/** Share of a pane, measured from each edge, where a dropped tab splits instead of joining the pane. */
const EDGE_ZONE = 0.3;

/** Where dropping `sessionId` at viewport point (x, y) would put it, or null when that point isn't a valid drop. */
const dropTargetAt = (sessionId: string, x: number, y: number): DropTarget | null => {
  const api = current;
  const panel = api?.getPanel(sessionPanelId(sessionId));
  if (!api || !panel) return null;
  const group = api.groups.find((g) => {
    if (!g.panels.length) return false;
    const r = g.element.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });
  if (!group) return null;
  const r = group.element.getBoundingClientRect();
  const fx = (x - r.left) / r.width;
  const fy = (y - r.top) / r.height;
  const edges: Array<[DropPosition, number]> = [
    ["left", fx],
    ["right", 1 - fx],
    ["top", fy],
    ["bottom", 1 - fy],
  ];
  const [edge, distance] = edges.reduce((best, e) => (e[1] < best[1] ? e : best));
  const sameGroup = group.id === panel.group.id;
  let position: DropPosition = edge;
  if (distance > EDGE_ZONE) {
    if (sameGroup) return null;
    position = "center";
  } else if (sameGroup && group.panels.length < 2) {
    return null; // splitting a pane away from itself when it holds only this session
  }
  const half = { width: r.width / 2, height: r.height / 2 };
  const rect: DropRect =
    position === "left"
      ? { left: r.left, top: r.top, width: half.width, height: r.height }
      : position === "right"
        ? { left: r.left + half.width, top: r.top, width: half.width, height: r.height }
        : position === "top"
          ? { left: r.left, top: r.top, width: r.width, height: half.height }
          : position === "bottom"
            ? { left: r.left, top: r.top + half.height, width: r.width, height: half.height }
            : { left: r.left, top: r.top, width: r.width, height: r.height };
  return { group, position, rect };
};

interface DropHintState {
  rect: DropRect | null;
  setRect: (rect: DropRect | null) => void;
}

/** Highlight shown over the terminal area while a session tab is dragged onto it. */
export const useSessionDropHint = create<DropHintState>((set) => ({
  rect: null,
  setRect: (rect) => set({ rect }),
}));

/** Updates the drop highlight for a tab being dragged at (x, y). */
export const hintSessionDrop = (sessionId: string, x: number, y: number) => {
  const rect = dropTargetAt(sessionId, x, y)?.rect ?? null;
  const prev = useSessionDropHint.getState().rect;
  if (!rect && !prev) return;
  if (rect && prev && rect.left === prev.left && rect.top === prev.top && rect.width === prev.width && rect.height === prev.height) return;
  useSessionDropHint.getState().setRect(rect);
};

export const clearSessionDropHint = () => useSessionDropHint.getState().setRect(null);

/** Drops a dragged tab at (x, y): splits it into a new pane or joins the pane under the pointer. Returns true when it moved. */
export const dropSession = (sessionId: string, x: number, y: number): boolean => {
  clearSessionDropHint();
  const target = dropTargetAt(sessionId, x, y);
  const panel = current?.getPanel(sessionPanelId(sessionId));
  if (!target || !panel) return false;
  try {
    panel.api.moveTo({ group: target.group, position: target.position });
    return true;
  } catch (error) {
    console.error("Failed to drop the session terminal", error);
    return false;
  }
};
