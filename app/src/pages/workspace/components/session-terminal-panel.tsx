import { useEffect } from "react";
import { Terminal } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import { useAgentSessions, useRuntimeAgent } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { useAgentTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { isDesktop } from "@/lib/desktop";
import { SessionReviewBar } from "./session-review-bar";
import type { SessionGroups } from "../hooks/use-session-groups";

/**
 * One agent session's terminal, as a standalone dock panel — every open session gets its own
 * instance (see `session-terminal-stage.tsx`), so multiple can be live/visible at once instead of
 * only the single "active" one. Content is unchanged from the previous `ActiveSessionTerminal`,
 * just parameterized by `sessionId` instead of always reading the store's active session.
 *
 * The per-session header this used to carry (project/name/status, "Review changes", restart/stop/
 * float/delete menu) now lives on each session's tab in `session-navigator.tsx` instead — scoped to
 * the session it acts on even when that tab isn't the focused one, and without a second place
 * showing the same identity/status the tab strip above already shows.
 */
export function SessionTerminalPanel({
  sessionId,
  groups,
  onNext,
  panelApi,
}: {
  sessionId: string;
  groups: SessionGroups;
  onNext: () => void;
  panelApi?: { setTitle: (title: string) => void };
}) {
  const { data: sessions } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const runtime = useRuntimeAgent(sessionId);
  const source = useAgentTerminalSource(isDesktop() ? sessionId : null);
  const { can } = usePermissions();

  const { data: workspaceConfig } = useWorkspaceConfig();
  const session = sessions?.data.find((s) => s.id === sessionId) ?? null;
  const ranOnThisDevice = !!runtime || (!!session?.device_id && session.device_id === workspaceConfig?.device_id);
  const project = projects?.find((p) => p.id === (runtime?.project_id ?? session?.project_id));
  const item = groups.ordered.find((i) => i.id === sessionId) ?? null;
  const remaining = groups.ready.filter((i) => i.id !== sessionId).length;
  const name = session?.name ?? runtime?.name ?? "Session";

  // Dockview defaults the tab title to the panel id (`session:<uuid>`), so push the real name.
  useEffect(() => {
    panelApi?.setTitle(name);
  }, [panelApi, name]);

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
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
