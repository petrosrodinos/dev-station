import Link from "next/link";
import type { CSSProperties } from "react";
import { Routes } from "@/routes/routes";

const sessionTabs = [
    { label: "storefront · Claude Code", color: "#ff6161", state: "working", active: true },
    { label: "api · Cursor", color: "#57c1ff", state: "input" },
    { label: "docs · Codex", color: "#59d499", state: "done" },
];

export function Hero() {
    return (
        <header className="wrap hero">
            <span className="eyebrow"><b>Free</b> Desktop app for Windows, macOS and Linux</span>
            <h1>A better workspace for building with <em>AI coding agents.</em></h1>
            <p className="lead">
                Run multiple projects, coding agents, terminals, and app previews from one focused desktop workspace.
            </p>
            <p className="lead lead-sub">
                Stop jumping between your editor, terminal, browser, Git, project scripts, and AI tools. Keep the parts you
                actually use together and move between them with your keyboard.
            </p>
            <div className="cta">
                <Link className="btn btn-primary btn-lg" href={Routes.downloads}>Download for free</Link>
                <a className="btn btn-ghost btn-lg" href="#how-it-works">Watch how it works</a>
            </div>
            <p className="fine">Works with Claude Code, Codex, Cursor, and other command-line coding agents.</p>

            <div className="stage">
                <div className="win" role="img" aria-label="Dev Station with a project rail, color-coded agent session tabs, a Claude Code session on the left and a live app preview on the right">
                    <div className="win-bar">
                        <span className="lights" aria-hidden="true"><i /><i /><i /></span>
                        <div className="win-tabs">
                            {sessionTabs.map((t) => (
                                <span key={t.label} className={`stab${t.active ? " on" : ""}`} style={{ "--c": t.color } as CSSProperties}>
                                    <i className={`sd ${t.state}`} />{t.label}
                                </span>
                            ))}
                        </div>
                        <span className="win-kbd"><kbd>Ctrl</kbd><kbd>K</kbd></span>
                    </div>
                    <div className="win-body">
                        <div className="rail" aria-hidden="true">
                            <span className="pdot on" style={{ background: "#ff6161", "--c": "#ff6161" } as CSSProperties}>SF<span className="b y" /></span>
                            <span className="pdot" style={{ background: "#57c1ff" }}>AP<span className="b r" /></span>
                            <span className="pdot" style={{ background: "#59d499" }}>DC<span className="b" /></span>
                            <span className="pdot" style={{ background: "#ffc533" }}>MB</span>
                            <span className="sep" />
                            <span className="pdot add">+</span>
                        </div>
                        <div className="split">
                            <div className="pane">
                                <div className="pane-h"><span>Agent</span><small>Claude Code · storefront</small></div>
                                <div className="term">
                                    <span className="m">›</span> <span className="w">Add a discount code field to the checkout summary</span><br />
                                    <span className="b">●</span> Reading <span className="w">src/checkout/Summary.tsx</span><br />
                                    <span className="b">●</span> Editing <span className="w">src/checkout/DiscountField.tsx</span><br />
                                    <span className="g">✓</span> Added field, validation and 3 tests<br />
                                    <span className="g">✓</span> npm run test <span className="m">· 42 passed</span><br />
                                    <span className="y">?</span> <span className="w">Should invalid codes clear the field?</span><span className="caret" />
                                </div>
                            </div>
                            <div className="pane">
                                <div className="pane-h"><span>Preview</span><small>localhost:5173/checkout</small></div>
                                <div className="browser">
                                    <div className="url"><span className="st" />localhost:5173/checkout</div>
                                    <div className="site">
                                        <div className="site-row"><span>Linen shirt</span><span>$68.00</span></div>
                                        <div className="site-row"><span>Canvas tote</span><span>$24.00</span></div>
                                        <div className="site-field"><span>Discount code</span><b>Apply</b></div>
                                        <div className="site-row total"><span>Total</span><span>$92.00</span></div>
                                        <div className="site-btn">Checkout</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
