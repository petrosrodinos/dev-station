---
name: release-version
description: Release a new version of the Dev Station desktop app (bump version, commit, tag, push so CI builds and publishes). Use when the user says "release a version", "cut a release", "ship vX.Y.Z", or "bump the version".
---

# Release a Dev Station version

A release = bump version → commit → annotated tag `vX.Y.Z` → push. Pushing the tag triggers
`.github/workflows/release.yml` (windows-latest), which builds the NSIS installer, publishes it to the
**separate releases repo** `logiqdevai/dev-agents-releases` (via `RELEASE_TARGET_TOKEN`), then PATCHes the API's
`/app-releases/win` record (`RELEASE_API_URL` var + `RELEASE_PUBLISH_TOKEN` secret). Unsigned build (SmartScreen warns).
Never build releases locally; no need to read the workflow.

## Steps

1. **Preflight**: `git status --short` should be clean (if not, ask — don't sweep unrelated changes in); be on `main`; `git fetch` and make sure local isn't behind origin.
2. **Pick the version**: `git tag --sort=-creatordate | head -3` for the latest tag. Default to a patch bump (0.1.7 → 0.1.8) unless the user names a version or asks for minor/major. The new version must be greater than the latest tag and not already exist.
3. **Bump exactly two files** (versions must match the tag; the workflow requires it):
   - `app/package.json` → `"version"` (the first `"version"` line)
   - `package-lock.json` → the `"app": { "name": "dev-station", "version": ... }` entry (~line 19). No other lockfile entry changes.
   Use `sed` on those lines (the version string must be matched literally; don't run `npm version`, which touches more).
4. **Commit** (message style matches history; end with the Co-Authored-By line from the session's attribution reminder):
   `chore(release): bump desktop app to X.Y.Z`
   Stage only those two files. CRLF warnings from git are harmless.
5. **Tag and push**:
   ```
   git tag -a vX.Y.Z -m vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```
   Pushing is outward-facing; "release a version" from the user counts as authorization.
6. **Report**: the version, that the tag triggered the CI workflow, and that you haven't verified the run. Optionally check with `gh run list --workflow release.yml --limit 1` (and `gh run watch`) if the user wants confirmation.

## Notes

- Release assets: `https://github.com/logiqdevai/dev-agents-releases/releases/download/vX.Y.Z/Dev-Station-Setup-X.Y.Z.exe`.
- The app auto-updates via electron-updater from that repo; `min_version` (forced upgrade) is **not** set automatically — only PATCH `/app-releases/:platform` by hand for breaking changes.
- If the CI run fails mid-way, the workflow is idempotent (reuses an existing tag/draft on the releases repo): fix the cause, delete and re-push the tag (`git push origin :refs/tags/vX.Y.Z`, re-tag, push) — ask the user before deleting a remote tag.
- Details/background: `docs/electron-distribution-and-updates.md`.
