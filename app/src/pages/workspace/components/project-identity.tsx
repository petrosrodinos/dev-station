import type { FC } from "react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useProject } from "@/features/projects/hooks/use-projects";
import { useWorkspaceStore } from "@/stores/workspace";

/** The active project's logo and repo path, shown in the top bar next to the back/forward arrows. */
export const ProjectIdentity: FC = () => {
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const { project } = useProject(activeProjectId);
  if (!project) return null;

  return (
    <div className="app-no-drag flex min-w-0 items-center gap-2 px-1">
      <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="sm" />
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate text-[0.8125rem] font-semibold">{project.name}</span>
        {(project.repository || project.sub_path) && (
          <span className="hidden truncate text-[0.7188rem] text-muted-foreground md:inline">
            {project.repository && <>{project.repository.full_name ?? project.repository.clone_url}</>}
            {project.sub_path && <>{project.repository ? " \u00b7 " : ""}{project.sub_path}</>}
          </span>
        )}
      </div>
    </div>
  );
};
