import type { ReactNode } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDesktop, getBridge } from "@/lib/desktop";
import { useAppInfo, useLatestRelease, useReportInstall } from "@/features/app-releases/hooks/use-app-releases";
import { toReleasePlatform } from "@/features/app-releases/utils/app-releases.utils";
import { isVersionBelow } from "@/lib/semver";
import { environments } from "@/config/environments";

/**
 * Reports this device's version to the API and hard-blocks the app when running below the
 * enforced minimum version (Spec: docs/superpowers/specs/2026-09-29-app-distribution-and-updates-design.md).
 * Sits above AuthGate — a forced update applies whether or not the user is signed in.
 */
export function AppUpdateGate({ children }: { children: ReactNode }) {
    const { data: info } = useAppInfo();
    const platform = info ? toReleasePlatform(info.platform) : null;
    const { data: latest } = useLatestRelease(platform);
    useReportInstall(info);

    if (!isDesktop() || !info || !latest?.min_version || !isVersionBelow(info.version, latest.min_version)) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas p-8 text-center">
            <AlertTriangle className="size-10 text-warning" />
            <div className="space-y-1">
                <h1 className="text-lg font-medium">Update required</h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                    Version {info.version} is no longer supported. Install {latest.version} to keep using {environments.APP_NAME}.
                </p>
            </div>
            <Button onClick={() => void getBridge().app.openUrl(latest.download_url)}>
                <Download className="size-4" />
                Download the latest version
            </Button>
        </div>
    );
}
