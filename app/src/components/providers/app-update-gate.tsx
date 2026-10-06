import type { ReactNode } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isDesktop, getBridge } from "@/lib/desktop";
import { useAppInfo, useInstallUpdate, useLatestRelease, useReportInstall } from "@/features/app-releases/hooks/use-app-releases";
import { toReleasePlatform } from "@/features/app-releases/utils/app-releases.utils";
import type { LatestRelease } from "@/features/app-releases/interfaces/app-releases.interfaces";
import { isVersionBelow } from "@/lib/semver";
import { environments } from "@/config/environments";
import { AppUpdateStates } from "@shared/contract";
import { useAppUpdateStore } from "@/stores/app-update";
import { AppUpdateBanner } from "./app-update-banner";

/**
 * Reports this device's version to the API and enforces the minimum supported version (Spec:
 * docs/superpowers/specs/2026-09-29-app-distribution-and-updates-design.md). Sits above AuthGate, so a
 * forced update applies whether or not the user is signed in.
 *
 * Below `min_version` the app is made inert behind a non-dismissable modal. Otherwise an Install / Skip
 * banner appears once an update has been downloaded in the background.
 */
export function AppUpdateGate({ children }: { children: ReactNode }) {
    const { data: info } = useAppInfo();
    const platform = info ? toReleasePlatform(info.platform) : null;
    const { data: latest } = useLatestRelease(platform);
    useReportInstall(info);

    const mustUpdate = isDesktop() && !!info && !!latest?.min_version && isVersionBelow(info.version, latest.min_version);

    return (
        <>
            <div className="contents" inert={mustUpdate}>
                {children}
            </div>
            {mustUpdate && info && latest ? <ForcedUpdateModal currentVersion={info.version} latest={latest} /> : <AppUpdateBanner />}
        </>
    );
}

function ForcedUpdateModal({ currentVersion, latest }: { currentVersion: string; latest: LatestRelease }) {
    const status = useAppUpdateStore((s) => s.status);
    const install = useInstallUpdate();
    const downloading = status.state === AppUpdateStates.AVAILABLE || status.state === AppUpdateStates.DOWNLOADING;

    return (
        // No close control and no-op onOpenChange: Escape and outside clicks cannot dismiss it.
        <Dialog open disablePointerDismissal>
            <DialogContent showCloseButton={false} className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-warning" />
                        Update required
                    </DialogTitle>
                    <DialogDescription>
                        Version {currentVersion} is no longer supported. Install {latest.version} to keep using {environments.APP_NAME}.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    {status.state === AppUpdateStates.DOWNLOADED ? (
                        <Button onClick={() => install.mutate()} loading={install.isPending}>
                            Restart to update
                        </Button>
                    ) : downloading ? (
                        <Button disabled loading>
                            {`Downloading update${status.percent != null ? ` ${status.percent}%` : "…"}`}
                        </Button>
                    ) : (
                        <Button onClick={() => void getBridge().app.openUrl(latest.download_url)}>
                            <Download className="size-4" />
                            Download v{latest.version}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
