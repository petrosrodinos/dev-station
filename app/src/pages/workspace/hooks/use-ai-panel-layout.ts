import { useLayoutStore } from "@/stores/layout";
import { useWorkspaceStore } from "@/stores/workspace";

export const AiPanelLayouts = {
  CLOSED: "closed",
  DEFAULT: "default",
  FULL_WIDTH: "full_width",
} as const;

export type AiPanelLayout = (typeof AiPanelLayouts)[keyof typeof AiPanelLayouts];

/** Closed, beside the workspace, or filling the dock: derived from the two stores that hold those facts. */
const toLayout = (open: boolean, fullWidth: boolean): AiPanelLayout =>
  !open ? AiPanelLayouts.CLOSED : fullWidth ? AiPanelLayouts.FULL_WIDTH : AiPanelLayouts.DEFAULT;

export const getAiPanelLayout = (): AiPanelLayout => toLayout(useWorkspaceStore.getState().ai_panel_open, useLayoutStore.getState().ai_full_width);

/** Closing also drops full width, so reopening starts from the default split. */
export const setAiPanelLayout = (layout: AiPanelLayout) => {
  useWorkspaceStore.getState().setAiPanelOpen(layout !== AiPanelLayouts.CLOSED);
  useLayoutStore.getState().setAiFullWidth(layout === AiPanelLayouts.FULL_WIDTH);
};

const NEXT_LAYOUT: Record<AiPanelLayout, AiPanelLayout> = {
  [AiPanelLayouts.CLOSED]: AiPanelLayouts.DEFAULT,
  [AiPanelLayouts.DEFAULT]: AiPanelLayouts.FULL_WIDTH,
  [AiPanelLayouts.FULL_WIDTH]: AiPanelLayouts.CLOSED,
};

export const cycleAiPanelLayout = () => setAiPanelLayout(NEXT_LAYOUT[getAiPanelLayout()]);

export const useAiPanelLayout = (): AiPanelLayout => {
  const open = useWorkspaceStore((s) => s.ai_panel_open);
  const fullWidth = useLayoutStore((s) => s.ai_full_width);
  return toLayout(open, fullWidth);
};
