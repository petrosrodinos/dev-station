import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { useCloseSessionTab, useMarkSessionReviewed } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { SessionReviewStateOptions } from "@/config/constants/dropdowns/agents/session-review-state.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { isAgentActive, reviewStateDot } from "@/lib/status";
import { useWorkspaceStore } from "@/stores/workspace";
import { useQuickStartSession } from "@/features/agent-sessions/hooks/use-quick-start-session";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import type { SessionGroups, SessionItem } from "../hooks/use-session-groups";
import { CloseSessionDialog } from "./close-session-dialog";
import { SessionContextMenu } from "./session-context-menu";
import { PlacementMenu, PlacementTargets } from "./placement-menu";

interface SessionNavigatorProps {
  groups: SessionGroups;
  activeId: string | null;
  onOpen: (item: SessionItem) => void;
}

/**
 * Open sessions across all projects, grouped by project: each project is a header bar (flag, name,
 * ready and session counts, new-session button) with its sessions stacked beneath it. The headers
 * stick while their sessions scroll, and the list takes at most part of the panel's height, so it
 * reads the same whether there are two projects or twenty.
 */
export function SessionNavigator({ groups, activeId, onOpen }: SessionNavigatorProps) {
  const navigate = useNavigate();
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const quickStartSession = useQuickStartSession();
  const closeTab = useCloseSessionTab();
  const { can } = usePermissions();
  const [closing, setClosing] = useState<SessionItem | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Keep the focused session in view (e.g. after "next review" jumps to one scrolled out of sight).
  useEffect(() => {
    if (!activeId) return;
    navRef.current?.querySelector<HTMLElement>(`[data-session-id="${activeId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  if (!groups.ordered.length) return null;

  const requestClose = (item: SessionItem) => {
    if (item.runtime?.alive && isAgentActive(item.status)) setClosing(item);
    else closeTab.mutate({ id: item.id, stopProcess: !!item.runtime });
  };

  const selectProject = (project: Project) => {
    setActiveProject(project.id);
    navigate(Routes.workspace.project(project.id));
  };

  return (
    <nav ref={navRef} className="flex max-h-[40%] shrink-0 flex-col overflow-y-auto border-b" aria-label="Open AI sessions">
      <PlacementMenu target={PlacementTargets.AI_PANEL}>
        <div>
          {groups.groups.map((group) => (
            <section key={group.project.id} aria-label={group.project.name} className="group/project border-b border-hairline-soft last:border-b-0">
              <header className="sticky top-0 z-10 flex h-8 items-center gap-1.5 bg-surface pl-2 pr-1.5">
                <button
                  onClick={() => selectProject(group.project)}
                  title={group.project.name}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.4px] text-muted-foreground hover:text-foreground",
                    group.project.id === activeProjectId && "text-foreground",
                  )}
                >
                  <ProjectFlag color={group.project.color} className="h-3.5" />
                  <span className="truncate">{group.project.name}</span>
                </button>
                {group.ready > 0 && (
                  <span title="Ready for review" className="shrink-0 rounded-full bg-info-soft px-1.5 text-[0.625rem] font-semibold leading-4 text-info">
                    {group.ready} ready
                  </span>
                )}
                <span className="shrink-0 text-[0.6875rem] tabular-nums text-ash">{group.sessions.length}</span>
                {can(PermissionKeys.AI_START_AGENTS) && (
                  <button
                    onClick={() => quickStartSession(group.project.id)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover/project:opacity-100"
                    aria-label={`New session in ${group.project.name}`}
                    title={`New session in ${group.project.name}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                )}
              </header>
              <ul>
                {group.sessions.map((item) => (
                  <li key={item.id}>
                    <SessionRow
                      item={item}
                      active={item.id === activeId}
                      onOpen={() => onOpen(item)}
                      onClose={can(PermissionKeys.AI_USE_AGENTS) ? () => requestClose(item) : undefined}
                    />
                  </li>
                ))}
              </ul>
            </section>
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
  const markReviewed = useMarkSessionReviewed();

  // The name is the only button in the row, so the review and close controls are siblings rather
  // than nested inside it.
  const row = (
    <div
      onContextMenu={(e) => e.stopPropagation()}
      // Without preventing default on the middle-button mousedown, Chrome enters its autoscroll mode
      // instead of letting the click through cleanly to `onAuxClick` below.
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onAuxClick={(e) => e.button === 1 && onClose?.()}
      className={cn(
        "group relative flex h-7 items-center gap-1 pr-1 text-xs text-body hover:bg-surface-elevated",
        ready && !active && "bg-info-soft",
        done && "text-muted-foreground",
        active && "bg-surface-card text-foreground before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground",
      )}
    >
      <button
        type="button"
        data-session-id={item.id}
        aria-current={active ? "true" : undefined}
        onClick={onOpen}
        title={`${item.name} · ${item.agent_type ? getAgentTypeLabel(item.agent_type) : ""} · ${label}`}
        className="flex h-full min-w-0 flex-1 items-center gap-2 pl-5 text-left outline-none focus-visible:bg-surface-elevated"
      >
        {done ? (
          <Check className="size-3 shrink-0 text-ash" aria-label={label} />
        ) : (
          <StatusDot status={reviewStateDot(state)} title={label} className={cn(item.unseen && "animate-pulse")} />
        )}
        <span className={cn("min-w-0 flex-1 truncate", (ready || item.unseen) && "font-semibold")}>{item.name}</span>
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

  return item.session ? <SessionContextMenu session={item.session}>{row}</SessionContextMenu> : row;
}
