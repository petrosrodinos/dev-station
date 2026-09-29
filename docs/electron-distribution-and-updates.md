# Electron Distribution, Updates and Version Tracking

## Status (2026-09-29)

Windows distribution, auto-update and version tracking are **implemented** —
see the design spec at
[`docs/superpowers/specs/2026-09-29-app-distribution-and-updates-design.md`](superpowers/specs/2026-09-29-app-distribution-and-updates-design.md)
for the full design, and `api/src/modules/app-releases/` for the API module.
macOS, code signing, and public release hosting are deferred (see
"What's left" below). The rest of this doc is the general reference material
the design was based on.

### What's built

- **Packaging**: `electron-builder` (`app/package.json` → `build`) produces
  an unsigned NSIS installer, `publish: github` pointed at
  `petrosrodinos/dev-station`, fixed `artifactName` for a predictable
  download URL.
- **CI**: `.github/workflows/release.yml` — tag `vX.Y.Z` → build → publish to
  GitHub Releases → PATCH the API's latest-release record.
- **Auto-update**: `app/electron/managers/update-manager.ts` wraps
  `electron-updater` (checks on launch + every 4h); manual check/download/
  restart controls live in Settings → General → About; a status-bar badge
  shows when an update is available.
- **Version enforcement**: the app pings `GET /app-releases/latest` and hard-
  blocks (full-screen, pre-login too) when running below the API's
  `min_version` for the platform.
- **Adoption tracking**: `POST /app-releases/ping` on every boot upserts an
  `AppInstall` row (device id, platform, arch, version); `GET /app-releases/
  download` is the stable public download link, and counts downloads.

### What's left (manual, one-time)

1. Add GitHub Actions secret `RELEASE_PUBLISH_TOKEN` and variable
   `RELEASE_API_URL` to the repo.
2. Set the matching `RELEASE_PUBLISH_TOKEN` on the real API deployment.
3. Apply the `app_releases`/`app_installs` migration
   (`api/prisma/migrations/20260929200000_app_releases`) to whichever
   Postgres is actually run.
4. Cut a first tagged release so `app_releases` has a row — until then,
   `/app-releases/latest` 404s and the app skips version-checking (fails
   open).
5. Set `min_version` by hand (PATCH `/app-releases/:platform`) when shipping
   a breaking change — nothing sets it automatically.
6. Make the repo/releases public (or move hosting to R2/generic) before
   auto-update or the download link work for anyone outside the GitHub org —
   private release assets aren't publicly downloadable.
7. macOS build/signing/notarization and Windows code signing (Azure Trusted
   Signing) are not started; CI ships an unsigned build, so Windows
   SmartScreen will warn users until signing is added.

---

## Recommended setup

**electron-builder + GitHub Releases + electron-updater + a small download page.**

### 1. Build and package
- Use **electron-builder** (or Electron Forge). It produces an NSIS `.exe` installer for Windows and a `.dmg` plus `.zip` for macOS (universal or separate arm64/x64 builds).
- Build both platforms in **CI** (GitHub Actions, with a Windows runner and a macOS runner). Trigger it on a version tag such as `v1.4.0`. Don't build releases on a laptop.

### 2. Code signing (required)
- **macOS:** Apple Developer account ($99/year), a Developer ID certificate, and **notarization**. Without them, Gatekeeper blocks the app. Auto-update on macOS also won't work unless the app is signed.
- **Windows:** Without signing, users see SmartScreen warnings. Options: Azure Trusted Signing (cheapest and easiest now), an EV or OV certificate, or SignPath.

### 3. Hosting and distribution
- **GitHub Releases** is the most common choice. It's free, versioned, and has changelogs. electron-builder publishes to it directly with `publish: github`.
- For a private repo, use a separate public releases repo, or put S3 or R2 behind a CDN and use the `generic` provider.
- Each release includes `latest.yml` (Windows) and `latest-mac.yml`. These contain the version, file hashes, and URLs that the updater reads.

