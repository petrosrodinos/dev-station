import axios from "axios";
import { environments } from "@/config/environments";
import { ApiRoutes } from "@/config/api/routes";

/** A request that never got a response (offline, DNS failure, refused connection, or timeout). */
export const isNetworkError = (error: unknown): boolean => axios.isAxiosError(error) && !error.response && !axios.isCancel(error);

// Deliberately bypasses axiosInstance: its request interceptor logs the user out on an expired token,
// and a reachability check must never do that.
const probeClient = axios.create({
    baseURL: environments.API_URL,
    timeout: 5_000,
    validateStatus: () => true,
});

/** Any HTTP response means the API is reachable, even a 5xx from a degraded dependency. */
export const probeApiHealth = async (): Promise<boolean> => {
    try {
        await probeClient.get(ApiRoutes.health.prefix);
        return true;
    } catch {
        return false;
    }
};
