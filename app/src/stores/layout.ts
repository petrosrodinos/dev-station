import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FloatingPanelBounds } from "@/features/workspace-layouts/interfaces/workspace-layouts.interfaces";

// Cross-cutting bookkeeping for the docking/workspace layout system. The dock tree itself is NOT
// duplicated here — DockviewApi.toJSON()/fromJSON() is the runtime source of truth (see
// `workspace-dock.tsx` / `use-layout-persistence.ts`); this store only tracks which preset is
// active, which preset each project remembers, and whether the live layout has diverged from what
// was last saved. Mirrors the `appearance.ts` store's hydrate-guard pattern.

interface LayoutState {
    active_preset_id: string | null;
    /** Record<projectId, presetId> — mirrors workspace.ts's preview_by_project/session_by_project shape. */
    preset_by_project: Record<string, string>;
    /** True once the live dock tree has changed since the active preset was last saved/loaded. */
    dirty: boolean;
    /** True once this device has diverged from server state; from then on the server never overwrites it. */
    customized: boolean;
    /** Real-OS-window floating panels for the active preset (see docking system spec §C). */
    floating: FloatingPanelBounds[];
}

interface LayoutActions {
    setActivePreset(id: string | null): void;
    rememberProjectPreset(projectId: string, presetId: string): void;
    markDirty(): void;
    markClean(): void;
    setFloating(floating: FloatingPanelBounds[]): void;
    addFloating(entry: FloatingPanelBounds): void;
    removeFloating(panelId: string): void;
    hydrateFromServer(values: Pick<LayoutState, "active_preset_id" | "preset_by_project">): void;
}

const initialValues: LayoutState = {
    active_preset_id: null,
    preset_by_project: {},
    dirty: false,
    customized: false,
    floating: [],
};

const STORE_KEY = "layout";

export const useLayoutStore = create<LayoutState & LayoutActions>()(
    persist(
        (set) => ({
            ...initialValues,
            setActivePreset: (id) => set({ active_preset_id: id, customized: true, dirty: false }),
            rememberProjectPreset: (projectId, presetId) =>
                set((s) => ({ preset_by_project: { ...s.preset_by_project, [projectId]: presetId }, customized: true })),
            markDirty: () => set({ dirty: true }),
            markClean: () => set({ dirty: false }),
            setFloating: (floating) => set({ floating, customized: true }),
            addFloating: (entry) =>
                set((s) => ({ floating: [...s.floating.filter((f) => f.panelId !== entry.panelId), entry], customized: true, dirty: true })),
            removeFloating: (panelId) => set((s) => ({ floating: s.floating.filter((f) => f.panelId !== panelId), dirty: true })),
            hydrateFromServer: (values) => set({ ...values, dirty: false }),
        }),
        { name: STORE_KEY },
    ),
);

export const getLayoutStoreState = () => useLayoutStore.getState();
