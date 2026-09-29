import type { DockviewApi } from "dockview-react";
import { AI_PANEL_DEFAULT_WIDTH, AI_PANEL_ID, MAIN_CONTENT_PANEL_ID } from "./workspace-dock";

const AI_PANEL_DEFAULT_HEIGHT = 360;

export const AiPanelDockSides = {
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  BOTTOM: "bottom",
} as const;
export type AiPanelDockSide = (typeof AiPanelDockSides)[keyof typeof AiPanelDockSides];

/**
 * The dock's tab strip is hidden (see `.workspace-dock` in index.css), so drag-to-dock is gone; this
 * is how the AI panel changes sides instead — it re-splits next to the main content panel.
 */
export const moveAiPanel = (api: DockviewApi, side: AiPanelDockSide) => {
  const ai = api.getPanel(AI_PANEL_ID);
  const main = api.getPanel(MAIN_CONTENT_PANEL_ID);
  if (!ai || !main) return;
  try {
    ai.api.moveTo({ group: main.group, position: side });
    ai.api.setSize(side === "left" || side === "right" ? { width: AI_PANEL_DEFAULT_WIDTH } : { height: AI_PANEL_DEFAULT_HEIGHT });
  } catch (error) {
    console.error("Failed to move the AI panel", error);
  }
};
