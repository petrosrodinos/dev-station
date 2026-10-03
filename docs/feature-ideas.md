# Feature Ideas

## 5 features

1. **One-click project startup profiles.** Save a set of services (API, DB, renderer) as a profile. Start them in dependency order with health checks and a "ready" indicator, and stop everything cleanly when you're done.
2. **Unified log viewer.** Merge stdout/stderr from all services into one searchable stream. Add filters by service and level, error highlighting, and click-to-jump to the file and line.
3. **Env and secrets manager.** Show `.env.local`, `.env.staging` and the like side by side, and flag missing or placeholder keys. Add a "diff against staging" view, so problems like the empty `RESEND_API_KEY` get caught before you hit them.
4. **Git and PR dashboard per project.** Show branch, dirty files, ahead/behind, recent commits and CI status. Add quick actions such as switch branch, stash, and open the PR.
5. **Port and process monitor.** Show what's listening on which port and which service owns it. Add one-click kill for orphaned processes and conflict alerts, building on your port-conflict work.

## 5 AI features

1. **Crash and error explainer.** When a service dies or logs a stack trace, an "Explain / Fix" button sends the trace with relevant code context to a model. It returns the likely cause and a suggested patch you can apply.
2. **Natural-language command bar.** Type things like "start the API on staging and open the preview" or "which service is using port 3000?" The model maps that to your app's actions (start, stop, open, kill).
3. **AI commit and PR writer.** Generate commit messages and PR descriptions from the staged diff, following your repo's conventions such as `feat(app):`.
4. **Project onboarding assistant.** Point it at a new repo and it detects the stack, proposes services, ports and start commands, and generates the profile from feature 1. It also flags missing env vars.
5. **Log anomaly digest.** Summarize a long session's logs into "what happened, what's failing, what's new since last run". Push the important parts through your existing toast notification system, and add optional local-model support for privacy.

## Suggested starting point

Unified log viewer (feature 2) paired with the crash/error explainer (AI feature 1) — together they give the most day-to-day value.

## Landing page follow-ups

1. **Codex as a first-class agent.** The landing copy, FAQ and structured data say Dev Station works with Claude Code, Codex and Cursor. The app only has built-in session types for Claude Code and Cursor CLI (`AgentTypeFormOptions`); Codex shows up only as a skills provider. Add a Codex session type, or soften the landing copy.
2. **"Watch how it works" video.** The hero button scrolls to the "How it works" section because there's no video yet. Record a short walkthrough and link it.
3. **Dedicated SEO pages.** The landing copy doc recommends separate pages: `/ai-coding-agent-workspace`, `/claude-code`, `/codex`, `/cursor`, `/multi-agent-development`, `/ai-development-workflow`, `/features`, `/integrations` and `/use-cases/{freelancers,software-agencies,indie-hackers}`. Each should have real screenshots and workflows.
4. **Persist the hero mockup layout.** Tab order, splits, AI panel and sidebar position, and panel sizes reset on reload. Save them in `localStorage` so a returning visitor sees their own arrangement.
5. **Touch support for the hero mockup.** Dragging tabs and the AI panel uses HTML5 drag and drop, which doesn't work on touch screens. Add pointer-based dragging, or a tab context menu with "Move to new split" for tablets.
6. **More than one split in the hero mockup.** It allows only two side-by-side tab groups. The real dock supports any number of groups and vertical splits.
