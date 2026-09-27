import { differenceInSeconds, format, formatDistanceToNowStrict, isToday, parseISO } from "date-fns";

const toDate = (value: string | number | Date) => (typeof value === "string" ? parseISO(value) : new Date(value));

/** "3m ago", "2h ago", "just now". */
export const formatRelative = (value: string | number | Date | null | undefined): string => {
    if (!value) return "—";
    const date = toDate(value);
    if (Math.abs(differenceInSeconds(new Date(), date)) < 30) return "just now";
    return `${formatDistanceToNowStrict(date)} ago`;
};

/** "09:42" for today, "Sep 24, 09:42" otherwise — used by activity timelines. */
export const formatTimelineTime = (value: string | number | Date): string => {
    const date = toDate(value);
    return isToday(date) ? format(date, "HH:mm") : format(date, "MMM d, HH:mm");
};

export const formatClock = (value: string | number | Date): string => format(toDate(value), "HH:mm:ss");

export const formatDateTime = (value: string | number | Date | null | undefined): string => (value ? format(toDate(value), "MMM d, yyyy HH:mm") : "—");

/** Elapsed duration between two timestamps, e.g. "12m", "1h 5m". */
export const formatDuration = (start: string, end?: string | null): string => {
    const seconds = Math.max(0, differenceInSeconds(end ? parseISO(end) : new Date(), parseISO(start)));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
