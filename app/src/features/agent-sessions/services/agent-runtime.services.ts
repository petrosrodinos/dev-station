import type { AgentAdapterInfo, AgentSessionInfo, StartAgentInput } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

// Local side of an AI session: the agent CLI process + PTY managed by the Electron main process.

const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getErrorMessage(error, fallback));
    }
};

export const getAgentAdapters = (): Promise<AgentAdapterInfo[]> => wrap(() => getBridge().agents.adapters(), "Failed to detect installed agents.");
export const startAgentProcess = (input: StartAgentInput): Promise<AgentSessionInfo> => wrap(() => getBridge().agents.start(input), "Failed to start the agent.");
export const stopAgentProcess = (id: string): Promise<void> => wrap(() => getBridge().agents.stop(id), "Failed to stop the agent.");
export const restartAgentProcess = (id: string): Promise<AgentSessionInfo> => wrap(() => getBridge().agents.restart(id), "Failed to restart the agent.");
export const forgetAgentProcess = (id: string): Promise<void> => wrap(() => getBridge().agents.forget(id), "Failed to close the session.");
export const openAgentExternally = (id: string): Promise<void> => wrap(() => getBridge().agents.openExternal(id), "Could not open an external terminal.");
export const setAgentIdleThreshold = (seconds: number): Promise<void> => wrap(() => getBridge().agents.setIdleThreshold(seconds), "Failed to apply the idle threshold.");
