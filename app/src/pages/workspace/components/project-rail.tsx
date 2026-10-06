import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CloudDownload,
  LayoutGrid,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelTopClose,
  PanelTopOpen,
  Plug,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useGetProjects, useReorderProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectLocalStates } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { ProjectLocalStateOptions } from "@/config/constants/dropdowns/projects/project-local-state.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { useWorkspaceStore } from "@/stores/workspace";
import { isHorizontalRail, type RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { OrganizationMenu } from "./organization-menu";
import { PlacementMenu, PlacementTargets } from "./placement-menu";
import { ProjectMenuItems } from "./project-actions";
import { useProjectActions } from "../hooks/use-project-actions";
import { useRailPosition } from "@/features/users/hooks/use-rail-position";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { isDesktop } from "@/lib/desktop";
import { jumpToSession } from "@/lib/session-navigation.utils";
import { cn } from "@/lib/utils";
import { ProjectLocalStates, type ProjectLocalState } from "@shared/contract";

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

/** Folding the bar away points at the edge it's docked to; bringing it back points into the screen. */
const HIDE_RAIL_ICON: Record<RailPosition, LucideIcon> = {
  left: PanelLeftClose,
  right: PanelRightClose,
  top: PanelTopClose,
  bottom: PanelBottomClose,
};

const SHOW_RAIL_ICON: Record<RailPosition, LucideIcon> = {
  left: PanelLeftOpen,
  right: PanelRightOpen,
  top: PanelTopOpen,
  bottom: PanelBottomOpen,
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
  const railCollapsed = useWorkspaceStore((s) => s.rail_collapsed);
  const setRailCollapsed = useWorkspaceStore((s) => s.setRailCollapsed);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openProjectDialog = useDialogsStore((s) => s.openProjectDialog);
  const { can } = usePermissions();
  const reorder = useReorderProjects();

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

  // Hooks are all above this point: a folded bar only renders its strip.
  if (railCollapsed) {
    return <CollapsedProjectRail position={position} attention={attentionIds.length} onExpand={() => setRailCollapsed(false)} />;
  }

  const HideIcon = HIDE_RAIL_ICON[position];

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
          horizontal ? "h-full min-w-0 flex-row overflow-x-auto overflow-y-hidden pl-2 pr-2" : "w-full flex-col overflow-y-auto overflow-x-hidden pt-2 pb-2",
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
                onSelect={() => selectProject(project)}
                onBadge={() => openAttention(project)}
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
        <RailButton label="Hide project bar" onClick={() => setRailCollapsed(true)} tipSide={tipSide}>
          <HideIcon className="size-4" />
        </RailButton>
      </div>
    </aside>
    </PlacementMenu>
  );
}

/** The bar folded away: a thin strip that stays visible, with one button in its middle to bring the bar back. */
function CollapsedProjectRail({ position, attention, onExpand }: { position: RailPosition; attention: number; onExpand: () => void }) {
  const horizontal = isHorizontalRail(position);
  const ShowIcon = SHOW_RAIL_ICON[position];
  // Badges live on the bar's avatars, so a folded bar reports pending attention on its button instead.
  const label = attention === 0 ? "Show project bar" : `Show project bar · ${attention === 1 ? "1 session needs" : `${attention} sessions need`} attention`;

  return (
    <PlacementMenu target={PlacementTargets.SIDEBAR}>
    <aside className={cn("flex shrink-0 items-center justify-center bg-canvas", RAIL_EDGE_BORDER[position], horizontal ? "h-6 w-full" : "w-6")} aria-label="Projects">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onExpand}
              aria-label={label}
              className="relative flex size-5 items-center justify-center rounded-md border bg-surface-elevated text-muted-foreground hover:text-foreground"
            >
              <ShowIcon className="size-3.5" />
              {attention > 0 && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger ring-2 ring-canvas" />}
            </button>
          }
        />
        <TooltipContent side={TOOLTIP_SIDE[position]}>{label}</TooltipContent>
      </Tooltip>
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
  onSelect: () => void;
  onBadge: () => void;
}

function RailItem({ project, active, position, localState, attention, canEdit, onSelect, onBadge }: RailItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id, disabled: !canEdit });
  const { entries, removeDialog } = useProjectActions(project);
  const horizontal = isHorizontalRail(position);
  const imported = localState === ProjectLocalStates.IMPORTED;
  const missing = localState === ProjectLocalStates.MISSING;

  return (
    <>
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
        <ProjectMenuItems entries={entries} variant="context" />
      </ContextMenuContent>
    </ContextMenu>
    {removeDialog}
    </>
  );
}
