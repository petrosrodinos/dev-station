import { useEffect, useRef, useState, type FC } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Minimize2, PanelRight } from "lucide-react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { ProjectTabOptions, ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { DEFAULT_PREVIEW_PREFS, useWorkspaceStore } from "@/stores/workspace";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { PreviewPanel } from "./components/preview-panel";
import { ProjectTabDock } from "./components/project-tab-dock";
import { ProjectContext } from "./hooks/use-project-context";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { ProjectLocalStates } from "@shared/contract";

/** Below this width the tab content beside the preview is unusable, so tabs open in a drawer instead. */
const MIN_CONTENT_WIDTH = 360;

/** Project workspace frame: header only — the tab bar itself is the dock's own tab strip now
 * (see `project-tab-dock.tsx`'s custom tab renderer), not a separate nav, to avoid showing two
 * tab bars for the same sections. Non-local projects go to the setup flow (Spec §26). */
const ProjectLayout: FC = () => {
  const { projectId, tab: tabParam } = useParams();
  const location = useLocation();
  const { project, isPending } = useProject(projectId);
  const localState = useProjectLocalState(projectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const onSetup = location.pathname.endsWith("/setup");
  const previewOpen = useWorkspaceStore((s) => (projectId ? s.preview_by_project[projectId]?.previewOpen : false)) ?? DEFAULT_PREVIEW_PREFS.previewOpen;
  const previewExpanded = useWorkspaceStore((s) => (projectId ? s.preview_by_project[projectId]?.previewExpanded : false)) ?? DEFAULT_PREVIEW_PREFS.previewExpanded;
  const setProjectPreview = useWorkspaceStore((s) => s.setProjectPreview);
  const previewAvailable = isDesktop() && !onSetup;
  // Review layout: the preview takes the whole project area, side by side with the AI panel.
  const reviewLayout = previewOpen && previewExpanded && previewAvailable;
  const previewWidth = useWorkspaceStore((s) => (projectId ? s.preview_by_project[projectId]?.previewWidth : undefined)) ?? DEFAULT_PREVIEW_PREFS.previewWidth;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Tab content opens in a drawer when the preview leaves it no usable room.
  const drawerMode = reviewLayout || (previewOpen && previewAvailable && bodyWidth > 0 && bodyWidth - previewWidth < MIN_CONTENT_WIDTH);
  const currentTab = (tabParam ?? ProjectTabs.OVERVIEW) as ProjectTab;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBodyWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
    // The body only exists once the project has loaded.
  }, [project]);

  useEffect(() => {
    if (!drawerMode) setDrawerOpen(false);
  }, [drawerMode]);

  // Moving to another section of this project (tab click, "Diff" in the AI panel…) opens it in the drawer.
  const lastSection = useRef({ projectId, tab: currentTab });
  useEffect(() => {
    const last = lastSection.current;
    lastSection.current = { projectId, tab: currentTab };
    if (drawerMode && last.projectId === projectId && last.tab !== currentTab) setDrawerOpen(true);
  }, [projectId, currentTab, drawerMode]);

  useEffect(() => {
    if (projectId) setActiveProject(projectId);
  }, [projectId, setActiveProject]);

  if (isPending) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return <EmptyState className="flex-1" title="Project not found" description="It may have been removed, or it belongs to another organization." />;
  }

  const needsSetup = isDesktop() && (localState === ProjectLocalStates.IMPORTED || localState === ProjectLocalStates.MISSING);
  if (needsSetup && !onSetup) return <Navigate to={Routes.workspace.project_setup(project.id)} replace />;

  return (
    <ProjectContext.Provider value={project}>
    <div className="@container flex h-full min-h-0 flex-col">
      {/* One compact row instead of the previous two-line stacked block (avatar + title on one
          line, subtitle below, plus its own top padding) — name and repo share a line, and the
          repo/sub_path detail drops entirely below `@lg` where there's no room to spare. */}
      <div className="flex h-11 shrink-0 items-center gap-2.5 px-4">
        <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="sm" />
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[0.8125rem] font-semibold">{project.name}</span>
          {(project.repository || project.sub_path) && (
            <span className="hidden truncate text-[0.7188rem] text-muted-foreground @lg:inline">
              {project.repository && <>{project.repository.full_name ?? project.repository.clone_url}</>}
              {project.sub_path && <>{project.repository ? " · " : ""}{project.sub_path}</>}
            </span>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {previewAvailable && (
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 gap-1.5", previewOpen && "border-hairline-strong bg-accent")}
              aria-pressed={previewOpen}
              title="Toggle preview (Ctrl+Shift+P)"
              onClick={() => setProjectPreview(project.id, { previewOpen: !previewOpen })}
            >
              <PanelRight className="size-3.5" /> <span className="hidden @xl:inline">Preview</span>
            </Button>
          )}
        </div>
      </div>
      <div ref={bodyRef} className="flex min-h-0 flex-1">
        {!drawerMode && (
          // The setup wizard (`Outlet`) still scrolls at this level; the dock scrolls per-panel
          // instead (see `ProjectTabDock`'s `TabPanel`), so this level must not also clip or scroll it.
          <div className={cn("@container min-h-0 min-w-0 flex-1", onSetup ? "overflow-y-auto" : "overflow-hidden")}>
            {onSetup ? <Outlet context={{ project }} /> : <ProjectTabDock key={project.id} projectId={project.id} routeTab={currentTab} />}
          </div>
        )}
        {previewOpen && previewAvailable && <PreviewPanel key={project.id} project={project} expanded={reviewLayout} />}
      </div>
      <Sheet open={drawerMode && drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="flex w-[min(960px,85vw)] flex-col gap-0 p-0 sm:max-w-none">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b pl-4 pr-12">
            <SheetTitle className="truncate text-sm font-medium">
              {project.name} · {getDropdownOptionLabel(ProjectTabOptions, currentTab)}
            </SheetTitle>
            <SheetDescription className="sr-only">Project section shown over the preview.</SheetDescription>
            {reviewLayout && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={() => setProjectPreview(project.id, { previewExpanded: false })}
              >
                <Minimize2 className="size-3.5" /> Show beside the preview
              </Button>
            )}
          </div>
          <div className="@container min-h-0 flex-1 overflow-hidden">
            <ProjectTabDock key={project.id} projectId={project.id} routeTab={currentTab} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </ProjectContext.Provider>
  );
};

export default ProjectLayout;
