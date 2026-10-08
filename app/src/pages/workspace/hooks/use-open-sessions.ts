import { useMemo } from "react";
import { mergeSessionStatus, ranOnDevice, useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates, type AgentSession, type SessionReviewState } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { sessionReviewState } from "@/lib/status";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import type { AgentChanges, AgentRuntimeStatus, AgentSessionInfo, AgentType } from "@shared/contract";

export interface SessionItem {
  id: string;
  name: string;
  project_id: string;
  agent_type: AgentType | null;
  status: AgentRuntimeStatus | null;
  review_state: SessionReviewState;
  /** Finished / needs input / crashed and not looked at yet. */
  unseen: boolean;
  changes: AgentChanges | null;
  session: AgentSession | null;
  runtime: AgentSessionInfo | null;
  /** Its CLI ran on this device, so it can be restarted or resumed here. */
  on_this_device: boolean;
}

export interface OpenSessions {
  /** Every listed session in display order: grouped by project, opening order within each group. Next/previous steps follow this order too. */
  ordered: SessionItem[];
  /** Sessions ready for review, in display order. */
  ready: SessionItem[];
  /** Running sessions the user took off the strip, most recently put away last. They don't take part in next/previous. */
  background: SessionItem[];
}

/**
 * Sessions of one project sit together. Groups follow the order the user dragged them into, with any project
 * not yet placed after those in the order its first session was opened. A group keeps its sessions in opening
 * order, so a new session lands at the end of its project's run.
 */
const groupByProject = (items: SessionItem[], projectOrder: string[]): SessionItem[] => {
  const groups = new Map<string, SessionItem[]>();
  for (const item of items) groups.set(item.project_id, [...(groups.get(item.project_id) ?? []), item]);
  const rank = (projectId: string) => {
    const at = projectOrder.indexOf(projectId);
    return at === -1 ? Number.MAX_SAFE_INTEGER : at;
  };
  // Array sort is stable, so unplaced projects keep their opening order.
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b)).flatMap(([, group]) => group);
};

/**
 * The AI panel's working set: sessions opened in this workspace plus any that need attention, grouped by
 * project. Runtime state on this device wins over the server copy.
 */
export const useOpenSessions = (): OpenSessions => {
  const { data: sessions } = useAgentSessions();
  const { data: workspaceConfig } = useWorkspaceConfig();
  const deviceId = workspaceConfig?.device_id ?? null;
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openIds = useWorkspaceStore((s) => s.open_session_tabs);
  const backgroundIds = useWorkspaceStore((s) => s.background_session_tabs);
  const attention = useWorkspaceStore((s) => s.attention_session_ids);
  const reviewed = useWorkspaceStore((s) => s.reviewed_session_ids);
  const projectOrder = useWorkspaceStore((s) => s.session_project_order);

  return useMemo(() => {
    const byId = new Map((sessions?.data ?? []).map((s) => [s.id, s]));
    const toItem = (id: string): SessionItem | null => {
      const session = byId.get(id) ?? null;
      const runtime = runtimeAgents[id] ?? null;
      const projectId = runtime?.project_id ?? session?.project_id;
      if (!projectId) return null;
      const status = mergeSessionStatus(session, runtime, deviceId);
      // Live sessions on this device are reviewed only when the developer said so; older ones count once a commit is linked.
      const committed = !!session?.commit_sha;
      const isReviewed = reviewed.includes(id) || (committed && !runtime);
      return {
        id,
        name: session?.name ?? runtime?.name ?? "Session",
        project_id: projectId,
        agent_type: runtime?.agent_type ?? session?.agent_type ?? null,
        status,
        review_state: sessionReviewState(status, { reviewed: isReviewed, committed }),
        unseen: attention.includes(id),
        changes: runtime?.changes ?? (session ? { files_changed: session.files_changed, additions: session.additions, deletions: session.deletions } : null),
        session,
        runtime,
        on_this_device: !!runtime || ranOnDevice(session, deviceId),
      };
    };

    // A session put away stays put even when it needs attention; the dropdown shows that instead.
    const ids = [...new Set([...openIds, ...attention])].filter((id) => !backgroundIds.includes(id));
    const ordered = ids.flatMap((id) => toItem(id) ?? []);
    const background = backgroundIds.flatMap((id) => toItem(id) ?? []);

    const grouped = groupByProject(ordered, projectOrder);
    return { ordered: grouped, ready: grouped.filter((i) => i.review_state === SessionReviewStates.READY), background };
  }, [sessions, runtimeAgents, openIds, backgroundIds, attention, reviewed, projectOrder, deviceId]);
};

/**
 * The session "next review" should open: the most recent unseen one first (what a notification
 * just announced), otherwise the next ready session after `currentId` in display order.
 */
export const nextReviewSession = (sessions: OpenSessions, currentId: string | null, attention: string[]): SessionItem | null => {
  const byId = new Map(sessions.ordered.map((i) => [i.id, i]));
  for (let i = attention.length - 1; i >= 0; i--) {
    const item = byId.get(attention[i]);
    if (item && item.id !== currentId) return item;
  }
  const { ready, ordered } = sessions;
  if (!ready.length) return null;
  const start = ordered.findIndex((i) => i.id === currentId);
  for (let step = 1; step <= ordered.length; step++) {
    const item = ordered[(start + step + ordered.length) % ordered.length];
    if (item.review_state === SessionReviewStates.READY && item.id !== currentId) return item;
  }
  // The only session waiting for review is the one already focused: reopen it (with its review
  // preview) rather than doing nothing while the "Needs review" badge still shows it.
  return ordered.find((i) => i.id === currentId && i.review_state === SessionReviewStates.READY) ?? null;
};
