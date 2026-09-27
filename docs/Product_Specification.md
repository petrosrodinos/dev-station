# Development Workspace Desktop App

I want to build a **desktop development workspace application** for a software agency. The purpose is to make it significantly easier for developers to manage and work across multiple client projects without constantly switching between multiple IDE windows, terminals, Git clients, browser tabs, and AI coding-agent sessions.

The application should **not attempt to replace VS Code, Cursor, or another IDE**. Instead, it should act as a lightweight **project orchestration and development workspace** around existing development tools and AI coding agents.

The core workflow should be:

**Select client/project → open workspace → start development services → inspect tasks/issues → work with AI agent → review changes → commit → push → switch to another project.**

---

# 1. Technology Stack

Use the following technologies:

### Desktop

* Electron
* React
* Vite
* TypeScript

### UI

* Tailwind CSS
* shadcn/ui
* Lucide icons
* Responsive desktop-first layout
* Dark mode as the primary/default theme

### Backend

* NestJS
* Prisma
* PostgreSQL

### Integrations

* Composio for third-party application connections
* GitHub through Composio
* Linear through Composio
* Notion through Composio
* Architecture should make adding additional Composio-supported integrations straightforward.

### Development Tools

The application should be able to launch and interact with:

* Claude Code CLI
* Cursor CLI
* Standard terminal processes
* Project-specific development commands

Use a modular architecture so additional AI coding agents can be supported later.

---

# 2. Core Product Concept

The application should provide a single desktop interface for managing many software projects.

A developer may have:

* Client A → Frontend
* Client A → Backend/API
* Client B → Full-stack application
* Client C → Website
* Internal → SaaS product
* Internal → Marketing website

The developer should be able to switch between these projects instantly without manually opening multiple IDE windows.

The application should maintain the state of each project, including:

* Repository
* Local path
* Git branch
* Git status
* Running development processes
* Active AI agent sessions
* Connected services
* Related issues/tasks
* Recent activity
* Project metadata

---

# 3. Important Architectural Principle

There should be a clear separation between:

### Organization

The business/team using the application.

### Client

A customer of the agency.

### Project

A development project belonging to a client or the agency.

### Repository

A Git repository associated with a project.

### Workspace

The local development environment for a project.

### Project Services

Processes such as:

* Frontend dev server
* Backend/API server
* Worker
* Database
* Storybook
* Other package.json scripts

A single repository may contain multiple applications/projects.

For example:

```text
client-platform/
├── apps/
│   ├── frontend/
│   └── api/
├── packages/
│   ├── ui/
│   └── shared/
└── package.json
```

The application must support this type of monorepo structure.

Do not assume:

**1 repository = 1 project = 1 development server.**

Instead, allow a repository to contain multiple project/service definitions.

---

# 4. Main Application Layout

Design the UI around a desktop workspace.

