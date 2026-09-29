# App Distribution, Auto-Update & Version Tracking (Windows-only)

## Goal

Ship a repeatable path from `git tag` to an installable Windows build that
users can download and that auto-updates itself, plus basic visibility into
which app versions are actually running in the field. macOS, code signing,
and public release hosting are explicitly deferred (see "Out of scope").

## Context / constraints

- Repo: `petrosrodinos/dev-station` on GitHub, currently **private**, staying
  private for now.
- App: Electron + Vite + React, already using `electron-builder` for local
  packaging (`app/package.json` → `build`). No CI exists yet
  (`.github/workflows/` is empty).
- API: NestJS + Prisma, module-per-feature under `api/src/modules/`
  (see `.cursor/rules/api-code-structure-and-best-practices.mdc`), snake_case
  Prisma fields.
- Every device already has a persistent UUID: `workspaceConfig.deviceId`
  (`app/electron/managers/workspace-config.ts`), exposed to the renderer via
  the `APP_INFO` IPC handler (`app/electron/ipc/register.ts`). This is reused
  as the install identifier — no new ID is generated.
- No code signing is configured. Building unsigned NSIS installers is
  accepted for now; Windows SmartScreen will warn users.
- **Known limitation, accepted, not solved by this spec:** because the repo
  is private, CI can still *publish* releases (the Actions token has repo
  access), but an end user's app cannot anonymously *fetch* release assets,
  and the public `/app-releases/download` link will not resolve to a
  downloadable file for anyone outside the repo's collaborators. Making the
  repo (or a separate releases mirror) public is the unlock step, deferred to
  a future task. All work here is structured so that flipping visibility
  later requires no code changes.

## Out of scope

- macOS (and Linux) builds, signing, notarization.
- Windows code signing (Azure Trusted Signing or otherwise) — left as an
  additive step for later; nothing here should need restructuring to add it.
- Making the repo/releases public, or moving artifact hosting to
  Cloudflare R2/S3.
- A public marketing/download website — no such site exists in this repo;
  the API's `/app-releases/download` redirect is the stable link other
  surfaces (a future landing site) can point to.

## Design

### 1. Packaging config (`app/package.json`)

- Add dependency: `electron-updater`.
- Extend the existing `build` block with:
  ```json
  "publish": {
    "provider": "github",
    "owner": "petrosrodinos",
    "repo": "dev-station"
  }
  ```
- No other changes to `win`/`nsis` config — installer stays unsigned.

### 2. Release CI (`.github/workflows/release.yml`, new)

- Trigger: `push` of tags matching `v*.*.*`.
- Single job on `windows-latest`:
  1. Checkout.
  2. Setup Node 22 (matching the API's `engines.node: ">=22.12.0"`; `app/`
     has no pinned engine today, so this also becomes its de facto baseline).
  3. `npm ci` in `app/`.
  4. `npm run build` in `app/`.
  5. `npx electron-builder --win --publish always` in `app/`, with
     `GITHUB_TOKEN` (the default Actions token, `contents: write` permission
     set on the job) — publishes the installer + `latest.yml` to a GitHub
     Release matching the tag.
  6. A final step calls the API to sync the "latest release" record:
     `curl -X PATCH "$API_URL/app-releases/win" -H "x-release-token: $RELEASE_PUBLISH_TOKEN" -H "Content-Type: application/json" -d '{"version": "<tag-without-v>", "download_url": "<installer asset URL>"}'`.
     `API_URL` and `RELEASE_PUBLISH_TOKEN` come from repo/environment
     secrets. This step's failure should not fail the whole build silently —
     log clearly but the release itself is already published by step 5.
- Tag version must match `app/package.json`'s `version` (electron-builder
  reads it from there); no automated enforcement in this pass — documented
  as a manual release checklist item.

### 3. In-app auto-update

New manager: `app/electron/managers/update-manager.ts`, following the
existing manager pattern (singleton class instance, exported instance).

- Wraps `electron-updater`'s `autoUpdater`.
- `autoUpdater.autoDownload = false` — check first, download only after the
  app decides to (keeps behavior predictable, avoids surprise bandwidth use).
- Checks:
  - Once, a few seconds after `ready-to-show` (never blocks first paint).
  - Every 4 hours thereafter, on a `setInterval` cleared on `before-quit`.
  - Manually, via an IPC call the renderer's "Check for updates" button uses.
- States tracked and broadcast: `checking`, `available`, `not-available`,
  `downloading` (with progress %), `downloaded`, `error`.
- New IPC channel `APP_UPDATE_STATUS` (added to `shared/contract.ts`'s
  `IpcChannels`) broadcasts state changes to all renderer windows, matching
  how `terminalManager`/`agentManager` broadcast today.
- New IPC actions: `APP_UPDATE_CHECK` (trigger a manual check),
  `APP_UPDATE_DOWNLOAD` (start download after "available"),
  `APP_UPDATE_INSTALL` (calls `autoUpdater.quitAndInstall()` — only ever
  invoked by explicit user action from the renderer, never automatically).
- Registered/wired in `main.ts` alongside the other managers.

### 4. API: version tracking & minVersion (`api/src/modules/app-releases/`)

