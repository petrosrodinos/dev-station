import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
    CreateLayoutDto,
    UpdateLayoutDto,
    UpdateLayoutStateDto,
    UpdateProjectDockLayoutDto,
    WorkspaceLayoutPreset,
    WorkspaceLayoutState,
} from "../interfaces/workspace-layouts.interfaces";

export const getLayouts = async (): Promise<WorkspaceLayoutPreset[]> => {
    try {
        const response = await axiosInstance.get<WorkspaceLayoutPreset[]>(ApiRoutes.workspaceLayouts.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load your saved layouts."));
    }
};

export const createLayout = async (dto: CreateLayoutDto): Promise<WorkspaceLayoutPreset> => {
    try {
        const response = await axiosInstance.post<WorkspaceLayoutPreset>(ApiRoutes.workspaceLayouts.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to save this layout."));
    }
};

export const updateLayout = async ({ id, dto }: { id: string; dto: UpdateLayoutDto }): Promise<WorkspaceLayoutPreset> => {
    try {
        const response = await axiosInstance.patch<WorkspaceLayoutPreset>(ApiRoutes.workspaceLayouts.by_id(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update this layout."));
    }
};

export const deleteLayout = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.workspaceLayouts.by_id(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete this layout."));
    }
};

export const getLayoutState = async (): Promise<WorkspaceLayoutState> => {
    try {
        const response = await axiosInstance.get<WorkspaceLayoutState>(ApiRoutes.workspaceLayouts.state);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load your layout state."));
    }
};

export const updateLayoutState = async (dto: UpdateLayoutStateDto): Promise<WorkspaceLayoutState> => {
    try {
        const response = await axiosInstance.patch<WorkspaceLayoutState>(ApiRoutes.workspaceLayouts.state, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to save your layout state."));
    }
};

export const updateProjectDockLayout = async (dto: UpdateProjectDockLayoutDto): Promise<WorkspaceLayoutState> => {
    try {
        const response = await axiosInstance.patch<WorkspaceLayoutState>(ApiRoutes.workspaceLayouts.project_dock_layout, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to save this project's panel layout."));
    }
};