Suggested layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top Bar                                                      │
├───────┬───────────────────────┬──────────────────────────────┤
│       │                       │                              │
│       │                       │                              │
│ Apps  │ Project Workspace     │ AI / Terminal / Details      │
│       │                       │                              │
│       │                       │                              │
│       │                       │                              │
├───────┴───────────────────────┴──────────────────────────────┤
│ Status / Processes / Notifications                           │
└──────────────────────────────────────────────────────────────┘
```

The exact layout can be improved during implementation, but the UI should prioritize:

* Fast navigation
* Minimal visual clutter
* Persistent project context
* Easy access to AI agents
* Easy access to Git
* Easy access to external application data

---

# 5. Project Navigation

Projects should appear in a **left-side vertical navigation rail**, visually similar to Slack workspace icons.

Each project should have:

* Circular project icon
* Project/client name
* Tooltip on hover
* Active-state indicator
* Optional status indicator

For example:

```text
○ Client A
○ Client B
○ Client C
○ Internal SaaS
○ Website
```

The user should be able to:

* Add project
* Remove project
* Edit project
* Reorder projects
* Group projects by client/organization
* Search projects

Clicking a project should immediately load its workspace.

---

# 6. Project Dashboard

When a project is selected, display a concise project dashboard.

It should show:

### Project Information

* Project name
* Client
* Repository
* Current branch
* Local path
* GitHub account/repository
* Last activity

### Git Status

Show:

* Current branch
* Modified files
* Added files
* Deleted files
* Untracked files
* Ahead/behind remote status

Provide actions such as:

* Pull
* Fetch
* Commit
* Push
* Create branch
* Switch branch
* Merge
* Stash
* Discard changes

Avoid attempting to recreate a complete Git GUI. Only provide the operations that are useful for the main workflow.

---

# 7. Repository Management

Support repositories from connected GitHub accounts.

Users should be able to:

### Connect GitHub

Use **Composio** to connect GitHub accounts.

Support:

* Multiple GitHub accounts
* Selecting which account is associated with a project
* Listing repositories
* Searching repositories
* Cloning repositories

### Manual Repository

Also allow:

```text
Clone Repository from URL
```

For example:

```text
https://github.com/company/project.git
```

The user should select the local destination directory.

After cloning, the application should inspect the repository automatically.

---

# 8. Automatic Project Detection

After cloning or adding a repository, inspect the filesystem and identify the project structure.

Detect things such as:

* package.json
* pnpm-workspace.yaml
* yarn.lock
* package-lock.json
* pnpm-lock.yaml
* turbo.json
* nx.json
* Dockerfile
* docker-compose files
* NestJS projects
* Vite projects
* Next.js projects
* React projects
* Node projects
* Python projects where practical

For JavaScript/TypeScript projects, inspect `package.json`.

Automatically detect scripts such as:

```json
{
  "scripts": {
    "dev": "...",
    "start": "...",
    "build": "...",
    "test": "...",
    "lint": "..."
  }
}
```

Display detected commands in the UI.

Do not hard-code assumptions such as:

```text
npm run dev
```

The application should detect the package manager and available scripts.

---

# 9. Development Processes

The application should manage development processes directly.

For example:

```text
Frontend
● Running
localhost:5173

API
● Running
localhost:3000

Worker
○ Stopped
```

Users should be able to:

* Start
* Stop
* Restart
* View logs
* Open the local URL
* View process status

The Electron main process should be responsible for safely spawning and managing local processes.

Do not run arbitrary shell commands directly from the React renderer without appropriate security boundaries.

Each process should have:

* Process ID
* Command
* Working directory
* Environment
* Status
* Start time
* Output logs
* Error logs

Processes should be isolated per project/workspace.

---

# 10. Terminal

Provide an integrated terminal experience where useful.

The terminal should allow developers to interact with the selected project's local environment.

It should support:

* Shell commands
* Project working directory
* Environment variables
* Process output
* Multiple terminal sessions

The terminal is not intended to replace a full terminal emulator. Keep it focused on project development workflows.

---

# 11. File Explorer

Provide an optional collapsible file tree.

The user should be able to:

* Browse files
* Expand directories
* Search files
* Open files externally
* Reveal files in the system file manager
* Copy file paths

Important:

**Do not build a full code editor.**

When a developer wants to edit code, the application should provide actions such as:

```text
Open in Cursor
Open in VS Code
Open in default editor
```

The workspace should orchestrate development rather than become another IDE.

---

# 12. AI Coding Agents

Each project should support AI coding agents.

Initial supported agents:

* Claude Code
* Cursor CLI

Architecture should make it possible to add additional agents later.

For example:

```text
AI Agents

Claude Code
● Active

Cursor
○ Available

New Agent Session
```

A user should be able to start an agent inside the selected project.

**Do not build a custom AI chat/messaging interface.** Each agent is its own CLI tool (`claude`, `cursor-agent`, etc.) with its own interaction model. Instead, the application should spawn the agent's CLI as a real process and attach an embedded, controllable terminal to it inside the app. The developer interacts with the agent through that terminal exactly as they would in a standalone terminal window — typing input, reading streamed output — with the app only responsible for spawning, displaying, and managing the process (start/stop/restart, visibility, working directory).

The agent process must receive:

* Project working directory
* Relevant environment
* User-selected instructions (e.g. an initial prompt/flag passed to the CLI invocation)
* Optional issue/task context (e.g. passed as CLI arguments or piped into the session)

---

# 13. AI Agent Sessions

AI sessions should be persistent within the project workspace.

An AI agent session is a managed CLI process with an embedded terminal attached to it — not a custom chat conversation. The application is responsible for spawning, tracking, and controlling that process (via the Electron main process's AI Agent Manager/Process Manager), and for rendering its terminal output live in the UI. Session state (status, timestamps, changes) is derived from the process lifecycle and the project's Git state, not from parsing a proprietary message format.

Example:

```text
Client A