Standard module layout per the API rules doc: module, controller, service,
`dto/`, `entities/`, `interfaces/`.

**Prisma models** (added to `api/prisma/schema.prisma`, snake_case fields,
consistent with existing models):

```prisma
model AppRelease {
  id            String    @id @default(uuid())
  platform      String    // "win" for now; "mac"/"linux" later
  version       String
  download_url  String
  min_version   String?
  release_notes String?
  published_at  DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@unique([platform])
}

model AppInstall {
  id            String   @id @default(uuid())
  device_id     String   @unique
  platform      String
  arch          String
  app_version   String
  first_seen_at DateTime @default(now())
  last_seen_at  DateTime @updatedAt
}
```

**Endpoints:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/app-releases/ping` | none (public) | Body `{ device_id, platform, arch, app_version }`. Upserts `AppInstall` by `device_id`, bumping `last_seen_at`/`app_version`/`arch` if changed. |
| `GET` | `/app-releases/latest` | none (public) | Query `platform`. Returns `{ version, download_url, min_version, release_notes }` from `AppRelease`. 404 if no release recorded yet for that platform. |
| `GET` | `/app-releases/download` | none (public) | Query `platform`. 302-redirects to that platform's `download_url`; increments a simple counter (a `download_count` field on `AppRelease`, incremented on each hit) for basic adoption visibility. |
| `PATCH` | `/app-releases/:platform` | shared-secret header | Body `{ version, download_url, min_version?, release_notes? }`. Upserts the `AppRelease` row for that platform. Guarded by a small custom guard comparing the `x-release-token` header against `RELEASE_PUBLISH_TOKEN` (new env var) — not the normal `JwtGuard`, since this is a machine-to-machine call from CI, not a logged-in user. |

No JWT/organization scoping on any of these — device pings and release
metadata are not tied to a user or org.

### 5. Renderer integration (`app/src`)

- `APP_INFO` IPC payload (`app/electron/ipc/register.ts` / `AppInfo` in
  `contract.ts`) gains an `arch: string` field (`process.arch`), alongside
  the existing `version`/`platform`/`device_id`.
- On desktop app boot (`App.tsx`, guarded by the existing `isDesktop()`
  check), once `APP_INFO` resolves:
  - Fire `POST /app-releases/ping` with `{ device_id, platform, arch, app_version: version }` — fire-and-forget, failures are swallowed (no network = no ping, not an error state).
  - Fetch `GET /app-releases/latest?platform=win` (desktop/Windows only for
    now) and compare against the running version (semver compare, small
    inline helper — no new dependency needed for simple `a.b.c` comparison).
    - If running version `<` `min_version`: render a new full-screen
      "Update required" route that replaces the whole app UI (no bypass),
      showing current vs. required version and a button that opens
      `download_url` externally (via the existing `APP_OPEN_URL` IPC
      channel). This check runs before the rest of the routed app mounts.
    - Else if running version `<` `latest.version`: no blocking — surfaced
      only via the badge/settings row below.
- `StatusBar` (`app/src/pages/workspace/components/status-bar.tsx`):
  - Replace the hardcoded `environments.APP_VERSION` display with the real
    version from `APP_INFO` (fixes an existing drift where the constant is
    hand-maintained and already stale).
  - Add a small dot/badge next to the version text when an update is
    available (available/downloaded state from `update-manager`), consistent
    with the app's existing badge-based notification style (no toasts).
- **Settings → General** (`general-settings.tsx`): new "About" section —
  current version, update status text (idle/checking/downloading %/ready to
  restart), a manual "Check for updates" button, and (once downloaded) a
  "Restart to update" button that calls `APP_UPDATE_INSTALL`.

## Data flow summary

```
Merge to main
  → tag vX.Y.Z pushed
  → GitHub Actions (windows-latest): build → electron-builder --publish always
      → GitHub Release created/updated (installer + latest.yml)
      → PATCH /app-releases/win (CI → API, shared-secret header)
  → running apps:
      - electron-updater checks latest.yml directly against GitHub (in-app auto-update)
      - renderer pings /app-releases/ping on boot (adoption tracking)
      - renderer checks /app-releases/latest (minVersion enforcement)
  → /app-releases/download?platform=win is the stable public link (works fully once the repo/releases are public)
```

## Testing

- API: unit tests for `AppReleasesService` (ping upsert, latest lookup,
  download redirect + counter, shared-secret guard rejecting bad/missing
  token) following existing module test conventions.
- Renderer: a small unit test for the semver-compare helper (equal, patch
  behind, minor behind, below minVersion) and for the blocking-vs-badge
  branching logic.
- Electron main: `update-manager` is thin glue over `electron-updater`;
  no meaningful unit test beyond a smoke check that IPC registration doesn't
  throw. Manual verification: bump `package.json` version locally, run
  `dist:dir`, confirm boot behavior with a mocked "latest" response.
- CI workflow: verified manually by tagging a real `vX.Y.Z-test` release
  once implemented (not part of automated test suite).

## Open items deferred to later work (explicitly, not blocking this spec)

- macOS build/signing/notarization.
- Windows code signing.
- Public repo / releases visibility, or a move to Cloudflare R2.
- A real download/marketing page consuming `/app-releases/download`.
