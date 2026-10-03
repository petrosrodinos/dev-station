import Link from "next/link";
import { Routes } from "@/routes/routes";

const clutter = [
    "Terminal window",
    "Another terminal window",
    "VS Code",
    "Browser",
    "Git client",
    "Linear",
    "Notion",
    "Another terminal",
];

/** "Less window management. More development." */
export function ClutterSection() {
    return (
        <section id="clutter">
            <div className="wrap two-col">
                <div>
                    <p className="kicker">Focus</p>
                    <h2>Less window management. More development.</h2>
                    <div className="prose">
                        <p>A typical AI-assisted workflow can look like the list on the right.</p>
                        <p>You shouldn&apos;t need to remember where everything is.</p>
                        <p className="pull">Keep the development workflow together.</p>
                    </div>
                </div>
                <div className="taskbar" role="img" aria-label="A stack of nine open windows ending with: where was that agent running again?">
                    {clutter.map((w, i) => (
                        <div key={w + i} className="tb-win" style={{ marginLeft: `${(i % 3) * 14}px` }}>
                            <i />{w}
                        </div>
                    ))}
                    <div className="tb-win lost"><i />&ldquo;Where was that agent running again?&rdquo;</div>
                </div>
            </div>
        </section>
    );
}

/** "The editor is still there." */
export function EditorSection() {
    return (
        <section id="editor">
            <div className="wrap narrow">
                <div className="editor-card">
                    <p className="kicker">The editor</p>
                    <h2>The editor is still there.</h2>
                    <div className="prose">
                        <p>We&apos;re not pretending developers never need to edit code.</p>
                        <p>Sometimes you want to open a file, inspect something, make a quick change, or understand what an agent modified.</p>
                        <p>The editor is there when you need it. It just isn&apos;t the center of the product.</p>
                        <p className="pull">The work is.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

const loop = [
    { title: "Pick a project", body: "Open the repository you're working on." },
    { title: "Start an agent", body: "Give your coding agent a task." },
    { title: "Let it work", body: "Continue with another task while it runs." },
    { title: "Check the result", body: "Open the preview or inspect the changes." },
    { title: "Give feedback", body: "Tell the agent what needs to change." },
    { title: "Review", body: "Check the Git diff and make sure the result is what you expected." },
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

/** "Stop managing your development environment." */
export function StopSection() {
    return (
        <section id="stop" className="stop">
            <div className="wrap stop-band">
                <div>
                    <h2>Stop managing your development environment.</h2>
                    <p>You already have enough things to think about. Your tools shouldn&apos;t become another project.</p>
                    <p className="stop-line">Open your projects. Start your agents. See the result. Keep moving.</p>
                </div>
                <Link className="btn btn-primary btn-lg" href={Routes.downloads}>Download the app</Link>
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
        q: "Can I work on multiple projects?",
        a: ["Yes. You can keep multiple projects available and switch between them quickly."],
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
    {
        q: "Does it detect project scripts?",
        a: ["Yes. The workspace can detect common project configuration and surface available development scripts so you can run them directly."],
    },
    {
        q: "Do I have to stop using my existing code editor?",
        a: ["No.", "The product is designed to complement your existing development tools. You can continue using whatever editor or AI coding agent fits your workflow."],
    },
    {
        q: "Who is this for?",
        a: ["It's primarily designed for developers who use AI coding agents and regularly work across multiple projects, repositories, terminals and application previews."],
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
                    <p>Run multiple projects, manage multiple agent sessions, preview your applications and keep your development workflow in one place.</p>
                    <div className="cta">
                        <Link className="btn btn-primary btn-lg" href={Routes.downloads}>Download for free</Link>
                    </div>
                    <p className="fine">No complicated setup. No proprietary AI model required.</p>
                </div>
            </div>
        </section>
    );
}
