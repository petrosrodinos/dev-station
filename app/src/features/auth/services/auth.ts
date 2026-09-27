import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { LoggedInUser } from "@/features/user/interfaces/user.interface";
import type { AuthResponse, SignInUser, SignUpUser } from "../interfaces/auth.interface";
import { formatAuthUser } from "../utils/auth.utils";

export const signIn = async ({ email, password }: SignInUser): Promise<LoggedInUser> => {
    try {
        const response = await axiosInstance.post<AuthResponse>(ApiRoutes.auth.email.login, { email, password });
        return formatAuthUser(response.data);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to sign in. Please try again."));
    }
};

export const signUp = async (data: SignUpUser): Promise<LoggedInUser> => {
    try {
        const response = await axiosInstance.post<AuthResponse>(ApiRoutes.auth.email.register, data);
        return formatAuthUser(response.data);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to sign up. Please try again."));
    }
};

export const refreshAccountToken = async (): Promise<LoggedInUser> => {
    try {
        const response = await axiosInstance.post<AuthResponse>(ApiRoutes.auth.email.refresh_token);
        return formatAuthUser(response.data);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to refresh your session."));
    }
};
