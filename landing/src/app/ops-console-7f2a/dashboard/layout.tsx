"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { useAdminSignOut } from "@/features/auth/hooks/use-auth";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import { cn } from "@/lib/utils";

const ADMIN_ROLES: string[] = [RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN, RoleTypes.SUPPORT];

const NAV_ITEMS = [
    { to: Routes.admin.overview, label: "Overview" },
    { to: Routes.admin.users, label: "Users" },
    { to: Routes.admin.releases, label: "Releases" },
];

/** Shell for the hidden admin console — no marketing nav, just a tab bar and sign-out. */
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    // zustand persist's own `hydrated` flag (set from onRehydrateStorage) isn't firing reliably
    // here, so gate on a plain post-mount flag instead — it only ever runs client-side, which is
    // exactly the guarantee we actually need (avoid an SSR/client render mismatch).
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only-mount flag, the standard pattern for this
    useEffect(() => setMounted(true), []);

    const isLoggedIn = useAuthStore((s) => Boolean(s.isLoggedIn && s.access_token));
    const role = useAuthStore((s) => s.role);
    const router = useRouter();
    const pathname = usePathname();
    const signOut = useAdminSignOut();

    const allowed = isLoggedIn && !!role && ADMIN_ROLES.includes(role);

    useEffect(() => {
        if (mounted && !allowed) router.replace(Routes.admin.login);
    }, [mounted, allowed, router]);

    if (!mounted || !allowed) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="flex items-center justify-between border-b px-4 py-3">
                <nav className="flex items-center gap-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.to}
                            href={item.to}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground",
                                pathname === item.to && "bg-muted text-foreground",
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                    <LogOut className="size-4" />
                    Sign out
                </Button>
            </header>
            <main className="p-4">{children}</main>
        </div>
    );
}
