# Dev Station — Architecture & API Contract

Implements `docs/Product_Specification.md`, styled per `DESIGN.MD` and `mockup/`.

```
app/                       Electron + React (Vite) desktop app
├── electron/              Electron MAIN process (privileged, Node)
│   ├── main.ts            BrowserWindow (contextIsolation, sandbox, no nodeIntegration)
│   ├── preload.ts         contextBridge → window.devStation (typed, minimal surface)
│   ├── ipc/               IPC channel registry + zod validation of every payload
│   └── managers/          process, filesystem, git, terminal, agent, workspace-config, secure-store, detection
└── src/                   React renderer (no Node access; talks to main via window.devStation, to API via axios)
api/                       NestJS + Prisma + PostgreSQL
```

Server state (shared across devices): users, organizations, members, roles/permissions, clients, projects,
repositories, project services, integration connections (Composio ids only), agent session metadata, activity.

Device state (Electron `userData/workspace.json`, never synced): local path per project, device id, workspace
directory, default shell, agent executable paths, editor paths. Tokens: JWT kept with Electron `safeStorage`.

Project local state is computed on the device: `LOCAL` (path exists), `IMPORTED` (no local record), `MISSING`
(record but directory gone).

## API conventions

- Base URL `API_URL` (e.g. `http://localhost:3000`). JSON. Bearer JWT in `Authorization`.
- Organization-scoped routes require header `x-organization-id: <uuid>`; `OrganizationGuard` loads the membership
  and `@RequirePermissions(PermissionKey.X)` checks the role's permissions (no role checks scattered in code).
- Errors: default Nest shape `{ statusCode, message, error }`.
- Paginated lists: `{ data, pagination: { total, page, limit, total_pages, has_next, has_prev } }`.

## Endpoints

### Auth / users
| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | /auth/email/register | `{ email, password, full_name? }` | `AuthResponse` (also creates a personal organization with OWNER role + system roles) |
| POST | /auth/email/login | `{ email, password }` | `AuthResponse` |
| POST | /auth/email/refresh-token | (JWT) | `AuthResponse` |
| GET | /users/me | | `Me` |
| PATCH | /users/me | `{ full_name?, avatar_url? }` | `Me` |
| GET | /users/me/preferences | | `UserPreference` |
| PATCH | /users/me/preferences | partial of preference fields | `UserPreference` |

`AuthResponse = { access_token, expires_in, user: { id, email, full_name, role, avatar_url } }`
`Me = { id, email, full_name, avatar_url, role, organizations: [{ id, name, slug, role: { id, name, key }, permissions: PermissionKey[] }] }`

### Organizations (JWT; org routes use `x-organization-id`)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | /organizations | — | orgs the user belongs to (same shape as `Me.organizations`) |
| POST | /organizations | — | `{ name }` → creates org, system roles, caller = OWNER |
| GET | /organizations/current | member | org + caller role + permissions |
| PATCH | /organizations/current | ORG_MANAGE_SETTINGS | `{ name }` |
| DELETE | /organizations/current | OWNER role only | |
| GET | /organizations/current/members | member | `[{ id, user: {id,email,full_name,avatar_url}, role: {id,name,key}, status, joined_at }]` |
| PATCH | /organizations/current/members/:memberId | ORG_MANAGE_MEMBERS | `{ role_id }` (cannot demote last OWNER) |
| DELETE | /organizations/current/members/:memberId | ORG_MANAGE_MEMBERS | |
| GET | /organizations/current/invitations | ORG_MANAGE_MEMBERS | pending invitations |
| POST | /organizations/current/invitations | ORG_MANAGE_MEMBERS | `{ email, role_id }` → `{ invitation, token }` (token also emailed when mail configured) |
| DELETE | /organizations/current/invitations/:id | ORG_MANAGE_MEMBERS | revoke |
| POST | /organizations/invitations/accept | — | `{ token }` → joins org |
| GET | /organizations/current/roles | member | `[{ id, name, key, description, is_system, permissions: PermissionKey[], member_count }]` |
| POST | /organizations/current/roles | ORG_MANAGE_ROLES | `{ name, description?, permissions }` |
| PATCH | /organizations/current/roles/:id | ORG_MANAGE_ROLES | `{ name?, description?, permissions? }` (OWNER role immutable) |
| DELETE | /organizations/current/roles/:id | ORG_MANAGE_ROLES | custom roles only, no members |
| GET | /organizations/permissions | — | catalog `[{ key, group, label }]` |

### Clients (org)
GET /clients (PROJECTS_VIEW) · POST /clients (PROJECTS_CREATE) `{ name, color? }` · PATCH /clients/:id (PROJECTS_EDIT) · DELETE /clients/:id (PROJECTS_DELETE)

### Projects (org)
| Method | Path | Permission | Body |
|---|---|---|---|
| GET | /projects | PROJECTS_VIEW | query `search?, client_id?` → `Project[]` ordered by sort_order (not paginated: rail needs all) |
| GET | /projects/:id | PROJECTS_VIEW | `Project` |
| POST | /projects | PROJECTS_CREATE | `{ name, client_id?, client_name?, color?, description?, sub_path?, repository?: { clone_url, provider?, full_name?, default_branch?, external_id?, connection_id? }, github_connection_id?, services?: ServiceInput[] }` |
| PATCH | /projects/:id | PROJECTS_EDIT | any of the create fields + `linear_*`, `notion_*`, `preferred_agent` |
| DELETE | /projects/:id | PROJECTS_DELETE | |
| POST | /projects/reorder | PROJECTS_EDIT | `{ ids: string[] }` |
| PUT | /projects/:id/services | PROJECTS_EDIT | `{ services: ServiceInput[] }` replaces all service definitions |
| GET | /projects/:id/issues | PROJECTS_VIEW | linked issue refs |
| POST | /projects/:id/issues | PROJECTS_EDIT | `{ provider, external_id, key?, title? }` (upsert) |

