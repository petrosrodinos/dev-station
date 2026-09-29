import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Globe, Plus, X } from "lucide-react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewHeaderActionsProps,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IDockviewReactProps,
  type SerializedDockview,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { RequirePermission } from "@/components/access/require-permission";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectTabOptions, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { filterByAccess } from "@/lib/access.utils";
import { isDesktop } from "@/lib/desktop";
import { DEFAULT_PREVIEW_PREFS, useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { TAB_ICONS, TAB_PAGES, tabPermission } from "../pages/tab-pages";
import { useProjectContext } from "../hooks/use-project-context";
import { PreviewPanel } from "./preview-panel";

const TAB_PANEL_COMPONENT = "project-tab";
const tabPanelId = (tab: string) => `project-tab:${tab}`;
const PREVIEW_PANEL_COMPONENT = "project-preview";
const PREVIEW_PANEL_ID = "project-preview";
const PREVIEW_DEFAULT_WIDTH = 480;
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

/** Tab for the preview panel: not a route section, so it has no URL tab, just a title and close. */
const PreviewTabHeader: FC<IDockviewPanelHeaderProps> = ({ api }) => {
  const [active, setActive] = useState(api.isActive);
  useEffect(() => {
    const disposable = api.onDidActiveChange(() => setActive(api.isActive));
    return () => disposable.dispose();
  }, [api]);
  return (
    <div
      className={cn(
        "group flex h-10 shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground",
        active && "border-foreground text-foreground",
      )}
      title="Preview"
    >
      <Globe className="size-3.5 shrink-0" />
      <span>Preview</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          api.close();
        }}
        aria-label="Close Preview"
        className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
};

