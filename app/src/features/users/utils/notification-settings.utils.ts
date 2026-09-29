import { NotificationEventTypes, type NotificationChannel, type NotificationSettings } from "../interfaces/users.interfaces";

const flags = (badge: boolean, feed: boolean, os: boolean, toast: boolean, sound: boolean) => ({ badge, feed, os, toast, sound });

/** Mirrors the API defaults so decisions are correct before preferences have loaded. */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    enabled: true,
    events: {
        AGENT_FINISHED: flags(true, true, false, true, true),
        AGENT_AWAITING_INPUT: flags(true, true, true, true, true),
        AGENT_CRASHED: flags(true, true, true, true, true),
        SERVICE_CRASHED: flags(false, true, true, true, false),
        GIT_COMMIT: flags(false, true, false, true, false),
        GIT_PUSH: flags(false, true, false, true, false),
        GIT_PULL: flags(false, true, false, true, false),
    },
};

const configurableTypes = new Set<string>(Object.values(NotificationEventTypes));

/** Event types that aren't configurable (e.g. PROJECT_CREATED) always notify through the feed. */
export function shouldNotify(settings: NotificationSettings | undefined, eventType: string, channel: NotificationChannel): boolean {
    const resolved = settings ?? DEFAULT_NOTIFICATION_SETTINGS;
    if (!configurableTypes.has(eventType)) return channel === "feed";
    if (!resolved.enabled) return false;
    return resolved.events[eventType as keyof NotificationSettings["events"]]?.[channel] ?? false;
}
