import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AgentSessionInfo, LogLine, ProcessInfo, TerminalInfo } from "@shared/contract";

// Live state pushed from the Electron main process (processes, PTYs, agent sessions).
// It mirrors OS state on this device, so nothing here is persisted.

const MAX_RENDERER_LOG_LINES = 2000;

interface RuntimeState {
    processes: Record<string, ProcessInfo>;
    process_logs: Record<string, LogLine[]>;
    terminals: Record<string, TerminalInfo>;
    agents: Record<string, AgentSessionInfo>;
}

interface RuntimeActions {
    upsertProcess(info: ProcessInfo): void;
    appendProcessLogs(key: string, lines: LogLine[]): void;
    setProcessLogs(key: string, lines: LogLine[]): void;
    setProcesses(list: ProcessInfo[]): void;
    upsertTerminal(info: TerminalInfo): void;
    removeTerminal(id: string): void;
    setTerminals(list: TerminalInfo[]): void;
    upsertAgent(info: AgentSessionInfo): void;
    removeAgent(id: string): void;
    setAgents(list: AgentSessionInfo[]): void;
}

const STORE_KEY = "runtime";

export const useRuntimeStore = create<RuntimeState & RuntimeActions>()(
    devtools(
        persist(
            (set) => ({
                processes: {},
                process_logs: {},
                terminals: {},
                agents: {},
                upsertProcess: (info) => set((s) => ({ processes: { ...s.processes, [info.key]: info } })),
                appendProcessLogs: (key, lines) =>
                    set((s) => {
                        const next = [...(s.process_logs[key] ?? []), ...lines];
                        return { process_logs: { ...s.process_logs, [key]: next.length > MAX_RENDERER_LOG_LINES ? next.slice(-MAX_RENDERER_LOG_LINES) : next } };
                    }),
                setProcessLogs: (key, lines) => set((s) => ({ process_logs: { ...s.process_logs, [key]: lines.slice(-MAX_RENDERER_LOG_LINES) } })),
                setProcesses: (list) => set({ processes: Object.fromEntries(list.map((p) => [p.key, p])) }),
                upsertTerminal: (info) => set((s) => ({ terminals: { ...s.terminals, [info.id]: info } })),
                removeTerminal: (id) =>
                    set((s) => {
                        const { [id]: _removed, ...rest } = s.terminals;
                        return { terminals: rest };
                    }),
                setTerminals: (list) => set({ terminals: Object.fromEntries(list.map((t) => [t.id, t])) }),
                upsertAgent: (info) => set((s) => ({ agents: { ...s.agents, [info.id]: info } })),
                removeAgent: (id) =>
                    set((s) => {
                        const { [id]: _removed, ...rest } = s.agents;
                        return { agents: rest };
                    }),
                setAgents: (list) => set({ agents: Object.fromEntries(list.map((a) => [a.id, a])) }),
            }),
            { name: STORE_KEY, partialize: () => ({}) },
        ),
    ),
);

export const getRuntimeStoreState = () => useRuntimeStore.getState();
