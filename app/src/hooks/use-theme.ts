import { resolveMode } from "@/lib/appearance/apply-appearance";
import { useAppearanceStore, type ThemeMode } from "@/stores/appearance";

export type Theme = ThemeMode;

/** Light/dark/system mode, backed by the shared appearance store so every caller stays in sync. */
export const useTheme = () => {
    const theme = useAppearanceStore((s) => s.mode);
    const update = useAppearanceStore((s) => s.update);
    const setTheme = (mode: Theme) => update({ mode });

    const resolved = resolveMode(theme);
    return {
        theme,
        setTheme,
        toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
        getThemeLabel: () => (resolved === "dark" ? "Light" : "Dark"),
        getThemeIconType: () => (resolved === "dark" ? "sun" : "moon"),
    };
};
