import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { NotificationChannels, NotificationEventTypes, type NotificationEventType, type UserPreference } from "@/features/users/interfaces/users.interfaces";
import { shouldNotify } from "@/features/users/utils/notification-settings.utils";
import { showOsNotification } from "@/features/users/services/notifications.services";
import { getNotificationEventLabel } from "@/config/constants/dropdowns/notifications/notification-event.options";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { updateAgentSession } from "@/features/agent-sessions/services/agent-sessions.services";
import type { AgentSession } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { createActivity } from "@/features/activities/services/activities.services";
import { ActivityTypes } from "@/features/activities/interfaces/activities.interfaces";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { formatComboParts } from "@/lib/shortcuts.utils";
import { jumpToSession } from "@/lib/session-navigation.utils";
import { AgentRuntimeStatuses, ProcessStatuses, type AgentSessionInfo, type AgentStatusEvent, type OsNotificationClick, type ProcessEvent } from "@shared/contract";

const ATTENTION_EVENTS: Partial<Record<string, { type: NotificationEventType; verb: string }>> = {
  [AgentRuntimeStatuses.FINISHED]: { type: NotificationEventTypes.AGENT_FINISHED, verb: "finished" },
  [AgentRuntimeStatuses.AWAITING_INPUT]: { type: NotificationEventTypes.AGENT_AWAITING_INPUT, verb: "needs your input" },
  [AgentRuntimeStatuses.CRASHED]: { type: NotificationEventTypes.AGENT_CRASHED, verb: "crashed" },
};
const CHANGE_SYNC_DEBOUNCE_MS = 4000;

/**
 * Bridges main-process events into the renderer:
 * - processes/terminals/agents → runtime store
 * - agent status transitions → session record on the API (which writes the activity feed)
 *   and, per the user's notification settings, a nav-rail attention badge and/or a native
 *   OS notification. The feed filter lives in the status bar (Spec §13/§27).
 */
export function DesktopEventsProvider() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const changeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const appliedNames = useRef(new Map<string, string>());
  const goToFinishedComboRef = useRef<string | null>(null);
  goToFinishedComboRef.current = useResolvedShortcuts().find((s) => s.action_id === ShortcutActions.GO_TO_FINISHED_SESSION)?.combo ?? null;

  useEffect(() => {
    if (!isDesktop()) return;
    const bridge = window.devStation!;
    const runtime = useRuntimeStore.getState();
    // Read at event time so handlers always see the latest saved preferences (defaults until loaded).
    const getSettings = () => queryClient.getQueryData<UserPreference>(["preferences"])?.notification_settings;

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

    // Follow the agent CLI's own title, but only while the name is still the one we set — a manual rename wins.
    const followAgentTitle = (session: AgentSessionInfo) => {
      const title = session.agent_title;
      if (!title) return;
      const followed = appliedNames.current.get(session.id) ?? session.name;
      if (title === followed) return;
      const cached = queryClient
        .getQueriesData<{ data: AgentSession[] }>({ queryKey: ["agent-sessions"] })
        .flatMap(([, page]) => page?.data ?? [])
        .find((s) => s.id === session.id);
      if (!cached || cached.name !== followed) return;
      appliedNames.current.set(session.id, title);
      void updateAgentSession({ id: session.id, name: title })
        .then(() => queryClient.invalidateQueries({ queryKey: ["agent-sessions"] }))
        .catch(() => appliedNames.current.set(session.id, followed));
    };

    const onAgentStatus = ({ session, previous }: AgentStatusEvent) => {
      useRuntimeStore.getState().upsertAgent(session);
      followAgentTitle(session);
      const statusChanged = previous !== session.status;
      if (!statusChanged) {
        syncChanges(session);
        return;
      }

      const workspace = useWorkspaceStore.getState();
      const viewing = workspace.active_session_id === session.id && workspace.ai_panel_open;
      const attention = ATTENTION_EVENTS[session.status];
      if (attention) {
        const settings = getSettings();
        if (!viewing && shouldNotify(settings, attention.type, NotificationChannels.BADGE)) {
          workspace.markAttention(session.id);
          // Unfocused windows get the OS notification instead; this is the in-app equivalent.
          if (document.hasFocus()) {
            const combo = goToFinishedComboRef.current;
            toast({
              title: `${session.name} ${attention.verb}`,
              description: combo ? `Press ${formatComboParts(combo).join("+")} to jump to it.` : undefined,
              variant: "info",
              action: (
                <ToastAction altText="View session" onClick={() => jumpToSession(session.id, navigate, session.project_id)}>
                  View session
                </ToastAction>
              ),
            });
          }
        }
        // Skip only when the user is looking right at this session in a focused window.
        if ((!viewing || !document.hasFocus()) && shouldNotify(settings, attention.type, NotificationChannels.OS)) {
          void showOsNotification({ title: `${session.name} ${attention.verb}`, body: getNotificationEventLabel(attention.type), project_id: session.project_id, session_id: session.id }).catch(() => undefined);
        }
      }
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
        if (shouldNotify(getSettings(), NotificationEventTypes.SERVICE_CRASHED, NotificationChannels.OS)) {
          void showOsNotification({ title: `${event.process.name} crashed`, body: `Exit code ${event.process.exit_code ?? "?"}`, project_id: event.process.project_id }).catch(() => undefined);
        }
      }
    };

    const onNotificationClick = ({ project_id, session_id }: OsNotificationClick) => {
      const workspace = useWorkspaceStore.getState();
      if (project_id) {
        workspace.setActiveProject(project_id);
        navigate(Routes.workspace.project(project_id));
      }
      if (session_id) workspace.openSessionTab(session_id);
    };

    const unsubscribers = [
      bridge.agents.onStatus(onAgentStatus),
      bridge.processes.onEvent(onProcessEvent),
      bridge.notifications.onClick(onNotificationClick),
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
  }, [queryClient, navigate]);

  return null;
}
