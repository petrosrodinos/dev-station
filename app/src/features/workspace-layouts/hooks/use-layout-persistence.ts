import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { DockviewApi, SerializedDockview } from "dockview-react";
import { useLayoutStore } from "@/stores/layout";
import { useWorkspaceStore } from "@/stores/workspace";
import { useGetLayoutState, useGetLayouts } from "./use-workspace-layouts";
import { applyOuterSizes, sameOuterShape, type SerializedOuterLayout } from "../utils/outer-layout.utils";

const SAVE_DEBOUNCE_MS = 500;
const HOME_CONTEXT = "home";

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
 * Remembers the outer main/AI-panel split per context: each project keeps its own geometry, and the
 * home screen keeps its own. Switching the active project first writes the outgoing context's live
 * layout, then applies the incoming context's stored layout (or the default when it has none).
 * Saves are debounced because `onDidLayoutChange` fires continuously during a drag; the pending
 * save records its own context so a late event can never land in the wrong project.
 */
export const useLayoutPersistence = (api: DockviewApi | null, resetToDefault: (api: DockviewApi) => void) => {
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const context = activeProjectId ?? HOME_CONTEXT;
  const activePresetId = useLayoutStore((s) => s.active_preset_id);
  const saveOuterLayout = useLayoutStore((s) => s.saveOuterLayout);
  const markDirty = useLayoutStore((s) => s.markDirty);
  const markClean = useLayoutStore((s) => s.markClean);
  const { data: presets } = useGetLayouts();

  const contextRef = useRef<string | null>(null);
  const applyingRef = useRef(false);
  const pendingRef = useRef<{ context: string; layout: Record<string, unknown> } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const presetLayoutRef = useRef<Record<string, unknown> | undefined>(undefined);
  presetLayoutRef.current = presets?.find((p) => p.id === activePresetId)?.layout;

  const commitPending = useCallback(() => {
    clearTimeout(timer.current);
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    saveOuterLayout(pending.context, pending.layout);
    const preset = presetLayoutRef.current;
    if (preset && JSON.stringify(preset) === JSON.stringify(pending.layout)) markClean();
    else markDirty();
  }, [saveOuterLayout, markClean, markDirty]);

  // Switching context: write the outgoing layout first, while the dock still holds it. Layout effect, so
  // the incoming geometry is in place before the browser paints (no flash of the previous project).
  useLayoutEffect(() => {
    if (!api) return;
    const previous = contextRef.current;
    if (previous !== null && previous !== context) {
      clearTimeout(timer.current);
      pendingRef.current = null;
      try {
        saveOuterLayout(previous, api.toJSON() as unknown as Record<string, unknown>);
      } catch (error) {
        console.error("Failed to save the outgoing panel layout", error);
      }
    }
    contextRef.current = context;

    const stored = useLayoutStore.getState().outer_layout_by_project[context] as unknown as SerializedOuterLayout | undefined;
    applyingRef.current = true;
    try {
      if (stored?.grid) {
        // Same panels in the same arrangement (the normal case): only resize. Rebuilding would remount
        // the whole project page and the AI panel's nested terminal dock on every switch.
        if (sameOuterShape(stored, api.toJSON())) applyOuterSizes(api, stored);
        else api.fromJSON(stored as unknown as SerializedDockview);
      } else resetToDefault(api);
    } catch (error) {
      console.error("Couldn't restore the saved panel layout — using the default", error);
      resetToDefault(api);
    } finally {
      applyingRef.current = false;
    }
  }, [api, context, saveOuterLayout, resetToDefault]);

  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidLayoutChange(() => {
      if (applyingRef.current || !contextRef.current) return;
      try {
        pendingRef.current = { context: contextRef.current, layout: api.toJSON() as unknown as Record<string, unknown> };
      } catch (error) {
        console.error("Failed to serialize the dock layout for saving", error);
        return;
      }
      clearTimeout(timer.current);
      timer.current = setTimeout(commitPending, SAVE_DEBOUNCE_MS);
    });
    return () => disposable.dispose();
  }, [api, commitPending]);

  useEffect(() => () => commitPending(), [commitPending]);
};
