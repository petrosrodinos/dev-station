export const PermissionKeys = {
    PROJECTS_VIEW: "PROJECTS_VIEW",
    PROJECTS_CREATE: "PROJECTS_CREATE",
    PROJECTS_EDIT: "PROJECTS_EDIT",
    PROJECTS_DELETE: "PROJECTS_DELETE",
    GIT_VIEW_CHANGES: "GIT_VIEW_CHANGES",
    GIT_COMMIT: "GIT_COMMIT",
    GIT_PUSH: "GIT_PUSH",
    GIT_MANAGE_BRANCHES: "GIT_MANAGE_BRANCHES",
    AI_START_AGENTS: "AI_START_AGENTS",
    AI_USE_AGENTS: "AI_USE_AGENTS",
    INTEGRATIONS_VIEW: "INTEGRATIONS_VIEW",
    INTEGRATIONS_CONNECT: "INTEGRATIONS_CONNECT",
    INTEGRATIONS_DISCONNECT: "INTEGRATIONS_DISCONNECT",
    INTEGRATIONS_MANAGE: "INTEGRATIONS_MANAGE",
    ORG_MANAGE_MEMBERS: "ORG_MANAGE_MEMBERS",
    ORG_MANAGE_ROLES: "ORG_MANAGE_ROLES",
    ORG_MANAGE_SETTINGS: "ORG_MANAGE_SETTINGS",
} as const;
export type PermissionKey = (typeof PermissionKeys)[keyof typeof PermissionKeys];

export const SystemRoleKeys = {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    DEVELOPER: "DEVELOPER",
    VIEWER: "VIEWER",
    CUSTOM: "CUSTOM",
} as const;
export type SystemRoleKey = (typeof SystemRoleKeys)[keyof typeof SystemRoleKeys];

export interface RoleSummary {
    id: string;
    name: string;
    key: SystemRoleKey;
}

export interface OrganizationSummary {
    id: string;
    name: string;
    slug: string;
    role: RoleSummary;
    permissions: PermissionKey[];
}

export interface OrganizationMember {
    id: string;
    user: { id: string; email: string; full_name: string | null; avatar_url: string | null };
    role: RoleSummary;
    status: "ACTIVE" | "SUSPENDED";
    joined_at: string;
}

export interface OrganizationInvitation {
    id: string;
    email: string;
    role: RoleSummary;
    expires_at: string;
    created_at: string;
}

export interface CreateInvitationResponse {
    invitation: OrganizationInvitation;
    token: string;
}

export interface Role extends RoleSummary {
    description: string | null;
    is_system: boolean;
    permissions: PermissionKey[];
    member_count: number;
}

export interface PermissionCatalogItem {
    key: PermissionKey;
    group: string;
    label: string;
}

export interface CreateOrganizationDto {
    name: string;
}

export interface CreateInvitationDto {
    email: string;
    role_id: string;
}

export interface CreateRoleDto {
    name: string;
    description?: string;
    permissions: PermissionKey[];
}

export type UpdateRoleDto = Partial<CreateRoleDto>;
