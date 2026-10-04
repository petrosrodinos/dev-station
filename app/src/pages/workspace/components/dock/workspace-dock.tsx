import { useCallback, useEffect, useRef, type FC } from "react";
import { Outlet } from "react-router-dom";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { AiPanel } from "../ai-panel";
import { useOpenSessions } from "../../hooks/use-open-sessions";
import { useWorkspaceStore } from "@/stores/workspace";
import { useLayoutStore } from "@/stores/layout";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useDockApi } from "../../context/dock-api-context";
import { useLayoutPersistence } from "@/features/workspace-layouts/hooks/use-layout-persistence";

export const MAIN_CONTENT_PANEL_ID = "main-content";
export const AI_PANEL_ID = "ai-panel";
const AI_PANEL_MIN_WIDTH = 320;
export const AI_PANEL_DEFAULT_WIDTH = 420;

/** Routed project/workspace content — unchanged from the previous fixed shell. */
const MainContentPanel: FC<IDockviewPanelProps> = () => (
  <main className="flex h-full min-w-0 flex-col">
    <Outlet />
  </main>
);

/** Thin adapter: resolves the open sessions the existing AiPanel component expects. */
const AiPanelDockPanel: FC<IDockviewPanelProps> = () => {
  const sessions = useOpenSessions();
  return <AiPanel sessions={sessions} />;
};

const components: IDockviewReactProps["components"] = {
  [MAIN_CONTENT_PANEL_ID]: MainContentPanel,
  [AI_PANEL_ID]: AiPanelDockPanel,
};

/**
 * Phase 1 dock root (Spec: docking system §G): replaces the fixed `ResizablePanelGroup`
 * two-column split with a dockview instance seeded with the same two panels. Visually and
 * behaviorally equivalent to the previous shell — free drag-to-dock/split, tab groups, named
 * presets, and floating panels land in later phases (see plan `giggly-growing-heron.md`).
 */
export const WorkspaceDock: FC = () => {
  const apiRef = useRef<DockviewApi | null>(null);
  const { api, setApi } = useDockApi();
  const { can } = usePermissions();
  const aiPanelOpen = useWorkspaceStore((s) => s.ai_panel_open) && can(PermissionKeys.AI_USE_AGENTS);
  const aiPanelOpenRef = useRef(aiPanelOpen);
  aiPanelOpenRef.current = aiPanelOpen;
  const aiFullWidth = useLayoutStore((s) => s.ai_full_width);
  const aiFullWidthRef = useRef(aiFullWidth);
  aiFullWidthRef.current = aiFullWidth;
  /** A context with no saved layout (a project never visited, or home) gets the default AI panel width. */
  const resetToDefault = useCallback((dock: DockviewApi) => {
    // Full width has the AI panel fill the dock; a fixed width here would leave the space beside it empty.
    if (aiFullWidthRef.current) return;
    dock.getPanel(AI_PANEL_ID)?.api.setSize({ width: AI_PANEL_DEFAULT_WIDTH });
  }, []);
  useLayoutPersistence(api, resetToDefault);

  /**
   * Full width hides the main content group instead of closing it, so the routed page and its
   * terminals stay mounted. Runs on every layout change, so presets, project switches and reloads
   * can't leave the main group visible while full width is on.
   */
  const syncMainContentVisibility = useCallback((api: DockviewApi) => {
    const main = api.getPanel(MAIN_CONTENT_PANEL_ID);
    if (!main) return;
    const visible = !(aiFullWidthRef.current && aiPanelOpenRef.current && api.getPanel(AI_PANEL_ID));
    if (main.group.api.isVisible !== visible) main.group.api.setVisible(visible);
  }, []);

  /**
   * Removes any leftover group with zero panels (e.g. a manually-edited saved preset with a group a
   * panel was once dragged out of and never cleaned up) — otherwise it just sits there as dead,
   * unremovable empty space next to the real panels. Leaves at least one group alone so the dock is
   * never left with nothing to anchor to.
   */
  const pruneEmptyGroups = useCallback((api: DockviewApi) => {
    if (api.groups.length <= 1) return;
    for (const group of api.groups) {
      if (group.panels.length === 0) {
        try {
          api.removeGroup(group);
        } catch (error) {
          console.error("Failed to remove an empty dock group", error);
        }
      }
    }
  }, []);

  /** Re-adds the routed-content panel if it's ever missing (user closed it, or a saved/corrupted layout lacked it). */
  const ensureMainContent = useCallback((api: DockviewApi) => {
    if (api.getPanel(MAIN_CONTENT_PANEL_ID)) return;
    try {
      api.addPanel({ id: MAIN_CONTENT_PANEL_ID, component: MAIN_CONTENT_PANEL_ID });
    } catch (error) {
      console.error("Failed to restore the main content panel", error);
    }
  }, []);

  const addAiPanel = useCallback(
    (api: DockviewApi) => {
      if (api.getPanel(AI_PANEL_ID)) return;
      ensureMainContent(api); // the reference panel below must exist first
      try {
        api.addPanel({
          id: AI_PANEL_ID,
          component: AI_PANEL_ID,
          position: api.getPanel(MAIN_CONTENT_PANEL_ID) ? { referencePanel: MAIN_CONTENT_PANEL_ID, direction: "right" } : undefined,
          initialWidth: AI_PANEL_DEFAULT_WIDTH,
          minimumWidth: AI_PANEL_MIN_WIDTH,
        });
      } catch (error) {
        console.error("Failed to open the AI panel", error);
      }
    },
    [ensureMainContent],
  );

  /**
   * The tab strip ("Workspace" / "AI panel") spent a full row on labels for two panels that are never
   * closed or re-ordered by hand. Panels move via the Layout menu instead, and the AI panel carries its
   * own header (history toggle + review pill).
   */
  const hideTabStrips = useCallback((api: DockviewApi) => {
    for (const group of api.groups) if (!group.header.hidden) group.header.hidden = true;
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      pruneEmptyGroups(event.api);
      ensureMainContent(event.api);
      hideTabStrips(event.api);
      if (aiPanelOpenRef.current) addAiPanel(event.api);
      // Self-heal: whatever changed the layout (user closing a panel, a restored/corrupted saved
      // preset, a future bug) can never leave the dock without its anchor panel — this is what
      // actually fixes a previously-saved broken layout, not just prevents a new one.
      event.api.onDidLayoutChange(() => {
        pruneEmptyGroups(event.api);
        ensureMainContent(event.api);
        hideTabStrips(event.api);
        if (aiPanelOpenRef.current && !event.api.getPanel(AI_PANEL_ID)) addAiPanel(event.api);
        syncMainContentVisibility(event.api);
      });
      syncMainContentVisibility(event.api);
      setApi(event.api);
    },
    [addAiPanel, ensureMainContent, hideTabStrips, pruneEmptyGroups, setApi, syncMainContentVisibility],
  );

  // Keep the AI panel's dock presence in sync with the existing `ai_panel_open` toggle/permission gate.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existing = api.getPanel(AI_PANEL_ID);
    if (aiPanelOpen && !existing) addAiPanel(api);
    else if (!aiPanelOpen && existing) existing.api.close();
  }, [aiPanelOpen, addAiPanel]);

  useEffect(() => {
    const api = apiRef.current;
    if (api) syncMainContentVisibility(api);
  }, [aiFullWidth, aiPanelOpen, syncMainContentVisibility]);

  return (
    <DockviewReact
      className="dockview-theme-abyss min-w-0 flex-1"
      components={components}
      onReady={onReady}
    />
  );
};
