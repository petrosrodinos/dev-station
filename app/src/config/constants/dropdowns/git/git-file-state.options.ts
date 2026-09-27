import type { GitFileState } from "@shared/contract";

export const GitFileStateOptions: { id: GitFileState; label: string }[] = [
    { id: "M", label: "Modified" },
    { id: "A", label: "Added" },
    { id: "D", label: "Deleted" },
    { id: "R", label: "Renamed" },
    { id: "U", label: "Untracked" },
    { id: "C", label: "Conflicted" },
];
