export const ProjectIntegrations = {
    LINEAR: "linear",
    NOTION: "notion",
} as const;
export type ProjectIntegration = (typeof ProjectIntegrations)[keyof typeof ProjectIntegrations];

export const ProjectIntegrationOptions: { id: ProjectIntegration; label: string }[] = [
    { id: ProjectIntegrations.LINEAR, label: "Linear" },
    { id: ProjectIntegrations.NOTION, label: "Notion" },
];
