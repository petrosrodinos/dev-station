import type { StatusDotStatus } from "@/components/ui/status-dot";
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
