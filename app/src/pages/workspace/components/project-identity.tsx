import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown } from "lucide-react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetProjects, useProject } from "@/features/projects/hooks/use-projects";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";

/** The active project's logo and repo path, shown in the top bar; click to switch to another project. */
export const ProjectIdentity: FC = () => {
  const navigate = useNavigate();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const { project } = useProject(activeProjectId);
  const { data: projects } = useGetProjects();
  if (!project) return null;

  const selectProject = (id: string) => {
    setActiveProject(id);
    navigate(Routes.workspace.project(id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label={`Switch project (current: ${project.name})`}
            className="app-no-drag flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-elevated"
          >
            <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="sm" />
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-[0.8125rem] font-semibold">{project.name}</span>
              {(project.repository || project.sub_path) && (
                <span className="hidden truncate text-[0.7188rem] text-muted-foreground md:inline">
                  {project.repository && <>{project.repository.full_name ?? project.repository.clone_url}</>}
                  {project.sub_path && <>{project.repository ? " · " : ""}{project.sub_path}</>}
                </span>
              )}
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
        {(projects ?? []).map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => selectProject(p.id)} className="gap-2">
            <ProjectAvatar name={p.name} color={p.color} seed={p.avatar_seed} size="sm" />
            <span className="flex-1 truncate">{p.name}</span>
            {p.id === project.id && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
