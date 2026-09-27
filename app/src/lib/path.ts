/** Joins a local absolute path with a relative sub-path using the base path's separator. */
export const joinLocalPath = (base: string, sub?: string | null): string => {
    if (!sub?.trim()) return base;
    const sep = base.includes("\\") ? "\\" : "/";
    const cleanSub = sub.trim().replace(/^[\\/]+|[\\/]+$/g, "").replace(/[\\/]+/g, sep);
    return `${base.replace(/[\\/]+$/, "")}${sep}${cleanSub}`;
};

export const baseName = (p: string): string => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? p;

/** "owner/repo" from common Git URLs (https, ssh). */
export const repoFullNameFromUrl = (url: string): string | null => {
    const m = url.trim().match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?\/?$/);
    return m ? m[1] : null;
};

export const repoNameFromUrl = (url: string): string | null => repoFullNameFromUrl(url)?.split("/")[1] ?? null;
