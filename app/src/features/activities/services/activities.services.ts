import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { ActivitiesQuery, ActivitiesResponse, Activity, CreateActivityDto } from "../interfaces/activities.interfaces";

export const getActivities = async (query: ActivitiesQuery): Promise<ActivitiesResponse> => {
    try {
        const response = await axiosInstance.get<ActivitiesResponse>(ApiRoutes.activities.prefix, { params: query });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load activity."));
    }
};

export const createActivity = async (dto: CreateActivityDto): Promise<Activity> => {
    try {
        const response = await axiosInstance.post<Activity>(ApiRoutes.activities.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to record activity."));
    }
};
