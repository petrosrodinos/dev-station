import { useState, useEffect, useRef, type WheelEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ExternalLink, FileDiff, MoreHorizontal, PictureInPicture2, Plus, RotateCw, Square, Trash2, X } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  useCloseSessionTab,
  useOpenAgentExternally,
  useRestartAgentSession,
  useStopAgentSession,
} from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { SessionReviewStateOptions } from "@/config/constants/dropdowns/agents/session-review-state.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { projectRouteKeepingTab } from "@/lib/project-route.utils";
import { isAgentActive, reviewStateDot } from "@/lib/status";
import { getBridge, isDesktop } from "@/lib/desktop";
import { useWorkspaceStore } from "@/stores/workspace";
import { useLayoutStore } from "@/stores/layout";
import { useQuickStartSession } from "@/features/agent-sessions/hooks/use-quick-start-session";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import type { SessionGroups, SessionItem } from "../hooks/use-session-groups";
import { CloseSessionDialog } from "./close-session-dialog";
import { DeleteSessionDialog, SessionContextMenu } from "./session-context-menu";
import { PlacementMenu, PlacementTargets } from "./placement-menu";

interface SessionNavigatorProps {
  groups: SessionGroups;
  activeId: string | null;
  onOpen: (item: SessionItem) => void;
}

/**
 * Open sessions across all projects as one row of tabs, segmented per project (color flag + name,
 * then that project's tabs). Scrolls horizontally, so it stays one line however many sessions run.
 */
