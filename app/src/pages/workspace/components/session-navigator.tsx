import { useState, useEffect, useRef, useMemo, type ReactNode, type WheelEvent } from "react";
import { StatusDot } from "@/components/ui/status-dot";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimelineTime } from "@/lib/date";
import { useCloseSessionTab, useMarkSessionReviewed } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { SessionReviewStateOptions } from "@/config/constants/dropdowns/agents/session-review-state.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { isAgentActive, reviewStateDot } from "@/lib/status";
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, EyeOff, Plus, X } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { OpenSessions, SessionItem } from "../hooks/use-open-sessions";
import { CloseSessionDialog } from "./close-session-dialog";
import { SessionContextMenu } from "./session-context-menu";
import { PlacementMenu, PlacementTargets } from "./placement-menu";

interface SessionNavigatorProps {
  sessions: OpenSessions;
  activeId: string | null;
  onOpen: (item: SessionItem) => void;
}

/**
 * Open sessions as a single strip of tabs, grouped by project (see `useOpenSessions`). The strip is one fixed-height
 * line that scrolls sideways when there are too many, so it never takes space from the terminal below.
 */
export function SessionNavigator({ sessions, activeId, onOpen }: SessionNavigatorProps) {
  const { data: projects } = useGetProjects();
  const closeTab = useCloseSessionTab();
  const backgroundTab = useWorkspaceStore((s) => s.backgroundSessionTab);
  const backgroundTabs = useWorkspaceStore((s) => s.backgroundSessionTabs);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const { can } = usePermissions();
  const [closing, setClosing] = useState<SessionItem | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const setProjectOrder = useWorkspaceStore((s) => s.setSessionProjectOrder);
  const setProjectSessionOrder = useWorkspaceStore((s) => s.setProjectSessionOrder);
  const promotedRef = useRef<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);
  // Two sessions in one project can share a name; those tabs get their start time so they can be told apart.
  const repeatedNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of sessions.ordered) counts.set(`${i.project_id}\u0000${i.name}`, (counts.get(`${i.project_id}\u0000${i.name}`) ?? 0) + 1);
    return new Set([...counts].filter(([, n]) => n > 1).map(([key]) => key));
  }, [sessions]);

  // Keep the focused session in view (e.g. after "next review" jumps to one scrolled out of sight).
  useEffect(() => {
    if (!activeId) return;
    navRef.current?.querySelector<HTMLElement>(`[data-session-id="${activeId}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  // The strip scrolls sideways; a mouse wheel (vertical only) should move it too.
  const scrollOnWheel = (e: WheelEvent<HTMLElement>) => {
    if (e.deltaY && !e.deltaX && navRef.current) navRef.current.scrollLeft += e.deltaY;
  };

  // One group per project, in display order; dragging a group's label moves the whole group.
  const groups = useMemo(() => {
    const byProject = new Map<string, SessionItem[]>();
    for (const item of sessions.ordered) byProject.set(item.project_id, [...(byProject.get(item.project_id) ?? []), item]);
    return [...byProject.entries()].map(([projectId, items]) => ({ projectId, items }));
  }, [sessions]);

  // A session focused from the "+" menu, a shortcut or anywhere else takes the last main slot, so the focused tab is always on the strip.
  // Runs once per focused session (not on every reorder), so dragging the focused tab into the "+" menu sticks.
  const promote = (id: string): boolean => {
    const group = groups.find((g) => g.items.some((i) => i.id === id));
    if (!group) return false;
    const ids = group.items.map((i) => i.id);
    if (ids.indexOf(id) >= MAX_MAIN_SESSIONS) setProjectSessionOrder(arrayMove(ids, ids.indexOf(id), MAX_MAIN_SESSIONS - 1));
    return true;
  };
  useEffect(() => {
    if (!activeId || promotedRef.current === activeId) return;
    if (promote(activeId)) promotedRef.current = activeId;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `promote` only reads `groups`
  }, [activeId, groups]);

  if (!sessions.ordered.length && !sessions.background.length) return null;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = groups.map((g) => g.projectId);
    setProjectOrder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  const requestClose = (item: SessionItem) => {
    if (item.runtime?.alive && isAgentActive(item.status)) setClosing(item);
    else closeTab.mutate({ id: item.id, stopProcess: !!item.runtime });
  };

  // Keeping a session running only takes its tab off the strip; the dropdown on the right brings it back.
  const keepRunning = (item: SessionItem) => {
    backgroundTab(item.id);
    toast({ title: "Session moved to the hidden list — agent keeps running", duration: 1500 });
  };

  const hideProject = (projectId: string, items: SessionItem[]) => {
    backgroundTabs(items.map((i) => i.id));
    toast({ title: `${projectById.get(projectId)?.name ?? "Project"} hidden — its agents keep running`, duration: 1500 });
  };

  // Bringing a project back puts every one of its hidden tabs on the strip and focuses the first.
  const showProject = (items: SessionItem[]) => {
    for (const item of items.slice(1)) openSessionTab(item.id, false);
    onOpen(items[0]);
  };

  return (
    <div className="flex h-8 shrink-0 items-stretch border-b">
    <nav
      ref={navRef}
      onWheel={scrollOnWheel}
      className="flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Open AI sessions"
    >
      <PlacementMenu target={PlacementTargets.AI_PANEL}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={groups.map((g) => g.projectId)} strategy={horizontalListSortingStrategy}>
            <ul className="flex h-full min-w-0">
              {groups.map(({ projectId, items }) => (
                <ProjectGroup key={projectId} projectId={projectId} project={projectById.get(projectId)} onHide={() => hideProject(projectId, items)}>
                  <GroupSessions
                    projectId={projectId}
                    items={items}
                    activeId={activeId}
                    onOpen={(item) => {
                      promote(item.id);
                      onOpen(item);
                    }}
                    onReorder={setProjectSessionOrder}
                    renderRow={(item) => (
                      <SessionRow
                        item={item}
                        project={projectById.get(item.project_id)}
                        timeHint={repeatedNames.has(`${item.project_id}\u0000${item.name}`) && item.session ? formatTimelineTime(item.session.started_at) : null}
                        active={item.id === activeId}
                        onOpen={() => onOpen(item)}
                        onClose={can(PermissionKeys.AI_USE_AGENTS) ? () => requestClose(item) : undefined}
                        onHide={() => keepRunning(item)}
                      />
                    )}
                  />
                </ProjectGroup>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </PlacementMenu>
      <CloseSessionDialog
        sessionName={closing?.name ?? "This session"}
        open={!!closing}
        isPending={closeTab.isPending}
        onOpenChange={(o) => !o && setClosing(null)}
        onChoose={(stopProcess) => {
          if (!closing) return;
          if (stopProcess) closeTab.mutate({ id: closing.id, stopProcess }, { onSettled: () => setClosing(null) });
          else {
            keepRunning(closing);
            setClosing(null);
          }
        }}
      />
    </nav>
    <HiddenSessionsMenu items={sessions.background} projectById={projectById} onOpen={onOpen} onShowProject={showProject} />
    </div>
  );
}

interface HiddenSessionsMenuProps {
  items: SessionItem[];
  projectById: Map<string, Project>;
  onOpen: (item: SessionItem) => void;
  onShowProject: (items: SessionItem[]) => void;
}

/** Sessions and projects taken off the strip with "Hide" / "Keep running", grouped by project. Picking one puts its tab(s) back. */
function HiddenSessionsMenu({ items, projectById, onOpen, onShowProject }: HiddenSessionsMenuProps) {
  if (!items.length) return null;
  const needsLook = items.filter((i) => i.unseen || i.review_state === SessionReviewStates.READY).length;
  const byProject = new Map<string, SessionItem[]>();
  for (const item of items) byProject.set(item.project_id, [...(byProject.get(item.project_id) ?? []), item]);
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="relative flex h-full shrink-0 items-center gap-1 border-l border-hairline-soft px-2 text-[0.6875rem] tabular-nums text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                  aria-label={`Hidden sessions (${items.length})`}
                >
                  {needsLook > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-info" aria-hidden />}
                  <EyeOff className="size-3.5" />
                  {items.length}
                </button>
              }
            />
          }
        />
        <TooltipContent>Hidden sessions, still running</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="max-h-80 min-w-56 overflow-y-auto">
        {[...byProject].map(([projectId, group], i) => {
          const project = projectById.get(projectId);
          return (
            <div key={projectId}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => onShowProject(group)} className="gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.3px] text-ash" title="Show all sessions of this project">
                {project && <ProjectAvatar name={project.name} color={project.color} size="xs" />}
                <span className="min-w-0 flex-1 truncate">{project?.name ?? "Unknown project"}</span>
                <span className="shrink-0 normal-case tracking-normal">Show all</span>
              </DropdownMenuItem>
              {group.map((item) => {
                const done = item.review_state === SessionReviewStates.REVIEWED || item.review_state === SessionReviewStates.COMMITTED;
                return (
                  <DropdownMenuItem key={item.id} onSelect={() => onOpen(item)} className="gap-2 pl-4">
                    {done ? (
                      <Check className="size-3 shrink-0 text-ash" />
                    ) : (
                      <StatusDot status={reviewStateDot(item.review_state)} className={cn("shrink-0", item.unseen && "animate-pulse")} />
                    )}
                    <span className={cn("min-w-0 flex-1 truncate", item.unseen && "font-semibold")}>{item.name}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** How many of a project's sessions sit on the strip; the rest wait behind its "+" menu. */
const MAX_MAIN_SESSIONS = 3;
const OVERFLOW_DROP_PREFIX = "overflow:";

interface GroupSessionsProps {
  projectId: string;
  items: SessionItem[];
  activeId: string | null;
  onOpen: (item: SessionItem) => void;
  onReorder: (ids: string[]) => void;
  renderRow: (item: SessionItem) => ReactNode;
}

/**
 * One project's session tabs: the first few, sortable by dragging, then a "+" menu holding the rest. Dropping a
 * tab on the "+" moves it there; picking a session from the menu (or reaching one with the keyboard) makes it a main tab.
 */
function GroupSessions({ projectId, items, activeId, onOpen, onReorder, renderRow }: GroupSessionsProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const main = items.slice(0, MAX_MAIN_SESSIONS);
  const overflow = items.slice(MAX_MAIN_SESSIONS);
  const ids = items.map((i) => i.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    if (over.id === `${OVERFLOW_DROP_PREFIX}${projectId}`) {
      onReorder(arrayMove(ids, from, ids.length - 1));
      return;
    }
    onReorder(arrayMove(ids, from, ids.indexOf(String(over.id))));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={main.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
        {main.map((item) => (
          <SortableSessionTab key={item.id} id={item.id}>
            {renderRow(item)}
          </SortableSessionTab>
        ))}
      </SortableContext>
      {overflow.length > 0 && <OverflowSessionsMenu projectId={projectId} items={overflow} activeId={activeId} onOpen={onOpen} />}
    </DndContext>
  );
}

function SortableSessionTab({ id, children }: { id: string; children: ReactNode }) {
  // Only the pointer listeners: the `attributes` would turn the tab into a focusable role="button" around its own buttons.
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      // The strip only scrolls sideways, so a dragged tab follows the pointer on the x axis alone.
      style={{ transform: CSS.Translate.toString(transform && { ...transform, y: 0 }), transition }}
      className={cn("flex h-full shrink-0", isDragging && "relative z-10 bg-surface-card opacity-80")}
    >
      {children}
    </li>
  );
}

interface OverflowSessionsMenuProps {
  projectId: string;
  items: SessionItem[];
  activeId: string | null;
  onOpen: (item: SessionItem) => void;
}

function OverflowSessionsMenu({ projectId, items, activeId, onOpen }: OverflowSessionsMenuProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${OVERFLOW_DROP_PREFIX}${projectId}` });
  const needsLook = items.some((i) => i.unseen || i.review_state === SessionReviewStates.READY);
  const hasActive = items.some((i) => i.id === activeId);

  return (
    <li ref={setNodeRef} className="flex h-full shrink-0">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "relative flex h-full shrink-0 items-center gap-0.5 border-r border-hairline-soft px-2 text-[0.6875rem] tabular-nums text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                      (isOver || hasActive) && "bg-surface-card text-foreground",
                    )}
                    aria-label={`${items.length} more sessions`}
                  >
                    {needsLook && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-info" aria-hidden />}
                    <Plus className="size-3.5" />
                    {items.length}
                  </button>
                }
              />
            }
          />
          <TooltipContent>More sessions — drop a tab here to move it</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="max-h-80 min-w-56 overflow-y-auto">
          {items.map((item) => {
            const done = item.review_state === SessionReviewStates.REVIEWED || item.review_state === SessionReviewStates.COMMITTED;
            return (
              <DropdownMenuItem key={item.id} onSelect={() => onOpen(item)} className="gap-2">
                {done ? (
                  <Check className="size-3 shrink-0 text-ash" />
                ) : (
                  <StatusDot status={reviewStateDot(item.review_state)} className={cn("shrink-0", item.unseen && "animate-pulse")} />
                )}
                <span className={cn("min-w-0 flex-1 truncate", item.unseen && "font-semibold", item.id === activeId && "text-foreground")}>{item.name}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

interface ProjectGroupProps {
  projectId: string;
  project?: Project;
  onHide: () => void;
  children: ReactNode;
}

/** A project's run of session tabs. Its name is the drag handle: dragging it moves the label and all its sessions together. */
function ProjectGroup({ projectId, project, onHide, children }: ProjectGroupProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: projectId });

  return (
    <li
      ref={setNodeRef}
      // The strip only scrolls sideways, so the group follows the pointer on the x axis alone.
      style={{ transform: CSS.Translate.toString(transform && { ...transform, y: 0 }), transition }}
      className={cn("flex h-full shrink-0", isDragging && "relative z-10 bg-surface-card opacity-80")}
    >
      {project && (
        <ContextMenu>
          <ContextMenuTrigger render={<div className="flex h-full shrink-0" onContextMenu={(e) => e.stopPropagation()} />}>
            <span
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              title={`Drag to reorder ${project.name}`}
              style={{ boxShadow: `inset 0 2px 0 ${project.color}` }}
              className={cn(
                "flex h-full max-w-24 shrink-0 cursor-grab touch-none items-center border-r border-hairline-soft px-2 text-[0.625rem] font-semibold uppercase tracking-[0.3px] text-ash hover:bg-surface-elevated",
                isDragging && "cursor-grabbing",
              )}
            >
              <span className="truncate">{project.name}</span>
            </span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={onHide}>
              <EyeOff /> Hide project
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      <ul className="flex h-full">{children}</ul>
    </li>
  );
}

interface SessionRowProps {
  item: SessionItem;
  project?: Project;
  /** Start time, shown only when another open session in the same project has the same name. */
  timeHint: string | null;
  active: boolean;
  onOpen: () => void;
  onClose?: () => void;
  onHide: () => void;
}

function SessionRow({ item, project, timeHint, active, onOpen, onClose, onHide }: SessionRowProps) {
  const state = item.review_state;
  const label = getDropdownOptionLabel(SessionReviewStateOptions, state);
  const ready = state === SessionReviewStates.READY;
  const done = state === SessionReviewStates.REVIEWED || state === SessionReviewStates.COMMITTED;
  const markReviewed = useMarkSessionReviewed();

  // Opening a session from its tab counts as reviewing it, the same as dismissing the badge.
  const open = () => {
    if (ready) markReviewed.mutate({ id: item.id });
    onOpen();
  };

  // The name is the only button in the row, so the review and close controls are siblings rather
  // than nested inside it.
  const row = (
    <div
      style={project ? { boxShadow: `inset 0 2px 0 ${project.color}` } : undefined}
      onContextMenu={(e) => e.stopPropagation()}
      // Without preventing default on the middle-button mousedown, Chrome enters its autoscroll mode
      // instead of letting the click through cleanly to `onAuxClick` below.
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onAuxClick={(e) => e.button === 1 && onClose?.()}
      className={cn(
        "group relative flex h-full items-center gap-1 border-r border-hairline-soft pr-1 text-xs text-body hover:bg-surface-elevated",
        ready && !active && "bg-info-soft",
        done && "text-muted-foreground",
        active && "bg-surface-card text-foreground before:absolute before:inset-x-0 before:bottom-0 before:h-0.5 before:bg-foreground",
      )}
    >
      <button
        type="button"
        data-session-id={item.id}
        aria-current={active ? "true" : undefined}
        onClick={open}
        title={`${item.name} · ${project?.name ?? "Unknown project"} · ${item.agent_type ? getAgentTypeLabel(item.agent_type) : ""} · ${label}`}
        className="flex h-full shrink-0 items-center gap-1.5 pl-2 text-left outline-none focus-visible:bg-surface-elevated"
      >
        {done ? (
          <Check className="size-3 shrink-0 text-ash" aria-label={label} />
        ) : (
          <StatusDot status={reviewStateDot(state)} title={label} className={cn("shrink-0", item.unseen && "animate-pulse")} />
        )}
        <span className={cn("max-w-32 truncate", (ready || item.unseen) && "font-semibold")}>{item.name}</span>
        {timeHint && <span className="shrink-0 text-[0.6875rem] tabular-nums text-ash">{timeHint}</span>}
      </button>
      {ready && (
        <button
          type="button"
          onClick={() => markReviewed.mutate({ id: item.id })}
          className="shrink-0 rounded-full bg-info px-1.5 py-px text-[0.625rem] font-bold leading-4 text-[#04121b] hover:brightness-110"
          aria-label={`Dismiss review badge for ${item.name}`}
          title="Needs review — click to dismiss"
        >
          Review
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100",
            active && "opacity-100",
          )}
          aria-label={`Close ${item.name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );

  return item.session ? <SessionContextMenu session={item.session} item={item} onHide={onHide}>{row}</SessionContextMenu> : row;
}