AI Sessions

● Fix authentication bug
● Implement Linear issue LIN-234
● Refactor API validation
○ New session
```

Each session should have:

* Agent type (which CLI is running, e.g. Claude Code, Cursor CLI)
* Session name
* Underlying process (command, PID, working directory)
* Start time
* Status (running/stopped/crashed)
* Project
* Terminal output/scrollback (the raw CLI output, not a custom chat log)
* Related issue/task
* Changes produced
* Git commit if available

The user should be able to:

* Switch between active AI sessions without losing project context or killing the underlying process
* Send input directly to the session's terminal (stdin passthrough)
* Stop, restart, or open the session in an external terminal window

### Detecting when a session has finished

The user must be notified when an agent finishes its task so they can review and continue, without having to keep the terminal in view. Since agents are plain CLI processes rather than a structured chat protocol, status must be inferred:

* **Process exit** — the CLI process exits (naturally or via a completion/exit code). Treated as "Finished".
* **Idle/output-quiet detection** — no new terminal output for a configurable threshold (e.g. 30–60s) while the process is still running. Treated as "Awaiting input" (the agent is likely waiting on the user, or done and sitting at its prompt).
* **Working tree change detection** — Git status changes in the project directory while a session is running are attached to that session as "changes produced," used to enrich the notification (e.g. "3 files changed").
* Where a given CLI exposes a more structured completion signal (e.g. a hook, exit code, or notification flag), the corresponding agent adapter may use it instead of the generic heuristics above. This should be pluggable per agent, not hard-coded.

The user will typically have several agent sessions running across several different projects at once. **Do not use in-app toasts/popups or a separate notification center for this** — with multiple concurrent sessions they add a layer of transient UI on top of what the app already shows. Keep it to the two places the user already looks: the project list and the project's own activity.

When a session transitions to **Finished** or **Awaiting input**, the application should:

* Update the session's status indicator in the AI Sessions list
* Surface a status badge on the project's icon in the left navigation rail, visible even when another project is open, showing a count if more than one session in that project needs attention
* Add an entry to the project's Activity feed, shown in the bottom Status/Processes/Notifications bar (see Section 27)

---

# 14. Composio Integration Layer

Use **Composio as the primary integration layer for third-party applications**.

Create an abstraction around external integrations rather than hard-coding each integration throughout the application.

For example:

```text
Integration
├── GitHub
├── Linear
├── Notion
├── Slack
└── Future integrations
```

Each integration should expose:

* Connection status
* Connected account
* Available actions
* Available data
* Permissions
* AI-agent access

The application should have a central integrations area where users can connect and manage services.

---

# 15. Multiple Accounts

Users should be able to connect multiple accounts for the same service.

For example:

```text
GitHub

● Personal GitHub
● Company GitHub
● Client GitHub
```

A project should specify which connected account it uses.

The same principle should apply to other services where supported.

---

# 16. Linear Integration

Linear should be deeply integrated into the project workflow.

For a project connected to Linear, display:

* Teams
* Projects
* Issues
* Issue status
* Priority
* Assignee
* Labels
* Description
* Comments where appropriate

Example:

```text
Linear

Project: Client Platform

Issues
────────────────────────────
LIN-231  Fix login redirect
LIN-232  Add property search
LIN-233  Improve API validation
```

Selecting an issue should display its relevant details inside the application.

---

# 17. AI + Linear Workflow

One of the most important workflows is:

```text
Linear issue
      ↓
AI agent reads issue
      ↓
AI understands requirements
      ↓
AI works inside project
      ↓
