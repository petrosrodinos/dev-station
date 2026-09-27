import type { TerminalInfo } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

export const createTerminal = async ({ projectId, cols, rows }: { projectId: string; cols?: number; rows?: number }): Promise<TerminalInfo> => {
    try {
        return await getBridge().terminals.create(projectId, { cols, rows });
    } catch (error) {
        throw new Error(getErrorMessage(error, "Could not open a terminal."));
    }
};

export const killTerminal = async (id: string): Promise<void> => {
    try {
        await getBridge().terminals.kill(id);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Could not close the terminal."));
    }
};
