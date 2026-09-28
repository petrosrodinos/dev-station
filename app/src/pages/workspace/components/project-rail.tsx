import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Building2, CloudDownload, FolderOpen, FolderSearch, LayoutGrid, Link2, Pencil, Plug, Plus, Settings, Trash2 } from "lucide-react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useDeleteProject, useGetProjects, useReorderProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectLocalStates } from "@/features/local-workspace/hooks/use-local-workspace";
import { useOpenInEditor, useRevealFile } from "@/features/files/hooks/use-files";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { ProjectLocalStateOptions } from "@/config/constants/dropdowns/projects/project-local-state.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { EditorTargets, ProjectLocalStates, type ProjectLocalState } from "@shared/contract";

interface RailGroup {
  id: string;
  label: string;
  projects: Project[];
}

/** Slack-style project rail (Spec §5) with attention badges (Spec §13/§27) and local-state treatment (Spec §26). */
export function ProjectRail() {
  const navigate = useNavigate();
  const { data: projects, isPending } = useGetProjects();
  const { data: localStates } = useProjectLocalStates();
  const { data: sessions } = useAgentSessions();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const attentionIds = useWorkspaceStore((s) => s.attention_session_ids);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openProjectDialog = useDialogsStore((s) => s.openProjectDialog);
  const { can } = usePermissions();
  const reorder = useReorderProjects();
  const deleteProject = useDeleteProject();
  const reveal = useRevealFile();
  const openInEditor = useOpenInEditor();
  const [removing, setRemoving] = useState<Project | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const groups: RailGroup[] = useMemo(() => {
    const map = new Map<string, RailGroup>();
    for (const p of projects ?? []) {
      const id = p.client?.id ?? "__none";
      if (!map.has(id)) map.set(id, { id, label: p.client?.name ?? "Internal", projects: [] });
      map.get(id)!.projects.push(p);
    }
    return [...map.values()];
  }, [projects]);

  // Sessions needing attention, per project (runtime knows the project even for sessions not yet listed).
  const attentionByProject = useMemo(() => {
    const projectOf = new Map((sessions?.data ?? []).map((s) => [s.id, s.project_id]));
    const out = new Map<string, string[]>();
    for (const id of attentionIds) {
      const projectId = runtimeAgents[id]?.project_id ?? projectOf.get(id);
      if (!projectId) continue;
      out.set(projectId, [...(out.get(projectId) ?? []), id]);
    }
    return out;
  }, [attentionIds, runtimeAgents, sessions]);

  const importedCount = Object.values(localStates ?? {}).filter((s) => s === ProjectLocalStates.IMPORTED).length;

  const onHome = useLocation().pathname === Routes.workspace.root;
  const goHome = () => {
    setActiveProject(null);
    navigate(Routes.workspace.root);
  };

  const selectProject = (project: Project) => {
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
  };

  const openAttention = (project: Project) => {
    const [first] = attentionByProject.get(project.id) ?? [];
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
    if (first) openSessionTab(first);
  };

  const onDragEnd = (group: RailGroup) => ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !projects) return;
    const ids = group.projects.map((p) => p.id);
    const reordered = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    // Keep other groups in place; replace this group's slice in the global order.
    const all = projects.map((p) => p.id);
    const positions = all.map((id, i) => (ids.includes(id) ? i : -1)).filter((i) => i >= 0);
    const next = [...all];
    positions.forEach((pos, i) => (next[pos] = reordered[i]));
    reorder.mutate(next);
  };

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center border-r bg-canvas py-2" aria-label="Projects">
      <div className="flex flex-col items-center gap-1 pb-1">
        <RailButton label="Home" onClick={goHome} active={onHome}>
          <LayoutGrid className="size-4" />
        </RailButton>
        <div className="mt-1 h-px w-7 bg-border" />
      </div>

      <div className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden pb-2">
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="size-10 shrink-0 rounded-full" />)}

        {groups.map((group, gi) => (
          <div key={group.id} className="flex w-full flex-col items-center gap-1.5">
            {gi > 0 && <div className="my-1 h-px w-7 bg-border" />}
            <div className="w-full truncate px-1 text-center text-[9px] uppercase tracking-[0.6px] text-stone" title={group.label}>
              {group.label}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(group)}>
              <SortableContext items={group.projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                {group.projects.map((project) => (
                  <RailItem
                    key={project.id}
                    project={project}
                    active={project.id === activeProjectId}
                    localState={isDesktop() ? localStates?.[project.id] ?? null : null}
                    attention={attentionByProject.get(project.id)?.length ?? 0}
                    canEdit={can(PermissionKeys.PROJECTS_EDIT)}
                    canDelete={can(PermissionKeys.PROJECTS_DELETE)}
                    onSelect={() => selectProject(project)}
                    onBadge={() => openAttention(project)}
                    onEdit={() => openProjectDialog(project.id)}
                    onSetup={() => navigate(Routes.workspace.project_setup(project.id))}
                    onReveal={() => reveal.mutate({ projectId: project.id, path: "." })}
                    onOpenEditor={() => openInEditor.mutate({ projectId: project.id, editor: EditorTargets.CURSOR })}
                    onRemove={() => setRemoving(project)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ))}

        {can(PermissionKeys.PROJECTS_CREATE) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => openProjectDialog(null)}
                className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed text-ash hover:border-hairline-strong hover:text-foreground"
                aria-label="Add project"
              >
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Add project</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5 pt-1">
        <div className="mb-1 h-px w-7 bg-border" />
        {importedCount > 0 && (
          <RailButton label={`Set up imported projects (${importedCount})`} onClick={() => navigate(Routes.workspace.imported)}>
            <CloudDownload className="size-4" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-info px-1 text-[10px] font-bold text-[#04121b]">{importedCount}</span>
          </RailButton>
        )}
        <RailButton label="Integrations" onClick={() => navigate(Routes.workspace.integrations)}>
          <Plug className="size-4" />
        </RailButton>
        <RailButton label="Organization" onClick={() => navigate(Routes.workspace.organization)}>
          <Building2 className="size-4" />
        </RailButton>
        <RailButton label="Settings" onClick={() => navigate(Routes.workspace.settings)}>
          <Settings className="size-4" />
        </RailButton>
      </div>

      <ConfirmationDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && deleteProject.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        title={`Remove ${removing?.name ?? "project"}?`}
        description="The project is removed from the organization for everyone. Local files on this device are not deleted."
        confirmText="Remove project"
        variant="destructive"
        isLoading={deleteProject.isPending}
        icon={<Trash2 className="size-5" />}
      />
    </aside>
  );
}

function RailButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn("relative flex size-10 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground hover:text-foreground", active && "text-foreground ring-1 ring-hairline-strong")}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface RailItemProps {
  project: Project;
  active: boolean;
  localState: ProjectLocalState | null;
  attention: number;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onBadge: () => void;
  onEdit: () => void;
  onSetup: () => void;
  onReveal: () => void;
  onOpenEditor: () => void;
  onRemove: () => void;
}

function RailItem({ project, active, localState, attention, canEdit, canDelete, onSelect, onBadge, onEdit, onSetup, onReveal, onOpenEditor, onRemove }: RailItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id, disabled: !canEdit });
  const imported = localState === ProjectLocalStates.IMPORTED;
  const missing = localState === ProjectLocalStates.MISSING;
  const isLocal = localState === ProjectLocalStates.LOCAL;

  return (
    <ContextMenu>
      <Tooltip>
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>
            <div
              ref={setNodeRef}
              style={{ transform: CSS.Translate.toString(transform), transition }}
              className={cn("relative flex w-full justify-center", isDragging && "z-10 opacity-60")}
            >
              <span className={cn("absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-sm bg-foreground transition-all", active ? "h-5" : "h-0")} />
              <button
                {...attributes}
                {...listeners}
                onClick={onSelect}
                aria-label={project.name}
                aria-current={active ? "page" : undefined}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ProjectAvatar name={project.name} color={project.color} size="lg" muted={imported} className={cn(active && "rounded-lg")} />
              </button>
              {attention > 0 && (
                <button
                  onClick={onBadge}
                  className="absolute -top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-[#1a0505] ring-2 ring-canvas"
                  aria-label={`${attention} session${attention > 1 ? "s need" : " needs"} attention`}
                >
                  {attention}
                </button>
              )}
              {missing && (
                <span className="absolute -bottom-0.5 right-2 flex size-4 items-center justify-center rounded-full bg-warning text-[#1a1200] ring-2 ring-canvas">
                  <AlertTriangle className="size-2.5" />
                </span>
              )}
            </div>
          </TooltipTrigger>
        </ContextMenuTrigger>
        <TooltipContent side="right" className="max-w-60">
          <div className="font-medium">{project.name}</div>
          <div className="text-[11px] opacity-70">
            {project.client?.name ?? "Internal"}
            {localState && localState !== ProjectLocalStates.LOCAL ? ` · ${getDropdownOptionLabel(ProjectLocalStateOptions, localState)}` : ""}
          </div>
        </TooltipContent>
      </Tooltip>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={onSelect}>Open workspace</ContextMenuItem>
        {isDesktop() && (
          <ContextMenuItem onSelect={onSetup} className="gap-2">
            {isLocal ? <Link2 className="size-3.5" /> : <CloudDownload className="size-3.5" />}
            {isLocal ? "Change local folder…" : "Set up on this device…"}
          </ContextMenuItem>
        )}
        {isLocal && (
          <>
            <ContextMenuItem onSelect={onOpenEditor} className="gap-2">
              <FolderOpen className="size-3.5" /> Open in Cursor
            </ContextMenuItem>
            <ContextMenuItem onSelect={onReveal} className="gap-2">
              <FolderSearch className="size-3.5" /> Reveal in file manager
            </ContextMenuItem>
          </>
        )}
        {canEdit && (
          <ContextMenuItem onSelect={onEdit} className="gap-2">
            <Pencil className="size-3.5" /> Edit project…
          </ContextMenuItem>
        )}
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onRemove} className="gap-2 text-danger focus:text-danger">
              <Trash2 className="size-3.5" /> Remove project
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
