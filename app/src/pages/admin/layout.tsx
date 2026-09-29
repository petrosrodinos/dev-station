import type { FC } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { to: Routes.admin.overview, label: "Overview" },
    { to: Routes.admin.users, label: "Users" },
    { to: Routes.admin.releases, label: "Releases" },
];

/** Shell for the hidden admin console — no sidebar/dock, just a tab bar and sign-out. */
const AdminLayout: FC = () => {
    const logout = useAuthStore((s) => s.logout);
    const resetWorkspace = useWorkspaceStore((s) => s.reset);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Signing out of the admin console must return to the hidden admin login,
    // never the normal /auth/sign-in (that would leak the "there's an admin area" hint).
    const signOut = () => {
        logout();
        resetWorkspace();
        queryClient.clear();
        navigate(Routes.admin.login, { replace: true });
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="flex items-center justify-between border-b px-4 py-3">
                <nav className="flex items-center gap-1">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    "rounded-md px-3 py-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground",
                                    isActive && "bg-muted text-foreground",
                                )
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                    <LogOut className="size-4" />
                    Sign out
                </Button>
            </header>
            <main className="p-4">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
