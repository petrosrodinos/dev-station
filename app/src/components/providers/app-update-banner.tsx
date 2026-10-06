import { Button } from "@/components/ui/button";
import { useInstallUpdate } from "@/features/app-releases/hooks/use-app-releases";
import { AppUpdateStates } from "@shared/contract";
import { useAppUpdateStore } from "@/stores/app-update";
import { environments } from "@/config/environments";

/** Bottom-left prompt once an update is downloaded in the background. "Skip" hides it for this session only. */
export function AppUpdateBanner() {
    const status = useAppUpdateStore((s) => s.status);
    const skippedVersion = useAppUpdateStore((s) => s.skippedVersion);
    const skip = useAppUpdateStore((s) => s.skip);
    const install = useInstallUpdate();
    const { version } = status;

    if (status.state !== AppUpdateStates.DOWNLOADED || !version || version === skippedVersion) return null;

    return (
        <div role="status" className="fixed bottom-10 left-4 z-50 flex w-80 items-center gap-3 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <div className="min-w-0 flex-1">
                <p className="font-medium">Update ready</p>
                <p className="truncate text-xs text-muted-foreground">
                    {environments.APP_NAME} v{version} has been downloaded.
                </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => skip(version)}>
                Skip
            </Button>
            <Button size="sm" onClick={() => install.mutate()} loading={install.isPending}>
                Install
            </Button>
        </div>
    );
}
