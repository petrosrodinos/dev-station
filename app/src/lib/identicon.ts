const GRID = 5;

/** FNV-1a string hash → seeded xorshift32 stream, so a seed always yields the same pattern. */
const seededBits = (seed: string, count: number): boolean[] => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    let x = h || 1;
    return Array.from({ length: count }, () => {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return (x >>> 0) % 2 === 0;
    });
};

/** GitHub-style identicon: a horizontally mirrored 5×5 grid. Returns the filled cells as [col, row] pairs. */
export const identiconCells = (seed: string): [number, number][] => {
    const half = Math.ceil(GRID / 2);
    const bits = seededBits(seed, half * GRID);
    const cells: [number, number][] = [];
    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < half; col++) {
            if (!bits[row * half + col]) continue;
            cells.push([col, row]);
            if (col !== GRID - 1 - col) cells.push([GRID - 1 - col, row]);
        }
    }
    return cells;
};

export const IDENTICON_GRID = GRID;

export const randomAvatarSeed = (): string => crypto.randomUUID().slice(0, 8);
