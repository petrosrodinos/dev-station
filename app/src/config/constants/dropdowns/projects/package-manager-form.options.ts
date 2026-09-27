import type { PackageManager } from "@shared/contract";

export const PackageManagerFormOptions: { id: PackageManager; label: string }[] = [
    { id: "npm", label: "npm" },
    { id: "pnpm", label: "pnpm" },
    { id: "yarn", label: "Yarn" },
    { id: "bun", label: "Bun" },
];
