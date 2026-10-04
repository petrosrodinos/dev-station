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
