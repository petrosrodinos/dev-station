import type { DetectionResult, DeviceSettings, ProjectLocalState, WorkspaceConfig } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

// Device-local workspace (Spec §25/§26) — served by the Electron main process, never by the API.

export const getWorkspaceConfig = async (): Promise<WorkspaceConfig> => {
    try {
        return await getBridge().workspace.getConfig();
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to read the local workspace configuration."));
    }
};

export const updateDeviceSettings = async (settings: Partial<DeviceSettings>): Promise<WorkspaceConfig> => {
    try {
        return await getBridge().workspace.updateSettings(settings);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to save device settings."));
    }
};

export const setProjectPath = async ({ projectId, path }: { projectId: string; path: string | null }): Promise<WorkspaceConfig> => {
    try {
        return await getBridge().workspace.setProjectPath(projectId, path);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to link the local folder."));
    }
};

export const getProjectLocalStates = async (projectIds: string[]): Promise<Record<string, ProjectLocalState>> => {
    try {
        return await getBridge().workspace.projectStates(projectIds);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to read local project state."));
    }
};

export const suggestProjectPath = async (projectName: string): Promise<string> => {
    try {
        return await getBridge().workspace.suggestPath(projectName);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to suggest a destination folder."));
    }
};

export const pickDirectory = async (defaultPath?: string): Promise<string | null> => {
    try {
        return await getBridge().workspace.pickDirectory(defaultPath);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Could not open the folder picker."));
    }
};

export const inspectProject = async (projectId: string): Promise<DetectionResult> => {
    try {
        return await getBridge().detect.inspectProject(projectId);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to inspect the project."));
    }
};

export const inspectPath = async (path: string): Promise<DetectionResult> => {
    try {
        return await getBridge().detect.inspectPath(path);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to inspect the folder."));
    }
};

export const openUrl = async (url: string): Promise<void> => {
    if (window.devStation) return window.devStation.app.openUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
};
