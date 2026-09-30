import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink, MonitorDown } from "lucide-react";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";

// Keep in sync with app/package.json's build.publish and .github/workflows/release.yml.
const RELEASES_REPO = "logiqdevai/dev-agents-releases";

const PLATFORM_LABELS: Record<string, string> = {
    win: "Windows",
    mac: "macOS",
    linux: "Linux",
};

interface AppRelease {
    platform: string;
    version: string;
    download_url: string;
    min_version: string | null;
    release_notes: string | null;
    published_at: string;
}

async function getReleases(): Promise<AppRelease[]> {
    try {
        const res = await fetch(`${environments.apiUrl}/app-releases`, { next: { revalidate: 60 } });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export const metadata: Metadata = {
    title: "Download",
    description: "Download Dev Station for your platform.",
};

export default async function DownloadsPage() {
    const releases = await getReleases();

    return (
        <div className="mx-auto max-w-3xl px-4 py-16">
            <div className="mb-10 space-y-2">
                <Link href={Routes.home} className="text-sm text-muted-foreground hover:text-foreground">
                    ← Back home
                </Link>
                <h1 className="text-3xl font-semibold tracking-tight">Download Dev Station</h1>
                <p className="text-muted-foreground">Pick your platform below. Windows, macOS and Linux builds are unsigned for now — see the install notes under each download.</p>
            </div>

            {releases.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No releases published yet — check back soon.</div>
            ) : (
                <div className="space-y-4">
                    {releases.map((release) => (
                        <div key={release.platform} className="rounded-lg border bg-card p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <MonitorDown className="size-5 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">{PLATFORM_LABELS[release.platform] ?? release.platform}</div>
                                        <div className="text-sm text-muted-foreground">v{release.version}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`${environments.apiUrl}/app-releases/download?platform=${release.platform}`}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                                    >
                                        <Download className="size-3.5" />
                                        Download
                                    </a>
                                    <a
                                        href={`https://github.com/${RELEASES_REPO}/releases/tag/v${release.version}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                                    >
                                        <ExternalLink className="size-3.5" />
                                        View on GitHub
                                    </a>
                                </div>
                            </div>

                            {release.release_notes && (
                                <div
                                    className="prose prose-sm mt-4 max-w-none border-t pt-4 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-base [&_h2]:font-medium [&_a]:text-primary [&_a]:underline"
                                    // release_notes is HTML set only by authenticated admin/CI writers (ADMIN/SUPER_ADMIN/SUPPORT or the CI release token) — trusted content, not user-submitted.
                                    dangerouslySetInnerHTML={{ __html: release.release_notes }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-12 space-y-3 border-t pt-8">
                <h2 className="text-lg font-medium">Install notes</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    <li><strong className="text-foreground">Windows:</strong> the installer isn&apos;t code-signed yet, so SmartScreen will warn — click &quot;More info&quot; → &quot;Run anyway&quot;.</li>
                    <li>Dev Station checks for updates automatically once installed, and will prompt you to update when a new version is available.</li>
                    <li>Having trouble? The installer and its checksum are also available directly from the GitHub release page linked above.</li>
                </ul>
            </div>
        </div>
    );
}
