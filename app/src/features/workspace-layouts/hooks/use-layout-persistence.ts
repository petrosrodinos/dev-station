import { useCallback, useEffect, useRef } from "react";
import type { DockviewApi, SerializedDockview } from "dockview-react";
import { useLayoutStore } from "@/stores/layout";
import { useGetLayoutState, useGetLayouts, useUpdateLayout } from "./use-workspace-layouts";

const SAVE_DEBOUNCE_MS = 500;

/** Pulls the account's active preset/per-project map onto this device until it diverges locally. Mount once. */
export const useLayoutHydration = () => {
  const { data: state } = useGetLayoutState();
  const customized = useLayoutStore((s) => s.customized);
  const hydrateFromServer = useLayoutStore((s) => s.hydrateFromServer);

  useEffect(() => {
    if (!state || customized) return;
    hydrateFromServer({ active_preset_id: state.active_preset_id, preset_by_project: state.preset_by_project });
    // Deliberately NOT restoring `preset.floating` into live state here: floating panels are
    // session-only in v1 (real OS windows aren't reopened across a relaunch) — see docking system
    // spec §I. The server value is still saved (useLayoutPersistence) as forward-compatible
    // metadata for a future phase, just not applied on load.
    // `customized` flips true the moment hydrateFromServer runs, so this effect settles after one pass.
  }, [state, customized, hydrateFromServer]);
};

/**
 * Debounce-then-PATCH persistence for the dock tree (mirrors `use-appearance.ts` exactly, but
 * `onDidLayoutChange` fires continuously during a drag/resize rather than on discrete user
 * actions, so the trailing debounce is the only thing standing between this and spamming the API).
 * Also applies the active preset's saved layout onto the dock whenever it changes, with a
 * corrupted/invalid-layout recovery path: a bad `fromJSON` call is swallowed, leaving whatever
 * arrangement the dock already had rather than crashing (see docking system spec §G).
 */
export const useLayoutPersistence = (api: DockviewApi | null) => {
  const activePresetId = useLayoutStore((s) => s.active_preset_id);
  const markDirty = useLayoutStore((s) => s.markDirty);
  const markClean = useLayoutStore((s) => s.markClean);
  const { data: presets } = useGetLayouts();
  const { mutate: save } = useUpdateLayout();

  const applyingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const appliedPresetId = useRef<string | null>(null);

  const flush = useCallback(() => {
    if (!api || !activePresetId) return;
    try {
      const layout = api.toJSON();
      const floating = useLayoutStore.getState().floating;
      save({ id: activePresetId, dto: { layout: layout as unknown as Record<string, unknown>, floating } });
      markClean();
    } catch (error) {
      console.error("Failed to serialize the dock layout for saving", error);
    }
  }, [api, activePresetId, save, markClean]);

  // Restore the active preset's saved layout whenever the preset changes (switch, or first hydrate).
  useEffect(() => {
    if (!api || !activePresetId || !presets) return;
    if (appliedPresetId.current === activePresetId) return;
    const preset = presets.find((p) => p.id === activePresetId);
    appliedPresetId.current = activePresetId;
    if (!preset || !Object.keys(preset.layout).length) return; // empty/seed layout — keep the dock's current (already-seeded) arrangement
    applyingRef.current = true;
    try {
      api.fromJSON(preset.layout as unknown as SerializedDockview);
    } catch (error) {
      console.error("Couldn't restore the saved layout — keeping the current arrangement", error);
    } finally {
      applyingRef.current = false;
    }
  }, [api, activePresetId, presets]);

  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidLayoutChange(() => {
      if (applyingRef.current) return;
      markDirty();
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    });
    return () => disposable.dispose();
  }, [api, flush, markDirty]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      flush();
    },
    [flush],
  );
};
