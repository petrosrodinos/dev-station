import { PermissionKeys, type AccessRequirement } from "@/features/organizations/interfaces/organizations.interfaces";

export const ProjectTabs = {
    OVERVIEW: "overview",
    GIT: "git",
    FILES: "files",
    TERMINAL: "terminal",
    SESSIONS: "sessions",
    SKILLS: "skills",
    INTEGRATIONS: "integrations",
} as const;
export type ProjectTab = (typeof ProjectTabs)[keyof typeof ProjectTabs];

/** `permission` decides whether the tab is listed and reachable by deep link. */
export const ProjectTabOptions: { id: ProjectTab; label: string; permission?: AccessRequirement }[] = [
    { id: ProjectTabs.OVERVIEW, label: "Overview" },
    { id: ProjectTabs.GIT, label: "Git", permission: PermissionKeys.GIT_VIEW_CHANGES },
    { id: ProjectTabs.FILES, label: "Files" },
    { id: ProjectTabs.TERMINAL, label: "Terminal", permission: PermissionKeys.PROJECTS_EDIT },
    { id: ProjectTabs.SESSIONS, label: "AI Sessions", permission: PermissionKeys.AI_USE_AGENTS },
    { id: ProjectTabs.SKILLS, label: "Skills", permission: PermissionKeys.AI_USE_AGENTS },
    { id: ProjectTabs.INTEGRATIONS, label: "Integrations", permission: PermissionKeys.INTEGRATIONS_VIEW },
];
