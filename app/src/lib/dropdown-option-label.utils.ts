/** Reads the display label for an enum value from a `{ id, label }[]` options array. */
export function getDropdownOptionLabel<T extends string>(options: readonly { id: T | "all"; label: string }[], id: T | string | null | undefined, fallback = ""): string {
    if (id === null || id === undefined) return fallback;
    return options.find((option) => option.id === id)?.label ?? String(id);
}
