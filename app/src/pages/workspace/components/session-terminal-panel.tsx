import { useEffect } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import { ranOnDevice, useAgentSessions, useRelaunchAgentSession, useRuntimeAgent } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { useAgentTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { isDesktop } from "@/lib/desktop";
import { SessionReviewBar } from "./session-review-bar";
import { useOpenSessions } from "../hooks/use-open-sessions";

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
  onNext,
  panelApi,
}: {
  sessionId: string;
  onNext: () => void;
  panelApi?: { setTitle: (title: string) => void };
}) {
  // Read live here rather than taking the open sessions as a prop: dockview renders panel components on its
  // own schedule, so a prop snapshot goes stale (wrong review state, or no item at all for a session
  // opened before the session list caught up) until something unrelated re-renders the panel.
  const openSessions = useOpenSessions();
  const { data: sessions } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const runtime = useRuntimeAgent(sessionId);
  const source = useAgentTerminalSource(isDesktop() ? sessionId : null);
  const { can } = usePermissions();
  const relaunch = useRelaunchAgentSession();

  const { data: workspaceConfig } = useWorkspaceConfig();
  const session = sessions?.data.find((s) => s.id === sessionId) ?? null;
  const ranOnThisDevice = !!runtime || ranOnDevice(session, workspaceConfig?.device_id);
  const live = !!runtime?.alive;
  const canUseAgents = can(PermissionKeys.AI_USE_AGENTS);
  const project = projects?.find((p) => p.id === (runtime?.project_id ?? session?.project_id));
  const item = openSessions.ordered.find((i) => i.id === sessionId) ?? null;
  const remaining = openSessions.ready.filter((i) => i.id !== sessionId).length;
  const name = session?.name ?? runtime?.name ?? "Session";

  // Dockview defaults the tab title to the panel id (`session:<uuid>`), so push the real name.
  useEffect(() => {
    panelApi?.setTitle(name);
  }, [panelApi, name]);

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      <div className="min-h-0 flex-1 bg-terminal">
        {source && ranOnThisDevice ? (
          <XtermTerminal source={source} sourceKey={sessionId} readOnly={!live || !canUseAgents} className="h-full" />
        ) : (
          <EmptyState
            className="h-full"
            icon={<Terminal />}
            title="This session isn't running on this device"
            description="Agent processes and their terminal output stay on the machine that ran them. Start a new session to continue here."
          />
        )}
      </div>
      {ranOnThisDevice && !live && canUseAgents && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-surface px-3 py-2 text-[0.7188rem] text-muted-foreground">
          <span>
            {runtime && !runtime.alive ? `Process exited (${runtime.exit_code ?? 0}). ` : "This session has ended. "}
            Resume to pick up the conversation where it left off.
          </span>
          <Button size="sm" variant="outline" disabled={relaunch.isPending} onClick={() => relaunch.mutate({ session, runtime })}>
            Resume
          </Button>
        </div>
      )}
      {item && project && <SessionReviewBar key={item.id} item={item} project={project} remaining={remaining} onNext={onNext} />}
    </div>
  );
}
