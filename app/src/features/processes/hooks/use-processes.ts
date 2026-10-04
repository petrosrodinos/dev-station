import { useMutation } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { approveServiceCommand, getProcessLogs, killPorts, processKey, restartService, startService, stopService } from "../services/processes.services";
import { useRuntimeStore } from "@/stores/runtime";
import { getBridgeErrorCode, getErrorMessage } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { IpcErrorCodes, ProcessStatuses, type ProcessInfo } from "@shared/contract";

export const useProjectProcesses = (projectId: string | null): Record<string, ProcessInfo> =>
    useRuntimeStore(
        useShallow((s) => {
            const out: Record<string, ProcessInfo> = {};
            if (!projectId) return out;
            for (const p of Object.values(s.processes)) if (p.project_id === projectId) out[p.service_id] = p;
            return out;
        }),
    );

export const useRunningProcessCount = (projectId?: string | null) =>
    useRuntimeStore((s) => Object.values(s.processes).filter((p) => p.status === ProcessStatuses.RUNNING && (!projectId || p.project_id === projectId)).length);

export const useProcessLogs = (key: string | null) => useRuntimeStore((s) => (key ? s.process_logs[key] ?? null : null));

/** `onNeedsApproval` is called when a custom command must be approved on this device first. */
export const useStartService = (onNeedsApproval?: (command: string) => void) => {
    const upsert = useRuntimeStore((s) => s.upsertProcess);
    return useMutation({
        mutationFn: startService,
        onSuccess: (info) => {
            upsert(info);
            toast({ title: `${info.name} started`, duration: 1500 });
        },
        onError: (error: Error, vars) => {
            if (getBridgeErrorCode(error) === IpcErrorCodes.COMMAND_NOT_APPROVED && vars.service.command) {
                onNeedsApproval?.(vars.service.command);
                return;
            }
            toast({ title: `Could not start ${vars.service.name}`, description: getErrorMessage(error), variant: "error", duration: 6000 });
        },
    });
};

export const useStopService = () =>
    useMutation({
        mutationFn: stopService,
        onSuccess: () => toast({ title: "Process stopped", duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not stop process", description: error.message, variant: "error" }),
    });

export const useRestartService = (onNeedsApproval?: (command: string) => void) => {
    const upsert = useRuntimeStore((s) => s.upsertProcess);
    return useMutation({
        mutationFn: restartService,
        onSuccess: (info) => {
            upsert(info);
            toast({ title: `${info.name} restarted`, duration: 1500 });
        },
        onError: (error: Error, vars) => {
            if (getBridgeErrorCode(error) === IpcErrorCodes.COMMAND_NOT_APPROVED && vars.service.command) {
                onNeedsApproval?.(vars.service.command);
                return;
            }
            toast({ title: `Could not restart ${vars.service.name}`, description: getErrorMessage(error), variant: "error" });
        },
    });
};

export const useApproveServiceCommand = () =>
    useMutation({
        mutationFn: approveServiceCommand,
        onSuccess: () => toast({ title: "Command approved on this device", duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not approve command", description: error.message, variant: "error" }),
    });

/** Terminates whatever listens on the given ports and reports what happened. */
export const useKillPorts = () =>
    useMutation({
        mutationFn: killPorts,
        onSuccess: (results) => {
            const stuck = results.filter((r) => !r.freed).map((r) => r.port);
            const freed = results.filter((r) => r.pids.length && r.freed).map((r) => r.port);
            const idle = results.filter((r) => !r.pids.length).map((r) => r.port);
            if (stuck.length) toast({ title: `Could not free port${stuck.length > 1 ? "s" : ""} ${stuck.join(", ")}`, description: "The process may need administrator rights.", variant: "error", duration: 6000 });
            else if (freed.length) toast({ title: `Freed port${freed.length > 1 ? "s" : ""} ${freed.join(", ")}`, description: idle.length ? `Nothing was running on ${idle.join(", ")}.` : undefined, duration: 2500 });
            else toast({ title: "Nothing was running on those ports", duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not free ports", description: error.message, variant: "error" }),
    });

/** Loads the full log backlog from main when a log viewer opens. */
export const useLoadProcessLogs = () => {
    const setLogs = useRuntimeStore((s) => s.setProcessLogs);
    return useMutation({
        mutationFn: async (key: string) => ({ key, lines: await getProcessLogs(key) }),
        onSuccess: ({ key, lines }) => setLogs(key, lines),
        onError: (error: Error) => toast({ title: "Could not load logs", description: error.message, variant: "error" }),
    });
};

export { processKey };