AI modifies files
      ↓
Developer reviews changes
      ↓
Commit
      ↓
Push
```

For example:

1. User opens a Linear issue.
2. User clicks **"Work on Issue with AI"**.
3. The application starts Claude Code or Cursor CLI in the relevant project.
4. The issue title, description and relevant context are passed to the agent.
5. The agent works inside the project's local directory.
6. The application displays the resulting Git changes.
7. The developer reviews the changes.
8. The developer commits and pushes.

Do not automatically commit or push AI-generated changes without explicit user control unless this is later configured as an optional automation.

---

# 18. Notion Integration

Support Notion through Composio.

Depending on available Composio capabilities, allow users and AI agents to access:

* Pages
* Databases
* Documents
* Project documentation
* Knowledge

For example, an AI agent may use project documentation stored in Notion as context while working on a project.

---

# 19. AI Tool Permissions

AI agents should not automatically receive unrestricted access to every connected application.

Implement a permission/context model.

For example:

```text
Agent: Claude Code

Project access: ✓
GitHub: ✓
Linear: ✓
Notion: ✓
Slack: ✕
Production systems: ✕
```

The user should be able to control which integrations an agent can access.

The application should clearly indicate when an AI agent is using an external integration.

---

# 20. Git Workflow

Git operations should be accessible from the project workspace.

At minimum:

* Status
* Fetch
* Pull
* Push
* Commit
* Branch creation
* Branch switching
* Stash
* Discard changes
* View diff

For commits:

```text
Commit message
[____________________________]

[Commit]
```

For push:

```text
Push changes
```

Before destructive operations such as discarding changes, require confirmation.

---

# 21. Diff Viewer

Provide a lightweight Git diff viewer.

Display:

* Changed files
* Added lines
* Removed lines
* Modified sections

The purpose is to allow the developer to quickly inspect AI-generated or manual changes.

It does not need to be a complete GitHub-style code review interface.

---

# 22. Organizations

Support multiple organizations.

Example:

```text
Organizations

LogiqDev
Client Company A
Client Company B
```

A user may belong to multiple organizations.

Each organization should have its own:

* Members
* Roles
* Projects
* Integrations
* Permissions
* Settings

---

# 23. Team Members & Roles

Support organization members.

Initial roles:

* Owner
* Admin
* Manager
* Developer
* Viewer

Permissions should be granular enough to control actions such as:

```text
Projects
View
Create
Edit
Delete

Git
View changes
Commit
Push
Manage branches

AI
Start agents
Use agents
Manage agent permissions

Integrations
View
Connect
Disconnect
Manage

Organization
Manage members
Manage roles
Manage settings
```

Use a permission-based architecture rather than scattering role checks throughout the application.

---

# 24. Database

Use PostgreSQL with Prisma.

Design the schema around entities such as:

```text
User
Organization
OrganizationMember
Role
Permission
Client
Project
Repository
ProjectService
GitAccount
Integration
IntegrationConnection
Agent
AgentSession
TerminalSession
Process
Issue
ProjectIssue
Activity
```

The exact schema can be adjusted during implementation.

Do not unnecessarily duplicate data from external services.

Where appropriate, store external IDs and retrieve current data from the provider.

---

# 25. Security

Electron security is important.

Follow secure Electron architecture:

* Context isolation enabled
* Node integration disabled in renderer
* Secure preload API
* IPC validation
* No arbitrary renderer-to-shell execution
* Validate all filesystem paths
* Validate all shell commands/process requests
* Secure storage for credentials/tokens
* Do not expose secrets to the renderer unnecessarily

Third-party OAuth credentials and integration tokens must never be stored insecurely.

---

# 26. Local Workspace Management

The application should maintain a local workspace configuration.

Example:

```text
~/Development/Clients/
    ClientA/
    ClientB/
    ClientC/
