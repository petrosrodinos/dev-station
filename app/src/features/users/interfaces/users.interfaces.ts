import type { OrganizationSummary } from "@/features/organizations/interfaces/organizations.interfaces";
import type { AgentType } from "@shared/contract";

export interface Me {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    organizations: OrganizationSummary[];
}

export interface UpdateMeDto {
    full_name?: string;
    avatar_url?: string | null;
}

export interface UserPreference {
    id: string;
    user_id: string;
    active_organization_id: string | null;
    preferred_agent: AgentType;
    default_branch: string;
    idle_threshold_seconds: number;
    confirm_destructive: boolean;
    theme: string;
    theme_preset: string;
    accent_color: string | null;
    font_size: number;
    font_family: string;
    mono_font_family: string;
}

export type UpdatePreferenceDto = Partial<Omit<UserPreference, "id" | "user_id">>;
