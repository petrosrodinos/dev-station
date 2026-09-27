import type { LogLine, ProcessInfo, ServiceSpec } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";
import type { ProjectService } from "@/features/projects/interfaces/projects.interfaces";

// Development processes are spawned and owned by the Electron main process (Process Manager).

export const toServiceSpec = (service: ProjectService): ServiceSpec => ({
    service_id: service.id,
    name: service.name,
    cwd: service.cwd || ".",
    package_manager: service.package_manager,
    script: service.script,
    command: service.command,
    url: service.url,
    env: service.env,
});

export const processKey = (projectId: string, serviceId: string) => `${projectId}:${serviceId}`;

export const listProcesses = async (): Promise<ProcessInfo[]> => {
    try {
        return await getBridge().processes.list();
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to list processes."));
    }
};

export const startService = async ({ projectId, service }: { projectId: string; service: ProjectService }): Promise<ProcessInfo> => {
    // Errors keep their bridge `code` (e.g. COMMAND_NOT_APPROVED) so the UI can offer approval.
    return getBridge().processes.start(projectId, toServiceSpec(service));
};

export const stopService = async (key: string): Promise<void> => {
    try {
        await getBridge().processes.stop(key);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to stop the process."));
    }
};

export const restartService = async ({ projectId, service }: { projectId: string; service: ProjectService }): Promise<ProcessInfo> => {
    return getBridge().processes.restart(projectId, toServiceSpec(service));
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
