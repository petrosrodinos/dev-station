"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";

const signInUrl = `${environments.appUrl}${Routes.app.signIn}`;
const signUpUrl = `${environments.appUrl}${Routes.app.signUp}`;

/** Sticky top nav shared by every page on the marketing site. */
export function SiteNav() {
    const pathname = usePathname();

    return (
        <nav>
            <div className="wrap">
                <Link className="logo" href={Routes.home} aria-label="Dev Station home">
                    <svg viewBox="0 0 24 24" fill="none">
                        <rect x="1" y="1" width="22" height="22" rx="6" fill="#121212" stroke="#242728" />
                        <path d="M6 8l4 4-4 4" stroke="#ff6161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12.5 16H18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Dev Station
                </Link>
                <div className="nav-links">
                    <Link href={`${Routes.home}#workspace`}>Workspace</Link>
                    <Link href={`${Routes.home}#features`}>Features</Link>
                    <Link href={`${Routes.home}#workflow`}>Workflow</Link>
                    <Link href={`${Routes.home}#integrations`}>Integrations</Link>
                    <Link href={Routes.downloads} className={cn(pathname === Routes.downloads && "active")}>
                        Download
                    </Link>
                </div>
                <div className="nav-cta">
                    <a className="btn btn-ghost" href={signInUrl}>Sign in</a>
                    <a className="btn btn-primary" href={signUpUrl}>Sign up</a>
                </div>
            </div>
        </nav>
    );
}
