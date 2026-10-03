import type { CSSProperties } from "react";

/** "The way we build software has changed." */
export function ShiftSection() {
    return (
        <section id="why" className="shift">
            <div className="wrap narrow">
                <p className="kicker">Why this exists</p>
                <h2>The way we build software has changed.</h2>
                <div className="prose">
                    <p>Traditional code editors were built around one assumption: <strong>the developer spends most of their time writing code.</strong></p>
                    <p>That is no longer how many developers work.</p>
                    <p>
                        Today, you might ask an AI coding agent to implement a feature, switch to another project while it works,
                        check the browser preview, review the changes in Git, give the agent another instruction, and start another
                        task in a completely different repository.
                    </p>
                    <p>The hard part isn&apos;t opening a file anymore.</p>
                    <p className="pull">It&apos;s keeping track of everything that&apos;s happening.</p>
                    <p>This workspace is built around that reality.</p>
                </div>
            </div>
        </section>
    );
}

const workspaceFeatures = [
    {
        title: "Multiple projects",
        body: "Keep several repositories open and switch between them instantly.",
        icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    },
    {
        title: "Multiple AI agents",
        body: "Run multiple coding agents at the same time and keep their sessions separate.",
        icon: <><path d="M4 17l6-6-6-6" /><path d="M12 19h8" /></>,
    },
    {
        title: "Live previews",
        body: "See what your application looks like without constantly switching to another browser window.",
        icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M7 6.5h.01M10 6.5h.01" /></>,
    },
    {
        title: "Built for keyboard workflows",
        body: "Move between projects, agents, terminals, previews and tools without reaching for the mouse every few seconds.",
        icon: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
    },
];

