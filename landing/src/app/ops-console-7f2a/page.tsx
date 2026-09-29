import type { Metadata } from "next";
import { Panel } from "@/components/ui/panel";
import { AdminLoginForm } from "./_components/admin-login-form";

export const metadata: Metadata = {
    title: "Sign in",
    robots: { index: false, follow: false },
};

/** Bare, unbranded login for the hidden admin console — no nav, no marketing chrome. */
export default function AdminLoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Panel className="w-full max-w-sm p-6">
                <div className="mb-5 space-y-1">
                    <h2 className="text-lg font-medium">Admin sign in</h2>
                    <p className="text-[0.8125rem] text-muted-foreground">Restricted access.</p>
                </div>
                <AdminLoginForm />
            </Panel>
        </div>
    );
}
