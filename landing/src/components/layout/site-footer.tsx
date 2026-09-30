import Link from "next/link";
import { Routes } from "@/routes/routes";

/** Footer shared by every page on the marketing site. */
export function SiteFooter() {
    return (
        <footer>
            <div className="wrap">
                <div>
                    <Link className="logo" href={Routes.home}>
                        <svg viewBox="0 0 24 24" fill="none">
                            <rect x="1" y="1" width="22" height="22" rx="6" fill="#121212" stroke="#242728" />
                            <path d="M6 8l4 4-4 4" stroke="#ff6161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12.5 16H18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Dev Station
                    </Link>
                    <p className="tag">One workspace for client projects, dev services, AI agents and Git.</p>
                </div>
                <div className="cols2">
                    <div>
                        <h5>Product</h5>
                        <ul>
                            <li><Link href={`${Routes.home}#workspace`}>Workspace</Link></li>
                            <li><Link href={`${Routes.home}#features`}>Features</Link></li>
                            <li><Link href={`${Routes.home}#workflow`}>Workflow</Link></li>
                            <li><Link href={Routes.downloads}>Download</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5>Integrations</h5>
                        <ul>
                            <li><Link href={`${Routes.home}#integrations`}>GitHub</Link></li>
                            <li><Link href={`${Routes.home}#integrations`}>Linear</Link></li>
                            <li><Link href={`${Routes.home}#integrations`}>Notion</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5>Agents</h5>
                        <ul>
                            <li><Link href={`${Routes.home}#features`}>Claude Code</Link></li>
                            <li><Link href={`${Routes.home}#features`}>Cursor CLI</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
