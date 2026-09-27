# Dev Station — Product Overview

> One workspace for managing projects, development processes, AI coding agents, Git workflows, and connected business/development tools — without turning the application itself into another IDE.

Full spec: `docs/Product_Specification.md`

## What it is

A desktop development workspace app for a software agency managing many client projects at once. It orchestrates existing tools (IDEs, terminals, Git, AI coding agents, GitHub/Linear/Notion) instead of replacing them, so a developer can switch between client projects instantly without juggling separate windows.

Core workflow: **select client/project → open workspace → start dev services → inspect tasks/issues → work with AI agent → review changes → commit → push → switch project.**

## What it is not

Not a code editor, not a full Git client, not a full GitHub/Linear/Notion client. It integrates these into one workflow rather than recreating them.

## Stack

- **Desktop:** Electron, React, Vite, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Lucide icons, dark mode default, desktop-first
- **Backend:** NestJS, Prisma, PostgreSQL
- **Integrations:** Composio (GitHub, Linear, Notion, extensible to more)
- **AI agents:** Claude Code, Cursor CLI (pluggable for future agents)

## Core concepts

- **Organization** — the business/team using the app
- **Client** — a customer of the agency
- **Project** — a development project belonging to a client or the agency
- **Repository** — a Git repo associated with a project (a monorepo may hold multiple projects/services — never assume 1 repo = 1 project = 1 dev server)
- **Workspace** — the local dev environment for a project
- **Project Services** — processes like frontend/API/worker/db/storybook

## Key capabilities

- **Project navigation** — Slack-style left rail of projects, each with its own color used consistently across the app (including AI session tabs)
- **Project dashboard** — repo/branch/path info, Git status, and quick Git actions (pull, fetch, commit, push, branch, merge, stash, discard)
- **Repository management** — connect GitHub via Composio (multiple accounts) or clone manually from a URL; auto-inspect after clone
- **Automatic project detection** — detects package managers, monorepo tooling (pnpm/turbo/nx), Docker, framework type, and `package.json` scripts; never hard-codes commands like `npm run dev`
- **Development process management** — start/stop/restart dev servers, view logs/status, isolated per project; process spawning is confined to the Electron main process
- **Integrated terminal** — scoped to the project's working directory; not a full terminal emulator replacement
- **File explorer** — browse/search files, open externally (Cursor/VS Code/default editor), reveal in file manager; explicitly not a code editor
- **AI coding agents** — each agent (Claude Code, Cursor CLI) runs as a real CLI process with an embedded, controllable terminal attached — not a custom chat UI
- **AI agent sessions** — persistent per project, global color-coded tab strip across the whole app, status inferred via process exit / output-idle detection / working-tree changes (pluggable per agent adapter)
- **Notifications** — no toasts or notification center; surfaced only via nav-rail status badges and each project's Activity feed
- **Composio integration layer** — pluggable abstraction (connection status, account, actions, data, permissions) so new integrations don't require hard-coding
- **Multiple accounts per service** — e.g. personal/company/client GitHub accounts, selectable per project
- **Linear integration** — teams/projects/issues/status/priority/assignee visible in-app; **"Work on issue with AI"** passes issue context directly into an agent session
- **Notion integration** — pages/databases as context/knowledge for AI agents
- **Git workflow & diff viewer** — status, fetch, pull, push, commit, branch ops, stash, discard (confirmed), lightweight diff viewer for reviewing AI or manual changes
- **Organizations, members, roles** — Owner/Admin/Manager/Developer/Viewer with granular, permission-based (not role-scattered) access control
- **Security** — standard secure Electron architecture: context isolation, no node integration in renderer, validated IPC, no arbitrary shell exec from renderer, secure credential storage

## Primary workflow (Linear + AI)

Linear issue → AI agent reads issue → AI works inside project locally → developer reviews Git diff → commit → push. AI never auto-commits or auto-pushes unless explicitly configured.

## MVP scope

Electron/React/NestJS/Prisma foundation + orgs/roles + projects + GitHub via Composio (multi-account, clone) + local project management (Git status/diff/commit/push/pull/branch, process manager, script detection, terminal, file tree) + Claude Code & Cursor CLI sessions + Linear integration + basic Notion integration.

Build order: Foundation → Local Workspace → Git → AI Agents → Composio → AI+Integrations → Polish (see spec §34 for phase details).

## Guiding principles

- Speed, clarity, minimal clicks, persistent project context
- Safe-by-default destructive actions (confirm before discard/reset)
- Pluggable agents and integrations — no hard-coded assumptions about repo structure or one integration baked into core logic
- Don't rebuild VS Code, Cursor, GitHub, Linear, or Notion — integrate them
