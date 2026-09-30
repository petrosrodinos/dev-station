import type { AgentRuntimeStatus, GitStatus } from "@shared/contract";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";

/** Ordered most-urgent first: a project's row is sorted by its most urgent reason. */
export const AttentionKinds = {
    CONFLICTS: "CONFLICTS",
    SERVICE_CRASHED: "SERVICE_CRASHED",
    AGENT_WAITING: "AGENT_WAITING",
    UNCOMMITTED: "UNCOMMITTED",
    UNPUSHED: "UNPUSHED",
    BEHIND: "BEHIND",
} as const;
export type AttentionKind = (typeof AttentionKinds)[keyof typeof AttentionKinds];

export interface AttentionReason {
    kind: AttentionKind;
    /** Count behind the reason (files, commits, services, sessions). */
    count: number;
}

export interface ProjectAttention {
    project: Project;
    git: GitStatus | null;
    reasons: AttentionReason[];
}

export interface AttentionAgentInput {
    status: AgentRuntimeStatus;
    alive: boolean;
}

export interface FleetSyncResult {
    fetched: number;
    pulled: string[];
    failed: string[];
    skipped: number;
}
