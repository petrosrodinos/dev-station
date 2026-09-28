import type { RefField } from "@shared/service-refs";

/** What a `{{service.<field>}}` reference expands to, shown when inserting one into an env value. */
export const ServiceReferenceFieldOptions: { id: RefField; label: string }[] = [
    { id: "url", label: "URL" },
    { id: "port", label: "Port" },
    { id: "host", label: "Host:port" },
];
