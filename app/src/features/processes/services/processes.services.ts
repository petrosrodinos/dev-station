import type { LogLine, PortKillResult, ProcessInfo, ServiceSpec } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";
import type { ProjectService } from "@/features/projects/interfaces/projects.interfaces";

// Development processes are spawned and owned by the Electron main process (Process Manager).

/** `siblings` is every service of the project (including `service`) so `{{other.port}}` references can resolve. */
export const toServiceSpec = (service: ProjectService, siblings: ProjectService[]): ServiceSpec => ({
    service_id: service.id,
    name: service.name,
    cwd: service.cwd || ".",
    package_manager: service.package_manager,
    script: service.script,
    command: service.command,
    url: service.url,
    env: service.env,
    port: service.port,
    siblings: siblings.map((s) => ({ service_id: s.id, name: s.name, port: s.port })),
});

export const processKey = (projectId: string, serviceId: string) => `${projectId}:${serviceId}`;

export const listProcesses = async (): Promise<ProcessInfo[]> => {
    try {
        return await getBridge().processes.list();
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to list processes."));
    }
};

export interface ServiceRunVars {
    projectId: string;
    service: ProjectService;
    siblings: ProjectService[];
}

export const startService = async ({ projectId, service, siblings }: ServiceRunVars): Promise<ProcessInfo> => {
    // Errors keep their bridge `code` (e.g. COMMAND_NOT_APPROVED) so the UI can offer approval.
    return getBridge().processes.start(projectId, toServiceSpec(service, siblings));
};

export const stopService = async (key: string): Promise<void> => {
    try {
        await getBridge().processes.stop(key);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to stop the process."));
    }
};

export const restartService = async ({ projectId, service, siblings }: ServiceRunVars): Promise<ProcessInfo> => {
    return getBridge().processes.restart(projectId, toServiceSpec(service, siblings));
};

export const getProcessLogs = async (key: string): Promise<LogLine[]> => {
    try {
        return await getBridge().processes.logs(key);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to load logs."));
    }
};

export const approveServiceCommand = async ({ projectId, command }: { projectId: string; command: string }): Promise<void> => {
    try {
        await getBridge().processes.approveCommand(projectId, command);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to approve the command."));
    }
};

/** Terminates whatever is listening on each of the given ports. */
export const killPorts = async (ports: number[]): Promise<PortKillResult[]> => {
    try {
        return await getBridge().ports.kill(ports);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to free ports."));
    }
};
