import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomShortcut, ShortcutSettings } from "@/features/users/interfaces/users.interfaces";

// Device-persisted shortcut bindings so they apply before preferences load; mirrored to the server preferences for cross-device sync.

interface ShortcutsState extends ShortcutSettings {
    /** True once the user changed something on this device; server values no longer override local ones. */
    customized: boolean;
    /** >0 while a dialog is recording a combo or practising, so real shortcuts must not fire. */
    suspended: number;
}

interface ShortcutsActions {
    /** `null` removes the override, restoring the action's default binding. */
    setBinding(actionId: string, combo: string | null): void;
    addCustom(shortcut: CustomShortcut): void;
    updateCustom(id: string, patch: Partial<Omit<CustomShortcut, "id">>): void;
    removeCustom(id: string): void;
    resetAll(): void;
    hydrateFromServer(settings: ShortcutSettings): void;
    suspend(): void;
    resume(): void;
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = { bindings: {}, custom: [] };

const STORE_KEY = "shortcuts";

export const useShortcutsStore = create<ShortcutsState & ShortcutsActions>()(
    persist(
        (set) => ({
            ...DEFAULT_SHORTCUT_SETTINGS,
            customized: false,
            suspended: 0,
            setBinding: (actionId, combo) =>
                set((s) => {
                    const bindings = { ...s.bindings };
                    if (combo === null) delete bindings[actionId];
                    else bindings[actionId] = combo;
                    return { bindings, customized: true };
                }),
            addCustom: (shortcut) => set((s) => ({ custom: [...s.custom, shortcut], customized: true })),
            updateCustom: (id, patch) => set((s) => ({ custom: s.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)), customized: true })),
            removeCustom: (id) => set((s) => ({ custom: s.custom.filter((c) => c.id !== id), customized: true })),
            resetAll: () => set({ ...DEFAULT_SHORTCUT_SETTINGS, customized: true }),
            hydrateFromServer: (settings) => set({ bindings: settings.bindings ?? {}, custom: settings.custom ?? [], customized: false }),
            suspend: () => set((s) => ({ suspended: s.suspended + 1 })),
            resume: () => set((s) => ({ suspended: Math.max(0, s.suspended - 1) })),
        }),
        {
            name: STORE_KEY,
            partialize: ({ bindings, custom, customized }) => ({ bindings, custom, customized }),
        },
    ),
);

export const getShortcutSettings = (): ShortcutSettings => {
    const { bindings, custom } = useShortcutsStore.getState();
    return { bindings, custom };
};