/** "Your projects. Your agents. One workspace." */
export function WorkspaceSection() {
    return (
        <section id="workspace">
            <div className="wrap">
                <div className="sec-head">
                    <p className="kicker">Workspace</p>
                    <h2>Your projects. Your agents. One workspace.</h2>
                    <p>Work on several projects without turning your desktop into a collection of terminals and browser windows. Keep your projects organized and give each one the workspace it needs.</p>
                </div>
                <div className="grid4">
                    {workspaceFeatures.map((f) => (
                        <div key={f.title} className="card">
                            <span className="ico">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                            </span>
                            <h3>{f.title}</h3>
                            <p>{f.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const sessions = [
    { project: "storefront", color: "#ff6161", agent: "Claude Code", task: "Build discount codes at checkout", state: "working", label: "Working" },
    { project: "api", color: "#57c1ff", agent: "Cursor", task: "Fix webhook retry on 429", state: "input", label: "Needs your input" },
    { project: "api", color: "#57c1ff", agent: "Claude Code", task: "Write tests for the orders service", state: "working", label: "Working" },
    { project: "docs", color: "#59d499", agent: "Codex", task: "Update the setup guide", state: "done", label: "Done · 4 files changed" },
];

const sessionSteps = [
    { title: "Start a session", body: "Open an agent in the project where you want it to work." },
    { title: "Let it work", body: "Leave the session running while you work somewhere else." },
    { title: "Come back when you need to", body: "Review the output, answer a question, inspect the changes, or give the agent its next instruction." },
    { title: "Keep going", body: "Move directly from agent → preview → Git → agent without rebuilding your context every time." },
];

/** "See what your agents are doing." */
export function AgentsSection() {
    return (
        <section id="agents">
            <div className="wrap two-col">
                <div>
                    <p className="kicker">Agent sessions</p>
                    <h2>See what your agents are doing.</h2>
                    <div className="prose">
                        <p>Running several AI agents is powerful. Keeping track of them is not.</p>
                        <p>Each agent session stays connected to its project so you can quickly see where it is, what it is doing, and whether you need to step in.</p>
                        <p>Run one agent to build a feature while another fixes a bug and a third works on tests. <strong>You stay in control.</strong></p>
                    </div>
                </div>
                <div className="panel" role="img" aria-label="A list of four agent sessions across three projects, each showing its status">
                    <div className="panel-h"><span>Sessions</span><small>3 projects · 4 agents</small></div>
                    <div className="sess-list">
                        {sessions.map((s) => (
                            <div key={s.task} className="sess" style={{ "--c": s.color } as CSSProperties}>
                                <span className="sess-bar" />
                                <div className="sess-main">
                                    <span className="sess-task">{s.task}</span>
                                    <span className="sess-meta">{s.project} · {s.agent}</span>
                                </div>
                                <span className={`sess-state ${s.state}`}><i />{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="wrap">
                <ol className="steps4">
                    {sessionSteps.map((s, i) => (
                        <li key={s.title}>
                            <span className="n">{String(i + 1).padStart(2, "0")}</span>
                            <h3>{s.title}</h3>
                            <p>{s.body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/** "Keep the browser next to the agent." */
export function PreviewSection() {
    return (
        <section id="preview">
            <div className="wrap">
                <div className="sec-head c">
                    <p className="kicker">Live preview</p>
                    <h2>Keep the browser next to the agent.</h2>
                    <p>You shouldn&apos;t have to constantly switch between your terminal and your browser to see whether something actually works. Open your local application directly inside the workspace.</p>
                </div>
                <div className="side-by-side" aria-hidden="true">
                    <div className="sbs-pane">
                        <span className="sbs-label">Agent</span>
                        <div className="term">
                            <span className="m">›</span> <span className="w">Make the hero headline smaller on mobile</span><br />
                            <span className="b">●</span> Editing <span className="w">src/components/Hero.tsx</span><br />
                            <span className="g">✓</span> Updated text-4xl → text-3xl below sm<br />
                            <span className="m">Hot reload picked up the change.</span>
                        </div>
                    </div>
                    <div className="sbs-pane">
                        <span className="sbs-label">Application</span>
                        <div className="browser">
                            <div className="url"><span className="st" />localhost:3000</div>
                            <div className="site hero-site">
                                <div className="hs-title" />
                                <div className="hs-line" />
                                <div className="hs-line short" />
                                <div className="hs-btns"><i /><i /></div>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="center-strong">Agent on one side. Application on the other.</p>
                <ol className="loop4">
                    <li>Make a change.</li>
                    <li>Watch the preview.</li>
                    <li>Give the agent feedback.</li>
                    <li>Repeat.</li>
                </ol>
                <p className="center-note">This makes the development loop much faster, especially for frontend and full-stack applications.</p>
            </div>
        </section>
    );
}

const layouts = [
    { name: "Agent + Preview", body: "The everyday workflow for building and testing an application.", panes: ["agent", "preview"] },
    { name: "Agent + Agent", body: "Work on two tasks at the same time.", panes: ["agent", "agent"] },
    { name: "Agent + Git", body: "Review what changed while the agent is working.", panes: ["agent", "git"] },
    { name: "Agent + Files", body: "Quickly inspect the project when you need to.", panes: ["agent", "files"] },
    { name: "Preview + Git", body: "Check the application and review the changes side by side.", panes: ["preview", "git"] },
];

function LayoutPane({ kind }: { kind: string }) {
    return (
        <span className={`lp ${kind}`}>
            <b>{kind}</b>
            <i /><i /><i />
        </span>
    );
}

/** "Two panels. Exactly what you need." */
export function LayoutsSection() {
    return (
        <section id="layouts">
            <div className="wrap">
                <div className="sec-head">
                    <p className="kicker">Layouts</p>
                    <h2>Two panels. Exactly what you need.</h2>
                    <p>You don&apos;t need twenty panels open at once. Choose what you want to see and keep your workspace focused.</p>
                </div>
                <div className="layouts">
                    {layouts.map((l) => (
                        <div key={l.name} className="card layout-card">
                            <div className="lp-pair" aria-hidden="true">
                                {l.panes.map((p, i) => <LayoutPane key={i} kind={p} />)}
                            </div>
                            <h3>{l.name}</h3>
                            <p>{l.body}</p>
                        </div>
                    ))}
                </div>
                <p className="center-note">Your workspace should adapt to the task, not the other way around.</p>
            </div>
        </section>
    );
}
