# Project Preview Panel — Design

## Purpose

Dev Station is for quickly managing projects: make changes, preview, commit, move to the next project. Today a running service's URL opens in the system browser (`openUrl`), which breaks that loop. This feature embeds a preview of the running service inside the app, similar to the Simple Browser in Cursor/VS Code, so the result stays visible while reviewing diffs and committing.

## Decisions (agreed)

- Docked, resizable **preview panel** beside the active project tab (not a tab, not a separate window).
- **Click-only**: the panel opens only when the user clicks the Preview button (or shortcut); starting a service never opens it.
- **Localhost only**: the embedded view may load only `localhost` and `127.0.0.1` (any port). Other hosts open in the system browser.

## Scope

In: toggle, service picker, address bar with navigation, per-project view state, reload on focus/restart, localhost restriction.

Out: DevTools, device emulation, element inspection, previewing arbitrary/non-service URLs, file watching.

## UX

- A Preview button in the project header toggles the panel; a keyboard shortcut does the same.
- The panel sits to the right of the active tab content and persists while switching between Overview, Git, Files, Terminal, AI Sessions and Integrations.
- Resizable with a drag handle. Open/closed state and width are remembered per project.
- Header: shadcn `Select` listing the project's running services that have a URL (hidden when there is only one), back, forward, reload, the current URL, and "open in system browser" (reuses `openUrl`).
- Default service: the first running service with a URL, preferring web services.
- Empty state when no service with a URL is running: a message with a "Start service" action for the project's services.
- The Services card "Open URL" action is unchanged; a new "Preview" action beside it opens the panel on that service.

## Architecture

### Main process
- New `preview-manager.ts` in `app/electron/managers/`, owning one Electron `WebContentsView` per project id.
- Views are created lazily on first show and kept alive (hidden, not destroyed) when the panel closes or the user switches projects, so page state survives. They are destroyed when the project is removed or the window closes.
- View configuration: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, no preload, a dedicated session partition (`persist:preview`).
- Navigation guard: `will-navigate`, `will-redirect` and `setWindowOpenHandler` allow only `http(s)://localhost` and `http(s)://127.0.0.1`. Blocked navigations and new-window requests open in the system browser via the existing `openUrl` path. The URL passed to `preview:load` is validated the same way.
- The renderer reports the panel's bounds (relative to the window); the manager applies them with `setBounds`, attaches only the active project's view to the window, and detaches the others.
- Reloads: on window focus the active view reloads; when a service's process transitions to running again after a restart, the view for that project reloads.
- Emits `preview:state` events (url, canGoBack, canGoForward, loading) to the renderer.

### IPC contract (`contract.ts`, `preload.ts`, `ipc/register.ts`)
- `preview.show({ projectId, url, bounds })`
- `preview.hide({ projectId })`
- `preview.setBounds({ projectId, bounds })`
- `preview.navigate({ projectId, action: "back" | "forward" | "reload" })`
- `preview.load({ projectId, url })`
- Event `preview:state`.
- Errors use the existing `IpcError` codes; a rejected URL returns a dedicated code (e.g. `PREVIEW_URL_NOT_ALLOWED`).

### Renderer
- `PreviewPanel` component in the project layout (`pages/workspace/pages/project/layout.tsx`), a resizable region right of the tab outlet. It renders a placeholder div and measures it with `ResizeObserver`, sending bounds to main.
- Hooks in `features/preview/`: `use-preview` (state subscription, actions) following the existing feature structure (`hooks/`, `services/`, `interfaces/`).
- Panel open/width persisted per project in the workspace store (`stores/workspace.ts`).
- Service list comes from the existing `useProjectProcesses` data (`proc.url ?? service.url`, status running).
- Overlays (dialogs, dropdowns, command palette) render above the DOM but a native view sits above the DOM; the panel must hide the view while any modal overlay is open, otherwise the view covers it.
- Desktop only; the panel and button are hidden when `!isDesktop()`.
- UI uses shadcn components only (Select, Button, Tooltip), per `app/AGENTS.md`.

## Error handling

- Load failure (connection refused): show an inline "Can't reach <url>" state with a Retry button; the service may still be starting.
- Service stops while previewed: keep the last page, show a "Service stopped" banner.
- Disallowed URL: rejected in main, surfaced as a toast, offered "Open in browser".
- Window resize, minimize, restore: bounds re-synced; view detached when the window is minimized.

## Testing

- Unit tests for the URL allow-list (localhost, 127.0.0.1, with ports; rejects lookalike hosts such as `localhost.evil.com` and userinfo tricks like `http://localhost@evil.com`).
- Manual: run a dev service, open the panel, navigate, switch tabs and projects (state preserved), open a modal (view hidden), stop and restart the service (banner, reload), click an external link (opens in system browser).

## Open risks

- Native view stacking above DOM overlays needs the hide-on-modal handling above; it must cover every overlay type (dialog, sheet, dropdown, command palette).
- Bounds sync during window drag/resize may flicker; throttle with `requestAnimationFrame`.
