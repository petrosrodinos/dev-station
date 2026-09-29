import type { RoleType } from "@/features/user/interfaces/user.interface";

export interface AdminSignupsByDay {
    date: string;
    count: number;
}

export interface AdminStats {
    total_users: number;
    new_users_this_week: number;
    new_users_this_month: number;
    active_agent_sessions: number;
    signups_last_30_days: AdminSignupsByDay[];
}

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: RoleType;
    created_at: string;
}

export interface AdminUsersQuery {
    search?: string;
    role?: RoleType;
    page?: number;
    limit?: number;
}

export interface AdminRelease {
    platform: string;
    version: string;
    download_url: string;
    min_version: string | null;
    release_notes: string | null;
    download_count: number;
    published_at: string;
    updated_at: string;
}

export interface UpdateReleaseLimits {
    min_version?: string;
    release_notes?: string;
}

export interface AdminInstallsByVersion {
    platform: string;
    app_version: string;
    count: number;
}

export interface AdminInstallAdoption {
    total_devices: number;
    active_last_7_days: number;
    active_last_30_days: number;
    by_version: AdminInstallsByVersion[];
}
