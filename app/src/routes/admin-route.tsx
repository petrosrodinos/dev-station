import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { RoleTypes } from "@/features/user/interfaces/user.interface";

const ADMIN_ROLES: string[] = [RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN, RoleTypes.SUPPORT];

/** Guards the hidden admin console — signed in AND one of the admin-capable roles. */
export default function AdminRoute({ children }: { children: ReactNode }) {
    const isLoggedIn = useAuthStore((s) => Boolean(s.isLoggedIn && s.access_token));
    const role = useAuthStore((s) => s.role);

    if (!isLoggedIn || !role || !ADMIN_ROLES.includes(role)) {
        return <Navigate to={Routes.admin.login} replace />;
    }

    return <>{children}</>;
}
