import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { updateAgentSession } from "@/features/agent-sessions/services/agent-sessions.services";
import { createActivity } from "@/features/activities/services/activities.services";
import { ActivityTypes } from "@/features/activities/interfaces/activities.interfaces";
import { isDesktop } from "@/lib/desktop";
import { AgentRuntimeStatuses, ProcessStatuses, type AgentSessionInfo, type AgentStatusEvent, type ProcessEvent } from "@shared/contract";

const ATTENTION_STATUSES: string[] = [AgentRuntimeStatuses.FINISHED, AgentRuntimeStatuses.AWAITING_INPUT, AgentRuntimeStatuses.CRASHED];
const CHANGE_SYNC_DEBOUNCE_MS = 4000;

/**
 * Bridges main-process events into the renderer:
 * - processes/terminals/agents → runtime store
 * - agent status transitions → session record on the API (which writes the activity feed)
 *   and a nav-rail attention badge. No toasts: the rail badge + activity feed are the
 *   notification surfaces (Spec §13/§27).
 */
export function DesktopEventsProvider() {
  const queryClient = useQueryClient();
  const changeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!isDesktop()) return;
    const bridge = window.devStation!;
    const runtime = useRuntimeStore.getState();

    // Initial snapshot — the main process may already be running things (e.g. after a reload).
    void bridge.processes.list().then(runtime.setProcesses).catch(() => undefined);
    void bridge.terminals.list().then(runtime.setTerminals).catch(() => undefined);
    void bridge.agents.list().then(runtime.setAgents).catch(() => undefined);

    const syncChanges = (session: AgentSessionInfo) => {
      const timers = changeTimers.current;
      clearTimeout(timers.get(session.id));
      timers.set(
        session.id,
        setTimeout(() => {
          timers.delete(session.id);
          void updateAgentSession({ id: session.id, ...session.changes }).catch(() => undefined);
        }, CHANGE_SYNC_DEBOUNCE_MS),
      );
    };

    const onAgentStatus = ({ session, previous }: AgentStatusEvent) => {
      useRuntimeStore.getState().upsertAgent(session);
      const statusChanged = previous !== session.status;
      if (!statusChanged) {
        syncChanges(session);
        return;
      }

      const workspace = useWorkspaceStore.getState();
      const viewing = workspace.active_session_id === session.id && workspace.ai_panel_open;
      if (ATTENTION_STATUSES.includes(session.status) && !viewing) workspace.markAttention(session.id);
      if (session.status === AgentRuntimeStatuses.RUNNING) workspace.clearAttention(session.id);

      // The API records AGENT_* activity entries on status transitions.
      void updateAgentSession({
        id: session.id,
        status: session.status,
        ...session.changes,
        exit_code: session.exit_code,
        ended_at: session.ended_at,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        })
        .catch(() => undefined);
    };

    const onProcessEvent = (event: ProcessEvent) => {
      const store = useRuntimeStore.getState();
      const previous = store.processes[event.process.key]?.status;
      store.upsertProcess(event.process);
      if (event.lines?.length) store.appendProcessLogs(event.process.key, event.lines);
      if (event.type === "status" && previous === ProcessStatuses.RUNNING && event.process.status === ProcessStatuses.CRASHED) {
        void createActivity({
          project_id: event.process.project_id,
          type: ActivityTypes.SERVICE_CRASHED,
          message: `${event.process.name} crashed (exit code ${event.process.exit_code ?? "?"})`,
        })
          .then(() => queryClient.invalidateQueries({ queryKey: ["activities"] }))
          .catch(() => undefined);
      }
    };

    const unsubscribers = [
      bridge.agents.onStatus(onAgentStatus),
      bridge.processes.onEvent(onProcessEvent),
      bridge.terminals.onExit(({ id }) => {
        const t = useRuntimeStore.getState().terminals[id];
        if (t) useRuntimeStore.getState().upsertTerminal({ ...t, alive: false });
      }),
    ];

    const timers = changeTimers.current;
    return () => {
      unsubscribers.forEach((off) => off());
      timers.forEach((t) => clearTimeout(t));
    };
  }, [queryClient]);

  return null;
}
