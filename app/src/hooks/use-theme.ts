import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

const readTheme = (): Theme => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        return stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    } catch {
        return "dark";
    }
};

const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** Applies the theme class on <html>. Dark is the primary/default theme (Spec §1). */
export const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme === "system" ? systemTheme() : theme);
};

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(readTheme);

    useEffect(() => {
        applyTheme(theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* storage unavailable */
        }
        if (theme !== "system") return;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => applyTheme("system");
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    const resolved = theme === "system" ? systemTheme() : theme;
    return {
        theme,
        setTheme,
        toggleTheme: () => setTheme(resolved === "dark" ? "light" : "dark"),
        getThemeLabel: () => (resolved === "dark" ? "Light" : "Dark"),
        getThemeIconType: () => (resolved === "dark" ? "sun" : "moon"),
    };
};

/** Call once at startup so the first paint uses the stored theme. */
export const initTheme = () => applyTheme(readTheme());
