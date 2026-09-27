import { AgentRuntimeStatuses, type AgentRuntimeStatus } from "@shared/contract";

export const AgentStatusOptions: { id: AgentRuntimeStatus; label: string }[] = [
    { id: AgentRuntimeStatuses.RUNNING, label: "Working" },
    { id: AgentRuntimeStatuses.AWAITING_INPUT, label: "Awaiting input" },
    { id: AgentRuntimeStatuses.FINISHED, label: "Finished" },
    { id: AgentRuntimeStatuses.STOPPED, label: "Stopped" },
    { id: AgentRuntimeStatuses.CRASHED, label: "Crashed" },
];

export const AgentStatusFilterOptions: { id: AgentRuntimeStatus | "all"; label: string }[] = [{ id: "all", label: "All statuses" }, ...AgentStatusOptions];
