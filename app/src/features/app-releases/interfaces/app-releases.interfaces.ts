export interface PingInstallDto {
    device_id: string;
    platform: string;
    arch: string;
    app_version: string;
}

export interface LatestRelease {
    version: string;
    download_url: string;
    min_version: string | null;
    release_notes: string | null;
}
