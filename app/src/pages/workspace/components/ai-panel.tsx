import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, CircleCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates, type AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot } from "@/lib/status";
import { jumpToSession } from "@/lib/session-navigation.utils";
import { formatRelative } from "@/lib/date";
import { AiPanelModes, useWorkspaceStore } from "@/stores/workspace";
import { useRuntimeStore } from "@/stores/runtime";
import { Routes } from "@/routes/routes";
import { SessionContextMenu } from "./session-context-menu";
import { SessionNavigator } from "./session-navigator";
import { SessionTerminalStage } from "./session-terminal-stage";
import { nextReviewSession, type SessionGroups, type SessionItem } from "../hooks/use-session-groups";
import { cn } from "@/lib/utils";

/**
 * Right-hand panel — the hub for parallel agent work: every open session grouped by project with
 * its review state, the focused session's terminal, and the review bar (commit → next).
 * The history toggle swaps in the full list of recent sessions.
 */
export function AiPanel({ groups }: { groups: SessionGroups }) {
  const navigate = useNavigate();
  const mode = useWorkspaceStore((s) => s.ai_panel_mode);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const { data: projects } = useGetProjects();
  const nextCombo = useResolvedShortcuts().find((s) => s.id === ShortcutActions.GO_TO_FINISHED_SESSION)?.combo;
  const history = mode === AiPanelModes.SESSIONS;

  const openItem = (item: SessionItem) =>
    jumpToSession(item.id, navigate, { fallbackProjectId: item.project_id, review: item.review_state === SessionReviewStates.READY ? { projects } : undefined });

  const openNext = () => {
    const next = nextReviewSession(groups, activeId, useWorkspaceStore.getState().attention_session_ids);
    if (next) openItem(next);
  };

  return (
    <aside className="flex h-full min-w-0 flex-col bg-surface" aria-label="AI panel">
      {/* This bar used to always show (label + history toggle + "New"), which was dead weight once
          there was nothing to review — the history toggle moved to the panel's own dock tab (see
          `AiPanelHeaderActions` in `workspace-dock.tsx`), "New" was dropped (redundant with the
          per-project "+" in `SessionNavigator` and Overview's "New session"), so now this only
          renders when there's actually something to say. */}
      {groups.ready.length > 0 && !history && (
        <div className="flex h-9 shrink-0 items-center border-b px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={openNext}
                className="flex h-7 items-center gap-1.5 rounded-full bg-info-soft pl-2 pr-1 text-[0.7813rem] font-medium text-info hover:brightness-110"
              >
                <CircleCheck className="size-3.5" /> Needs review
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-info px-1.5 text-[0.6875rem] font-bold text-[#04121b]">{groups.ready.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              Open the next session to review {nextCombo && <ShortcutKeys combo={nextCombo} />}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        {history ? (
          <SessionList />
        ) : (
          <>
            <SessionNavigator groups={groups} activeId={activeId} onOpen={openItem} />
            <SessionTerminalStage groups={groups} onNext={openNext} />
          </>
        )}
      </div>
    </aside>
  );
}

function SessionList() {
  const navigate = useNavigate();
  const { data, isPending } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const attention = useWorkspaceStore((s) => s.attention_session_ids);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);

  if (isPending) return <ListSkeleton rows={8} />;
  if (!data?.data.length) return <EmptyState className="flex-1" icon={<Bot />} title="No AI sessions yet" description="Sessions from every project appear here." />;

  const open = (s: AgentSession) => {
    setActiveProject(s.project_id);
    openSessionTab(s.id);
    navigate(Routes.workspace.project(s.project_id));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {data.data.map((s) => {
        const project = projectById.get(s.project_id);
        const status = runtimeAgents[s.id]?.status ?? s.status;
        return (
          <SessionContextMenu key={s.id} session={s}>
            <button
              onClick={() => open(s)}
              className={cn("flex w-full items-center gap-2.5 border-b border-hairline-soft px-4 py-2.5 text-left hover:bg-surface-elevated", s.id === activeId && "bg-surface-card")}
            >
              <StatusDot status={agentStatusDot(status)} />
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-[0.8125rem] font-medium", attention.includes(s.id) && "text-foreground")}>{s.name}</div>
                <div className="truncate text-[0.7188rem] text-muted-foreground">
                  {project?.name ?? "—"} · {getAgentTypeLabel(s.agent_type)} · {getDropdownOptionLabel(AgentStatusOptions, status)} · {formatRelative(s.started_at)}
                </div>
              </div>
              {project && <ProjectFlag color={project.color} className="h-[22px]" />}
            </button>
          </SessionContextMenu>
        );
      })}
    </div>
  );
}
