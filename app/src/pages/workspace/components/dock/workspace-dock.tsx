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
import { useLayoutPersistence } from "@/features/workspace-layouts/hooks/use-layout-persistence";

export const MAIN_CONTENT_PANEL_ID = "main-content";
export const AI_PANEL_ID = "ai-panel";
const AI_PANEL_MIN_WIDTH = 320;
const AI_PANEL_DEFAULT_WIDTH = 420;

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

  const addAiPanel = useCallback((api: DockviewApi) => {
    api.addPanel({
      id: AI_PANEL_ID,
      component: AI_PANEL_ID,
      position: { referencePanel: MAIN_CONTENT_PANEL_ID, direction: "right" },
      initialWidth: AI_PANEL_DEFAULT_WIDTH,
      minimumWidth: AI_PANEL_MIN_WIDTH,
    });
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      event.api.addPanel({ id: MAIN_CONTENT_PANEL_ID, component: MAIN_CONTENT_PANEL_ID });
      if (aiPanelOpenRef.current) addAiPanel(event.api);
      setApi(event.api);
    },
    [addAiPanel, setApi],
  );

  // Keep the AI panel's dock presence in sync with the existing `ai_panel_open` toggle/permission gate.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existing = api.getPanel(AI_PANEL_ID);
    if (aiPanelOpen && !existing) addAiPanel(api);
    else if (!aiPanelOpen && existing) existing.api.close();
  }, [aiPanelOpen, addAiPanel]);

  return <DockviewReact className="dockview-theme-abyss min-w-0 flex-1" components={components} onReady={onReady} />;
};
