import type { Pagination } from "@/interfaces/pagination/pagination.interface";

export const ActivityTypes = {
    PROJECT_CREATED: "PROJECT_CREATED",
    PROJECT_UPDATED: "PROJECT_UPDATED",
    REPOSITORY_CLONED: "REPOSITORY_CLONED",
    SERVICE_STARTED: "SERVICE_STARTED",
    SERVICE_STOPPED: "SERVICE_STOPPED",
    SERVICE_CRASHED: "SERVICE_CRASHED",
    GIT_COMMIT: "GIT_COMMIT",
    GIT_PUSH: "GIT_PUSH",
    GIT_PULL: "GIT_PULL",
    GIT_BRANCH: "GIT_BRANCH",
    GIT_STASH: "GIT_STASH",
    GIT_DISCARD: "GIT_DISCARD",
    AGENT_STARTED: "AGENT_STARTED",
    AGENT_AWAITING_INPUT: "AGENT_AWAITING_INPUT",
    AGENT_FINISHED: "AGENT_FINISHED",
    AGENT_CRASHED: "AGENT_CRASHED",
    AGENT_STOPPED: "AGENT_STOPPED",
    CHANGES_REVIEWED: "CHANGES_REVIEWED",
    ISSUE_LINKED: "ISSUE_LINKED",
    INTEGRATION_CONNECTED: "INTEGRATION_CONNECTED",
    INTEGRATION_DISCONNECTED: "INTEGRATION_DISCONNECTED",
    MEMBER_JOINED: "MEMBER_JOINED",
    OTHER: "OTHER",
} as const;
export type ActivityType = (typeof ActivityTypes)[keyof typeof ActivityTypes];

export interface Activity {
    id: string;
    organization_id: string;
    project_id: string | null;
    user_id: string | null;
    agent_session_id: string | null;
    type: ActivityType;
    message: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    user?: { id: string; full_name: string | null; email: string } | null;
}

export interface ActivitiesQuery {
    project_id?: string;
    page?: number;
    limit?: number;
}

export interface ActivitiesResponse {
    data: Activity[];
    pagination: Pagination;
}

export interface CreateActivityDto {
    project_id?: string | null;
    type: ActivityType;
    message: string;
    agent_session_id?: string | null;
    metadata?: Record<string, unknown>;
}
