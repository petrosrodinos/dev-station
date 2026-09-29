import { format, parseISO } from "date-fns";

const toDate = (value: string | number | Date) => (typeof value === "string" ? parseISO(value) : new Date(value));

export const formatDateTime = (value: string | number | Date | null | undefined): string => (value ? format(toDate(value), "MMM d, yyyy HH:mm") : "—");

export const formatDate = (value: string | number | Date | null | undefined): string => (value ? format(toDate(value), "MMM d, yyyy") : "—");
