# Cloud / Web Sandbox Exploration

Notes from discussing how `dev-station` (currently an Electron desktop app, see `docs/Product_Specification.md`) could become a webapp where each user gets their own isolated cloud dev sandbox instead of using their local machine.

## The core shift

Today the Electron main process *is* the sandbox: it owns the filesystem, spawns real processes (dev servers, terminals, AI CLI agents like Claude Code / Cursor CLI) directly on the developer's own machine, and the renderer talks to it over local IPC.

To offer this from a browser with per-user isolation, that runtime needs to move off the desktop and into a **cloud sandbox per user/project** (the Codespaces/Gitpod/E2B model):

- Each user/project gets an isolated microVM or gVisor/Kata container that clones the repo and stays alive for the session.
- The sandbox runs the dev servers, terminal shell, and AI agent CLIs.
- Its terminal is streamed to the browser over WebSocket (e.g. xterm.js) instead of local IPC.
- The NestJS backend and Prisma/Postgres schema barely change — it's the Electron-main modules (Process Manager, Filesystem Manager, Terminal Manager, AI Agent Manager) that get reimplemented as a remote "workspace agent" service running *inside* each sandbox.
- The React app becomes a plain web client (no Electron).

## What has to change vs. what stays the same

**Stays the same:**
- NestJS API, Prisma schema, Organizations/Projects/Clients/Repositories model (Section 23 of the spec)
- Composio integration layer (GitHub/Linear/Notion)
- The core workflow (select project → workspace → services → AI agent → review → commit → push)

**Changes:**
- Electron Main Process modules (Process/Filesystem/Git/Terminal/AI Agent Managers, Section 31) move from running on the developer's own machine to running inside a remote per-user sandbox.
- Local IPC (preload/contextBridge) is replaced by an authenticated WebSocket/API channel between the browser and the sandbox's workspace agent.
- Dev server preview needs port-forwarding / a reverse proxy with a per-sandbox subdomain (like Codespaces port forwarding).
- Sandbox lifecycle management is new: cold start on project open, suspend/pause when idle to control cost, persistent volume per user/project so the repo and `node_modules` survive across sessions.
- Security model shifts from "protect the renderer from doing arbitrary shell/filesystem access on the user's own machine" (Section 24) to "isolate one user's sandbox from every other user's sandbox and from your own infrastructure," since you're now running arbitrary AI-agent-driven code on infrastructure you operate.

## Main tradeoff

This turns a free, instant-start desktop app into an infra-heavy product: you now pay for and manage per-user compute (idle/suspend policies, cold-start latency, persistent volumes, port-forwarding, stronger isolation/security).

## Provider research: who can host the per-user sandbox

Two categories of provider came up:

1. **Purpose-built AI-code-sandbox platforms** (Daytona, E2B, Modal) — designed for ephemeral/agent code execution, but also usable as persistent per-user dev boxes.
2. **General VM/container platforms** (Fly.io, Railway) — you'd wire up the sandbox semantics (fs/exec/git bridge, suspend/resume, snapshotting) yourself.

For dev-station's need — a persistent, per-user isolated box with a real filesystem, git, a shell, long-running dev servers, and an attached CLI agent — the purpose-built sandbox platforms fit far better out of the box than a generic PaaS like Railway.

### Comparison

| | **Daytona** | **E2B** | **Fly.io Machines** |
|---|---|---|---|
| Isolation | Docker/OCI containers, optional Kata Containers for hard isolation | Firecracker microVMs | Firecracker microVMs (full VM, your own image) |
| Out-of-the-box fit | Purpose-built for AI-agent/dev sandboxes: SDK gives filesystem, process exec, and git ops directly — closest match to the current Electron main-process managers | Same category as Daytona; SDK for exec/fs/git, mature ecosystem, widely used by coding-agent products | Nothing coding-specific — raw VMs. You build the "workspace agent" (terminal/exec/fs bridge) yourself, same shape as the current Electron main process, just deployed remotely |
| Suspend/resume | Sub-90ms cold start (some configs ~27ms); pause keeps state indefinitely | Pause saves filesystem + memory, resume ~1s, paused sandboxes billed $0 and kept indefinitely | Suspend dumps full VM state to disk, resumes in a few hundred ms — **not guaranteed durable** (Fly can force a cold start under host pressure); machines must be ≤4GB RAM to suspend |
| Pricing model | Pure usage-based: $0.0504/vCPU-hr, $0.000108/GB-hr storage. No seats, no base fee. $200 free credit | Free tier 100 sandbox-hours/mo; Pro $150/mo, then $0.0504/vCPU-hr + $0.0162/GiB-hr; concurrency caps by tier (20/100/600/1100) | No coding-specific plan — pure compute + storage. Roughly ~$2/mo per always-on shared vCPU if never suspended; stopped/suspended machines billed at $0.15/GB-month for rootfs only |
| Est. cost / active user\* | ~$10.65/mo | ~$15/mo (+ $150/mo Pro floor once past free tier/concurrency limits) | Cheapest raw compute, but add engineering cost to reach feature parity |

\* assumes a 2 vCPU / 4GB sandbox, ~3 active hours/day, suspended the rest of the month.

### Recommendation

- **Daytona** — best starting point. Most direct drop-in replacement for the current Electron main-process managers (filesystem, process, git, terminal all exposed via SDK), usage-based with no per-seat tax, cold-start numbers good enough that "open project → sandbox ready" won't feel laggy.
- **E2B** — fallback/alternative if Daytona has rough edges. More battle-tested, same pricing ballpark, slightly worse concurrency economics at scale.
- **Fly.io Machines** — only if full infra control is wanted and the team is willing to build the workspace-agent layer itself. Cheapest raw compute, but re-builds what Daytona/E2B already provide.

### Why not Railway

Railway's serverless sleep-on-idle fits stateless web services, not this. It has no per-user isolated *sandbox* concept (filesystem/exec/git primitives), no snapshot/pause-with-state model (a sleeping service just stops, it doesn't preserve an in-memory session the way E2B/Daytona/Fly suspend does), and billing is plain compute+memory+egress with no dev-sandbox SDK. Possible to run one Railway service per user as a workaround, but it fights the platform instead of using native primitives.

### Sources

- [Daytona Pricing](https://www.daytona.io/pricing)
- [AI Sandbox pricing comparison (2026) — Northflank](https://northflank.com/blog/ai-sandbox-pricing)
- [E2B Pricing](https://e2b.dev/pricing)
- [How do I calculate the price of a sandbox? — E2B Docs](https://e2b.dev/docs/faq/calculate-sandbox-price)
- [E2B Pricing Breakdown — Morph](https://www.morphllm.com/e2b-pricing)
- [Fly.io Billing](https://fly.io/docs/about/billing/)
- [Machine Suspend and Resume — Fly Docs](https://fly.io/docs/reference/suspend-resume/)
- [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/)
- [Railway Pricing](https://railway.com/pricing)
- [Usage-Based vs. Fixed Pricing 2026 — Railway Blog](https://blog.railway.com/p/usage-based-vs-fixed-pricing-2026)
- [11 Best Sandbox Runners in 2026 — Better Stack](https://betterstack.com/community/comparisons/best-sandbox-runners/)

## Open question

Not yet decided: whether to actually pursue this, or a concrete architecture (which isolation tech, session lifecycle, how it maps onto the existing NestJS/Prisma schema). This file is a snapshot of the exploratory discussion, not a committed plan.
