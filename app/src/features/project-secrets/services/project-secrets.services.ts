import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { SecretSet, SecretSetInput, SecretSetSummary } from "../interfaces/project-secrets.interfaces";

// Shared env values are encrypted by the API at rest. Values are only returned by getSecretSet, never by the list.

export const getSecretSets = async (projectId: string): Promise<SecretSetSummary[]> => {
    try {
        const response = await axiosInstance.get<SecretSetSummary[]>(ApiRoutes.projects.secret_sets(projectId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load the shared secrets."));
    }
};

export const getSecretSet = async ({ projectId, setId }: { projectId: string; setId: string }): Promise<SecretSet> => {
    try {
        const response = await axiosInstance.get<SecretSet>(ApiRoutes.projects.secret_set(projectId, setId));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load the secret set."));
    }
};

export const createSecretSet = async ({ projectId, ...dto }: SecretSetInput & { projectId: string }): Promise<SecretSet> => {
    try {
        const response = await axiosInstance.post<SecretSet>(ApiRoutes.projects.secret_sets(projectId), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the secret set."));
    }
};

export const updateSecretSet = async ({ projectId, setId, ...dto }: Partial<SecretSetInput> & { projectId: string; setId: string }): Promise<SecretSet> => {
    try {
        const response = await axiosInstance.patch<SecretSet>(ApiRoutes.projects.secret_set(projectId, setId), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the secret set."));
    }
};

export const deleteSecretSet = async ({ projectId, setId }: { projectId: string; setId: string }): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.projects.secret_set(projectId, setId));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the secret set."));
    }
};
