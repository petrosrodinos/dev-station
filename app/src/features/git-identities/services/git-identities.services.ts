import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { CreateGitIdentityDto, GitIdentity, UpdateGitIdentityDto } from "../interfaces/git-identities.interfaces";

export const getGitIdentities = async (): Promise<GitIdentity[]> => {
    try {
        const response = await axiosInstance.get<GitIdentity[]>(ApiRoutes.gitIdentities.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load Git identities."));
    }
};

export const createGitIdentity = async (dto: CreateGitIdentityDto): Promise<GitIdentity> => {
    try {
        const response = await axiosInstance.post<GitIdentity>(ApiRoutes.gitIdentities.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the identity."));
    }
};

export const updateGitIdentity = async ({ id, ...dto }: UpdateGitIdentityDto & { id: string }): Promise<GitIdentity> => {
    try {
        const response = await axiosInstance.patch<GitIdentity>(ApiRoutes.gitIdentities.byId(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the identity."));
    }
};

export const deleteGitIdentity = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.gitIdentities.byId(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the identity."));
    }
};
