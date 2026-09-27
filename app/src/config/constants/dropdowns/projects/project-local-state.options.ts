import { ProjectLocalStates, type ProjectLocalState } from "@shared/contract";

export const ProjectLocalStateOptions: { id: ProjectLocalState; label: string }[] = [
    { id: ProjectLocalStates.LOCAL, label: "Local" },
    { id: ProjectLocalStates.IMPORTED, label: "Not set up on this device" },
    { id: ProjectLocalStates.MISSING, label: "Folder missing" },
];

export const ProjectLocalStateDescriptionOptions: { id: ProjectLocalState; description: string }[] = [
    { id: ProjectLocalStates.LOCAL, description: "The repository is cloned on this device." },
    { id: ProjectLocalStates.IMPORTED, description: "This project exists in your organization but has no local clone on this device yet." },
    { id: ProjectLocalStates.MISSING, description: "This device had a local folder for the project, but it no longer exists." },
];

export function getProjectLocalStateDescription(state: ProjectLocalState): string {
    return ProjectLocalStateDescriptionOptions.find((o) => o.id === state)?.description ?? "";
}
