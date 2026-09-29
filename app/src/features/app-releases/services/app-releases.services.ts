import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { LatestRelease, PingInstallDto } from "../interfaces/app-releases.interfaces";

/** Device heartbeat for version adoption tracking. Best-effort — callers should swallow failures. */
export const pingInstall = async (dto: PingInstallDto): Promise<void> => {
    await axiosInstance.post(ApiRoutes.appReleases.ping, dto);
};

export const getLatestRelease = async (platform: string): Promise<LatestRelease> => {
    try {
        const response = await axiosInstance.get<LatestRelease>(ApiRoutes.appReleases.latest, { params: { platform } });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to check for updates."));
    }
};
