import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDesktop } from "@/lib/desktop";
import { environments } from "@/config/environments";
import { AppUpdateStates } from "@shared/contract";
import { useAppUpdateStore } from "@/stores/app-update";
import { useAppInfo, useCheckForUpdate, useDownloadUpdate, useInstallUpdate, useLatestRelease, toReleasePlatform } from "@/features/app-releases/hooks/use-app-releases";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

const STATUS_LABEL: Partial<Record<string, string>> = {
  [AppUpdateStates.IDLE]: "Up to date",
  [AppUpdateStates.CHECKING]: "Checking for updates…",
  [AppUpdateStates.AVAILABLE]: "Update available",
  [AppUpdateStates.NOT_AVAILABLE]: "Up to date",
  [AppUpdateStates.DOWNLOADED]: "Ready to install",
  [AppUpdateStates.ERROR]: "Could not check for updates",
};

/** Current version + auto-update controls (Spec §5, "Renderer integration"). Desktop-only. */
export function AboutSection() {
  const { data: info } = useAppInfo();
  const platform = info ? toReleasePlatform(info.platform) : null;
  const { data: latest } = useLatestRelease(platform);
  const status = useAppUpdateStore((s) => s.status);
  const check = useCheckForUpdate();
  const download = useDownloadUpdate();
  const install = useInstallUpdate();

  if (!isDesktop()) return null;

  const version = info?.version ?? environments.APP_VERSION;
  const statusLabel = status.state === AppUpdateStates.DOWNLOADING ? `Downloading update…${status.percent != null ? ` ${status.percent}%` : ""}` : STATUS_LABEL[status.state];

  return (
    <section>
      <SettingsSectionHeader title="About" description={`${environments.APP_NAME} — version ${version}${latest ? ` (latest: v${latest.version})` : ""}.`} />
      <SettingsRow label="Updates" description={statusLabel}>
        <div className="flex w-full justify-end">
          {status.state === AppUpdateStates.DOWNLOADED ? (
            <Button size="sm" onClick={() => install.mutate()} loading={install.isPending}>
              Restart to update
            </Button>
          ) : status.state === AppUpdateStates.AVAILABLE ? (
            <Button size="sm" onClick={() => download.mutate()} loading={download.isPending}>
              Download update
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => check.mutate()} loading={check.isPending || status.state === AppUpdateStates.CHECKING}>
              <RefreshCw className="size-3.5" />
              Check for updates
            </Button>
          )}
        </div>
      </SettingsRow>
    </section>
  );
}
