import { useEffect, useState } from "react";
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

const hasOverlay = () => !!document.body.querySelector(OVERLAY_SELECTOR);

/** True while any overlay is open. A native preview view sits above the DOM and would cover it. */
export const useOverlayOpen = (): boolean => {
    const paletteOpen = useDialogsStore((s) => s.command_palette);
    const [domOverlay, setDomOverlay] = useState(hasOverlay);

    useEffect(() => {
        let frame = 0;
        const check = () => {
            frame = 0;
            setDomOverlay(hasOverlay());
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
    }, []);

    return domOverlay || paletteOpen;
};
