import type { FC, ReactNode } from "react";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import type { AccessRequirement } from "@/features/organizations/interfaces/organizations.interfaces";

interface CanProps {
    permission: AccessRequirement;
    /** Rendered when the caller lacks the permission (default: nothing). */
    fallback?: ReactNode;
    children: ReactNode;
}

/** Renders children only when the caller satisfies the requirement. */
export const Can: FC<CanProps> = ({ permission, fallback = null, children }) => {
    const { can } = usePermissions();
    return <>{can(permission) ? children : fallback}</>;
};