export function SessionNavigator({ groups, activeId, onOpen }: SessionNavigatorProps) {
  const navigate = useNavigate();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const quickStartSession = useQuickStartSession();
  const closeTab = useCloseSessionTab();
  const { can } = usePermissions();
  const [closing, setClosing] = useState<SessionItem | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the focused tab in view (e.g. after "next review" jumps to a tab scrolled off-screen).
  useEffect(() => {
    if (!activeId) return;
    scroller.current?.querySelector<HTMLElement>(`[data-session-id="${activeId}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  if (!groups.ordered.length) return null;

  const requestClose = (item: SessionItem) => {
    if (item.runtime?.alive && isAgentActive(item.status)) setClosing(item);
    else closeTab.mutate({ id: item.id, stopProcess: !!item.runtime });
  };

  const selectProject = (project: Project) => {
    setActiveProject(project.id);
    navigate(projectRouteKeepingTab(project.id, window.location.pathname));
  };

  // A mouse wheel scrolls the row sideways.
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY && !e.deltaX && scroller.current) scroller.current.scrollLeft += e.deltaY;
  };

  return (
    <nav className="shrink-0 border-b" aria-label="Open AI sessions">
      <PlacementMenu target={PlacementTargets.AI_PANEL}>
      <div ref={scroller} onWheel={onWheel} className="flex h-9 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.groups.map((group) => (
          <div key={group.project.id} className="group/project flex shrink-0 items-stretch border-r">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => selectProject(group.project)}
                    className={cn(
                      "flex max-w-28 items-center gap-1.5 pl-2 pr-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.4px] text-muted-foreground hover:text-foreground",
                      group.project.id === activeProjectId && "text-foreground",
                    )}
                  >
                    <ProjectFlag color={group.project.color} className="h-3.5" />
                    <span className="truncate">{group.project.name}</span>
                  </button>
                }
              />
              <TooltipContent>
                {group.project.name} · {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"}
                {group.ready > 0 && ` · ${group.ready} ready for review`}
              </TooltipContent>
            </Tooltip>
            {group.sessions.map((item) => (
              <SessionTab
                key={item.id}
                item={item}
                active={item.id === activeId}
                onOpen={() => onOpen(item)}
                onClose={can(PermissionKeys.AI_USE_AGENTS) ? () => requestClose(item) : undefined}
              />
            ))}
            {can(PermissionKeys.AI_START_AGENTS) && (
              <button
                onClick={() => quickStartSession(group.project.id)}
                className="flex w-0 items-center justify-center overflow-hidden text-ash hover:text-foreground focus-visible:w-6 group-hover/project:w-6"
                aria-label={`New session in ${group.project.name}`}
                title={`New session in ${group.project.name}`}
              >
                <Plus className="size-3.5 shrink-0" />
              </button>
            )}
          </div>
        ))}
      </div>
      </PlacementMenu>
      <CloseSessionDialog
        sessionName={closing?.name ?? "This session"}
        open={!!closing}
        isPending={closeTab.isPending}
        onOpenChange={(o) => !o && setClosing(null)}
        onChoose={(stopProcess) => closing && closeTab.mutate({ id: closing.id, stopProcess }, { onSettled: () => setClosing(null) })}
      />
    </nav>
  );
}

interface SessionTabProps {
  item: SessionItem;
  active: boolean;
  onOpen: () => void;
  onClose?: () => void;
}

function SessionTab({ item, active, onOpen, onClose }: SessionTabProps) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const restart = useRestartAgentSession();
  const stop = useStopAgentSession();
  const openExternal = useOpenAgentExternally();
  const addFloating = useLayoutStore((s) => s.addFloating);

  const state = item.review_state;
  const label = getDropdownOptionLabel(SessionReviewStateOptions, state);
  const ready = state === SessionReviewStates.READY;
  const done = state === SessionReviewStates.REVIEWED || state === SessionReviewStates.COMMITTED;
  const runtime = item.runtime;
  const hasAgentActions = !!runtime && can(PermissionKeys.AI_USE_AGENTS);
  const hasChanges = !!item.changes && item.changes.files_changed > 0;
  const canFloat = isDesktop();
  const canDelete = !!item.session && can(PermissionKeys.AI_USE_AGENTS);
  const hasMenu = hasAgentActions || hasChanges || canFloat || canDelete;

  // Ported from the per-session terminal header this used to live in (see `session-terminal-panel.tsx`)
  // — relocated here so it stays reachable for a background tab too, not only the focused session's.
  const floatPanel = () => {
    if (!isDesktop()) return;
    const panelId = `session:${item.id}`;
    void getBridge().layout.openFloatingPanel({ panelId, componentType: "session-terminal", params: { sessionId: item.id }, title: item.name });
    addFloating({ panelId, componentType: "session-terminal", params: { sessionId: item.id }, bounds: { x: 0, y: 0, width: 640, height: 480 } });
  };

  const tab = (
    <div
      role="tab"
      onContextMenu={(e) => e.stopPropagation()}
      tabIndex={0}
      data-session-id={item.id}
      aria-selected={active}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      // Without preventing default on the middle-button mousedown, Chrome enters its autoscroll mode
      // instead of letting the click through cleanly to `onAuxClick` below.
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onAuxClick={(e) => e.button === 1 && onClose?.()}
      title={`${item.name} · ${item.agent_type ? getAgentTypeLabel(item.agent_type) : ""} · ${label}`}
      className={cn(
        "group relative flex w-32 shrink-0 cursor-pointer select-none items-center gap-1.5 pl-2 pr-1 text-xs text-body outline-none hover:bg-surface-elevated focus-visible:bg-surface-elevated",
        ready && "bg-info-soft/60 text-foreground",
        done && "text-muted-foreground",
        active && "bg-surface-card text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground",
      )}
    >
      {done ? (
        <Check className="size-3 shrink-0 text-ash" aria-label={label} />
      ) : (
        <StatusDot status={reviewStateDot(state)} title={label} className={cn(item.unseen && "animate-pulse")} />
      )}
      <span className={cn("min-w-0 flex-1 truncate", (ready || item.unseen) && "font-semibold")}>{item.name}</span>
      <div className={cn("flex shrink-0 items-center opacity-0 group-hover:opacity-100", active && "opacity-100")}>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash hover:bg-surface-card hover:text-foreground"
                  aria-label={`${item.name} options`}
                >
                  <MoreHorizontal className="size-3" />
                </button>
              }
            />
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {hasChanges && (
                <DropdownMenuItem onSelect={() => navigate(Routes.workspace.project_tab(item.project_id, ProjectTabs.GIT))}>
                  <FileDiff className="size-3.5" /> Review changes
                </DropdownMenuItem>
              )}
              {hasAgentActions && runtime && (
                <>
                  <DropdownMenuItem onSelect={() => restart.mutate(runtime.id)} disabled={restart.isPending}>
                    <RotateCw className="size-3.5" /> Restart
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => stop.mutate(runtime.id)} disabled={!runtime.alive || stop.isPending}>
                    <Square className="size-3.5" /> Stop
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openExternal.mutate(runtime.id)}>
                    <ExternalLink className="size-3.5" /> Open in external terminal
                  </DropdownMenuItem>
                </>
              )}
              {canFloat && (
                <DropdownMenuItem onSelect={floatPanel}>
                  <PictureInPicture2 className="size-3.5" /> Float in its own window
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  {(hasAgentActions || hasChanges || canFloat) && <DropdownMenuSeparator />}
                  <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setConfirmDelete(true)}>
                    <Trash2 className="size-3.5" /> Delete session
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash hover:bg-surface-card hover:text-foreground"
            aria-label={`Close ${item.name}`}
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      {item.session && canDelete && <DeleteSessionDialog session={item.session} open={confirmDelete} onOpenChange={setConfirmDelete} />}
    </div>
  );

  return item.session ? <SessionContextMenu session={item.session}>{tab}</SessionContextMenu> : tab;
}
