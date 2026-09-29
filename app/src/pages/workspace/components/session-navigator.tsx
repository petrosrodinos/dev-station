import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Plus, X } from "lucide-react";
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

/** Open sessions across all projects, grouped by project, with their review state. Collapsible to a one-line summary. */
export function SessionNavigator({ groups, activeId, onOpen }: SessionNavigatorProps) {
  const navigate = useNavigate();
  const collapsed = useWorkspaceStore((s) => s.session_list_collapsed);
  const setCollapsed = useWorkspaceStore((s) => s.setSessionListCollapsed);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const closeTab = useCloseSessionTab();
  const { can } = usePermissions();
  const [closing, setClosing] = useState<SessionItem | null>(null);

  if (!groups.ordered.length) return null;

  const working = groups.ordered.filter((i) => i.review_state === SessionReviewStates.WORKING).length;

  const requestClose = (item: SessionItem) => {
    if (item.runtime?.alive && isAgentActive(item.status)) setClosing(item);
    else closeTab.mutate({ id: item.id, stopProcess: !!item.runtime });
  };

  const selectProject = (project: Project) => {
    setActiveProject(project.id);
    navigate(projectRouteKeepingTab(project.id, window.location.pathname));
  };

  return (
    <div className="flex max-h-[45%] shrink-0 flex-col border-b">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-8 shrink-0 items-center gap-1.5 px-3 text-[0.7188rem] text-muted-foreground hover:text-foreground"
        aria-expanded={!collapsed}
      >
        <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-90")} />
        <span className="font-medium uppercase tracking-[0.4px]">Sessions</span>
        <span className="text-ash">{groups.ordered.length}</span>
        {working > 0 && <span className="ml-auto text-ash">{working} working</span>}
      </button>
      {!collapsed && (
        <div className="min-h-0 overflow-y-auto pb-1.5">
          {groups.groups.map((group) => (
            <div key={group.project.id}>
              <div className="group/project flex h-7 items-center gap-2 pl-3 pr-2">
                <ProjectFlag color={group.project.color} className="h-3" />
                <button
                  onClick={() => selectProject(group.project)}
                  className={cn(
                    "min-w-0 truncate text-[0.6875rem] font-semibold uppercase tracking-[0.4px] text-muted-foreground hover:text-foreground",
                    group.project.id === activeProjectId && "text-foreground",
                  )}
                >
                  {group.project.name}
                </button>
                {group.ready > 0 && <span className="shrink-0 text-[0.6875rem] font-medium text-info">{group.ready} ready</span>}
                {can(PermissionKeys.AI_START_AGENTS) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openNewSession({ project_id: group.project.id })}
                        className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground focus-visible:opacity-100 group-hover/project:opacity-100"
                        aria-label={`New session in ${group.project.name}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>New session in {group.project.name}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {group.sessions.map((item) => (
                <SessionRow
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onOpen={() => onOpen(item)}
                  onClose={can(PermissionKeys.AI_USE_AGENTS) ? () => requestClose(item) : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      <CloseSessionDialog
        sessionName={closing?.name ?? "This session"}
        open={!!closing}
        isPending={closeTab.isPending}
        onOpenChange={(o) => !o && setClosing(null)}
        onChoose={(stopProcess) => closing && closeTab.mutate({ id: closing.id, stopProcess }, { onSettled: () => setClosing(null) })}
      />
    </div>
  );
}

interface SessionRowProps {
  item: SessionItem;
  active: boolean;
  onOpen: () => void;
  onClose?: () => void;
}

function SessionRow({ item, active, onOpen, onClose }: SessionRowProps) {
  const state = item.review_state;
  const label = getDropdownOptionLabel(SessionReviewStateOptions, state);
  const ready = state === SessionReviewStates.READY;
  const done = state === SessionReviewStates.REVIEWED || state === SessionReviewStates.COMMITTED;

  const row = (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      onAuxClick={(e) => e.button === 1 && onClose?.()}
      title={`${item.name} · ${item.agent_type ? getAgentTypeLabel(item.agent_type) : ""} · ${label}`}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group relative flex h-8 cursor-pointer select-none items-center gap-2 pl-[1.4rem] pr-2 text-[0.8125rem] text-body outline-none hover:bg-surface-elevated focus-visible:bg-surface-elevated",
        active && "bg-surface-card text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-sm before:bg-foreground",
      )}
    >
      {done ? (
        <Check className="size-3 shrink-0 text-ash" aria-label={label} />
      ) : (
        <StatusDot status={reviewStateDot(state)} title={label} className={cn(item.unseen && "animate-pulse")} />
      )}
      <span className={cn("min-w-0 flex-1 truncate", (ready || item.unseen) && "font-medium text-foreground", done && "text-muted-foreground")}>{item.name}</span>
      <span
        className={cn(
          "shrink-0 text-[0.6875rem]",
          ready ? "rounded-full bg-info-soft px-1.5 py-px font-medium text-info" : state === SessionReviewStates.FAILED ? "text-danger" : "text-ash",
          onClose && "group-hover:hidden",
        )}
      >
        {label}
      </span>
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="hidden size-5 shrink-0 items-center justify-center rounded-xs text-ash hover:bg-surface-card hover:text-foreground group-hover:flex"
          aria-label={`Close ${item.name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );

  return item.session ? <SessionContextMenu session={item.session}>{row}</SessionContextMenu> : row;
}
