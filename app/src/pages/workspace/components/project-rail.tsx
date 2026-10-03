import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, CloudDownload, FolderOpen, FolderSearch, LayoutGrid, Link2, Pencil, Plug, Plus, Settings, Trash2 } from "lucide-react";
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
import { isHorizontalRail, type RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { OrganizationMenu } from "./organization-menu";
import { PlacementMenu, PlacementTargets } from "./placement-menu";
import { useRailPosition } from "@/features/users/hooks/use-rail-position";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { jumpToSession } from "@/lib/session-navigation.utils";
import { cn } from "@/lib/utils";
import { EditorTargets, ProjectLocalStates, type ProjectLocalState } from "@shared/contract";

type TipSide = "left" | "right" | "top" | "bottom";

/** Tooltips open away from the edge the rail is docked to, so they never cover the workspace. */
const TOOLTIP_SIDE: Record<RailPosition, TipSide> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

const RAIL_EDGE_BORDER: Record<RailPosition, string> = {
  left: "border-r",
  right: "border-l",
  top: "border-b",
  bottom: "border-t",
};

/** Slack-style project rail (Spec §5) with attention badges (Spec §13/§27) and local-state treatment (Spec §26). */
export function ProjectRail() {
  const { position } = useRailPosition();
  const horizontal = isHorizontalRail(position);
  const tipSide = TOOLTIP_SIDE[position];
  const navigate = useNavigate();
  const { data: projects, isPending } = useGetProjects();
  const { data: localStates } = useProjectLocalStates();
  const { data: sessions } = useAgentSessions();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const attentionIds = useWorkspaceStore((s) => s.attention_session_ids);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openProjectDialog = useDialogsStore((s) => s.openProjectDialog);
  const { can } = usePermissions();
  const reorder = useReorderProjects();
  const deleteProject = useDeleteProject();
  const reveal = useRevealFile();
  const openInEditor = useOpenInEditor();
  const [removing, setRemoving] = useState<Project | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const { pathname } = useLocation();
  const onHome = pathname === Routes.workspace.root;
  const goHome = () => {
    setActiveProject(null);
    navigate(Routes.workspace.root);
  };

  const selectProject = (project: Project) => {
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
  };

  // The badge opens the latest session that needs attention straight into review.
  const openAttention = (project: Project) => {
    const latest = attentionByProject.get(project.id)?.at(-1);
    if (latest && jumpToSession(latest, navigate, { fallbackProjectId: project.id, review: { projects } })) return;
    selectProject(project);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !projects) return;
    const ids = projects.map((p) => p.id);
    reorder.mutate(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <PlacementMenu target={PlacementTargets.SIDEBAR}>
    <aside
      className={cn("flex shrink-0 items-center bg-canvas", RAIL_EDGE_BORDER[position], horizontal ? "h-16 w-full flex-row px-2" : "w-16 flex-col py-2")}
      aria-label="Projects"
    >
      <div className={cn("flex items-center gap-1", horizontal ? "flex-row pr-1" : "flex-col pb-1")}>
        <RailButton label="Home" onClick={goHome} active={onHome} tipSide={tipSide}>
          <LayoutGrid className="size-4" />
        </RailButton>
        <div className={cn("bg-border", horizontal ? "ml-1 h-7 w-px" : "mt-1 h-px w-7")} />
      </div>

      <div
        className={cn(
          "flex flex-1 items-center gap-1",
          horizontal ? "h-full min-w-0 flex-row overflow-x-auto overflow-y-hidden pr-2" : "w-full flex-col overflow-y-auto overflow-x-hidden pb-2",
        )}
      >
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="size-10 shrink-0 rounded-full" />)}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={(projects ?? []).map((p) => p.id)} strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}>
            {(projects ?? []).map((project) => (
              <RailItem
                key={project.id}
                project={project}
                active={project.id === activeProjectId}
                position={position}
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

        {can(PermissionKeys.PROJECTS_CREATE) && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => openProjectDialog(null)}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed text-ash hover:border-hairline-strong hover:text-foreground",
                    horizontal ? "ml-1" : "mt-1",
                  )}
                  aria-label="Add project"
                >
                  <Plus className="size-4" />
                </button>
              }
            />
            <TooltipContent side={tipSide}>Add project</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className={cn("flex items-center gap-1.5", horizontal ? "flex-row pl-1" : "flex-col pt-1")}>
        <div className={cn("bg-border", horizontal ? "mr-1 h-7 w-px" : "mb-1 h-px w-7")} />
        {importedCount > 0 && (
          <RailButton label={`Set up imported projects (${importedCount})`} onClick={() => navigate(Routes.workspace.imported)} tipSide={tipSide}>
            <CloudDownload className="size-4" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-info px-1 text-[0.625rem] font-bold text-[#04121b]">{importedCount}</span>
          </RailButton>
        )}
        <RailButton label="Integrations" onClick={() => navigate(Routes.workspace.integrations)} tipSide={tipSide}>
          <Plug className="size-4" />
        </RailButton>
        <OrganizationMenu side={tipSide} />
        <RailButton label="Settings" onClick={() => navigate(Routes.workspace.settings)} tipSide={tipSide}>
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
    </PlacementMenu>
  );
}

