import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import {
    createLayout,
    deleteLayout,
    getLayoutState,
    getLayouts,
    updateLayout,
    updateLayoutState,
} from "../services/workspace-layouts.services";

const LAYOUTS_KEY = ["workspace-layouts"];
const LAYOUT_STATE_KEY = ["workspace-layout-state"];

export const useGetLayouts = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: LAYOUTS_KEY, queryFn: getLayouts, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useGetLayoutState = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: LAYOUT_STATE_KEY, queryFn: getLayoutState, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useCreateLayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createLayout,
        onSuccess: (preset) => {
            queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
            toast({ title: `Saved layout "${preset.name}"`, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not save layout", description: error.message, variant: "error" }),
    });
};

/** Silent by default — dragging/resizing debounces into frequent saves that shouldn't toast each time. */
export const useUpdateLayout = (options?: { silent?: boolean }) => {
    const queryClient = useQueryClient();
    const silent = options?.silent ?? true;
    return useMutation({
        mutationFn: updateLayout,
        onSuccess: (preset) => {
            queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
            if (!silent) toast({ title: `Updated "${preset.name}"`, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save layout", description: error.message, variant: "error" }),
    });
};

export const useDeleteLayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteLayout,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LAYOUTS_KEY });
            queryClient.invalidateQueries({ queryKey: LAYOUT_STATE_KEY });
            toast({ title: "Layout deleted", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not delete layout", description: error.message, variant: "error" }),
    });
};

export const useUpdateLayoutState = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateLayoutState,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LAYOUT_STATE_KEY }),
        onError: (error: Error) => toast({ title: "Could not save layout state", description: error.message, variant: "error" }),
    });
};
