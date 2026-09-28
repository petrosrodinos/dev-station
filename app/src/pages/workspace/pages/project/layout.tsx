import { useEffect, type FC } from "react";
import { Navigate, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { Bot, ChevronDown, ExternalLink, Files, GitBranch, Home, Plug, SquareTerminal } from "lucide-react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { useGitStatus } from "@/features/git/hooks/use-git";
import { useOpenInEditor } from "@/features/files/hooks/use-files";
import { EditorTargetOptions } from "@/config/constants/dropdowns/settings/editor-target.options";
import { ProjectTabOptions, ProjectTabs, type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { ProjectLocalStates } from "@shared/contract";

const TAB_ICONS: Record<ProjectTab, typeof Home> = {
  [ProjectTabs.OVERVIEW]: Home,
  [ProjectTabs.GIT]: GitBranch,
  [ProjectTabs.FILES]: Files,
  [ProjectTabs.TERMINAL]: SquareTerminal,
  [ProjectTabs.SESSIONS]: Bot,
  [ProjectTabs.INTEGRATIONS]: Plug,
};

/** Project workspace frame: header + sub navigation; non-local projects go to the setup flow (Spec §26). */
const ProjectLayout: FC = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const { project, isPending } = useProject(projectId);
  const localState = useProjectLocalState(projectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const { data: git } = useGitStatus(projectId ?? null);
  const openInEditor = useOpenInEditor();
  const onSetup = location.pathname.endsWith("/setup");

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <ProjectAvatar name={project.name} color={project.color} size="md" />
          <div className="min-w-0">
            <div className="truncate text-lg font-medium leading-tight">{project.name}</div>
            <div className="truncate text-[12.5px] text-muted-foreground">
              {project.client?.name ?? "Internal"}
              {project.repository && <> · {project.repository.full_name ?? project.repository.clone_url}</>}
              {project.sub_path && <> · {project.sub_path}</>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {git?.branch && (
              <NavLink
                to={Routes.workspace.project_tab(project.id, ProjectTabs.GIT)}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-md border bg-surface-elevated px-2.5 font-mono text-[12.5px] font-medium hover:border-hairline-strong"
              >
                <GitBranch className="size-3.5" /> {git.branch}
              </NavLink>
            )}
            {localState === ProjectLocalStates.LOCAL && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-[30px] gap-1.5">
                    <ExternalLink className="size-3.5" /> Open in <ChevronDown className="size-3" />
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
          <nav className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b px-4" aria-label="Project sections">
            {ProjectTabOptions.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              return (
                <NavLink
                  key={tab.id}
                  to={Routes.workspace.project_tab(project.id, tab.id)}
                  end
                  className={({ isActive }) =>
                    cn(
                      "-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2 text-[13px] font-medium text-muted-foreground hover:text-foreground",
                      (isActive || (tab.id === ProjectTabs.OVERVIEW && location.pathname === Routes.workspace.project(project.id))) && "border-foreground text-foreground",
                    )
                  }
                >
                  <Icon className="size-3.5" /> {tab.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
};

export default ProjectLayout;
