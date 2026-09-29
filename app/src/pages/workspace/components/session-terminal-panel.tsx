import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, FileDiff, PictureInPicture2, RotateCw, Square, Terminal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusDot } from "@/components/ui/status-dot";
import { ProjectFlag } from "@/components/ui/project-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import {
  useAgentSessions,
  useOpenAgentExternally,
  useRestartAgentSession,
  useRuntimeAgent,
  useStopAgentSession,
} from "@/features/agent-sessions/hooks/use-agent-sessions";
import { useAgentTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { AgentStatusOptions } from "@/config/constants/dropdowns/agents/agent-status.options";
import { SessionReviewStateOptions } from "@/config/constants/dropdowns/agents/session-review-state.options";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { agentStatusDot, reviewStateDot } from "@/lib/status";
import { getBridge, isDesktop } from "@/lib/desktop";
import { useLayoutStore } from "@/stores/layout";
import { Routes } from "@/routes/routes";
import { DeleteSessionDialog } from "./session-context-menu";
import { SessionReviewBar } from "./session-review-bar";
import type { SessionGroups } from "../hooks/use-session-groups";
import { cn } from "@/lib/utils";

/**
 * One agent session's terminal, as a standalone dock panel — every open session gets its own
 * instance (see `session-terminal-stage.tsx`), so multiple can be live/visible at once instead of
 * only the single "active" one. Content is unchanged from the previous `ActiveSessionTerminal`,
 * just parameterized by `sessionId` instead of always reading the store's active session.
 */
export function SessionTerminalPanel({ sessionId, groups, onNext }: { sessionId: string; groups: SessionGroups; onNext: () => void }) {
  const navigate = useNavigate();
  const { data: sessions } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const runtime = useRuntimeAgent(sessionId);
  const source = useAgentTerminalSource(isDesktop() ? sessionId : null);
  const stop = useStopAgentSession();
  const restart = useRestartAgentSession();
  const openExternal = useOpenAgentExternally();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { can } = usePermissions();
  const addFloating = useLayoutStore((s) => s.addFloating);

  const { data: workspaceConfig } = useWorkspaceConfig();
  const session = sessions?.data.find((s) => s.id === sessionId) ?? null;
  const ranOnThisDevice = !!runtime || (!!session?.device_id && session.device_id === workspaceConfig?.device_id);
  const project = projects?.find((p) => p.id === (runtime?.project_id ?? session?.project_id));
  const status = runtime?.status ?? session?.status ?? null;
  const item = groups.ordered.find((i) => i.id === sessionId) ?? null;
  const statusLabel = item ? getDropdownOptionLabel(SessionReviewStateOptions, item.review_state) : status ? getDropdownOptionLabel(AgentStatusOptions, status) : "";
  const remaining = groups.ready.filter((i) => i.id !== sessionId).length;
  const changes = runtime?.changes ?? (session ? { files_changed: session.files_changed, additions: session.additions, deletions: session.deletions } : null);
  const panelId = `session:${sessionId}`;
  const name = session?.name ?? runtime?.name ?? "Session";

  // Real-OS-window floating (docking system §C): pops this panel's content into its own window;
  // the dock excludes it (see `session-terminal-stage.tsx`) until that window is closed.
  const floatPanel = () => {
    if (!isDesktop()) return;
    void getBridge().layout.openFloatingPanel({ panelId, componentType: "session-terminal", params: { sessionId }, title: name });
    addFloating({ panelId, componentType: "session-terminal", params: { sessionId }, bounds: { x: 0, y: 0, width: 640, height: 480 } });
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
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
        {isDesktop() && (
          <PanelIconButton label="Float in its own window" onClick={floatPanel}>
            <PictureInPicture2 className="size-3.5" />
          </PanelIconButton>
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
          <XtermTerminal source={source} sourceKey={sessionId} readOnly={!runtime?.alive || !can(PermissionKeys.AI_USE_AGENTS)} className="h-full" />
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
    </div>
  );
}

function PanelIconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-7 text-muted-foreground")} onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
