import { useCallback } from "react";
import { DEFAULT_RAIL_POSITION, RailPositionOptions, type RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { useWorkspaceStore } from "@/stores/workspace";
import { useGetPreferences, useUpdateRailPosition } from "./use-users";

const isRailPosition = (value: unknown): value is RailPosition => RailPositionOptions.some((o) => o.id === value);

/**
 * Where the project rail (sidebar) is docked. The account preference is the source of truth across
 * devices; a move also applies immediately on this device, and stays applied if the save fails.
 */
export const useRailPosition = () => {
    const { data: preferences } = useGetPreferences();
    const local = useWorkspaceStore((s) => s.rail_position);
    const setLocal = useWorkspaceStore((s) => s.setRailPosition);
    const { mutate } = useUpdateRailPosition();

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
