import type { PreviewBounds, PreviewState } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";
import type { PreviewNavigateAction } from "../interfaces/preview.interfaces";

// Embedded preview views are owned by the Electron main process (PreviewManager).

// show/load keep the raw bridge error so callers can read its code (PREVIEW_URL_NOT_ALLOWED).
export const showPreview = async (input: { projectId: string; url: string; bounds: PreviewBounds }): Promise<void> => {
    await getBridge().preview.show(input);
};

export const loadPreview = async (input: { projectId: string; url: string }): Promise<void> => {
    await getBridge().preview.load(input);
};

export const hidePreview = async (projectId: string): Promise<void> => {
    try {
        await getBridge().preview.hide({ projectId });
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to hide the preview."));
    }
};

export const setPreviewBounds = async (projectId: string, bounds: PreviewBounds): Promise<void> => {
    try {
        await getBridge().preview.setBounds({ projectId, bounds });
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to resize the preview."));
    }
};

export const navigatePreview = async (projectId: string, action: PreviewNavigateAction): Promise<void> => {
    try {
        await getBridge().preview.navigate({ projectId, action });
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to navigate the preview."));
    }
};

export const subscribePreviewState = (cb: (state: PreviewState) => void): (() => void) => getBridge().preview.onState(cb);
