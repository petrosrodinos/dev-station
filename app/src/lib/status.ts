import type { StatusDotStatus } from "@/components/ui/status-dot";
import { SessionReviewStates, type SessionReviewState } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";
import { AgentRuntimeStatuses, ProcessStatuses, type AgentRuntimeStatus, type ProcessStatus } from "@shared/contract";

/** Visual mapping only (dot color) — display text comes from config/constants/dropdowns. */
export const agentStatusDot = (status: AgentRuntimeStatus | null | undefined): StatusDotStatus => {
    switch (status) {
        case AgentRuntimeStatuses.RUNNING:
            return "running";
        case AgentRuntimeStatuses.AWAITING_INPUT:
            return "awaiting";
        case AgentRuntimeStatuses.FINISHED:
            return "finished";
        case AgentRuntimeStatuses.CRASHED:
            return "crashed";
        default:
            return "stopped";
    }
};

export const processStatusDot = (status: ProcessStatus | null | undefined): StatusDotStatus => {
    switch (status) {
        case ProcessStatuses.RUNNING:
            return "running";
        case ProcessStatuses.CRASHED:
            return "crashed";
        case ProcessStatuses.STARTING:
            return "starting";
        default:
            return "stopped";
    }
};

export const isAgentActive = (status: AgentRuntimeStatus | null | undefined) =>
    status === AgentRuntimeStatuses.RUNNING || status === AgentRuntimeStatuses.AWAITING_INPUT;

/**
 * Review state of a session. The agent's turn ending (idle / awaiting input) and a clean exit both
 * count as "ready for review" until the developer commits or marks it reviewed.
 */
export const sessionReviewState = (status: AgentRuntimeStatus | null | undefined, review: { reviewed: boolean; committed: boolean }): SessionReviewState => {
    switch (status) {
        case AgentRuntimeStatuses.RUNNING:
            return SessionReviewStates.WORKING;
        case AgentRuntimeStatuses.CRASHED:
            return SessionReviewStates.FAILED;
        case AgentRuntimeStatuses.AWAITING_INPUT:
        case AgentRuntimeStatuses.FINISHED:
            if (review.reviewed) return review.committed ? SessionReviewStates.COMMITTED : SessionReviewStates.REVIEWED;
            return SessionReviewStates.READY;
        default:
            if (review.reviewed && review.committed) return SessionReviewStates.COMMITTED;
            return SessionReviewStates.STOPPED;
    }
};

export const reviewStateDot = (state: SessionReviewState): StatusDotStatus => {
    switch (state) {
        case SessionReviewStates.WORKING:
            return "running";
        case SessionReviewStates.READY:
            return "finished";
        case SessionReviewStates.FAILED:
            return "crashed";
        default:
            return "stopped";
    }
};