```

When a project is opened, the application should know:

* Local repository path
* Repository URL
* Current branch
* Associated organization
* Associated client
* Services
* Connected integrations
* AI configuration

If the directory no longer exists, show a clear recovery flow instead of failing silently.

---

# 27. Notifications & Activity

Provide a lightweight activity system.

Examples:

```text
Claude Code completed a task
Git push completed
Linear issue updated
Development server crashed
Repository has uncommitted changes
AI agent requires approval
```

**AI agent completion is the most important notification case.** The user may have several agent sessions running across several different projects at the same time, so this must be built for that from the start — not just the single-session case. The user should be able to notice a finished session and jump back in without keeping that project's terminal in view.

**Do not implement this as toasts/popups or a dedicated notification center.** Keep it to two places the user already looks:

* A status badge on each project's icon in the left navigation rail (visible while working in a different project), showing a count when more than one of that project's sessions needs attention
* An entry in that project's Activity feed, surfaced through the bottom Status/Processes/Notifications bar (see Section 4)

Clicking a nav-rail badge or an activity entry should switch to that project and open the finished session.

A project activity timeline could display:

```text
09:42  Claude Code modified 8 files
09:45  Claude Code finished — awaiting review
09:47  Changes reviewed
09:49  Commit created
09:50  Push completed
```

---

# 28. Settings

Create application settings for:

### General

* Workspace directory
* Default shell
* Theme
* Notifications

### Git

* Default Git identity
* Git accounts
* Default branch behavior

### AI

* Preferred agent
* Agent executable paths
* Default permissions
* Session settings

### Integrations

* Connected accounts
* Permissions
* Connection management

### Organizations

* Members
* Roles
* Permissions

---

# 29. UX Principles

The application should feel like a **professional developer operations dashboard**, not an IDE.

Prioritize:

1. Speed
2. Clarity
3. Minimal clicks
4. Persistent project context
5. Easy switching
6. Clear process status
7. Clear Git status
8. AI-agent visibility
9. Safe destructive actions
10. Useful automation

Avoid unnecessary complexity.

Do not recreate:

* Full VS Code
* Full Cursor
* Full GitHub
* Full Linear
* Full Notion

Instead, integrate them into one workflow.

---

# 30. Example Primary Workflow

A typical developer workflow should look like this:

### Step 1

Open the application.

The developer sees their projects in the left navigation.

### Step 2

Select:

```text
Client A
```

### Step 3

The project workspace opens and displays:

```text
Client A

Git
main
2 modified files

Services
Frontend   ● Running
API        ● Running

Linear
3 open issues

AI
Claude Code
Cursor

Files
...
```

### Step 4

The developer selects a Linear issue:

```text
LIN-234
Fix property filtering
```

### Step 5

Click:

```text
Work on issue with Claude
```

### Step 6

The application starts Claude Code inside the project's local directory and provides the relevant Linear context.

### Step 7

Claude modifies the project.

The application shows:

```text
Git Changes

8 files changed
+142
-37
```

### Step 8

The developer reviews the diff.

### Step 9

The developer enters:

```text
Fix property filtering
```

and clicks:

```text
Commit
```

### Step 10

Click:

```text
Push
```

### Step 11

Switch to another project using the left navigation.

No IDE windows need to be manually closed or reopened.

---

# 31. Architecture Requirements

Use a clean modular architecture.

Separate:

```text
Electron Main Process
        │
        ├── Process Manager
        ├── Filesystem Manager
        ├── Git Manager
        ├── Terminal Manager
        ├── AI Agent Manager
        └── Secure IPC
                │
                ↓
        NestJS Application
                │
                ├── Auth
                ├── Organizations
                ├── Projects
                ├── Repositories
                ├── Integrations
                ├── AI Agents
                ├── Git
                └── Database
                │
                ↓
             Prisma
                │
                ↓
           PostgreSQL
```

The React renderer should communicate with Electron through a controlled preload/API layer.

Do not tightly couple the UI directly to OS-level operations.

---

# 32. Extensibility

The architecture must make future additions easy.

Potential future integrations:

* Slack
* Jira
* GitLab
* Bitbucket
* Sentry
* Google Drive
* Google Calendar
* Gmail
* Notion
* Discord
* AWS
* Vercel
* Docker
* Kubernetes

Potential future AI agents:

* Claude Code
* Cursor
* OpenAI Codex
* Other CLI-based coding agents

Potential future project automation:

```text
When Linear issue assigned
        ↓
