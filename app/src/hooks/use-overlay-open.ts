import { useEffect, useState, type RefObject } from "react";
import { useDialogsStore } from "@/stores/dialogs";

// Radix portals to <body>: dialogs/sheets/alert-dialogs, menus/popovers/selects (popper wrapper).
// Tooltip wrappers are excluded: they are transient and would flicker the view on every hover.
const OVERLAY_SELECTOR = [
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[role="menu"]',
    '[role="listbox"]',
    "[data-radix-popper-content-wrapper]:not(:has([role='tooltip']))",
].join(",");

const rectsIntersect = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Whether any overlay is open, optionally restricted to ones that actually cover `targetRef`. */
const hasOverlay = (targetRect: DOMRect | null) => {
    const overlays = document.body.querySelectorAll(OVERLAY_SELECTOR);
    if (!overlays.length) return false;
    if (!targetRect) return true;
    return Array.from(overlays).some((el) => rectsIntersect(el.getBoundingClientRect(), targetRect));
};

/**
 * True while any overlay is open. A native preview view sits above the DOM and would cover it.
 * Pass `targetRef` to only report overlays that geometrically overlap that element (e.g. an
 * unrelated dropdown elsewhere on the page shouldn't hide a native view docked far away from it).
 */
export const useOverlayOpen = (targetRef?: RefObject<HTMLElement | null>): boolean => {
    const paletteOpen = useDialogsStore((s) => s.command_palette);
    const [domOverlay, setDomOverlay] = useState(() => hasOverlay(targetRef?.current?.getBoundingClientRect() ?? null));

    useEffect(() => {
        let frame = 0;
        const check = () => {
            frame = 0;
            setDomOverlay(hasOverlay(targetRef?.current?.getBoundingClientRect() ?? null));
        };
        const observer = new MutationObserver(() => {
            if (!frame) frame = requestAnimationFrame(check);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        check();
        return () => {
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [targetRef]);

    return domOverlay || paletteOpen;
};
