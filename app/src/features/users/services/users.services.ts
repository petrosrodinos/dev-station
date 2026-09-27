import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { Me, UpdateMeDto, UpdatePreferenceDto, UserPreference } from "../interfaces/users.interfaces";

export const getMe = async (): Promise<Me> => {
    try {
        const response = await axiosInstance.get<Me>(ApiRoutes.users.me);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load your profile."));
    }
};

export const updateMe = async (dto: UpdateMeDto): Promise<Me> => {
    try {
        const response = await axiosInstance.patch<Me>(ApiRoutes.users.me, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update your profile."));
    }
};

export const getPreferences = async (): Promise<UserPreference> => {
    try {
        const response = await axiosInstance.get<UserPreference>(ApiRoutes.users.preferences);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load preferences."));
    }
};

export const updatePreferences = async (dto: UpdatePreferenceDto): Promise<UserPreference> => {
    try {
        const response = await axiosInstance.patch<UserPreference>(ApiRoutes.users.preferences, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to save preferences."));
    }
};
