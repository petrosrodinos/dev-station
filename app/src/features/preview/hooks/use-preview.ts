import { useCallback, useEffect, useMemo, useState } from "react";
import type { PreviewBounds, PreviewState } from "@shared/contract";
import { IpcErrorCodes } from "@shared/contract";
import { hidePreview, loadPreview, navigatePreview, setPreviewBounds, showPreview, subscribePreviewState, toggleDevToolsPreview } from "../services/preview.services";
import type { PreviewNavigateAction } from "../interfaces/preview.interfaces";
import { getBridgeErrorCode, getErrorMessage, isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";

/** Latest state pushed by the main process for this project's preview view. */
export const usePreviewState = (projectId: string | null): PreviewState | null => {
    const [state, setState] = useState<PreviewState | null>(null);

    useEffect(() => {
        setState(null);
        if (!projectId || !isDesktop()) return;
        return subscribePreviewState((e) => {
            if (e.projectId === projectId) setState(e);
        });
    }, [projectId]);

    return state;
};

const notifyError = (error: unknown, title: string) =>
    toast({
        title: getBridgeErrorCode(error) === IpcErrorCodes.PREVIEW_URL_NOT_ALLOWED ? "Only localhost URLs can be previewed" : title,
        description: getErrorMessage(error),
        variant: "error",
        duration: 5000,
    });

export const usePreviewActions = (projectId: string) => {
    const show = useCallback(
        (url: string, bounds: PreviewBounds) => showPreview({ projectId, url, bounds }).catch((e) => notifyError(e, "Could not open the preview")),
        [projectId],
    );
    const hide = useCallback(() => hidePreview(projectId).catch(() => undefined), [projectId]);
    const setBounds = useCallback((bounds: PreviewBounds) => setPreviewBounds(projectId, bounds).catch(() => undefined), [projectId]);
    const navigate = useCallback((action: PreviewNavigateAction) => navigatePreview(projectId, action).catch(() => undefined), [projectId]);
    const load = useCallback((url: string) => loadPreview({ projectId, url }).catch((e) => notifyError(e, "Could not load the URL")), [projectId]);
    const toggleDevTools = useCallback(() => toggleDevToolsPreview(projectId).catch((e) => notifyError(e, "Could not open DevTools")), [projectId]);
    return useMemo(() => ({ show, hide, setBounds, navigate, load, toggleDevTools }), [show, hide, setBounds, navigate, load, toggleDevTools]);
};
