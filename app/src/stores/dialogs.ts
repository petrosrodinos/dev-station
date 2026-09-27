import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { LinearIssue } from "@/features/integrations/interfaces/integrations.interfaces";

// Open/close state for app-wide dialogs that can be triggered from anywhere in the shell
// (tab strip "+", project overview, Linear "Work on issue", command palette…).

export interface NewSessionDialogState {
    open: boolean;
    project_id: string | null;
    issue: LinearIssue | null;
    /** Pre-filled prompt (e.g. Notion documentation passed as context). */
    initial_prompt: string | null;
}

export interface ProjectDialogState {
    open: boolean;
    /** null = create a new project, otherwise edit this project. */
    project_id: string | null;
}

interface DialogsState {
    new_session: NewSessionDialogState;
    project: ProjectDialogState;
    command_palette: boolean;
}

interface DialogsActions {
    openNewSession(input?: { project_id?: string | null; issue?: LinearIssue | null; initial_prompt?: string | null }): void;
    closeNewSession(): void;
    openProjectDialog(projectId?: string | null): void;
    closeProjectDialog(): void;
    setCommandPalette(open: boolean): void;
}

const STORE_KEY = "dialogs";

export const useDialogsStore = create<DialogsState & DialogsActions>()(
    devtools(
        persist(
            (set) => ({
                new_session: { open: false, project_id: null, issue: null, initial_prompt: null },
                project: { open: false, project_id: null },
                command_palette: false,
                openNewSession: (input) =>
                    set({ new_session: { open: true, project_id: input?.project_id ?? null, issue: input?.issue ?? null, initial_prompt: input?.initial_prompt ?? null } }),
                closeNewSession: () => set((s) => ({ new_session: { ...s.new_session, open: false } })),
                openProjectDialog: (projectId) => set({ project: { open: true, project_id: projectId ?? null } }),
                closeProjectDialog: () => set((s) => ({ project: { ...s.project, open: false } })),
                setCommandPalette: (open) => set({ command_palette: open }),
            }),
            { name: STORE_KEY, partialize: () => ({}) },
        ),
    ),
);

export const getDialogsStoreState = () => useDialogsStore.getState();
