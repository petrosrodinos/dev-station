import { onlineManager } from "@tanstack/react-query";
import { probeApiHealth } from "@/config/api/network";

const PROBE_INTERVAL_MS = 10_000;

let probeTimer: ReturnType<typeof setInterval> | undefined;
let inFlightProbe: Promise<boolean> | undefined;

const stopProbing = () => {
    if (probeTimer === undefined) return;
    clearInterval(probeTimer);
    probeTimer = undefined;
};

/** Concurrent callers share one health request, so a burst of failed requests sends a single probe. */
const probeOnce = (): Promise<boolean> => {
    inFlightProbe ??= probeApiHealth().finally(() => {
        inFlightProbe = undefined;
    });
    return inFlightProbe;
};

const goOnline = () => {
    stopProbing();
    onlineManager.setOnline(true);
};

const goOffline = () => {
    onlineManager.setOnline(false);
    if (probeTimer === undefined) probeTimer = setInterval(() => void verifyConnection(), PROBE_INTERVAL_MS);
};

/** Only the API answering proves connectivity, so every change of state goes through the health probe. */
const verifyConnection = async () => {
    if (await probeOnce()) goOnline();
    else goOffline();
};

/**
 * Called when a request fails without a response. A single timeout or dropped socket can happen while the
 * network is fine, so the probe decides whether the app goes offline instead of the failed request.
 */
export const reportApiUnreachable = () => {
    if (onlineManager.isOnline()) void verifyConnection();
};

/**
 * Browser online/offline events are hints, not proof: Windows can report offline during adapter changes
 * (VPN, virtual NICs) while the API is reachable. Both events are verified against the API.
 */
export const initConnectivity = () => {
    if (typeof window === "undefined") return;
    onlineManager.setEventListener(() => {
        const handleBrowserChange = () => void verifyConnection();
        window.addEventListener("online", handleBrowserChange);
        window.addEventListener("offline", handleBrowserChange);
        return () => {
            window.removeEventListener("online", handleBrowserChange);
            window.removeEventListener("offline", handleBrowserChange);
        };
    });
};
