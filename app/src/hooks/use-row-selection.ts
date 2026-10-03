import { useCallback, useEffect, useState, type MouseEvent } from "react";

/**
 * Click-modifier multi-select for a list of rows: Shift+click selects the range from the last
 * clicked row (or starts a selection), Ctrl/Cmd+click toggles one row, Esc clears. A plain click
 * isn't handled — `onRowClick` returns false so the caller can run its normal action.
 */
export const useRowSelection = (orderedIds: string[], { enabled = true }: { enabled?: boolean } = {}) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [anchorId, setAnchorId] = useState<string | null>(null);

    const clear = useCallback(() => {
        setSelected(new Set());
        setAnchorId(null);
    }, []);

    useEffect(() => {
        if (!selected.size) return;
        const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && clear();
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected.size, clear]);

    // Drop ids that left the list (deleted, filtered out, next page).
    const idsKey = orderedIds.join(",");
    useEffect(() => {
        const present = new Set(orderedIds);
        setSelected((prev) => ([...prev].every((id) => present.has(id)) ? prev : new Set([...prev].filter((id) => present.has(id)))));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setAnchorId(id);
    };

    const setAll = (on: boolean) => (on ? setSelected(new Set(orderedIds)) : clear());

    /** Returns true when the click was a selection gesture (so the caller should not open the row). */
    const onRowClick = (e: MouseEvent, id: string): boolean => {
        if (!enabled) return false;
        if (e.shiftKey) {
            e.preventDefault();
            const from = anchorId ? orderedIds.indexOf(anchorId) : -1;
            if (from === -1) {
                toggle(id);
                return true;
            }
            const to = orderedIds.indexOf(id);
            const range = orderedIds.slice(Math.min(from, to), Math.max(from, to) + 1);
            setSelected((prev) => new Set([...prev, ...range]));
            return true;
        }
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggle(id);
            return true;
        }
        return false;
    };

    /** Spread on the row: keeps Shift+click from highlighting text across rows. */
    const onRowMouseDown = (e: MouseEvent) => {
        if (enabled && e.shiftKey) e.preventDefault();
    };

    const allSelected = orderedIds.length > 0 && orderedIds.every((id) => selected.has(id));

    return { selected, allSelected, toggle, setAll, clear, onRowClick, onRowMouseDown };
};
