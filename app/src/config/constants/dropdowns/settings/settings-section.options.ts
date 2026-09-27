export const SettingsSections = {
    GENERAL: "general",
    GIT: "git",
    AI: "ai",
    INTEGRATIONS: "integrations",
    ORGANIZATION: "organization",
    ACCOUNT: "account",
} as const;
export type SettingsSection = (typeof SettingsSections)[keyof typeof SettingsSections];

export const SettingsSectionOptions: { id: SettingsSection; label: string }[] = [
    { id: SettingsSections.GENERAL, label: "General" },
    { id: SettingsSections.GIT, label: "Git" },
    { id: SettingsSections.AI, label: "AI" },
    { id: SettingsSections.INTEGRATIONS, label: "Integrations" },
    { id: SettingsSections.ORGANIZATION, label: "Organization" },
    { id: SettingsSections.ACCOUNT, label: "Account" },
];
