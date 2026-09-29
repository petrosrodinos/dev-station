/** Compares two plain `x.y.z` versions. Returns -1 / 0 / 1. Missing/non-numeric parts count as 0. */
export function compareVersions(a: string, b: string): number {
    const partsOf = (v: string) =>
        v
            .trim()
            .split(".")
            .map((p) => parseInt(p, 10) || 0);
    const [a1, a2, a3] = partsOf(a);
    const [b1, b2, b3] = partsOf(b);
    if (a1 !== b1) return a1 < b1 ? -1 : 1;
    if (a2 !== b2) return a2 < b2 ? -1 : 1;
    if (a3 !== b3) return a3 < b3 ? -1 : 1;
    return 0;
}

/** `current < other` */
export const isVersionBelow = (current: string, other: string) => compareVersions(current, other) < 0;
