const detected = ["React", "Vite", "Node.js", "Git"];
const commands = [
    { cmd: "npm run dev", note: "vite", running: true },
    { cmd: "npm run build", note: "tsc && vite build" },
    { cmd: "npm run test", note: "vitest" },
    { cmd: "npm run lint", note: "eslint ." },
];

/** "Your project already knows how to run." */
export function ScriptsSection() {
    return (
        <section id="scripts">
            <div className="wrap two-col">
                <div>
                    <p className="kicker">Project scripts</p>
                    <h2>Your project already knows how to run.</h2>
                    <div className="prose">
                        <p>Opening a new repository shouldn&apos;t mean spending ten minutes figuring out which command starts the application.</p>
                        <p>The workspace detects common project configuration and surfaces the commands already available in your project.</p>
                        <p><strong>Run them with one click.</strong></p>
                        <p>No copying commands between windows. No hunting through <code>package.json</code>.</p>
                    </div>
                </div>
                <div className="panel" role="img" aria-label="Detected stack: React, Vite, Node.js and Git, with four npm scripts ready to run">
                    <div className="panel-h"><span>Detected</span><small>storefront</small></div>
                    <div className="detected">
                        {detected.map((d) => <span key={d} className="pill">{d}</span>)}
                    </div>
                    <div className="panel-h sub"><span>Available commands</span><small>package.json</small></div>
                    <div className="cmds">
                        {commands.map((c) => (
                            <div key={c.cmd} className="cmd">
                                <code>{c.cmd}</code>
                                <small>{c.note}</small>
                                {c.running
                                    ? <span className="cmd-run on"><span className="st" />Running · :5173</span>
                                    : <span className="cmd-run">▶ Run</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/** "Git without the overhead." */
export function GitSection() {
    return (
        <section id="git">
            <div className="wrap two-col reverse">
                <div>
                    <p className="kicker">Git</p>
                    <h2>Git without the overhead.</h2>
                    <div className="prose">
                        <p>You still need to know what changed.</p>
                        <p>The workspace gives you quick access to your repository and the changes your agents are making.</p>
                        <p>Review modified files, inspect diffs, check your branch, and keep an eye on the state of your project without opening another application.</p>
                        <p>Your AI agent can write the code.</p>
                        <p className="pull">You still decide what gets shipped.</p>
                    </div>
                </div>
                <div className="panel" role="img" aria-label="Git panel on branch feat/discount-codes showing three changed files and a diff">
                    <div className="panel-h">
                        <span>Changes</span>
                        <span className="gitbar"><span className="chip blue">feat/discount-codes</span><span className="chip yellow">3 changed</span></span>
                    </div>
                    <div className="files">
                        <div className="file on"><span className="fs m">M</span>src/checkout/Summary.tsx<small>+4 −1</small></div>
                        <div className="file"><span className="fs a">A</span>src/checkout/DiscountField.tsx<small>+38</small></div>
                        <div className="file"><span className="fs a">A</span>src/checkout/DiscountField.test.tsx<small>+52</small></div>
                    </div>
                    <div className="diff">
                        <div className="h">src/checkout/Summary.tsx</div>
                        <div className="c">  &lt;LineItems items={"{items}"} /&gt;</div>
                        <div className="d">- &lt;Total value={"{subtotal}"} /&gt;</div>
                        <div className="a">+ &lt;DiscountField onApply={"{setDiscount}"} /&gt;</div>
                        <div className="a">+ &lt;Total value={"{subtotal - discount}"} /&gt;</div>
                    </div>
                    <div className="git-actions">
                        <span className="chip plain">Commit</span>
                        <span className="chip plain">Push</span>
                        <small>Agents never commit or push on their own.</small>
                    </div>
                </div>
            </div>
        </section>
    );
}

const integrations = [
    { name: "Linear", body: "See the tasks you're working on and keep development connected to your project backlog.", color: "#8b8ff8" },
    { name: "Notion", body: "Keep your documentation and project context close to your development workspace.", color: "#f4f4f6" },
    { name: "Git", body: "Work with repositories, branches and changes without leaving the application.", color: "#ff7a45" },
    { name: "Your existing AI tools", body: "Use the coding agents you already know rather than being locked into a proprietary agent.", color: "#59d499" },
];

/** "Connect the tools you already use." */
export function IntegrationsSection() {
    return (
        <section id="integrations">
            <div className="wrap">
                <div className="sec-head">
                    <p className="kicker">Integrations</p>
                    <h2>Connect the tools you already use.</h2>
                    <p>Your development workflow doesn&apos;t live inside your code editor. It lives across your project management, documentation, source control, terminal and browser. Bring the relevant context closer to the work.</p>
                </div>
                <div className="grid4">
                    {integrations.map((i) => (
                        <div key={i.name} className="card">
                            <span className="mono-badge" style={{ color: i.color }}>{i.name.charAt(0)}</span>
                            <h3>{i.name}</h3>
                            <p>{i.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const agentTools = [
    { name: "Claude Code", cmd: "claude", body: "Run Claude Code directly inside your project workspace." },
    { name: "Codex", cmd: "codex", body: "Use Codex alongside your other development sessions." },
    { name: "Cursor", cmd: "cursor-agent", body: "Keep Cursor-based workflows alongside the rest of your projects and tools." },
    { name: "More agents", cmd: "your-agent", body: "The workspace is designed around agent sessions rather than a single AI provider." },
];

/** "Use the AI coding tools you already trust." */
export function AgentToolsSection() {
    return (
        <section id="ai-tools">
            <div className="wrap">
                <div className="sec-head c">
                    <p className="kicker">Bring your own agent</p>
                    <h2>Use the AI coding tools you already trust.</h2>
                    <p>This isn&apos;t another AI model you have to learn. It&apos;s the workspace around your existing agents.</p>
                </div>
                <div className="grid4">
                    {agentTools.map((a) => (
                        <div key={a.name} className="card agent-card">
                            <code className="agent-cmd"><span>$</span> {a.cmd}</code>
                            <h3>{a.name}</h3>
                            <p>{a.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const audiences = [
    { title: "Freelance developers", body: "Keep client projects separated while running agents across several repositories." },
    { title: "Software agencies", body: "Work across multiple client projects without filling your desktop with terminals, browsers and editors." },
    { title: "Startup teams", body: "Move quickly between product work, bugs, experiments and infrastructure." },
    { title: "Indie hackers", body: "Keep your application, AI agents, preview and Git workflow in one place." },
    { title: "Full-stack developers", body: "Move between frontend, backend and infrastructure projects without losing context." },
    { title: "Developers working with AI agents", body: "If you already spend a large part of your day inside Claude Code, Codex, Cursor or other coding agents, this workspace is designed around the way you actually work." },
];

/** "Built for developers who work on multiple things at once." */
export function AudienceSection() {
    return (
        <section id="who">
            <div className="wrap">
                <div className="sec-head">
                    <p className="kicker">Who it&apos;s for</p>
                    <h2>Built for developers who work on multiple things at once.</h2>
                </div>
                <div className="grid3">
                    {audiences.map((a) => (
                        <div key={a.title} className="card">
                            <h3>{a.title}</h3>
                            <p>{a.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
