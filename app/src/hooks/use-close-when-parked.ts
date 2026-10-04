import { useEffect } from "react";

/**
 * A write can be submitted online and then park in the offline outbox mid-flight. Its dialog is still open
 * at that point, so run `onParked` (typically the dialog's close) once the mutation pauses. The outbox owns
 * the write from then on, so the user should not be left on a form that can be submitted again.
 */
export const useCloseWhenParked = (mutation: { isPaused: boolean }, onParked: () => void) => {
    useEffect(() => {
        if (mutation.isPaused) onParked();
        // onParked is intentionally keyed on the pause transition only; its identity changes every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mutation.isPaused]);
};
