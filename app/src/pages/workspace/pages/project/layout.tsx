import { useEffect, useState, type FC } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useProjectLocalState } from "@/features/local-workspace/hooks/use-local-workspace";
import { type ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { useWorkspaceStore } from "@/stores/workspace";
import { ProjectTabDock } from "./components/project-tab-dock";
import { ProjectContext } from "./hooks/use-project-context";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { ProjectLocalStates } from "@shared/contract";

/** Project workspace frame — the tab bar itself is the dock's own tab strip now
 * (see `project-tab-dock.tsx`'s custom tab renderer), not a separate nav, to avoid showing two
 * tab bars for the same sections. Non-local projects go to the setup flow (Spec §26). */
const ProjectLayout: FC = () => {
  const { projectId, tab: tabParam } = useParams();
  const location = useLocation();
  const { project, isPending } = useProject(projectId);
  const localState = useProjectLocalState(projectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const onSetup = location.pathname.endsWith("/setup");
  // Undefined on the bare project URL: the dock then shows whatever tab/panel it last saved for this project.
  const currentTab = tabParam as ProjectTab | undefined;

  // The dock for a project mounts one frame after the switch, not in the same commit. That commit
  // removes the previous project's dock immediately (no lingering tab row), and the heavy new mount
  // runs as a separate, fast render that can fade in.
  const [dockProjectId, setDockProjectId] = useState<string | null>(null);
  useEffect(() => {
    if (!projectId) return;
    const frame = requestAnimationFrame(() => setDockProjectId(projectId));
    return () => cancelAnimationFrame(frame);
  }, [projectId]);

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
      {/* The setup wizard (`Outlet`) still scrolls at this level; the dock scrolls per-panel
          instead (see `ProjectTabDock`'s `TabPanel`), so this level must not also clip or scroll it.
          The preview is a panel inside that dock, not a column here, so it moves like any tab. */}
      <div className={cn("@container min-h-0 min-w-0 flex-1", onSetup ? "overflow-y-auto" : "overflow-hidden")}>
        {onSetup ? (
          <Outlet context={{ project }} />
        ) : dockProjectId === project.id ? (
          <div key={project.id} className="h-full animate-in fade-in duration-200">
            <ProjectTabDock key={project.id} projectId={project.id} routeTab={currentTab} />
          </div>
        ) : (
          <div className="flex h-full flex-col gap-3 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="min-h-0 flex-1 w-full" />
          </div>
        )}
      </div>
    </div>
    </ProjectContext.Provider>
  );
};

export default ProjectLayout;
