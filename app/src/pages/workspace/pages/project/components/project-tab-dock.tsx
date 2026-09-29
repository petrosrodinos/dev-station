import { useCallback, useEffect, useRef, type FC } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { RequirePermission } from "@/components/access/require-permission";
import { ProjectTabOptions, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { TAB_PAGES, tabPermission } from "../pages/tab-pages";

const TAB_PANEL_COMPONENT = "project-tab";
const tabPanelId = (tab: string) => `project-tab:${tab}`;
const TAB_LABEL = new Map(ProjectTabOptions.map((t) => [t.id, t.label]));

/**
 * Project tab pages as dockable views (docking system spec §G Phase 2): every open tab (Overview,
 * Git, Files, Terminal, Sessions, Skills, Integrations) is its own dock panel instead of a single
 * routed page, so e.g. Files and Terminal can be split side by side. The URL still tracks
 * `routeTab` for deep-linking/back-forward; visiting a tab via the nav ensures/focuses its panel
 * without closing whatever else is open.
 */
export const ProjectTabDock: FC<{ projectId: string; routeTab: ProjectTab }> = ({ projectId, routeTab }) => {
  const navigate = useNavigate();
  const apiRef = useRef<DockviewApi | null>(null);
  const openTabs = useWorkspaceStore((s) => s.open_project_tabs[projectId]) ?? [];
  const openProjectTab = useWorkspaceStore((s) => s.openProjectTab);
  const closeProjectTab = useWorkspaceStore((s) => s.closeProjectTab);

  // The route's current tab is always considered "open" — this is what makes today's exact
  // single-tab navigation still work unless the user explicitly splits another tab alongside it.
  const wantedTabs = openTabs.includes(routeTab) ? openTabs : [...openTabs, routeTab];

  const TabPanel = useCallback<FC<IDockviewPanelProps<{ tab: ProjectTab }>>>(({ params }) => {
    const Page = TAB_PAGES[params.tab];
    if (!Page) return null;
    const permission = tabPermission(params.tab);
    if (!permission) return <Page />;
    return (
      <RequirePermission permission={permission} redirectTo={Routes.workspace.project(projectId)}>
        <Page />
      </RequirePermission>
    );
     
  }, [projectId]);

  const components: IDockviewReactProps["components"] = { [TAB_PANEL_COMPONENT]: TabPanel };

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    event.api.onDidRemovePanel((panel) => {
      if (!panel.id.startsWith("project-tab:")) return;
      const tab = panel.id.slice("project-tab:".length);
      closeProjectTab(projectId, tab);
      // Closing the tab that matches the current URL: fall back to Overview rather than leaving a dangling route.
      if (tab === routeTab) navigate(Routes.workspace.project(projectId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existingIds = new Set(api.panels.map((p) => p.id));
    const wantedIds = new Set(wantedTabs.map(tabPanelId));

    for (const panel of api.panels) {
      if (!wantedIds.has(panel.id)) panel.api.close();
    }
    const anchor = api.panels.find((p) => wantedIds.has(p.id));
    for (const tab of wantedTabs) {
      const id = tabPanelId(tab);
      if (existingIds.has(id)) continue;
      api.addPanel({
        id,
        component: TAB_PANEL_COMPONENT,
        title: TAB_LABEL.get(tab as ProjectTab) ?? tab,
        params: { tab: tab as ProjectTab },
        position: anchor ? { referencePanel: anchor.id, direction: "within" } : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedTabs.join("|")]);

  // Navigating to a different tab (nav click) focuses that tab's panel, opening it if needed.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    openProjectTab(projectId, routeTab);
    api.getPanel(tabPanelId(routeTab))?.api.setActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, routeTab]);

  if (!TAB_PAGES[routeTab]) return <Navigate to={Routes.workspace.project(projectId)} replace />;

  return <DockviewReact className="dockview-theme-abyss h-full" components={components} onReady={onReady} />;
};
