import type { Theme } from "@/hooks/use-theme";

export const ThemeOptions: { id: Theme; label: string }[] = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "system", label: "System" },
];
