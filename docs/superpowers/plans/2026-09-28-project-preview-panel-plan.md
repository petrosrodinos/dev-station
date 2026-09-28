# Project Preview Panel — Implementation Plan

Spec: `docs/superpowers/specs/2026-09-28-project-preview-panel-design.md`

Each task ends with `npx tsc --noEmit` (in `app/`) passing. Tasks are ordered so the app builds after each one.

## Task 1 — URL allow-list (pure, tested)
- Create `app/electron/utils/preview-url.ts` exporting `isPreviewUrlAllowed(url: string): boolean`: parse with `new URL`, require protocol `http:`/`https:`, no username/password, hostname exactly `localhost` or `127.0.0.1` (any port).
- Create `app/electron/utils/preview-url.test.ts` covering: allowed (`http://localhost:3000/x`, `https://127.0.0.1:5173`), rejected (`http://localhost.evil.com`, `http://localhost@evil.com`, `http://evil.com/localhost`, `file:///`, `javascript:`, garbage string).
- Confirm the app's test runner (check `app/package.json`); if none exists, add `vitest` as a dev dependency and a `test` script (ask before adding the dependency).

## Task 2 — Contract + IPC surface
- `app/electron/shared/contract.ts`: add `PreviewBounds {x,y,width,height}`, `PreviewState {projectId,url,title,loading,canGoBack,canGoForward,error: string|null}`, `PREVIEW_*` entries in `IpcChannels` (`preview:show`, `preview:hide`, `preview:set-bounds`, `preview:navigate`, `preview:load`, `preview:destroy`, `preview:state`), `PREVIEW_URL_NOT_ALLOWED` in `IpcErrorCodes`, and a `preview` group on `DevStationBridge` (`show`, `hide`, `setBounds`, `navigate`, `load`, `destroy`, `onState`).
- `app/electron/preload.ts`: wire the `preview` group with `call`/`on`.

## Task 3 — PreviewManager (main process)
- Create `app/electron/managers/preview-manager.ts`: class holding `Map<projectId, WebContentsView>` and the active project id.
  - `attach(window)` stores the `BrowserWindow`.
  - `show(projectId, url, bounds)`: validate URL (throw `IpcError(..., PREVIEW_URL_NOT_ALLOWED)`), create the view lazily (`partition: "persist:preview"`, `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, no preload), remove the previously active view from `window.contentView`, add this one, `setBounds`, load URL if the view has no page or the URL differs.
  - `hide(projectId)`: remove from `contentView` (keep alive).
  - `setBounds`, `navigate` (back/forward/reload via `navigationHistory`), `load`, `destroy(projectId)` (remove + `webContents.close()`), `destroyAll()`.
  - Guards on each view's `webContents`: `will-navigate` and `will-redirect` prevent non-allowed URLs and `shell.openExternal` them; `setWindowOpenHandler` denies and opens allowed-scheme URLs externally; session permission handler for the partition denies everything.
  - Emits `preview:state` to the main window on `did-start-loading`, `did-stop-loading`, `did-navigate`, `did-navigate-in-page`, `page-title-updated`, and `did-fail-load` (ignore `-3` aborted; set `error` for the rest).
  - `reloadActive()` used on window focus; `reloadProject(projectId)` for service restarts.
- Register IPC handlers in `app/electron/ipc/register.ts` using the existing `handle` helper.
- `app/electron/main.ts`: call `previewManager.attach(mainWindow)` in `createWindow`, `window.on("focus")` → `reloadActive()`, and `previewManager.destroyAll()` in `before-quit`.
- Restart reload: in `process-manager` events subscription (or `register.ts` where `PROC_EVENT` is forwarded), when a `status` event shows a service moving to `running` and a preview view exists for that project, call `reloadProject`.

## Task 4 — Renderer feature module
- `app/src/features/preview/interfaces/preview.interfaces.ts`, `services/preview.services.ts` (thin bridge wrappers matching `local-workspace.services.ts` style), `hooks/use-preview.ts`:
  - `usePreviewState(projectId)` subscribes to `onState` and keeps the latest state for that project.
  - Actions: `show`, `hide`, `setBounds`, `navigate`, `load`.
- Workspace store (`app/src/stores/workspace.ts`): per-project `previewOpen`, `previewWidth`, `previewServiceId`, with setters; persisted the same way as existing store fields.

## Task 5 — PreviewPanel component
- `app/src/pages/workspace/pages/project/components/preview-panel.tsx`:
  - Header: shadcn `Select` for running services with a URL (hidden if only one), back/forward/reload `Button`s with `Tooltip`, URL text, "open in browser" (`openUrl`), close.
  - Body: placeholder div measured by `ResizeObserver` plus window resize; sends bounds (via `requestAnimationFrame` throttle) to `setBounds`. Calls `show` on mount/service change and `hide` on unmount/close.
  - States: empty ("No service with a URL is running", "Start service" via `useStartService` for the first service), loading, error ("Can't reach <url>" + Retry), stopped banner when the process is no longer running.
  - Hides the native view while any overlay is open: detect Radix overlays by observing `document.body` for `[data-radix-popper-content-wrapper]`, `[role="dialog"]`, and the command palette open flag; call `hide` while any exist and `show` again after. (Write this as a small `useOverlayOpen()` hook in `src/hooks/`.)
- Resizable width: use an existing resizable primitive if present in `src/components/ui/`; otherwise add shadcn `resizable` via `npx shadcn@latest add resizable` (ask before adding).

## Task 6 — Layout + entry points
- `project/layout.tsx`: wrap the tab `Outlet` region in a horizontal flex (tab content + `PreviewPanel` when `previewOpen && isDesktop() && !onSetup`); add a Preview toggle `Button` (lucide `PanelRight`/`Globe`) to the header actions; register a keyboard shortcut (`Ctrl/Cmd+Shift+P` unless it conflicts; check `command-palette.tsx` for existing bindings first) and a command palette entry "Toggle preview".
- `services-card.tsx`: add a "Preview" `IconAction` next to "Open URL" that sets `previewServiceId` and `previewOpen` for the project.

## Task 7 — Verification
- `npx tsc --noEmit` and lint in `app/`; run unit tests from Task 1.
- Manual run via the `run` skill: start a dev service, click Preview, navigate, switch tabs (panel persists), switch projects and back (state preserved), open a dialog/dropdown/command palette (view hidden, then restored), stop/restart the service (banner, reload), click an external link (opens system browser), try a non-localhost URL (rejected), resize the window and panel.

## Notes
- Do not touch the unrelated modified files in the working tree; commit only files changed for this feature (use the `scoped-commit` skill when asked to commit).
- `main.ts` already blocks `<webview>` (`will-attach-webview`); `WebContentsView` is unaffected.
