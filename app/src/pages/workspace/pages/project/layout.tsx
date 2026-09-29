import { useEffect, useRef, useState, type FC } from "react";
import { Navigate, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { Bot, BookOpen, ChevronDown, ExternalLink, Files, GitBranch, Home, Minimize2, PanelRight, Plug, SquareTerminal } from "lucide-react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useOpenInEditor } from "@/features/files/hooks/use-files";
import { EditorTargetOptions } from "@/config/constants/dropdowns/settings/editor-target.options";
import { ProjectTabOptions, ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { DEFAULT_PREVIEW_PREFS, useWorkspaceStore } from "@/stores/workspace";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { PreviewPanel } from "./components/preview-panel";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { filterByAccess } from "@/lib/access.utils";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { cn } from "@/lib/utils";
import { ProjectLocalStates } from "@shared/contract";

/** Below this width the tab content beside the preview is unusable, so tabs open in a drawer instead. */
const MIN_CONTENT_WIDTH = 360;

const TAB_ICONS: Record<ProjectTab, typeof Home> = {
  [ProjectTabs.OVERVIEW]: Home,
  [ProjectTabs.GIT]: GitBranch,
  [ProjectTabs.FILES]: Files,
  [ProjectTabs.TERMINAL]: SquareTerminal,
  [ProjectTabs.SESSIONS]: Bot,
  [ProjectTabs.SKILLS]: BookOpen,
  [ProjectTabs.INTEGRATIONS]: Plug,
};

/** Project workspace frame: header + sub navigation; non-local projects go to the setup flow (Spec §26). */
const ProjectLayout: FC = () => {
  const { projectId, tab: tabParam } = useParams();
  const location = useLocation();
  const { project, isPending } = useProject(projectId);
  const localState = useProjectLocalState(projectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const { data: git } = useGitStatus(projectId ?? null);
  const openInEditor = useOpenInEditor();
  const { can } = usePermissions();
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
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="md" />
          <div className="min-w-0">
            <div className="truncate text-lg font-medium leading-tight">{project.name}</div>
            <div className="truncate text-[0.7813rem] text-muted-foreground">
              {project.repository && <>{project.repository.full_name ?? project.repository.clone_url}</>}
              {project.sub_path && <>{project.repository ? " · " : ""}{project.sub_path}</>}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {git?.branch && (
              <NavLink
                to={Routes.workspace.project_tab(project.id, ProjectTabs.GIT)}
                title={git.branch}
                className="inline-flex h-[30px] max-w-[9rem] items-center gap-1.5 rounded-md border bg-surface-elevated px-2.5 font-mono text-[0.7813rem] font-medium hover:border-hairline-strong @2xl:max-w-[16rem]"
              >
                <GitBranch className="size-3.5 shrink-0" /> <span className="hidden truncate @md:inline">{git.branch}</span>
              </NavLink>
            )}
            {previewAvailable && (
              <Button
                variant="outline"
                size="sm"
                className={cn("h-[30px] gap-1.5", previewOpen && "border-hairline-strong bg-accent")}
                aria-pressed={previewOpen}
                title="Toggle preview (Ctrl+Shift+P)"
                onClick={() => setProjectPreview(project.id, { previewOpen: !previewOpen })}
              >
                <PanelRight className="size-3.5" /> <span className="hidden @xl:inline">Preview</span>
              </Button>
            )}
            {localState === ProjectLocalStates.LOCAL && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-[30px] gap-1.5">
                    <ExternalLink className="size-3.5" /> <span className="hidden @xl:inline">Open in</span> <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {EditorTargetOptions.map((o) => (
                    <DropdownMenuItem key={o.id} onSelect={() => openInEditor.mutate({ projectId: project.id, editor: o.id })}>
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {!onSetup && (
          <nav className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Project sections">
            {filterByAccess(ProjectTabOptions, can).map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              return (
                <NavLink
                  key={tab.id}
                  title={tab.label}
                  aria-label={tab.label}
                  to={Routes.workspace.project_tab(project.id, tab.id)}
                  end
                  onClick={() => drawerMode && setDrawerOpen(true)}
                  className={({ isActive }) =>
                    cn(
                      "-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground",
                      (!drawerMode || drawerOpen) && (isActive || (tab.id === ProjectTabs.OVERVIEW && location.pathname === Routes.workspace.project(project.id))) && "border-foreground text-foreground",
                    )
                  }
                >
                  {({ isActive }) => {
                    const active = isActive || (tab.id === ProjectTabs.OVERVIEW && location.pathname === Routes.workspace.project(project.id));
                    return (
                      <>
                        <Icon className="size-3.5 shrink-0" />
                        <span className={cn(!active && "hidden @3xl:inline")}>{tab.label}</span>
                      </>
                    );
                  }}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
      <div ref={bodyRef} className="flex min-h-0 flex-1">
        {!drawerMode && (
          <div className="@container min-h-0 min-w-0 flex-1 overflow-y-auto">
            <Outlet context={{ project }} />
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
          <div className="@container min-h-0 flex-1 overflow-y-auto">
            <Outlet context={{ project }} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjectLayout;
