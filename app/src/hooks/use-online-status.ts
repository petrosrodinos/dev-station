import { onlineManager, useMutationState } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** The connection state TanStack Query acts on. It also goes offline when the API stops answering. */
export const useOnlineStatus = (): boolean =>
    useSyncExternalStore(
        (onChange) => onlineManager.subscribe(() => onChange()),
        () => onlineManager.isOnline(),
    );

/** Writes paused while offline (or waiting to replay). Live requests never pause, so this is the outbox size. */
export const usePendingSyncCount = (): number => {
    const paused = useMutationState({
        filters: { predicate: (mutation) => mutation.state.isPaused },
        select: (mutation) => mutation.state.submittedAt,
    });
    return paused.length;
};
