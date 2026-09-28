import { PermissionKeys, type AccessRequirement } from "@/features/organizations/interfaces/organizations.interfaces";

export const SettingsSections = {
    GENERAL: "general",
    THEME: "theme",
    GIT: "git",
    AI: "ai",
    INTEGRATIONS: "integrations",
    ORGANIZATION: "organization",
    ACCOUNT: "account",
} as const;
export type SettingsSection = (typeof SettingsSections)[keyof typeof SettingsSections];

/** `permission` decides whether the section is listed and reachable by deep link. */
export const SettingsSectionOptions: { id: SettingsSection; label: string; permission?: AccessRequirement }[] = [
    { id: SettingsSections.GENERAL, label: "General" },
    { id: SettingsSections.THEME, label: "Theme" },
    { id: SettingsSections.GIT, label: "Git" },
    { id: SettingsSections.AI, label: "AI" },
    { id: SettingsSections.INTEGRATIONS, label: "Integrations", permission: PermissionKeys.INTEGRATIONS_VIEW },
    { id: SettingsSections.ORGANIZATION, label: "Organization" },
    { id: SettingsSections.ACCOUNT, label: "Account" },
];
