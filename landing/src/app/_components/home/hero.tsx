import Link from "next/link";
import { Routes } from "@/routes/routes";
import { AppPreview } from "./app-preview";

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
                <AppPreview />
                <p className="ds-hint"><b>Try it:</b> switch projects, drag tabs into a split, move the AI panel by its header, resize the dividers and review what the agents did.</p>
            </div>
        </header>
    );
}
