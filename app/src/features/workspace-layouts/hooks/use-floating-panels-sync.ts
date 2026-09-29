import { useEffect } from "react";
import { getBridge, isDesktop } from "@/lib/desktop";
import { useLayoutStore } from "@/stores/layout";

/**
 * Removes a panel from the "currently floating" set once its OS window is closed, so the
 * corresponding dock (session-terminal-stage, shell terminal tab, project tab dock) re-adds it —
 * this is what makes closing the floating window equivalent to "dock back". Mount once, desktop only.
 */
export const useFloatingPanelsSync = () => {
  const removeFloating = useLayoutStore((s) => s.removeFloating);

  useEffect(() => {
    if (!isDesktop()) return;
    return getBridge().layout.onFloatingPanelClosed((e) => removeFloating(e.panelId));
  }, [removeFloating]);
};
