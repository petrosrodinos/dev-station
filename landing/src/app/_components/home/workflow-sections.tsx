import Link from "next/link";
import { Routes } from "@/routes/routes";

const loop = [
    { title: "Pick a project", body: "Open the repository you're working on." },
    { title: "Start an agent", body: "Give your coding agent a task." },
    { title: "Let it work", body: "Continue with another task while it runs." },
    { title: "Review", body: "Check the preview and Git diff." },
    { title: "Repeat", body: "Keep iterating until it's ready." },
];

/** "Designed around the development loop" — also the target of the hero's "Watch how it works". */
export function LoopSection() {
    return (
        <section id="how-it-works">
            <div className="wrap">
                <div className="sec-head c">
                    <p className="kicker">How it works</p>
                    <h2>Designed around the development loop</h2>
                    <p>A productive AI development workflow often looks like this.</p>
                </div>
                <ol className="loop">
                    {loop.map((s, i) => (
                        <li key={s.title} className={i === loop.length - 1 ? "again" : undefined}>
                            <span className="n">{i + 1}</span>
                            <h3>{s.title}</h3>
                            <p>{s.body}</p>
                        </li>
                    ))}
                </ol>
                <p className="center-note">The workspace is designed to make this loop fast.</p>
            </div>
        </section>
    );
}

export const faqs: { q: string; a: string[] }[] = [
    {
        q: "Is this another code editor?",
        a: ["Not exactly.", "It includes a basic code editor for when you need to inspect or modify files, but the main focus is managing AI coding agents, terminals, project previews, Git, scripts and development workflows."],
    },
    {
        q: "What AI coding agents does it support?",
        a: ["The workspace is designed to work with existing coding agents such as Claude Code, Codex and Cursor, rather than requiring you to use a proprietary AI agent.", "Support can expand as new coding agents become available."],
    },
    {
        q: "Can I run multiple AI agents at the same time?",
        a: ["Yes. Each agent can have its own session and project context, allowing you to work on multiple tasks concurrently."],
    },
    {
        q: "Can I preview my application?",
        a: ["Yes. Local development servers can be opened in the built-in browser preview so you can see the application alongside your agent session."],
    },
    {
        q: "Does it work with Git?",
        a: ["Yes. Git functionality is built into the workspace so you can inspect repositories, branches and changes without leaving the application."],
    },
];

export function FaqSection() {
    return (
        <section id="faq">
            <div className="wrap narrow">
                <div className="sec-head c">
                    <p className="kicker">FAQ</p>
                    <h2>Frequently asked questions</h2>
                </div>
                <div className="faq">
                    {faqs.map((f) => (
                        <details key={f.q}>
                            <summary>{f.q}</summary>
                            {f.a.map((p) => <p key={p}>{p}</p>)}
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function FinalCtaSection() {
    return (
        <section id="get">
            <div className="wrap">
                <div className="final">
                    <h2>Your AI agents are already writing the code.</h2>
                    <p className="final-sub">Give them a better workspace to work in.</p>
                    <div className="cta">
                        <Link className="btn btn-primary btn-lg" href={Routes.downloads}>Download for free</Link>
                    </div>
                    <p className="fine">No complicated setup. No proprietary AI model required.</p>
                </div>
            </div>
        </section>
    );
}
