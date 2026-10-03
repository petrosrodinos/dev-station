import { useEffect, useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import type { FloatingWindowPanel } from "@shared/contract";
import { getBridge, isDesktop } from "@/lib/desktop";
import { FloatingWindowDock } from "./components/floating-window-dock";

/**
 * Bare window dock panels float into (docking system §C) — no top bar/rail/status bar, just the panels
 * hosted here plus a minimal title bar. Loaded by `electron/managers/floating-panel-manager.ts` into a real
 * OS `BrowserWindow` at this renderer bundle's `/floating?windowId=...` route, so it reuses every existing
 * provider. See `use-floating-panels-sync.ts` for how closing a panel docks it back.
 */
const FloatingWindowPage: FC = () => {
  const [search] = useSearchParams();
  const windowId = search.get("windowId") ?? "";
  const [panels, setPanels] = useState<FloatingWindowPanel[]>([]);

  useEffect(() => {
    document.title = "Dev Station";
  }, []);

  useEffect(() => {
    if (!isDesktop() || !windowId) return;
    const layout = getBridge().layout;
    const unsubscribe = layout.onFloatingWindowChanged((snapshot) => {
      if (snapshot.windowId === windowId) setPanels(snapshot.panels);
    });
    void layout.getFloatingWindow(windowId).then((snapshot) => setPanels(snapshot.panels));
    return unsubscribe;
  }, [windowId]);

  return (
    <div className="flex h-screen flex-col bg-canvas text-foreground">
      <div className="app-drag flex h-8 shrink-0 items-center justify-between border-b px-3 text-[0.7188rem] text-muted-foreground">
        <span className="truncate">Dev Station</span>
        <button className="app-no-drag rounded-xs p-0.5 hover:bg-surface-elevated hover:text-foreground" onClick={() => window.close()} aria-label="Close window and dock its panels back">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <FloatingWindowDock panels={panels} />
      </div>
    </div>
  );
};

export default FloatingWindowPage;
