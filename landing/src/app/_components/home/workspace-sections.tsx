import type { CSSProperties } from "react";

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
        </section>
    );
}
