import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, CloudDownload, FolderSearch, Link2, Pencil, Trash2, type LucideIcon } from "lucide-react";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useArchiveProject, useDeleteProject } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectLocalStates } from "@/features/local-workspace/hooks/use-local-workspace";
import { useRevealFile } from "@/features/files/hooks/use-files";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { isDesktop } from "@/lib/desktop";
import { useDialogsStore } from "@/stores/dialogs";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { ProjectLocalStates } from "@shared/contract";

export type ProjectMenuEntry = "separator" | { label: string; icon?: LucideIcon; destructive?: boolean; onSelect: () => void };

/**
 * Every action a project offers from a menu, filtered by device and permissions.
 * The sidebar rail's right-click menu and the /workspace card dropdown both render this list.
 */
export function useProjectActions(project: Project) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: localStates } = useProjectLocalStates();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const openProjectDialog = useDialogsStore((s) => s.openProjectDialog);
  const archiveProject = useArchiveProject();
  const deleteProject = useDeleteProject();
  const reveal = useRevealFile();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const localState = isDesktop() ? localStates?.[project.id] ?? null : null;
  const isLocal = localState === ProjectLocalStates.LOCAL;

  const open = () => {
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
  };

  // Archiving is reversible from /workspace, so it needs no confirmation; leaving the project's page avoids a "not found" screen.
  const archive = () => {
    if (project.id === activeProjectId) {
      setActiveProject(null);
      navigate(Routes.workspace.root);
    }
    archiveProject.mutate({ id: project.id, archived: true });
  };

  const entries: ProjectMenuEntry[] = [
    { label: "Open workspace", onSelect: open },
    ...(isDesktop()
      ? [
          {
            label: isLocal ? "Change local folder…" : "Set up on this device…",
            icon: isLocal ? Link2 : CloudDownload,
            onSelect: () => navigate(Routes.workspace.project_setup(project.id)),
          },
        ]
      : []),
    ...(isLocal ? [{ label: "Reveal in file manager", icon: FolderSearch, onSelect: () => reveal.mutate({ projectId: project.id, path: "." }) }] : []),
    ...(can(PermissionKeys.PROJECTS_EDIT)
      ? [
          { label: "Edit project…", icon: Pencil, onSelect: () => openProjectDialog(project.id) },
          { label: "Archive project", icon: Archive, onSelect: archive },
        ]
      : []),
    ...(can(PermissionKeys.PROJECTS_DELETE)
      ? (["separator", { label: "Remove project", icon: Trash2, destructive: true, onSelect: () => setConfirmingRemove(true) }] as ProjectMenuEntry[])
      : []),
  ];

  const removeDialog = (
    <ConfirmationDialog
      isOpen={confirmingRemove}
      onClose={() => setConfirmingRemove(false)}
      onConfirm={() => deleteProject.mutate(project.id, { onSuccess: () => setConfirmingRemove(false) })}
      title={`Remove ${project.name}?`}
      description="The project is removed from the organization for everyone. Local files on this device are not deleted."
      confirmText="Remove project"
      variant="destructive"
      isLoading={deleteProject.isPending}
      icon={<Trash2 className="size-5" />}
    />
  );

  return { entries, removeDialog };
}
