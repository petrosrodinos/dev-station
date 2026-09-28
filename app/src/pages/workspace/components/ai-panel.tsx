import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, ExternalLink, FileDiff, Plus, RotateCw, Square, Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import {
  useAgentSessions,
  useCloseSessionTab,
  useOpenAgentExternally,
  useRestartAgentSession,
  useRuntimeAgent,
  useStopAgentSession,
} from "@/features/agent-sessions/hooks/use-agent-sessions";
import type { AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useAgentTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot, isAgentActive } from "@/lib/status";
import { formatRelative } from "@/lib/date";
import { isDesktop } from "@/lib/desktop";
import { AiPanelModes, useWorkspaceStore, type AiPanelMode } from "@/stores/workspace";
import { useRuntimeStore } from "@/stores/runtime";
import { useDialogsStore } from "@/stores/dialogs";
import { Routes } from "@/routes/routes";
import { CloseSessionDialog } from "./close-session-dialog";
import { SessionContextMenu } from "./session-context-menu";
import { cn } from "@/lib/utils";

/** Right-hand panel: the active session's embedded agent terminal, or the list of all sessions. */
export function AiPanel() {
  const mode = useWorkspaceStore((s) => s.ai_panel_mode);
  const setMode = useWorkspaceStore((s) => s.setAiPanelMode);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const { can } = usePermissions();

  return (
    <aside className="flex h-full min-w-0 flex-col bg-surface" aria-label="AI panel">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as AiPanelMode)}>
          <TabsList className="h-8 rounded-full border bg-surface p-[3px]">
            <TabsTrigger value={AiPanelModes.TERMINAL} className="h-6 gap-1.5 rounded-full px-3 text-[0.7813rem] data-[state=active]:bg-surface-elevated data-[state=active]:shadow-none">
              <Terminal className="size-3.5" /> Terminal
            </TabsTrigger>
            <TabsTrigger value={AiPanelModes.SESSIONS} className="h-6 gap-1.5 rounded-full px-3 text-[0.7813rem] data-[state=active]:bg-surface-elevated data-[state=active]:shadow-none">
              <Bot className="size-3.5" /> Sessions
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {can(PermissionKeys.AI_START_AGENTS) && (
          <Button size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs" onClick={() => openNewSession({ project_id: activeProjectId })}>
            <Plus className="size-3.5" /> New
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{mode === AiPanelModes.SESSIONS ? <SessionList /> : <ActiveSessionTerminal />}</div>
    </aside>
  );
}

function ActiveSessionTerminal() {
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
  const closeTab = useCloseSessionTab();
  const [confirmClose, setConfirmClose] = useState(false);
  const { can } = usePermissions();

  const { data: workspaceConfig } = useWorkspaceConfig();
  const session = sessions?.data.find((s) => s.id === activeId) ?? null;
  const ranOnThisDevice = !!runtime || (!!session?.device_id && session.device_id === workspaceConfig?.device_id);
  const project = projects?.find((p) => p.id === (runtime?.project_id ?? session?.project_id));
  const status = runtime?.status ?? session?.status ?? null;
  const statusLabel = status ? getDropdownOptionLabel(AgentStatusOptions, status) : "";

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

  const requestClose = () => {
    if (runtime?.alive && isAgentActive(runtime.status)) setConfirmClose(true);
    else closeTab.mutate({ id: activeId, stopProcess: !!runtime });
  };

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
        <StatusDot status={agentStatusDot(status)} title={statusLabel} />
        <span className="text-[0.7188rem] text-muted-foreground">{statusLabel}</span>
        {changes && changes.files_changed > 0 && project && (
          <PanelIconButton label="Review changes" onClick={() => navigate(Routes.workspace.project_tab(project.id, ProjectTabs.GIT))}>
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
        {can(PermissionKeys.AI_USE_AGENTS) && (
          <PanelIconButton label="Close session" onClick={requestClose} disabled={closeTab.isPending}>
            <X className="size-3.5" />
          </PanelIconButton>
        )}
      </div>
      <CloseSessionDialog
        sessionName={session?.name ?? runtime?.name ?? "This session"}
        open={confirmClose}
        isPending={closeTab.isPending}
        onOpenChange={setConfirmClose}
        onChoose={(stopProcess) => closeTab.mutate({ id: activeId, stopProcess }, { onSettled: () => setConfirmClose(false) })}
      />
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
          Process exited ({runtime.exit_code ?? 0}). Restart to continue in this terminal, or review the changes in Git.
        </div>
      )}
    </>
  );
}

function PanelIconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClick} disabled={disabled} aria-label={label}>
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
