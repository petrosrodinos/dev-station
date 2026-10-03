"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { AppLogo } from "./app-logo";

const signInUrl = `${environments.appUrl}${Routes.app.signIn}`;

/** Sticky top nav shared by every page on the marketing site. */
export function SiteNav() {
    const pathname = usePathname();

    return (
        <nav>
            <div className="wrap">
                <Link className="logo" href={Routes.home} aria-label="Dev Station home">
                    <AppLogo />
                    Dev Station
                </Link>
                <div className="nav-links">
                    <Link href={`${Routes.home}#workspace`}>Workspace</Link>
                    <Link href={`${Routes.home}#agents`}>Agents</Link>
                    <Link href={`${Routes.home}#how-it-works`}>How it works</Link>
                    <Link href={`${Routes.home}#integrations`}>Integrations</Link>
                    <Link href={`${Routes.home}#faq`}>FAQ</Link>
                </div>
                <div className="nav-cta">
                    <a className="btn btn-ghost nav-signin" href={signInUrl}>Sign in</a>
                    <Link className={cn("btn btn-primary", pathname === Routes.downloads && "is-current")} href={Routes.downloads}>
                        Download
                    </Link>
                </div>
            </div>
        </nav>
    );
}
