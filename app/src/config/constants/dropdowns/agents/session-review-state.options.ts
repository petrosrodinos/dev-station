import { SessionReviewStates, type SessionReviewState } from "@/features/agent-sessions/interfaces/agent-sessions.interfaces";

export const SessionReviewStateOptions: { id: SessionReviewState; label: string }[] = [
    { id: SessionReviewStates.WORKING, label: "Working" },
    { id: SessionReviewStates.READY, label: "Ready for review" },
    { id: SessionReviewStates.FAILED, label: "Failed" },
    { id: SessionReviewStates.STOPPED, label: "Stopped" },
    { id: SessionReviewStates.REVIEWED, label: "Reviewed" },
    { id: SessionReviewStates.COMMITTED, label: "Committed" },
];
