import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, CircleCheck, ExternalLink, FileDiff, History, Plus, RotateCw, Square, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import {
  useAgentSessions,
  useOpenAgentExternally,
  useRestartAgentSession,
  useRuntimeAgent,
  useStopAgentSession,
} from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates, type AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useAgentTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { SessionReviewStateOptions } from "@/config/constants/dropdowns/agents/session-review-state.options";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot, reviewStateDot } from "@/lib/status";
import { jumpToSession } from "@/lib/session-navigation.utils";
import { formatRelative } from "@/lib/date";
import { isDesktop } from "@/lib/desktop";
import { AiPanelModes, useWorkspaceStore } from "@/stores/workspace";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { DeleteSessionDialog, SessionContextMenu } from "./session-context-menu";
import { SessionNavigator } from "./session-navigator";
import { SessionReviewBar } from "./session-review-bar";
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
  const setMode = useWorkspaceStore((s) => s.setAiPanelMode);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const { data: projects } = useGetProjects();
  const nextCombo = useResolvedShortcuts().find((s) => s.id === ShortcutActions.GO_TO_FINISHED_SESSION)?.combo;
  const { can } = usePermissions();
  const history = mode === AiPanelModes.SESSIONS;

  const openItem = (item: SessionItem) =>
    jumpToSession(item.id, navigate, { fallbackProjectId: item.project_id, review: item.review_state === SessionReviewStates.READY ? { projects } : undefined });

  const openNext = () => {
    const next = nextReviewSession(groups, activeId, useWorkspaceStore.getState().attention_session_ids);
    if (next) openItem(next);
  };

  return (
    <aside className="flex h-full min-w-0 flex-col bg-surface" aria-label="AI panel">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        {groups.ready.length > 0 && !history ? (
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
        ) : (
          <span className="flex items-center gap-1.5 text-[0.7813rem] font-medium text-muted-foreground">
            <Bot className="size-3.5" /> {history ? "Recent sessions" : "AI sessions"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <PanelIconButton label={history ? "Back to open sessions" : "Session history"} onClick={() => setMode(history ? AiPanelModes.TERMINAL : AiPanelModes.SESSIONS)} pressed={history}>
            <History className="size-3.5" />
          </PanelIconButton>
          {can(PermissionKeys.AI_START_AGENTS) && (
            <Button size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs" onClick={() => openNewSession({ project_id: activeProjectId })}>
              <Plus className="size-3.5" /> New
            </Button>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {history ? (
          <SessionList />
        ) : (
          <>
            <SessionNavigator groups={groups} activeId={activeId} onOpen={openItem} />
            <ActiveSessionTerminal groups={groups} onNext={openNext} />
          </>
        )}
      </div>
    </aside>
  );
}

function ActiveSessionTerminal({ groups, onNext }: { groups: SessionGroups; onNext: () => void }) {
  const navigate = useNavigate();
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const { data: sessions } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const runtime = useRuntimeAgent(activeId);
  const source = useAgentTerminalSource(activeId && isDesktop() ? activeId : null);
  const stop = useStopAgentSession();
  const restart = useRestartAgentSession();
  const openExternal = useOpenAgentExternally();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { can } = usePermissions();

  const { data: workspaceConfig } = useWorkspaceConfig();
  const session = sessions?.data.find((s) => s.id === activeId) ?? null;
  const ranOnThisDevice = !!runtime || (!!session?.device_id && session.device_id === workspaceConfig?.device_id);
  const project = projects?.find((p) => p.id === (runtime?.project_id ?? session?.project_id));
  const status = runtime?.status ?? session?.status ?? null;
  const item = groups.ordered.find((i) => i.id === activeId) ?? null;
  const statusLabel = item ? getDropdownOptionLabel(SessionReviewStateOptions, item.review_state) : status ? getDropdownOptionLabel(AgentStatusOptions, status) : "";
  const remaining = groups.ready.filter((i) => i.id !== activeId).length;

  if (!activeId) {
    return (
      <EmptyState
        className="flex-1"
        icon={<Terminal />}
        title="No session open"
        description="Start Claude Code or Cursor CLI inside a project. The agent runs as a real CLI with its terminal embedded here."
        action={
          can(PermissionKeys.AI_START_AGENTS) && (
            <Button size="sm" onClick={() => openNewSession({ project_id: activeProjectId })}>
              New AI session
            </Button>
          )
        }
      />
    );
  }

  const changes = runtime?.changes ?? (session ? { files_changed: session.files_changed, additions: session.additions, deletions: session.deletions } : null);

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        {project && <ProjectFlag color={project.color} className="h-[18px]" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{session?.name ?? runtime?.name ?? "Session"}</div>
          <div className="truncate text-[0.6875rem] text-muted-foreground">
            {project?.name} · {getAgentTypeLabel(runtime?.agent_type ?? session?.agent_type)}
            {changes && changes.files_changed > 0 && (
              <>
                {" · "}
                <span>{changes.files_changed} files</span> <span className="text-success">+{changes.additions}</span> <span className="text-danger">-{changes.deletions}</span>
              </>
            )}
          </div>
        </div>
        <StatusDot status={item ? reviewStateDot(item.review_state) : agentStatusDot(status)} title={statusLabel} />
        <span className="shrink-0 text-[0.7188rem] text-muted-foreground">{statusLabel}</span>
        {changes && changes.files_changed > 0 && project && (
          <PanelIconButton
            label="Review changes"
            onClick={() => navigate(Routes.workspace.project_tab(project.id, ProjectTabs.GIT))}
          >
            <FileDiff className="size-3.5" />
          </PanelIconButton>
        )}
        {runtime && can(PermissionKeys.AI_USE_AGENTS) && (
          <>
            <PanelIconButton label="Restart" onClick={() => restart.mutate(runtime.id)} disabled={restart.isPending}>
              <RotateCw className="size-3.5" />
            </PanelIconButton>
            <PanelIconButton label="Stop" onClick={() => stop.mutate(runtime.id)} disabled={!runtime.alive || stop.isPending}>
              <Square className="size-3.5" />
            </PanelIconButton>
            <PanelIconButton label="Open in external terminal" onClick={() => openExternal.mutate(runtime.id)}>
              <ExternalLink className="size-3.5" />
            </PanelIconButton>
          </>
        )}
        {session && can(PermissionKeys.AI_USE_AGENTS) && (
          <>
            <PanelIconButton label="Delete session" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" />
            </PanelIconButton>
            <DeleteSessionDialog session={session} open={confirmDelete} onOpenChange={setConfirmDelete} />
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 bg-terminal">
        {source && ranOnThisDevice ? (
          <XtermTerminal key={activeId} source={source} sourceKey={activeId} readOnly={!runtime?.alive || !can(PermissionKeys.AI_USE_AGENTS)} className="h-full" />
        ) : (
          <EmptyState
            className="h-full"
            icon={<Terminal />}
            title="This session isn't running on this device"
            description="Agent processes and their terminal output stay on the machine that ran them. Start a new session to continue here."
          />
        )}
      </div>
      {runtime && !runtime.alive && (
        <div className="shrink-0 border-t bg-surface px-3 py-2 text-[0.7188rem] text-muted-foreground">
          Process exited ({runtime.exit_code ?? 0}). Restart to continue in this terminal.
        </div>
      )}
      {item && project && <SessionReviewBar key={item.id} item={item} project={project} remaining={remaining} onNext={onNext} />}
    </>
  );
}

function PanelIconButton({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-7 text-muted-foreground", pressed && "bg-surface-elevated text-foreground")}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
