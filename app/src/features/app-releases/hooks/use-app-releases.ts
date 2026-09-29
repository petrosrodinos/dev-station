import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AppInfo } from "@shared/contract";
import { getBridge, getErrorMessage, isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { getLatestRelease, pingInstall } from "../services/app-releases.services";
import { toReleasePlatform } from "../utils/app-releases.utils";

/** Real Electron version/platform/device id — the source of truth (not the hand-maintained env constant). */
export const useAppInfo = () => useQuery<AppInfo>({ queryKey: ["app-info"], queryFn: () => getBridge().app.info(), enabled: isDesktop(), staleTime: Infinity });

export const useLatestRelease = (platform: string | null) =>
    useQuery({
        queryKey: ["app-releases-latest", platform],
        queryFn: () => getLatestRelease(platform!),
        enabled: isDesktop() && !!platform,
        staleTime: 5 * 60_000,
        refetchInterval: 30 * 60_000,
        retry: false,
    });

/** Fire-and-forget device heartbeat, once per app session. Failures (offline, no release published yet) are swallowed. */
export const useReportInstall = (info: AppInfo | undefined) => {
    const sent = useRef(false);
    useEffect(() => {
        if (!info || sent.current) return;
        sent.current = true;
        void pingInstall({ device_id: info.device_id, platform: info.platform, arch: info.arch, app_version: info.version }).catch(() => undefined);
    }, [info]);
};

export const useCheckForUpdate = () =>
    useMutation({
        mutationFn: () => getBridge().appUpdates.check(),
        onError: (error: Error) => toast({ title: "Could not check for updates", description: getErrorMessage(error), variant: "error" }),
    });

export const useDownloadUpdate = () =>
    useMutation({
        mutationFn: () => getBridge().appUpdates.download(),
        onError: (error: Error) => toast({ title: "Could not download update", description: getErrorMessage(error), variant: "error" }),
    });

export const useInstallUpdate = () =>
    useMutation({
        mutationFn: () => getBridge().appUpdates.install(),
        onError: (error: Error) => toast({ title: "Could not restart to update", description: getErrorMessage(error), variant: "error" }),
    });

export { toReleasePlatform };