### 4. Auto-update
- Use **electron-updater** (part of electron-builder). On launch and periodically, the app checks `latest.yml`, downloads the update in the background, and prompts the user to restart.
- `update-electron-app` (Squirrel) is the alternative, but electron-updater is more flexible and works with the same release files.
- Release channels (`latest`, `beta`) work through prerelease tags. electron-updater supports `stagingPercentage` for gradual rollouts.

### 5. Download link for users
- Put a "Download" page on the website. Detect the OS with `navigator.userAgent` and link to the right asset.
- Use a stable URL that always points to the latest version. For GitHub: `https://github.com/<org>/<repo>/releases/latest/download/<AppName>-Setup.exe`. To keep it stable, set `artifactName` without the version, or add a small redirect endpoint on the API that looks up the latest release.
- The API can serve `/download?platform=win|mac`, redirect to the asset, and log the event. That gives download counts.

### 6. Tracking versions and distribution
- **Version adoption:** Have the app send its version, OS, and arch on the update check or on a startup ping to the API. Store it in a table (`installs`, `app_version`, `last_seen`). GitHub download counts only show downloads, not active installs.
- **Crash and error reporting:** Sentry has an Electron SDK and tags events by release version.
- **Minimum supported version:** Have the API return a `minVersion` and force an update below it. This is useful for breaking API changes.
- **Versioning:** Use semver, with `package.json` as the single source of truth. `release-please` or `semantic-release` can automate changelogs and tags.

### Flow

Merge to main → tag `vX.Y.Z` → CI builds, signs, notarizes → publishes to GitHub Releases → the website download link and in-app updater both pick it up → the app reports its version to the API.

---

## Paid tools that automate this

### Update and distribution platforms
- **Keygen.sh:** Licensing plus release distribution. Update channels, version management, download tracking. Works with Electron. Choose it if you also need license keys, paid tiers, or seat limits.
- **Nucleus / Hazel / Electron Update Server:** Self-hosted update servers. Nucleus adds release channels and download stats. Less polished and less actively maintained.
- **Cloudsmith / JFrog Artifactory:** Artifact hosting with access control and download analytics. Overkill unless distributing privately or to enterprises.
- **Firebase App Distribution:** Good for beta testers, not for public Windows and Mac downloads.

### Hosting and CDN
- **Cloudflare R2** (no egress fees) with a custom domain is the best value for installers. Use it with electron-updater's `generic` provider.
- **AWS S3 + CloudFront** works as well but costs more in egress.

### Code signing
- **Azure Trusted Signing:** Roughly $10/month. The easiest Windows signing option, and it works in CI.
- **SignPath, DigiCert KeyLocker, SSL.com eSigner:** Cloud-based signing, so no hardware token is needed. This matters because EV and OV certificates now require hardware keys, which is awkward in CI.
- **Apple Developer Program:** $99/year, required for macOS signing and notarization.

### CI/CD
- **GitHub Actions** is usually enough. Paid larger runners help with slow macOS builds.
- **Codemagic** and **CircleCI** offer managed macOS and Windows build machines with signing built in.

### Analytics, crashes, and version tracking
- **Sentry:** Crashes and release-health adoption by version.
- **PostHog, Amplitude, Mixpanel:** Product analytics, including active users by app version.
- **Aptabase:** Privacy-friendly analytics with Electron support, aimed at desktop apps.

### Payments and licensing (if selling the app)
- **Paddle, Lemon Squeezy, Polar** act as merchant of record and handle tax. Pair them with **Keygen** for licenses.

---

## Recommended stack for a solo or small-team app

1. **GitHub Actions**, **electron-builder**, and **electron-updater** (free).
2. **Azure Trusted Signing** for Windows and the **Apple Developer Program** for macOS (~$10/month plus $99/year).
3. **GitHub Releases** to start, then **Cloudflare R2** if you need private builds or more control.
4. **Sentry** for crashes, plus a version ping to the API for adoption tracking.
5. Add **Keygen** only if you need licensing or paid tiers.

Prices change often, so check current pricing before committing.
