import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_RAIL_POSITION, RailPositionOptions, type RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { toast } from "@/hooks/use-toast";
import { updatePreferences } from "../services/users.services";
import type { UserPreference } from "../interfaces/users.interfaces";
import { useGetPreferences } from "./use-users";

const PREFERENCES_KEY = ["preferences"];

/** Where the project rail (sidebar) is docked. Stored on the account so it follows the user across devices. */
export const useRailPosition = () => {
    const { data: preferences } = useGetPreferences();
    const queryClient = useQueryClient();
    const { mutate } = useMutation({
        mutationFn: (position: RailPosition) => updatePreferences({ rail_position: position }),
        onMutate: async (position) => {
            await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY });
            const previous = queryClient.getQueryData<UserPreference>(PREFERENCES_KEY);
            if (previous) queryClient.setQueryData<UserPreference>(PREFERENCES_KEY, { ...previous, rail_position: position });
            return { previous };
        },
        onError: (error: Error, _position, context) => {
            if (context?.previous) queryClient.setQueryData(PREFERENCES_KEY, context.previous);
            toast({ title: "Could not move the sidebar", description: error.message, variant: "error" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY }),
    });

    const stored = preferences?.rail_position;
    const position = RailPositionOptions.some((o) => o.id === stored) ? (stored as RailPosition) : DEFAULT_RAIL_POSITION;
    const setPosition = useCallback((next: RailPosition) => mutate(next), [mutate]);
    return { position, setPosition };
};
