import type { FC } from "react";
import { Panel } from "@/components/ui/panel";
import { AdminLoginForm } from "./components/admin-login-form";

/** Bare, unbranded login for the hidden admin console — no nav, no sign-up link. */
const AdminLoginPage: FC = () => {
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
};

export default AdminLoginPage;
