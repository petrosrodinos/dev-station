import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_RAIL_POSITION, RailPositionOptions, type RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { toast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/stores/workspace";
import { updatePreferences } from "../services/users.services";
import type { UserPreference } from "../interfaces/users.interfaces";
import { useGetPreferences } from "./use-users";

const PREFERENCES_KEY = ["preferences"];
const isRailPosition = (value: unknown): value is RailPosition => RailPositionOptions.some((o) => o.id === value);

/**
 * Where the project rail (sidebar) is docked. The account preference is the source of truth across
 * devices; a move also applies immediately on this device, and stays applied if the save fails.
 */
export const useRailPosition = () => {
    const { data: preferences } = useGetPreferences();
    const local = useWorkspaceStore((s) => s.rail_position);
    const setLocal = useWorkspaceStore((s) => s.setRailPosition);
    const queryClient = useQueryClient();
    const { mutate } = useMutation({
        mutationFn: (position: RailPosition) => updatePreferences({ rail_position: position }),
        onSuccess: (saved) => {
            const previous = queryClient.getQueryData<UserPreference>(PREFERENCES_KEY);
            if (previous) queryClient.setQueryData<UserPreference>(PREFERENCES_KEY, { ...previous, rail_position: saved.rail_position });
        },
        onError: (error: Error) => toast({ title: "Moved, but not saved to your account", description: error.message, variant: "error" }),
    });

    const position = local ?? (isRailPosition(preferences?.rail_position) ? preferences.rail_position : DEFAULT_RAIL_POSITION);
    const setPosition = useCallback(
        (next: RailPosition) => {
            setLocal(next);
            mutate(next);
        },
        [mutate, setLocal],
    );
    return { position, setPosition };
};
