import { onlineManager } from "@tanstack/react-query";
import { probeApiHealth } from "@/config/api/network";

const PROBE_INTERVAL_MS = 10_000;

let probeTimer: ReturnType<typeof setInterval> | undefined;

const stopProbing = () => {
    if (probeTimer === undefined) return;
    clearInterval(probeTimer);
    probeTimer = undefined;
};

const probeUntilReachable = async () => {
    if (!(await probeApiHealth())) return;
    stopProbing();
    onlineManager.setOnline(true);
};

/**
 * Called when a request fails without a response. The OS can report a connection while the API is
 * unreachable (VPN dropped, server restarting), so the failure itself marks the app offline and a
 * health probe flips it back once the API answers again.
 */
export const reportApiUnreachable = () => {
    onlineManager.setOnline(false);
    if (probeTimer === undefined) probeTimer = setInterval(() => void probeUntilReachable(), PROBE_INTERVAL_MS);
};

/** Mirrors the OS connection state. Browser events are the fast path; reportApiUnreachable covers the rest. */
export const initConnectivity = () => {
    if (typeof window === "undefined") return;
    onlineManager.setEventListener((setOnline) => {
        const handleOnline = () => {
            stopProbing();
            setOnline(true);
        };
        const handleOffline = () => {
            stopProbing();
            setOnline(false);
        };
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    });
};
