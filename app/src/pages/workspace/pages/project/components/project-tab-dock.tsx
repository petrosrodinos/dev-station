import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { RequirePermission } from "@/components/access/require-permission";
import { ProjectTabOptions, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { TAB_ICONS, TAB_PAGES, tabPermission } from "../pages/tab-pages";

const TAB_PANEL_COMPONENT = "project-tab";
const tabPanelId = (tab: string) => `project-tab:${tab}`;
const TAB_LABEL = new Map(ProjectTabOptions.map((t) => [t.id, t.label]));

/**
 * Custom tab renderer so the dock's own tab strip looks and behaves like the rest of the app
 * (icon + label, active underline) instead of dockview's generic default tab — this replaces the
 * previous separate "Project sections" nav entirely rather than duplicating it (see
 * `project/layout.tsx`; there is now exactly one tab bar for a project, and it's the real,
 * reorderable/splittable dock tab strip).
 */
const ProjectTabHeader: FC<IDockviewPanelHeaderProps<{ tab: ProjectTab }>> = ({ api, params }) => {
  const [active, setActive] = useState(api.isActive);
  useEffect(() => {
    const disposable = api.onDidActiveChange(() => setActive(api.isActive));
    return () => disposable.dispose();
  }, [api]);

  const Icon = TAB_ICONS[params.tab];
  const label = TAB_LABEL.get(params.tab) ?? params.tab;

  return (
    <div
      className={cn(
        "group flex h-10 shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground",
        active && "border-foreground text-foreground",
      )}
      title={label}
    >
      <Icon className="size-3.5 shrink-0" />
      <span>{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          api.close();
        }}
        aria-label={`Close ${label}`}
        className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
};

/**
 * Project tab pages as dockable views (docking system spec §G Phase 2): every open tab (Overview,
 * Git, Files, Terminal, Sessions, Skills, Integrations) is its own dock panel instead of a single
 * routed page, so e.g. Files and Terminal can be split side by side. The URL still tracks
 * `routeTab` for deep-linking/back-forward, kept in sync in both directions: navigating updates
 * which panel is focused, and focusing a panel (by clicking its tab or after a drag) updates the URL.
 */
export const ProjectTabDock: FC<{ projectId: string; routeTab: ProjectTab }> = ({ projectId, routeTab }) => {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const routeTabRef = useRef(routeTab);
  routeTabRef.current = routeTab;
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
      if (tab === routeTabRef.current) navigateRef.current(Routes.workspace.project(projectId));
    });
    // Clicking a tab (or a drag landing it active) navigates the URL to match, so deep-linking,
    // refresh, and the drawer/preview logic (which read `routeTab`) all stay correct.
    event.api.onDidActivePanelChange(({ panel }) => {
      if (!panel?.id.startsWith("project-tab:")) return;
      const tab = panel.id.slice("project-tab:".length) as ProjectTab;
      if (tab !== routeTabRef.current) navigateRef.current(Routes.workspace.project_tab(projectId, tab));
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

  return <DockviewReact className="dockview-theme-abyss h-full" components={components} defaultTabComponent={ProjectTabHeader} onReady={onReady} />;
};
