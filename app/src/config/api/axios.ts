import axios from "axios";
import { getAuthStoreState } from "@/stores/auth";
import { getWorkspaceStoreState } from "@/stores/workspace";
import { isTokenExpired } from "@/lib/token";
import { environments } from "@/config/environments";

const axiosInstance = axios.create({
    baseURL: environments.API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30_000,
});

axiosInstance.interceptors.request.use((config) => {
    const authState = getAuthStoreState();

    if (authState.access_token && authState.expires_in && isTokenExpired(authState.expires_in)) {
        authState.logout();
        return Promise.reject(new Error("Your session has expired. Please sign in again."));
    }

    if (authState.access_token) {
        config.headers.Authorization = `Bearer ${authState.access_token}`;
    }

    // Organization-scoped endpoints resolve membership + permissions from this header.
    const organizationId = getWorkspaceStoreState().active_organization_id;
    if (organizationId && !config.headers["x-organization-id"]) {
        config.headers["x-organization-id"] = organizationId;
    }

    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401 && getAuthStoreState().access_token) {
            getAuthStoreState().logout();
        }
        return Promise.reject(error);
    },
);

/** Extracts the API's human-readable error (Nest `message` may be a string or an array). */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (Array.isArray(message)) return message.join(", ");
        if (typeof message === "string" && message) return message;
        if (!error.response) return "Cannot reach the Dev Station API. Check your connection.";
    }
    if (error instanceof Error && error.message && !axios.isAxiosError(error)) return error.message;
    return fallback;
};

export default axiosInstance;
