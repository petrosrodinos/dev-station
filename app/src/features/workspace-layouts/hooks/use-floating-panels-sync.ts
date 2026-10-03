import { useEffect } from "react";
import { getBridge, isDesktop } from "@/lib/desktop";
import { useLayoutStore } from "@/stores/layout";
import { useWorkspaceStore } from "@/stores/workspace";
import { parseProjectTabFloatingPanelId } from "../utils/project-tab-floating.utils";

/**
 * Removes a panel from the "currently floating" set once its OS window is closed, so the
 * corresponding dock (session-terminal-stage, shell terminal tab, project tab dock) re-adds it —
 * this is what makes closing the floating window equivalent to "dock back". A floated project tab
 * was taken out of its project's open tabs when it floated, so closing its window re-opens it there.
 * Mount once, desktop only.
 */
export const useFloatingPanelsSync = () => {
  const removeFloating = useLayoutStore((s) => s.removeFloating);
  const openProjectTab = useWorkspaceStore((s) => s.openProjectTab);

  useEffect(() => {
    if (!isDesktop()) return;
    return getBridge().layout.onFloatingPanelClosed((e) => {
      removeFloating(e.panelId);
      const projectTab = parseProjectTabFloatingPanelId(e.panelId);
      if (projectTab) openProjectTab(projectTab.projectId, projectTab.tab);
    });
  }, [removeFloating, openProjectTab]);
};
