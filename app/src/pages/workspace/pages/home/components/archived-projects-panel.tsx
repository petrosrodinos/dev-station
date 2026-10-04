import { useState } from "react";
import { ArchiveRestore } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useArchiveProject, useGetArchivedProjects } from "@/features/projects/hooks/use-projects";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { formatRelative } from "@/lib/date";

/** Archived projects are hidden from the rail and everywhere else; this is where they come back. */
export function ArchivedProjectsPanel() {
  const { data: archived } = useGetArchivedProjects();
  const archive = useArchiveProject();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);

  if (!archived?.length) return null;

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title={`Archived projects (${archived.length})`}
        actions={
          <Button size="sm" variant="ghost" className="h-7 text-xs" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Show"}
          </Button>
        }
      />
      {open &&
        archived.map((project) => (
          <div key={project.id} className="flex items-center gap-3 border-b border-hairline-soft px-4 py-3 last:border-b-0">
            <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="sm" muted />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.8125rem] font-medium">{project.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {project.repository?.full_name ?? "No repository"} · archived {formatRelative(project.archived_at)}
              </div>
            </div>
            {can(PermissionKeys.PROJECTS_EDIT) && (
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => archive.mutate({ id: project.id, archived: false })}>
                <ArchiveRestore className="size-3.5" /> Restore
              </Button>
            )}
          </div>
        ))}
    </Panel>
  );
}
