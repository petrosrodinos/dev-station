import { SystemRoleKeys, type SystemRoleKey } from "@/features/organizations/interfaces/organizations.interfaces";

export const RoleKeyOptions: { id: SystemRoleKey; label: string }[] = [
    { id: SystemRoleKeys.OWNER, label: "Owner" },
    { id: SystemRoleKeys.ADMIN, label: "Admin" },
    { id: SystemRoleKeys.MANAGER, label: "Manager" },
    { id: SystemRoleKeys.DEVELOPER, label: "Developer" },
    { id: SystemRoleKeys.VIEWER, label: "Viewer" },
    { id: SystemRoleKeys.CUSTOM, label: "Custom" },
];
