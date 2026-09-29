import type { OsNotificationInput } from "@shared/contract";
import { getBridge, getErrorMessage } from "@/lib/desktop";

/** Shows a native OS notification. Resolves to false when the OS doesn't support them. */
export const showOsNotification = async (input: OsNotificationInput): Promise<boolean> => {
    try {
        return await getBridge().notifications.show(input);
    } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to show the desktop notification."));
    }
};

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext ??= new Ctor();
    return audioContext;
};

/** Plays a short two-tone chime for in-app notifications. Resolves to false if Web Audio is unavailable. */
export const playNotificationSound = async (): Promise<boolean> => {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.connect(ctx.destination);

    [880, 1320].forEach((frequency, i) => {
        const start = now + i * 0.11;
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.connect(gain);
        oscillator.start(start);
        oscillator.stop(start + 0.14);
    });

    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.32);
    return true;
};
