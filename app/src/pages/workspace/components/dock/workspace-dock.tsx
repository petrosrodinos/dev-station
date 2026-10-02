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
import { useSessionGroups } from "../../hooks/use-session-groups";
import { useWorkspaceStore } from "@/stores/workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useDockApi } from "../../context/dock-api-context";
import { useLayoutPersistence, useProjectPresetAutoApply } from "@/features/workspace-layouts/hooks/use-layout-persistence";

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

/** Thin adapter: resolves the session groups the existing AiPanel component expects. */
const AiPanelDockPanel: FC<IDockviewPanelProps> = () => {
  const groups = useSessionGroups();
  return <AiPanel groups={groups} />;
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
  useLayoutPersistence(api);
  useProjectPresetAutoApply();

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
      ensureMainContent(event.api);
      hideTabStrips(event.api);
      if (aiPanelOpenRef.current) addAiPanel(event.api);
      // Self-heal: whatever changed the layout (user closing a panel, a restored/corrupted saved
      // preset, a future bug) can never leave the dock without its anchor panel — this is what
      // actually fixes a previously-saved broken layout, not just prevents a new one.
      event.api.onDidLayoutChange(() => {
        ensureMainContent(event.api);
        hideTabStrips(event.api);
        if (aiPanelOpenRef.current && !event.api.getPanel(AI_PANEL_ID)) addAiPanel(event.api);
      });
      setApi(event.api);
    },
    [addAiPanel, ensureMainContent, hideTabStrips, setApi],
  );

  // Keep the AI panel's dock presence in sync with the existing `ai_panel_open` toggle/permission gate.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existing = api.getPanel(AI_PANEL_ID);
    if (aiPanelOpen && !existing) addAiPanel(api);
    else if (!aiPanelOpen && existing) existing.api.close();
  }, [aiPanelOpen, addAiPanel]);

  return (
    <DockviewReact
      className="dockview-theme-abyss min-w-0 flex-1"
      components={components}
      onReady={onReady}
    />
  );
};
