import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { Paginated } from "@/interfaces/pagination/pagination.interface";
import type {
    AdminInstallAdoption,
    AdminRelease,
    AdminStats,
    AdminUser,
    AdminUsersQuery,
    UpdateReleaseLimits,
} from "../interfaces/admin.interface";

export const getAdminStats = async (): Promise<AdminStats> => {
    try {
        const response = await axiosInstance.get<AdminStats>(ApiRoutes.admin.stats);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load admin stats."));
    }
};

export const getAdminUsers = async (query: AdminUsersQuery): Promise<Paginated<AdminUser>> => {
    try {
        const response = await axiosInstance.get<Paginated<AdminUser>>(ApiRoutes.admin.users, { params: query });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load users."));
    }
};

export const getAdminReleases = async (): Promise<AdminRelease[]> => {
    try {
        const response = await axiosInstance.get<AdminRelease[]>(ApiRoutes.admin.releases);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load releases."));
    }
};

export const updateAdminReleaseLimits = async ({ platform, ...dto }: UpdateReleaseLimits & { platform: string }): Promise<AdminRelease> => {
    try {
        const response = await axiosInstance.patch<AdminRelease>(ApiRoutes.admin.release(platform), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the release."));
    }
};

export const getAdminInstallAdoption = async (): Promise<AdminInstallAdoption> => {
    try {
        const response = await axiosInstance.get<AdminInstallAdoption>(ApiRoutes.admin.installs);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load install adoption."));
    }
};
