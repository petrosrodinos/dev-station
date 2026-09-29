import type { LucideIcon } from "lucide-react";
import { Bot, GitBranch, ListChecks, PanelLeft, Plug, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { WorkspacePreview } from "./components/workspace-preview";

const WORKFLOW_STEPS = [
  { title: "Select a project", body: "Pick up exactly where you left off, per client." },
  { title: "Start services", body: "Frontend, API, worker, DB — one status view." },
  { title: "Work with AI", body: "Claude Code and Cursor run as real, controllable sessions." },
  { title: "Review the diff", body: "See exactly what changed before anything ships." },
  { title: "Commit & push", body: "Confirmed before anything destructive happens." },
  { title: "Switch projects", body: "Back to step one, instantly." },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: PanelLeft, title: "Project rail", body: "Every project gets its own color, used consistently across tabs, sessions, and the rail." },
  { icon: Server, title: "Process manager", body: "Start, stop, and watch dev servers per project — logs and status in one place." },
  { icon: Bot, title: "AI agent sessions", body: "Claude Code and Cursor CLI run as real processes with an embedded terminal, not a chat box." },
  { icon: GitBranch, title: "Git & diff viewer", body: "Status, commit, push, pull, branch, and stash — with a diff viewer for every change." },
  { icon: ListChecks, title: "Linear, in context", body: "Open an issue, then work on it with AI — the context travels with the session." },
  { icon: Plug, title: "Connected accounts", body: "GitHub, Linear, Notion, and more — multiple accounts per service, per project." },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen overflow-y-auto bg-canvas text-foreground">
      <header className="flex h-14 items-center justify-between border-b bg-canvas px-6">
        <div className="flex items-center gap-2 text-[0.875rem] font-semibold">
          <span className="size-[18px] rounded-[5px] bg-gradient-to-br from-[#ff5757] to-[#a1131a]" aria-hidden />
          {environments.APP_NAME}
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(Routes.auth.sign_in)}>
          Sign in
        </Button>
      </header>

      <main>
        <section className="px-6 pt-24 pb-16">
          <div className="landing-fade-up mx-auto flex max-w-xl flex-col items-center gap-6 text-center" style={{ animationDelay: "0ms" }}>
            <span className="size-16 rounded-lg bg-gradient-to-br from-[#ff5757] to-[#a1131a]" aria-hidden />
            <h1 className="text-[2.75rem] font-semibold leading-[1.1] sm:text-[3.5rem]">One workspace for every client project.</h1>
            <p className="max-w-md text-lg text-body">
              Switch projects, start dev servers, work with AI agents, and review Git diffs — without juggling a dozen windows.
            </p>
            <div className="flex items-center gap-3">
              <Button size="lg" onClick={() => navigate(Routes.auth.sign_in)}>
                Sign in
              </Button>
              <Button variant="ghost" size="lg" render={<a href="#workflow">See how it works</a>} />
            </div>
          </div>

          <div className="landing-fade-up mx-auto mt-16 max-w-4xl" style={{ animationDelay: "120ms" }}>
            <WorkspacePreview />
          </div>
        </section>

        <section id="workflow" className="border-t px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-medium">The core loop</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-3 border-t pt-4">
                  <span className="font-mono text-[0.8125rem] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="text-[0.9375rem] font-medium">{step.title}</div>
                    <p className="mt-1 text-sm text-body">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-medium">What it does for you</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-lg border bg-surface p-6">
                  <feature.icon className="size-5 text-muted-foreground" />
                  <div className="mt-4 text-[0.9375rem] font-medium">{feature.title}</div>
                  <p className="mt-1.5 text-sm text-body">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 text-[0.8125rem] font-semibold">
            <span className="size-[16px] rounded-[4px] bg-gradient-to-br from-[#ff5757] to-[#a1131a]" aria-hidden />
            {environments.APP_NAME}
          </div>
          <p className="text-sm text-muted-foreground">Projects, processes, AI agents, and Git — one workspace.</p>
          <p className="text-xs text-muted-foreground">© 2026 LogiqDev</p>
        </div>
      </footer>
    </div>
  );
}
