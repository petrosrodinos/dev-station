import type { FC, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import type { AccessRequirement } from "@/features/organizations/interfaces/organizations.interfaces";
import { Routes } from "@/routes/routes";

interface RequirePermissionProps {
    permission: AccessRequirement;
    /** Where to send callers who lack the permission. */
    redirectTo?: string;
    children: ReactNode;
}

/** Route/screen guard: blocks deep links to areas the caller may not use. */
export const RequirePermission: FC<RequirePermissionProps> = ({ permission, redirectTo = Routes.workspace.root, children }) => {
    const { ready, can } = usePermissions();
    if (!ready) return <Skeleton className="m-6 h-40 w-full max-w-3xl" />;
    if (!can(permission)) return <Navigate to={redirectTo} replace />;
    return <>{children}</>;
};