Start AI agent
        ↓
Implement task
        ↓
Run tests
        ↓
Create branch
        ↓
Commit
        ↓
Create pull request
```

These should be possible without rewriting the core architecture.

---

# 33. MVP Scope

Build the MVP around the core developer workflow rather than implementing every integration immediately.

### MVP should include:

* Electron desktop application
* React + Vite
* Tailwind + shadcn/ui
* NestJS
* PostgreSQL + Prisma
* Organizations
* Users/team members
* Roles and permissions
* Projects
* GitHub connection through Composio
* Multiple GitHub accounts
* Repository cloning
* Manual repository cloning
* Local project management
* Git status
* Git diff
* Commit
* Push
* Pull
* Branch switching
* Development process management
* package.json script detection
* Integrated terminal
* File tree
* Claude Code integration
* Cursor CLI integration
* AI sessions
* Linear integration through Composio
* Basic Notion integration through Composio
* Project-level integration permissions

---

# 34. Implementation Approach

Do not attempt to build the entire system in one step.

Implement incrementally.

### Phase 1 — Foundation

Build:

* Electron
* React
* Vite
* Tailwind
* shadcn
* NestJS
* Prisma
* PostgreSQL
* Authentication
* Organizations
* Basic project model

### Phase 2 — Local Development Workspace

Implement:

* Project creation
* Local repository management
* File tree
* Terminal
* Process manager
* package.json script detection
* Development server controls

### Phase 3 — Git

Implement:

* Git status
* Branches
* Diff
* Commit
* Pull
* Push
* GitHub repository connection

### Phase 4 — AI Agents

Implement:

* Agent abstraction
* Claude Code
* Cursor CLI
* Agent sessions
* Session history
* Project-level permissions

### Phase 5 — Composio

Implement:

* Integration framework
* GitHub
* Linear
* Notion
* Multiple accounts
* Integration permissions

### Phase 6 — AI + Integrations

Implement:

* Linear issue context
* "Work on issue with AI"
* Passing issue context to agents
* AI access to approved integrations
* Change review workflow

### Phase 7 — Polish

Improve:

* UX
* Keyboard shortcuts
* Notifications
* Error handling
* Loading states
* Empty states
* Security
* Performance
* Logging
* Recovery flows

---

# 35. Important Development Rules

While implementing this application:

1. **Do not build a VS Code clone.**
2. Keep the interface focused on project orchestration.
3. Prefer existing CLI tools and integrations instead of rebuilding them.
4. Keep Electron's privileged operations isolated from the renderer.
5. Use TypeScript throughout.
6. Keep modules loosely coupled.
7. Avoid hard-coded assumptions about repository structure.
8. Support monorepos.
9. Make AI agents pluggable.
10. Make integrations pluggable.
11. Make permissions explicit.
12. Never automatically perform destructive Git operations without confirmation.
13. Never automatically commit/push AI changes unless explicitly configured.
14. Provide useful error messages and recovery actions.
15. Keep the UI fast even when multiple projects and processes exist.
16. Maintain project context when switching between projects.
17. Do not unnecessarily duplicate external service data.
18. Store external provider IDs where appropriate.
19. Treat secrets and OAuth credentials securely.
20. Build the MVP first and avoid premature implementation of advanced automation.

---

# 36. Expected Result

The final application should feel like a **central command center for software development projects**.

A developer should be able to open the application in the morning and immediately see:

```text
CLIENTS / PROJECTS

Client A
  ● Frontend
  ● API

Client B
  ● Website

Internal
  ● SaaS
  ● Marketing Site


CURRENT PROJECT

Client A / Platform

Git
main
3 modified files

Services
Frontend   ● Running
API        ● Running

Linear
5 issues

AI
Claude Code   ● Working
Cursor        ○ Available

Changes
3 files modified

Actions
[Commit] [Push] [Pull] [Open in Cursor]
```

The central value proposition is:

> **One workspace for managing projects, development processes, AI coding agents, Git workflows, and connected business/development tools — without turning the application itself into another IDE.**
