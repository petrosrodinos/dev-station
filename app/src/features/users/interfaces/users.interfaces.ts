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

export interface ChangePasswordDto {
    current_password: string;
    new_password: string;
}

export interface UpdateMeDto {
    full_name?: string;
    avatar_url?: string | null;
}

export const NotificationEventTypes = {
    AGENT_FINISHED: "AGENT_FINISHED",
    AGENT_AWAITING_INPUT: "AGENT_AWAITING_INPUT",
    AGENT_CRASHED: "AGENT_CRASHED",
    SERVICE_CRASHED: "SERVICE_CRASHED",
    GIT_COMMIT: "GIT_COMMIT",
    GIT_PUSH: "GIT_PUSH",
    GIT_PULL: "GIT_PULL",
} as const;
export type NotificationEventType = (typeof NotificationEventTypes)[keyof typeof NotificationEventTypes];

export const NotificationChannels = {
    BADGE: "badge",
    FEED: "feed",
    OS: "os",
    TOAST: "toast",
    SOUND: "sound",
} as const;
export type NotificationChannel = (typeof NotificationChannels)[keyof typeof NotificationChannels];

export type NotificationChannelFlags = Record<NotificationChannel, boolean>;

export interface NotificationSettings {
    enabled: boolean;
    events: Record<NotificationEventType, NotificationChannelFlags>;
}

export const CustomShortcutTypes = {
    ACTION: "action",
    AI_PROMPT: "ai_prompt",
} as const;
export type CustomShortcutType = (typeof CustomShortcutTypes)[keyof typeof CustomShortcutTypes];

export interface CustomShortcut {
    id: string;
    name: string;
    combo: string;
    type: CustomShortcutType;
    action_id?: string;
    prompt?: string;
}

export interface ShortcutSettings {
    /** Combo overrides keyed by action id; a missing action uses its default binding. */
    bindings: Record<string, string>;
    custom: CustomShortcut[];
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
    rail_position: string;
    notification_settings: NotificationSettings;
    shortcut_settings: ShortcutSettings;
}

export interface UpdateNotificationSettingsDto {
    enabled?: boolean;
    events?: Partial<Record<NotificationEventType, Partial<NotificationChannelFlags>>>;
}

export type UpdatePreferenceDto = Partial<Omit<UserPreference, "id" | "user_id" | "notification_settings">> & {
    notification_settings?: UpdateNotificationSettingsDto;
};
