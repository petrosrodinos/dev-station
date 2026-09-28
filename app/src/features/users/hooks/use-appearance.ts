import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_APPEARANCE, useAppearanceStore, type AppearanceValues, type ThemeMode } from "@/stores/appearance";
import type { UpdatePreferenceDto } from "../interfaces/users.interfaces";
import { useGetPreferences, useUpdatePreferences } from "./use-users";

const SAVE_DEBOUNCE_MS = 500;

const toDto = (patch: Partial<AppearanceValues>): UpdatePreferenceDto => {
    const dto: UpdatePreferenceDto = {};
    if (patch.mode !== undefined) dto.theme = patch.mode;
    if (patch.preset_id !== undefined) dto.theme_preset = patch.preset_id;
    if (patch.accent_color !== undefined) dto.accent_color = patch.accent_color;
    if (patch.font_size !== undefined) dto.font_size = patch.font_size;
    if (patch.font_family !== undefined) dto.font_family = patch.font_family;
    if (patch.mono_font_family !== undefined) dto.mono_font_family = patch.mono_font_family;
    return dto;
};

/** Pulls the account's appearance onto this device until the user customizes it locally. Mount once in the workspace shell. */
export const useAppearanceHydration = () => {
    const { data: preferences } = useGetPreferences();
    const customized = useAppearanceStore((s) => s.customized);
    const hydrateFromServer = useAppearanceStore((s) => s.hydrateFromServer);

    useEffect(() => {
        if (!preferences || customized) return;
        hydrateFromServer({
            mode: (["light", "dark", "system"].includes(preferences.theme) ? preferences.theme : "dark") as ThemeMode,
            preset_id: preferences.theme_preset ?? DEFAULT_APPEARANCE.preset_id,
            accent_color: preferences.accent_color ?? null,
            font_size: preferences.font_size ?? DEFAULT_APPEARANCE.font_size,
            font_family: preferences.font_family ?? DEFAULT_APPEARANCE.font_family,
            mono_font_family: preferences.mono_font_family ?? DEFAULT_APPEARANCE.mono_font_family,
        });
    }, [preferences, customized, hydrateFromServer]);
};

/** Appearance state plus setters that apply instantly and save to the account preferences (debounced). */
export const useAppearance = () => {
    const values = useAppearanceStore();
    const update = useAppearanceStore((s) => s.update);
    const resetAll = useAppearanceStore((s) => s.resetAll);
    const { mutate: save } = useUpdatePreferences();
    const pending = useRef<Partial<AppearanceValues>>({});
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const flush = useCallback(() => {
        const patch = pending.current;
        pending.current = {};
        if (Object.keys(patch).length) save(toDto(patch));
    }, [save]);

    useEffect(() => () => {
        clearTimeout(timer.current);
        flush();
    }, [flush]);

    const change = useCallback(
        (patch: Partial<AppearanceValues>) => {
            update(patch);
            pending.current = { ...pending.current, ...patch };
            clearTimeout(timer.current);
            timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
        },
        [update, flush],
    );

    const reset = useCallback(() => {
        resetAll();
        const { mode, preset_id, accent_color, font_size, font_family, mono_font_family } = useAppearanceStore.getState();
        pending.current = { mode, preset_id, accent_color, font_size, font_family, mono_font_family };
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    }, [resetAll, flush]);

    return { values, change, reset };
};
