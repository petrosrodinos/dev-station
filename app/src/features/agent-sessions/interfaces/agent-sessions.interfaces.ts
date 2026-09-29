import type { AgentRuntimeStatus, AgentType } from "@shared/contract";
import type { Pagination } from "@/interfaces/pagination/pagination.interface";

export interface AgentSession {
    id: string;
    organization_id: string;
    project_id: string;
    user_id: string;
    agent_type: AgentType;
    name: string;
    status: AgentRuntimeStatus;
    initial_prompt: string | null;
    device_id: string | null;
    issue_provider: string | null;
    issue_external_id: string | null;
    issue_key: string | null;
    issue_title: string | null;
    files_changed: number;
    additions: number;
    deletions: number;
    commit_sha: string | null;
    exit_code: number | null;
    started_at: string;
    ended_at: string | null;
    updated_at: string;
}

export interface AgentSessionsQuery {
    project_id?: string;
    status?: AgentRuntimeStatus;
    page?: number;
    limit?: number;
}

export interface AgentSessionsResponse {
    data: AgentSession[];
    pagination: Pagination;
}

export interface CreateAgentSessionDto {
    project_id: string;
    agent_type: AgentType;
    name: string;
    initial_prompt?: string | null;
    device_id?: string | null;
    issue_provider?: string | null;
    issue_external_id?: string | null;
    issue_key?: string | null;
    issue_title?: string | null;
}

export interface UpdateAgentSessionDto {
    status?: AgentRuntimeStatus;
    name?: string;
    files_changed?: number;
    additions?: number;
    deletions?: number;
    commit_sha?: string | null;
    exit_code?: number | null;
    ended_at?: string | null;
}

export interface AgentCatalogItem {
    type: AgentType;
    name: string;
    default_executable: string;
    description: string;
}

/** What a session needs from the developer — derived from the runtime status plus the local review state. */
export const SessionReviewStates = {
    WORKING: "WORKING",
    READY: "READY",
    FAILED: "FAILED",
    STOPPED: "STOPPED",
    REVIEWED: "REVIEWED",
    COMMITTED: "COMMITTED",
} as const;
export type SessionReviewState = (typeof SessionReviewStates)[keyof typeof SessionReviewStates];
