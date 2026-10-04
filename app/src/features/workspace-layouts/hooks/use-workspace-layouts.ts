import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";
import {
    createLayout,
    deleteLayout,
    getLayoutState,
    getLayouts,
    updateLayout,
    updateLayoutState,
    updateProjectDockLayout,
} from "../services/workspace-layouts.services";
import type {
    CreateLayoutDto,
    UpdateLayoutDto,
    UpdateLayoutStateDto,
    UpdateProjectDockLayoutDto,
    WorkspaceLayoutPreset,
    WorkspaceLayoutState,
} from "../interfaces/workspace-layouts.interfaces";

const LAYOUTS_KEY = ["workspace-layouts"];
const LAYOUT_STATE_KEY = ["workspace-layout-state"];

/** Mutation keys only. The functions and callbacks live in registerWorkspaceLayoutMutations (see config/query/mutation-defaults). */
export const WorkspaceLayoutMutationKeys = {
    create: ["workspace-layouts", "create"],
    /** Silent update: drag/resize autosaves. */
    update: ["workspace-layouts", "update"],
    /** Same write as `update`, but reports success with a toast. Picked by useUpdateLayout({ silent: false }). */
    updateWithToast: ["workspace-layouts", "update-with-toast"],
    delete: ["workspace-layouts", "delete"],
    updateState: ["workspace-layouts", "update-state"],
    updateProjectDock: ["workspace-layouts", "update-project-dock"],
} as const;

export const useGetLayouts = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: LAYOUTS_KEY, queryFn: getLayouts, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useGetLayoutState = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: LAYOUT_STATE_KEY, queryFn: getLayoutState, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useCreateLayout = () => useMutation<WorkspaceLayoutPreset, Error, CreateLayoutDto>({ mutationKey: WorkspaceLayoutMutationKeys.create });

/** Silent by default — dragging/resizing debounces into frequent saves that shouldn't toast each time. */
export const useUpdateLayout = (options?: { silent?: boolean }) =>
    useMutation<WorkspaceLayoutPreset, Error, { id: string; dto: UpdateLayoutDto }>({
        mutationKey: (options?.silent ?? true) ? WorkspaceLayoutMutationKeys.update : WorkspaceLayoutMutationKeys.updateWithToast,
    });

export const useDeleteLayout = () => useMutation<void, Error, string>({ mutationKey: WorkspaceLayoutMutationKeys.delete });

export const useUpdateLayoutState = () =>
    useMutation<WorkspaceLayoutState, Error, UpdateLayoutStateDto>({ mutationKey: WorkspaceLayoutMutationKeys.updateState });

/**
 * Background sync for a project's dock arrangement — the local Zustand store (`workspace.ts`) is
 * already the working copy, so a failed save here loses nothing locally and doesn't need a toast,
 * just enough to surface in the console for debugging.
 */
export const useUpdateProjectDockLayout = () =>
    useMutation<WorkspaceLayoutState, Error, UpdateProjectDockLayoutDto>({ mutationKey: WorkspaceLayoutMutationKeys.updateProjectDock });

export const registerWorkspaceLayoutMutations = (queryClient: QueryClient) => {
    const refreshLayouts = () => queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
    const refreshLayoutState = () => queryClient.invalidateQueries({ queryKey: LAYOUT_STATE_KEY });
    const reportFailure = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

    // Every layout write shares one scope so they replay in the order they were made.
    const scope = { id: "workspace-layouts" };

    queryClient.setMutationDefaults(WorkspaceLayoutMutationKeys.create, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: createLayout,
        onSuccess: (preset: WorkspaceLayoutPreset) => {
            refreshLayouts();
            toast({ title: `Saved layout "${preset.name}"`, duration: 2000 });
        },
        onError: reportFailure("Could not save layout"),
    });

    queryClient.setMutationDefaults(WorkspaceLayoutMutationKeys.update, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateLayout,
        onSuccess: () => refreshLayouts(),
        onError: reportFailure("Could not save layout"),
    });

    queryClient.setMutationDefaults(WorkspaceLayoutMutationKeys.updateWithToast, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateLayout,
        onSuccess: (preset: WorkspaceLayoutPreset) => {
            refreshLayouts();
            toast({ title: `Updated "${preset.name}"`, duration: 1500 });
        },
        onError: reportFailure("Could not save layout"),
    });

    queryClient.setMutationDefaults(WorkspaceLayoutMutationKeys.delete, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: deleteLayout,
        onSuccess: () => {
            refreshLayouts();
            refreshLayoutState();
            toast({ title: "Layout deleted", duration: 1500 });
        },
        onError: reportFailure("Could not delete layout"),
    });

    queryClient.setMutationDefaults(WorkspaceLayoutMutationKeys.updateState, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateLayoutState,
        onSuccess: () => refreshLayoutState(),
        onError: reportFailure("Could not save layout state"),
    });

    queryClient.setMutationDefaults(WorkspaceLayoutMutationKeys.updateProjectDock, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateProjectDockLayout,
        onSuccess: (state: WorkspaceLayoutState) => queryClient.setQueryData(LAYOUT_STATE_KEY, state),
        onError: (error: Error) => console.error("Failed to sync project dock layout", error),
    });
};
