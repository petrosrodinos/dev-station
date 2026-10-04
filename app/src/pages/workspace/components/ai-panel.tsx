import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, History, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates, type AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useRowSelection } from "@/hooks/use-row-selection";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot } from "@/lib/status";
import { jumpToSession } from "@/lib/session-navigation.utils";
import { formatRelative } from "@/lib/date";
import { AiPanelModes, useWorkspaceStore } from "@/stores/workspace";
import { useLayoutStore } from "@/stores/layout";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { DeleteSessionsDialog, SessionContextMenu } from "./session-context-menu";
import { PlacementMenu, PlacementTargets } from "./placement-menu";
import { SessionNavigator } from "./session-navigator";
import { SessionActionsMenu } from "./session-actions-menu";
import { SessionTerminalStage } from "./session-terminal-stage";
import { nextReviewSession, type OpenSessions, type SessionItem } from "../hooks/use-open-sessions";
import { cn } from "@/lib/utils";

/**
 * Right-hand panel — the hub for parallel agent work: the open sessions as one flat list with their
 * review state, the focused session's terminal, and the review bar (commit → next).
 * The history toggle swaps in the full list of recent sessions.
 */
export function AiPanel({ sessions }: { sessions: OpenSessions }) {
  const navigate = useNavigate();
  const mode = useWorkspaceStore((s) => s.ai_panel_mode);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const { data: projects } = useGetProjects();
  const history = mode === AiPanelModes.SESSIONS;
  const activeItem = sessions.ordered.find((i) => i.id === activeId) ?? null;
  const setMode = useWorkspaceStore((s) => s.setAiPanelMode);
  const historyLabel = history ? "Back to open sessions" : "Session history";
  const aiFullWidth = useLayoutStore((s) => s.ai_full_width);
  const setAiFullWidth = useLayoutStore((s) => s.setAiFullWidth);
  const fullWidthLabel = aiFullWidth ? "Show workspace" : "Full-width AI panel";
  const { can } = usePermissions();
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);

  const openItem = (item: SessionItem) =>
    jumpToSession(item.id, navigate, { fallbackProjectId: item.project_id, review: item.review_state === SessionReviewStates.READY ? { projects } : undefined });

  const openNext = () => {
    const next = nextReviewSession(sessions, activeId, useWorkspaceStore.getState().attention_session_ids);
    if (next) openItem(next);
  };

  return (
    <aside className="flex h-full min-w-0 flex-col bg-surface" aria-label="AI panel">
      <PlacementMenu target={PlacementTargets.AI_PANEL}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-2">
        <span className="px-1 text-[0.7813rem] font-medium text-muted-foreground">{history ? "Session history" : "AI sessions"}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <SessionActionsMenu item={activeItem} />
          {can(PermissionKeys.AI_START_AGENTS) && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => openNewSession({ project_id: activeProjectId })}
                    aria-label="New AI session"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent>New AI session</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setMode(history ? AiPanelModes.TERMINAL : AiPanelModes.SESSIONS)}
                  aria-label={historyLabel}
                  aria-pressed={history}
                  className={cn("flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", history && "bg-accent text-foreground")}
                >
                  <History className="size-3.5" />
                </button>
              }
            />
            <TooltipContent>{historyLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setAiFullWidth(!aiFullWidth)}
                  aria-label={fullWidthLabel}
                  aria-pressed={aiFullWidth}
                  className={cn("flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", aiFullWidth && "bg-accent text-foreground")}
                >
                  {aiFullWidth ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
                </button>
              }
            />
            <TooltipContent>{fullWidthLabel}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      </PlacementMenu>
      <div className="flex min-h-0 flex-1 flex-col">
        {history ? (
          <SessionList />
        ) : (
          <>
            <SessionNavigator sessions={sessions} activeId={activeId} onOpen={openItem} />
            <SessionTerminalStage onNext={openNext} />
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
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openNewSession = useDialogsStore((s) => s.openNewSession);

  // Every session in one flat list, labelled with its project. A session whose project no longer
  // exists (deleted since) still lands here, just without a project name.
  const sessions = useMemo(() => data?.data ?? [], [data]);
  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);

  const { can } = usePermissions();
  const canDelete = can(PermissionKeys.AI_USE_AGENTS);
  const orderedIds = useMemo(() => sessions.map((s) => s.id), [sessions]);
  const selection = useRowSelection(orderedIds, { enabled: canDelete });
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isPending) return <ListSkeleton rows={8} />;
  if (!sessions.length)
    return (
      <EmptyState
        className="flex-1"
        icon={<Bot />}
        title="No AI sessions yet"
        description="Sessions from every project appear here."
        action={
          can(PermissionKeys.AI_START_AGENTS) && (
            <Button size="sm" onClick={() => openNewSession({ project_id: activeProjectId })}>
              New AI session
            </Button>
          )
        }
      />
    );

  const open = (s: AgentSession) => {
    setActiveProject(s.project_id);
    openSessionTab(s.id);
    navigate(Routes.workspace.project(s.project_id));
  };

  return (
    <>
    {selection.selected.size > 0 && (
      <div className="flex h-9 shrink-0 items-center gap-1 border-b bg-surface-elevated px-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{selection.selected.size} selected</span>
        <span className="ml-1 hidden text-ash sm:inline">· Shift+click for a range, Ctrl+click to toggle</span>
        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={selection.clear}>
          Clear
        </Button>
        <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    )}
    <div className="min-h-0 flex-1 overflow-y-auto">
      {sessions.map((s) => {
        const status = runtimeAgents[s.id]?.status ?? s.status;
        const isSelected = selection.selected.has(s.id);
        const project = projectById.get(s.project_id);
        return (
          <SessionContextMenu key={s.id} session={s}>
            <button
              onClick={(e) => selection.onRowClick(e, s.id) || open(s)}
              onMouseDown={selection.onRowMouseDown}
              aria-pressed={selection.selected.size ? isSelected : undefined}
              className={cn(
                "flex w-full select-none items-center gap-2.5 border-b border-hairline-soft px-4 py-2.5 text-left hover:bg-surface-elevated",
                s.id === activeId && "bg-surface-card",
                isSelected && "relative bg-accent before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground hover:bg-accent",
              )}
            >
              <StatusDot status={agentStatusDot(status)} />
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-[0.8125rem] font-medium", attention.includes(s.id) && "text-foreground")}>{s.name}</div>
                <div className="flex min-w-0 items-center gap-1.5 text-[0.7188rem] text-muted-foreground">
                  {project && <ProjectFlag color={project.color} className="h-3" />}
                  <span className="truncate">
                    {project?.name ?? "Unknown project"} · {getAgentTypeLabel(s.agent_type)} · {getDropdownOptionLabel(AgentStatusOptions, status)} · {formatRelative(s.started_at)}
                  </span>
                </div>
              </div>
            </button>
          </SessionContextMenu>
        );
      })}
    </div>
    <DeleteSessionsDialog ids={[...selection.selected]} open={confirmDelete} onOpenChange={setConfirmDelete} onDeleted={selection.clear} />
    </>
  );
}