`Project = { id, organization_id, name, description, color, sort_order, sub_path, preferred_agent, client: {id,name}|null, repository: Repository|null, github_connection_id, linear_connection_id, linear_team_id, linear_project_id, notion_connection_id, notion_root_page_id, last_activity_at, created_at, updated_at, services: ProjectService[] }`
`ServiceInput = { name, kind?, cwd?, package_manager?, script?, command?, port?, url?, env?, auto_detected? }`

### Integrations (org, Composio)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | /integrations | INTEGRATIONS_VIEW | catalog + connections: `[{ provider, name, description, available: boolean(composio key set), capabilities: string[], connections: Connection[] }]` |
| POST | /integrations/:provider/connections | INTEGRATIONS_CONNECT | `{ label? }` → `{ connection, redirect_url }` (open in system browser) |
| POST | /integrations/connections/:id/refresh | INTEGRATIONS_VIEW | re-read Composio status (ACTIVE after OAuth), fills `external_account` |
| PATCH | /integrations/connections/:id | INTEGRATIONS_MANAGE | `{ label?, is_default? }` |
| DELETE | /integrations/connections/:id | INTEGRATIONS_DISCONNECT | deletes at Composio + locally |
| GET | /integrations/github/:connectionId/repositories | PROJECTS_VIEW | query `search?, page?` → `[{ id, full_name, name, clone_url, ssh_url, default_branch, private, description, updated_at }]` |
| GET | /integrations/linear/:connectionId/teams | PROJECTS_VIEW | `[{ id, key, name }]` |
| GET | /integrations/linear/:connectionId/projects | PROJECTS_VIEW | query `team_id?` → `[{ id, name, state }]` |
| GET | /integrations/linear/:connectionId/issues | PROJECTS_VIEW | query `team_id?, project_id?, search?, include_completed?` → `LinearIssue[]` |
| GET | /integrations/linear/:connectionId/issues/:issueId | PROJECTS_VIEW | `LinearIssue` + `comments` |
| GET | /integrations/notion/:connectionId/pages | PROJECTS_VIEW | query `search?` → `[{ id, title, url, last_edited_time, object }]` |
| GET | /integrations/notion/:connectionId/pages/:pageId | PROJECTS_VIEW | `{ id, title, url, markdown }` |

`Connection = { id, provider, label, external_account, status, is_default, created_at, user: {id, full_name, email} }`
`LinearIssue = { id, identifier, title, description, priority (0-4), priority_label, url, state: {id,name,type,color}, assignee: {id,name,avatar_url}|null, labels: [{id,name,color}], team: {id,key,name}, project: {id,name}|null, created_at, updated_at, comments? }`

### Agent sessions (org)
GET /agent-sessions (AI_USE_AGENTS) query `project_id?, status?, page?, limit?` → paginated ·
POST /agent-sessions (AI_START_AGENTS) `{ project_id, agent_type, name, initial_prompt?, device_id?, issue_provider?, issue_external_id?, issue_key?, issue_title? }` ·
PATCH /agent-sessions/:id (AI_USE_AGENTS) `{ status?, name?, files_changed?, additions?, deletions?, commit_sha?, exit_code?, ended_at? }` (status transitions emit Activity) ·
GET /agents (—) catalog `[{ type, name, default_executable, description }]`

### Activity (org)
GET /activities (PROJECTS_VIEW) query `project_id?, page?, limit?` → paginated newest first ·
POST /activities (PROJECTS_VIEW) `{ project_id?, type, message, agent_session_id?, metadata? }` (device-originated events: git push, service crash…)

## Electron IPC surface (`window.devStation`)

All payloads validated with zod in main; paths must resolve inside a known project root or the workspace dir.

- `workspace.getConfig() / setConfig(partial)` · `workspace.setProjectPath(projectId, path|null)` · `workspace.projectStates(projectIds)` → `{ [id]: 'LOCAL'|'IMPORTED'|'MISSING' }`
- `dialog.pickDirectory(defaultPath?)`
- `fs.tree(projectId, relDir)` · `fs.search(projectId, query)` · `fs.reveal(projectId, rel)` · `fs.openExternal(projectId, rel)` · `fs.openInEditor(projectId, 'cursor'|'vscode'|'default', rel?)` · `fs.copyPath`
- `detect.inspect(projectId | path)` → package manager, frameworks, workspaces, services
- `git.status/diff/fileDiff/branches/fetch/pull/push/commit/checkout/createBranch/merge/stash/stashPop/discard/log/clone`
- `process.list/start/stop/restart/logs` + event `process:event`
- `terminal.create/write/resize/kill/list` + events `terminal:data`, `terminal:exit`
- `agent.list/start/write/resize/stop/restart/openExternal/scrollback` + events `agent:data`, `agent:status`
- `skills.list(projectId|null)` · `skills.read(skillId)` · `skills.send({ session_id, skill_id, mode: 'content'|'reference', submit? })` — read-only scan of Claude/Cursor/Codex/Gemini/Copilot/`.agents` skill locations (user, project, plus `settings.skill_folders`); `send` bracketed-pastes into a running agent PTY (needs `AI_USE_AGENTS`); ids only resolve to files the scanner found
- `secure.get/set/delete` (safeStorage), `shell.openUrl(url)` (http/https only), `app.info()`
