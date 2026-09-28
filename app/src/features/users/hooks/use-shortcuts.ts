import { useCallback, useEffect, useMemo, useRef } from "react";
import { getShortcutSettings, useShortcutsStore } from "@/stores/shortcuts";
import { resolveShortcuts } from "@/lib/shortcuts.utils";
import type { CustomShortcut } from "../interfaces/users.interfaces";
import { useGetPreferences, useUpdatePreferences } from "./use-users";

const SAVE_DEBOUNCE_MS = 600;

/** Pulls the account's shortcuts onto this device until the user customizes them locally. Mount once in the workspace shell. */
export const useShortcutsHydration = () => {
    const { data: preferences } = useGetPreferences();
    const customized = useShortcutsStore((s) => s.customized);
    const hydrateFromServer = useShortcutsStore((s) => s.hydrateFromServer);

    useEffect(() => {
        if (!preferences || customized) return;
        hydrateFromServer(preferences.shortcut_settings ?? { bindings: {}, custom: [] });
    }, [preferences, customized, hydrateFromServer]);
};

/** Effective shortcut list (defaults + overrides + custom). Read-only; safe to call from anywhere. */
export const useResolvedShortcuts = () => {
    const bindings = useShortcutsStore((s) => s.bindings);
    const custom = useShortcutsStore((s) => s.custom);
    return useMemo(() => resolveShortcuts(bindings, custom), [bindings, custom]);
};

/** Blocks real shortcuts from firing while `active` (recording a combo, practice mode). */
export const useSuspendShortcuts = (active: boolean) => {
    const suspend = useShortcutsStore((s) => s.suspend);
    const resume = useShortcutsStore((s) => s.resume);
    useEffect(() => {
        if (!active) return;
        suspend();
        return resume;
    }, [active, suspend, resume]);
};

/** Shortcut editing: updates apply instantly on this device and save to the account preferences (debounced). */
export const useShortcutSettings = () => {
    const shortcuts = useResolvedShortcuts();
    const store = useShortcutsStore.getState;
    const { mutate: save } = useUpdatePreferences();
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const dirty = useRef(false);

    const flush = useCallback(() => {
        if (!dirty.current) return;
        dirty.current = false;
        save({ shortcut_settings: getShortcutSettings() });
    }, [save]);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            flush();
        },
        [flush],
    );

    const scheduleSave = useCallback(() => {
        dirty.current = true;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    }, [flush]);

    return {
        shortcuts,
        setBinding: (actionId: string, combo: string) => {
            store().setBinding(actionId, combo);
            scheduleSave();
        },
        resetBinding: (actionId: string) => {
            store().setBinding(actionId, null);
            scheduleSave();
        },
        addCustom: (shortcut: CustomShortcut) => {
            store().addCustom(shortcut);
            scheduleSave();
        },
        updateCustom: (id: string, patch: Partial<Omit<CustomShortcut, "id">>) => {
            store().updateCustom(id, patch);
            scheduleSave();
        },
        removeCustom: (id: string) => {
            store().removeCustom(id);
            scheduleSave();
        },
        resetAll: () => {
            store().resetAll();
            scheduleSave();
        },
    };
};
