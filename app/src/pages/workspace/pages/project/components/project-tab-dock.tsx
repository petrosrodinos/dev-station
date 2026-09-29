import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewHeaderActionsProps,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { RequirePermission } from "@/components/access/require-permission";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectTabOptions, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { filterByAccess } from "@/lib/access.utils";
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
  const { can } = usePermissions();
  const permittedTabs = filterByAccess(ProjectTabOptions, can).map((t) => t.id);
  const storedOpenTabs = useWorkspaceStore((s) => s.open_project_tabs[projectId]);
  const openProjectTab = useWorkspaceStore((s) => s.openProjectTab);
  const closeProjectTab = useWorkspaceStore((s) => s.closeProjectTab);

  // Every permitted tab starts open (matches the old always-visible nav); once the user closes one
  // the store remembers an explicit list instead. Either way, stay within what's actually permitted.
  const openTabs = (storedOpenTabs ?? permittedTabs).filter((t) => permittedTabs.includes(t as ProjectTab));
  // The route's current tab is always considered "open" — this is what makes today's exact
  // single-tab navigation still work unless the user explicitly splits another tab alongside it.
  const wantedTabs = openTabs.includes(routeTab) ? openTabs : [...openTabs, routeTab];
  const closedTabs = permittedTabs.filter((t) => !wantedTabs.includes(t));

  const AddTabMenu = useCallback<FC<IDockviewHeaderActionsProps>>(() => {
    if (!closedTabs.length) return null;
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 w-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Open a section">
                <Plus className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Open a section</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {closedTabs.map((tab) => {
            const Icon = TAB_ICONS[tab as ProjectTab];
            return (
              <DropdownMenuItem key={tab} onSelect={() => navigate(Routes.workspace.project_tab(projectId, tab as ProjectTab))} className="gap-2">
                <Icon className="size-3.5" />
                {TAB_LABEL.get(tab as ProjectTab) ?? tab}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedTabs.join("|"), projectId]);

  // Each split pane gets a fixed pixel height from dockview's layout engine, not a page-flowing one,
  // so a page taller than its pane (e.g. Overview, Files) would just clip with no way to reach the
  // rest — every panel needs its own scroll container rather than relying on one shared ancestor.
  const TabPanel = useCallback<FC<IDockviewPanelProps<{ tab: ProjectTab }>>>(({ params }) => {
    const Page = TAB_PAGES[params.tab];
    if (!Page) return null;
    const permission = tabPermission(params.tab);
    const content = permission ? (
      <RequirePermission permission={permission} redirectTo={Routes.workspace.project(projectId)}>
        <Page />
      </RequirePermission>
    ) : (
      <Page />
    );
    return (
      <div className="@container h-full min-h-0 overflow-y-auto">
        {content}
      </div>
    );
  }, [projectId]);

  // dockview-react calls `updateOptions()` (a *forced full relayout*, unconditionally, regardless of
  // which option actually changed) whenever this prop gets a new identity — a fresh object literal
  // here on every render was re-triggering that relayout on every render (this component subscribes
  // to git status, permissions, etc., so it re-renders often), visible as the whole dock — tab strip
  // and every split pane — constantly jittering. Memoizing keeps the identity stable across renders
  // unless the panel component itself changes.
  const components: IDockviewReactProps["components"] = useMemo(() => ({ [TAB_PANEL_COMPONENT]: TabPanel }), [TabPanel]);

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
    let anchor = api.panels.find((p) => wantedIds.has(p.id));
    // Every permitted tab opens at once on first visit (see `openTabs` above). Without `inactive`,
    // each `addPanel` call activates its own panel and fires `onDidActivePanelChange`, which the
    // handler below turns into a `navigate()` — bulk-adding 7 tabs fired a cascade of spurious
    // navigations, visible as the whole tab strip/content flickering ("shaking") on every project
    // visit. `inactive` is only honored once a group already has a panel, so process the tab
    // matching the current URL first — it naturally becomes the group's initial active panel, and
    // every other tab added afterward is correctly inactive from the start.
    const orderedTabs = [routeTab, ...wantedTabs.filter((t) => t !== routeTab)];
    for (const tab of orderedTabs) {
      const id = tabPanelId(tab);
      if (existingIds.has(id) || !wantedIds.has(id)) continue;
      const panel = api.addPanel({
        id,
        component: TAB_PANEL_COMPONENT,
        title: TAB_LABEL.get(tab as ProjectTab) ?? tab,
        params: { tab: tab as ProjectTab },
        position: anchor ? { referencePanel: anchor.id, direction: "within" } : undefined,
        inactive: tab !== routeTabRef.current,
      });
      anchor ??= panel;
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

  return (
    <DockviewReact
      className="dockview-theme-abyss project-tab-dock h-full"
      components={components}
      defaultTabComponent={ProjectTabHeader}
      rightHeaderActionsComponent={AddTabMenu}
      onReady={onReady}
    />
  );
};
