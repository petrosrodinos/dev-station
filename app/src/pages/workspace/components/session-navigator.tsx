import { useEffect, useRef, useState, type WheelEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCloseSessionTab } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { SessionReviewStateOptions } from "@/config/constants/dropdowns/agents/session-review-state.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { projectRouteKeepingTab } from "@/lib/project-route.utils";
import { isAgentActive, reviewStateDot } from "@/lib/status";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDialogsStore } from "@/stores/dialogs";
import { cn } from "@/lib/utils";
import type { SessionGroups, SessionItem } from "../hooks/use-session-groups";
import { CloseSessionDialog } from "./close-session-dialog";
import { SessionContextMenu } from "./session-context-menu";

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
  const openNewSession = useDialogsStore((s) => s.openNewSession);
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
      <div ref={scroller} onWheel={onWheel} className="flex h-9 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.groups.map((group) => (
          <div key={group.project.id} className="group/project flex shrink-0 items-stretch border-r">
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
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
                onClick={() => openNewSession({ project_id: group.project.id })}
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
  const state = item.review_state;
  const label = getDropdownOptionLabel(SessionReviewStateOptions, state);
  const ready = state === SessionReviewStates.READY;
  const done = state === SessionReviewStates.REVIEWED || state === SessionReviewStates.COMMITTED;

  const tab = (
    <div
      role="tab"
      tabIndex={0}
      data-session-id={item.id}
      aria-selected={active}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
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
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100",
            active && "opacity-100",
          )}
          aria-label={`Close ${item.name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );

  return item.session ? <SessionContextMenu session={item.session}>{tab}</SessionContextMenu> : tab;
}
