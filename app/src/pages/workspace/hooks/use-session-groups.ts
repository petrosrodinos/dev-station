import { useMemo } from "react";
import { useAgentSessions } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { SessionReviewStates, type AgentSession, type SessionReviewState } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
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
}

export interface SessionGroup {
  project: Project;
  sessions: SessionItem[];
  ready: number;
}

export interface SessionGroups {
  groups: SessionGroup[];
  /** Every listed session in display order (grouped by project, in rail order). */
  ordered: SessionItem[];
  /** Sessions ready for review, in display order. */
  ready: SessionItem[];
}

/**
 * The AI panel's working set: sessions opened in this workspace plus any that need attention,
 * grouped by project in rail order. Runtime state on this device wins over the server copy.
 */
export const useSessionGroups = (): SessionGroups => {
  const { data: sessions } = useAgentSessions();
  const { data: projects } = useGetProjects();
  const runtimeAgents = useRuntimeStore((s) => s.agents);
  const openIds = useWorkspaceStore((s) => s.open_session_tabs);
  const attention = useWorkspaceStore((s) => s.attention_session_ids);
  const reviewed = useWorkspaceStore((s) => s.reviewed_session_ids);

  return useMemo(() => {
    const byId = new Map((sessions?.data ?? []).map((s) => [s.id, s]));
    const ids = [...new Set([...openIds, ...attention])];
    const byProject = new Map<string, SessionItem[]>();

    for (const id of ids) {
      const session = byId.get(id) ?? null;
      const runtime = runtimeAgents[id] ?? null;
      const projectId = runtime?.project_id ?? session?.project_id;
      if (!projectId) continue;
      const status = runtime?.status ?? session?.status ?? null;
      // Live sessions on this device are reviewed only when the developer said so; older ones count once a commit is linked.
      const committed = !!session?.commit_sha;
      const isReviewed = reviewed.includes(id) || (committed && !runtime);
      const item: SessionItem = {
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
      };
      byProject.set(projectId, [...(byProject.get(projectId) ?? []), item]);
    }

    const groups: SessionGroup[] = (projects ?? [])
      .filter((p) => byProject.has(p.id))
      .map((project) => {
        const items = byProject.get(project.id)!;
        return { project, sessions: items, ready: items.filter((i) => i.review_state === SessionReviewStates.READY).length };
      });
    const ordered = groups.flatMap((g) => g.sessions);
    return { groups, ordered, ready: ordered.filter((i) => i.review_state === SessionReviewStates.READY) };
  }, [sessions, projects, runtimeAgents, openIds, attention, reviewed]);
};

/**
 * The session "next review" should open: the most recent unseen one first (what a notification
 * just announced), otherwise the next ready session after `currentId` in display order.
 */
export const nextReviewSession = (groups: SessionGroups, currentId: string | null, attention: string[]): SessionItem | null => {
  const byId = new Map(groups.ordered.map((i) => [i.id, i]));
  for (let i = attention.length - 1; i >= 0; i--) {
    const item = byId.get(attention[i]);
    if (item && item.id !== currentId) return item;
  }
  const { ready, ordered } = groups;
  if (!ready.length) return null;
  const start = ordered.findIndex((i) => i.id === currentId);
  for (let step = 1; step <= ordered.length; step++) {
    const item = ordered[(start + step + ordered.length) % ordered.length];
    if (item.review_state === SessionReviewStates.READY && item.id !== currentId) return item;
  }
  return null;
};
