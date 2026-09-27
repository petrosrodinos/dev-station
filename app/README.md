# Dev Station — desktop app

Electron main process + React renderer (Vite, Tailwind v4, shadcn/ui, TanStack Query, Zustand).
Follow `.cursor/rules/app-code-structure-and-best-practices.mdc` and `app/AGENTS.md` when changing code.

```
electron/
├── main.ts                 window, app:// protocol, navigation lockdown, shutdown
├── preload.ts              contextBridge → window.devStation (typed, allow-listed)
├── shared/contract.ts      types + IPC channel names shared with the renderer (@shared/contract)
├── ipc/                    handle() with zod validation, channel registration
├── agents/                 pluggable agent adapters (Claude Code, Cursor CLI)
└── managers/               workspace-config, secure-store, detection, git, process, terminal, agent, filesystem
src/
├── features/               data-only modules (API + bridge services, TanStack hooks, interfaces)
├── pages/                  auth · workspace shell (rail, tab strip, AI panel, status bar) · project tabs · settings · organization · integrations
├── components/ui/          shadcn primitives + shared presentational components (status-dot, panel, xterm-terminal, diff-viewer…)
├── config/constants/dropdowns/   all enum display labels / options
├── stores/                 auth (keychain-backed), workspace UI, runtime (live main-process state), dialogs
└── routes/                 Routes / RoutePatterns
```

## Scripts

| Script | |
|---|---|
| `npm run dev` | Vite + Electron with HMR (`RENDERER_PORT` to change the port) |
| `npm run dev:web` | Renderer only in a browser (local-workspace features disabled) |
| `npm run build` | Typecheck + production bundles |
| `npm run dist` / `dist:dir` | Package with electron-builder |
| `npm run lint` | ESLint |

`DEV_STATION_REMOTE_DEBUGGING_PORT=9333 npm run dev` exposes the Chrome DevTools Protocol for automated UI checks (unpackaged builds only).
