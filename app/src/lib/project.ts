/** "Web App" → "WA". */
export const projectInitials = (name: string): string =>
    name
        .split(/[\s\-_/.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "?";