const PreviewDockPanel: FC = () => {
  const project = useProjectContext();
  const expanded = useWorkspaceStore((s) => s.preview_by_project[project.id]?.previewExpanded) ?? false;
  return <PreviewPanel project={project} expanded={expanded} />;
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
  // Read once — captured by `onReady`'s first (and only) call below, not meant to re-apply mid-session.
  const savedLayout = useWorkspaceStore((s) => s.project_dock_layout[projectId]);
  const saveProjectDockLayout = useWorkspaceStore((s) => s.saveProjectDockLayout);
  const previewOpen = useWorkspaceStore((s) => s.preview_by_project[projectId]?.previewOpen) ?? DEFAULT_PREVIEW_PREFS.previewOpen;
  const previewExpanded = useWorkspaceStore((s) => s.preview_by_project[projectId]?.previewExpanded) ?? DEFAULT_PREVIEW_PREFS.previewExpanded;
  const previewWidth = useWorkspaceStore((s) => s.preview_by_project[projectId]?.previewWidth) ?? DEFAULT_PREVIEW_PREFS.previewWidth;
  const setProjectPreview = useWorkspaceStore((s) => s.setProjectPreview);
  const previewAvailable = isDesktop();
  // Suppresses the URL-sync/close listeners below while we're programmatically rebuilding the tree
  // from a saved layout — otherwise restoring fires the same events a user action would (a batch of
  // `onDidActivePanelChange`s mid-restore would spuriously `navigate()` away from the deep-linked tab).
  const restoringRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Every permitted tab starts open (matches the old always-visible nav); once the user closes one
  // the store remembers an explicit list instead. Either way, stay within what's actually permitted.
  const openTabs = (storedOpenTabs ?? permittedTabs).filter((t) => permittedTabs.includes(t as ProjectTab));
  // The route's current tab is always considered "open" — this is what makes today's exact
  // single-tab navigation still work unless the user explicitly splits another tab alongside it.
  const wantedTabs = openTabs.includes(routeTab) ? openTabs : [...openTabs, routeTab];
  const closedTabs = permittedTabs.filter((t) => !wantedTabs.includes(t));

  const AddTabMenu = useCallback<FC<IDockviewHeaderActionsProps>>(() => {
    const previewClosed = previewAvailable && !previewOpen;
    if (!closedTabs.length && !previewClosed) return null;
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button className="flex h-10 w-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Open a section">
                    <Plus className="size-3.5" />
                  </button>
                }
              />
            }
          />
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
          {previewClosed && (
            <DropdownMenuItem onSelect={() => setProjectPreview(projectId, { previewOpen: true })} className="gap-2">
              <Globe className="size-3.5" />
              Preview
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedTabs.join("|"), projectId, previewOpen, previewAvailable]);

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
  const components: IDockviewReactProps["components"] = useMemo(() => ({ [TAB_PANEL_COMPONENT]: TabPanel, [PREVIEW_PANEL_COMPONENT]: PreviewDockPanel }), [TabPanel]);
  const tabComponents: IDockviewReactProps["tabComponents"] = useMemo(() => ({ [PREVIEW_PANEL_COMPONENT]: PreviewTabHeader }), []);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    event.api.onDidRemovePanel((panel) => {
      if (restoringRef.current) return;
      if (panel.id === PREVIEW_PANEL_ID) {
        setProjectPreview(projectId, { previewOpen: false, previewExpanded: false });
        return;
      }
      if (!panel.id.startsWith("project-tab:")) return;
      const tab = panel.id.slice("project-tab:".length);
      closeProjectTab(projectId, tab);
      // Closing the tab that matches the current URL: fall back to Overview rather than leaving a dangling route.
      if (tab === routeTabRef.current) navigateRef.current(Routes.workspace.project(projectId));
    });
    // Clicking a tab (or a drag landing it active) navigates the URL to match, so deep-linking,
    // refresh, and the drawer/preview logic (which read `routeTab`) all stay correct.
    event.api.onDidActivePanelChange(({ panel }) => {
      if (restoringRef.current) return;
      if (!panel?.id.startsWith("project-tab:")) return;
      const tab = panel.id.slice("project-tab:".length) as ProjectTab;
      if (tab !== routeTabRef.current) navigateRef.current(Routes.workspace.project_tab(projectId, tab));
    });
    // Debounce-save the dock arrangement (splits/groups/sizes) itself — the store's `open_project_tabs`
    // already remembers *which* tabs are open, but not how they were split/arranged, which is what
    // actually gets lost when rearranging panels without this.
    event.api.onDidLayoutChange(() => {
      if (restoringRef.current) return;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          saveProjectDockLayout(projectId, event.api.toJSON() as unknown as Record<string, unknown>);
        } catch (error) {
          console.error("Failed to save the project dock layout", error);
        }
      }, 500);
    });
    // Restore the saved arrangement once, before the tab-reconciliation effect below seeds any
    // panels itself — a corrupt/stale save is swallowed (falls through to the normal seeding path)
    // rather than breaking the dock.
    if (savedLayout && Object.keys(savedLayout).length) {
      restoringRef.current = true;
      try {
        event.api.fromJSON(savedLayout as unknown as SerializedDockview);
      } catch (error) {
        console.error("Couldn't restore the saved project dock layout — seeding it fresh instead", error);
      } finally {
        restoringRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existingIds = new Set(api.panels.map((p) => p.id));
    const wantedIds = new Set(wantedTabs.map(tabPanelId));

    for (const panel of api.panels) {
      if (panel.id !== PREVIEW_PANEL_ID && !wantedIds.has(panel.id)) panel.api.close();
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

  // The preview is a panel of this dock (so it can be dragged/split like any tab), mirroring the
  // existing `previewOpen` flag that the header button, shortcut and "Preview" service action set.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existing = api.getPanel(PREVIEW_PANEL_ID);
    if (previewOpen && previewAvailable && !existing) {
      const reference = api.activePanel ?? api.panels[0];
      try {
        api.addPanel({
          id: PREVIEW_PANEL_ID,
          component: PREVIEW_PANEL_COMPONENT,
          tabComponent: PREVIEW_PANEL_COMPONENT,
          title: "Preview",
          position: reference ? { referencePanel: reference.id, direction: "right" } : undefined,
          initialWidth: previewWidth || PREVIEW_DEFAULT_WIDTH,
        });
      } catch (error) {
        console.error("Failed to open the preview panel", error);
      }
    } else if ((!previewOpen || !previewAvailable) && existing) {
      existing.api.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen, previewAvailable]);

  // Review layout: the preview's group fills the project area (the AI panel keeps its own side).
  useEffect(() => {
    const panel = apiRef.current?.getPanel(PREVIEW_PANEL_ID);
    if (!panel) return;
    if (previewExpanded && !panel.api.isMaximized()) panel.api.maximize();
    else if (!previewExpanded && panel.api.isMaximized()) panel.api.exitMaximized();
  }, [previewExpanded, previewOpen]);

  // Navigating to a different tab (nav click) focuses that tab's panel, opening it if needed.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    openProjectTab(projectId, routeTab);
    api.getPanel(tabPanelId(routeTab))?.api.setActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, routeTab]);

  // Flush the last, still-debounced layout change on unmount (e.g. navigating to another project
  // right after a drag) instead of dropping it on the floor.
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      const api = apiRef.current;
      if (!api) return;
      try {
        saveProjectDockLayout(projectId, api.toJSON() as unknown as Record<string, unknown>);
      } catch (error) {
        console.error("Failed to flush the project dock layout on unmount", error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TAB_PAGES[routeTab]) return <Navigate to={Routes.workspace.project(projectId)} replace />;

  return (
    <DockviewReact
      className="dockview-theme-abyss project-tab-dock h-full"
      components={components}
      defaultTabComponent={ProjectTabHeader}
      tabComponents={tabComponents}
      rightHeaderActionsComponent={AddTabMenu}
      disableTabsOverflowList
      onReady={onReady}
    />
  );
};
