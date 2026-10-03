import "../landing.css";
import type { Metadata } from "next";
import { environments } from "@/config/environments";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";

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
    description: "Download Dev Station for Windows, macOS or Linux.",
};

export default async function DownloadsPage() {
    const releases = await getReleases();
    // Only meaningful to call one out as "latest" when there's more than one to compare against.
    const latestPlatform =
        releases.length > 1
            ? releases.reduce((latest, r) => (new Date(r.published_at) > new Date(latest.published_at) ? r : latest)).platform
            : null;

    return (
        <div className="landing">
            <div className="stripes" aria-hidden="true"><i /><i /><i /></div>

            <SiteNav />

            <main>
                <header className="wrap dl-hero">
                    <span className="eyebrow"><b>v{releases[0]?.version ?? "—"}</b> latest build</span>
                    <h1>Download Dev Station</h1>
                    <p className="lead">Your projects, agents, terminals and previews in one workspace. Pick your platform below — installers are unsigned for now, see the notes at the bottom.</p>
                </header>

                <section style={{ paddingTop: 0 }}>
                    <div className="wrap">
                        {releases.length === 0 ? (
                            <div className="dl-empty">No releases published yet — check back soon.</div>
                        ) : (
                            <div className="dl-list">
                                {releases.map((release) => (
                                    <div key={release.platform} className={`dl-card${release.platform === latestPlatform ? " is-latest" : ""}`}>
                                        <div className="dl-top">
                                            <div className="dl-plat">
                                                <span className="dl-ico">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="4" width="18" height="12" rx="2" />
                                                        <path d="M8 20h8M12 16v4" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h3>
                                                        {PLATFORM_LABELS[release.platform] ?? release.platform}
                                                        {release.platform === latestPlatform && (
                                                            <span className="dl-badge"><span className="dot" />Latest</span>
                                                        )}
                                                    </h3>
                                                    <span className="ver">v{release.version}</span>
                                                </div>
                                            </div>
                                            <div className="dl-actions">
                                                <a className="btn btn-primary" href={`${environments.apiUrl}/app-releases/download?platform=${release.platform}`}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" /></svg>
                                                    Download
                                                </a>
                                                <a className="btn btn-ghost" href={`https://github.com/${RELEASES_REPO}/releases/tag/v${release.version}`} target="_blank" rel="noopener noreferrer">
                                                    View on GitHub
                                                </a>
                                            </div>
                                        </div>

                                        {release.release_notes && (
                                            // release_notes is HTML set only by authenticated admin/CI writers (ADMIN/SUPER_ADMIN/SUPPORT or the CI release token) — trusted content, not user-submitted.
                                            <div className="dl-notes" dangerouslySetInnerHTML={{ __html: release.release_notes }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="dl-install">
                            <div className="sec-head" style={{ marginBottom: 20 }}>
                                <p className="kicker">Before you install</p>
                                <h2 style={{ fontSize: 22 }}>A few things to know</h2>
                            </div>
                            <ul>
                                <li><strong>Windows:</strong> the installer isn&apos;t code-signed yet, so SmartScreen will warn on first run — click &quot;More info&quot; → &quot;Run anyway&quot;.</li>
                                <li>Dev Station checks for updates automatically once installed, and prompts you when a new version is ready.</li>
                                <li>Older versions may be blocked from launching if they fall below the minimum supported version — you&apos;ll be prompted to update.</li>
                                <li>Trouble downloading? Every installer and its checksum are also on the GitHub release page linked above.</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
