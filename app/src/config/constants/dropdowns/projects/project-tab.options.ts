export const ProjectTabs = {
    OVERVIEW: "overview",
    GIT: "git",
    FILES: "files",
    TERMINAL: "terminal",
    SESSIONS: "sessions",
    LINEAR: "linear",
    NOTION: "notion",
} as const;
export type ProjectTab = (typeof ProjectTabs)[keyof typeof ProjectTabs];

export const ProjectTabOptions: { id: ProjectTab; label: string }[] = [
    { id: ProjectTabs.OVERVIEW, label: "Overview" },
    { id: ProjectTabs.GIT, label: "Git" },
    { id: ProjectTabs.FILES, label: "Files" },
    { id: ProjectTabs.TERMINAL, label: "Terminal" },
    { id: ProjectTabs.SESSIONS, label: "AI Sessions" },
    { id: ProjectTabs.LINEAR, label: "Linear" },
    { id: ProjectTabs.NOTION, label: "Notion" },
];