function RailButton({ label, onClick, active, tipSide, children }: { label: string; onClick: () => void; active?: boolean; tipSide: TipSide; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={onClick}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex size-10 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground hover:text-foreground", active && "text-foreground ring-1 ring-hairline-strong")}
          >
            {children}
          </button>
        }
      />
      <TooltipContent side={tipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

interface RailItemProps {
  project: Project;
  active: boolean;
  position: RailPosition;
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

function RailItem({ project, active, position, localState, attention, canEdit, canDelete, onSelect, onBadge, onEdit, onSetup, onReveal, onOpenEditor, onRemove }: RailItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id, disabled: !canEdit });
  const horizontal = isHorizontalRail(position);
  const imported = localState === ProjectLocalStates.IMPORTED;
  const missing = localState === ProjectLocalStates.MISSING;
  const isLocal = localState === ProjectLocalStates.LOCAL;

  return (
    <ContextMenu>
      <Tooltip>
        <ContextMenuTrigger
          render={
            <TooltipTrigger
              render={
                <div
                  ref={setNodeRef}
                  style={{ transform: CSS.Translate.toString(transform), transition }}
                  onContextMenu={(e) => e.stopPropagation()}
              className={cn("relative flex justify-center", horizontal ? "h-full items-center" : "w-full", isDragging && "z-10 opacity-60")}
                >
                  <span
                    className={cn(
                      "absolute rounded-sm bg-foreground transition-all",
                      horizontal ? "bottom-0 left-1/2 h-[3px] -translate-x-1/2" : "left-0 top-1/2 w-[3px] -translate-y-1/2",
                      horizontal ? (active ? "w-5" : "w-0") : active ? "h-5" : "h-0",
                    )}
                  />
                  <button
                    {...attributes}
                    {...listeners}
                    onClick={onSelect}
                    aria-label={project.name}
                    aria-current={active ? "page" : undefined}
                    className="rail-avatar-trigger rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ProjectAvatar name={project.name} color={project.color} seed={project.avatar_seed} size="lg" muted={imported} className={cn("rail-avatar", active && "rounded-lg")} />
                  </button>
                  {attention > 0 && (
                    <button
                      onClick={onBadge}
                      className={cn(
                        "absolute -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-bold text-[#1a0505] ring-2 ring-canvas transition-transform hover:scale-110",
                        horizontal ? "right-0" : "right-2",
                      )}
                      aria-label={`${attention} session${attention > 1 ? "s need" : " needs"} attention`}
                    >
                      {attention}
                    </button>
                  )}
                  {missing && (
                    <span
                      className={cn(
                        "absolute -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-warning text-[#1a1200] ring-2 ring-canvas",
                        horizontal ? "right-0" : "right-2",
                      )}
                    >
                      <AlertTriangle className="size-2.5" />
                    </span>
                  )}
                </div>
              }
            />
          }
        />
        <TooltipContent side={TOOLTIP_SIDE[position]} className="max-w-60">
          <div className="font-medium">{project.name}</div>
          {localState && localState !== ProjectLocalStates.LOCAL && (
            <div className="text-[0.6875rem] opacity-70">{getDropdownOptionLabel(ProjectLocalStateOptions, localState)}</div>
          )}
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
