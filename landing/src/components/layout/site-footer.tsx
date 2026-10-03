import Link from "next/link";
import { Routes } from "@/routes/routes";
import { AppLogo } from "./app-logo";

/** Footer shared by every page on the marketing site. */
export function SiteFooter() {
    return (
        <footer>
            <div className="wrap">
                <div>
                    <Link className="logo" href={Routes.home}>
                        <AppLogo />
                        Dev Station
                    </Link>
                    {/* Plain, factual product description for search engines and AI answer engines. */}
                    <p className="tag">
                        Dev Station is a desktop development workspace for developers who use AI coding agents. It lets you manage
                        multiple projects and agent sessions, run project scripts, view local application previews, work with Git,
                        and connect tools such as Linear and Notion from one workspace. It works with existing coding agents
                        including Claude Code, Codex and Cursor.
                    </p>
                </div>
                <div className="cols2">
                    <div>
                        <h5>Product</h5>
                        <ul>
                            <li><Link href={`${Routes.home}#workspace`}>Workspace</Link></li>
                            <li><Link href={`${Routes.home}#preview`}>Live preview</Link></li>
                            <li><Link href={`${Routes.home}#how-it-works`}>How it works</Link></li>
                            <li><Link href={`${Routes.home}#faq`}>FAQ</Link></li>
                            <li><Link href={Routes.downloads}>Download</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5>Agents</h5>
                        <ul>
                            <li><Link href={`${Routes.home}#agents`}>Claude Code</Link></li>
                            <li><Link href={`${Routes.home}#agents`}>Codex</Link></li>
                            <li><Link href={`${Routes.home}#agents`}>Cursor</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5>Integrations</h5>
                        <ul>
                            <li><Link href={`${Routes.home}#integrations`}>Git</Link></li>
                            <li><Link href={`${Routes.home}#integrations`}>Linear</Link></li>
                            <li><Link href={`${Routes.home}#integrations`}>Notion</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
