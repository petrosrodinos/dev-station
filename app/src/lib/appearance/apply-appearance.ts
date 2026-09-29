import { FontFamilyOptions, MonoFontFamilyOptions, getFontOption, DEFAULT_FONT_SIZE, type FontOption } from "@/config/constants/dropdowns/settings/font-family.options";
import { getThemePreset, type ThemePalette } from "@/config/constants/themes/theme-presets";
import { getAppearanceValues, useAppearanceStore, type AppearanceValues } from "@/stores/appearance";

const PALETTE_VARS: Record<keyof ThemePalette, string> = {
    canvas: "--canvas",
    surface: "--surface",
    elevated: "--surface-elevated",
    card: "--surface-card",
    ink: "--ink",
    body: "--body",
    muted: "--muted-foreground",
    border: "--border",
    primary: "--primary",
    primaryForeground: "--primary-foreground",
    terminal: "--terminal",
};

// Variables that are derived from the palette in index.css but hard-coded per theme class there.
const DERIVED_VARS = ["--input", "--secondary-foreground", "--accent-foreground", "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-accent-foreground", "--ring", "--ash", "--stone"];

export const systemMode = (): "light" | "dark" => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const resolveMode = (mode: AppearanceValues["mode"]): "light" | "dark" => (mode === "system" ? systemMode() : mode);

/** Black or white, whichever reads better on the given hex background. */
export const readableForeground = (hex: string): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return "#ffffff";
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#000000" : "#ffffff";
};

/** Palette actually in effect (preset for the resolved mode), or null when the base index.css tokens apply. */
export const getActivePalette = (values: AppearanceValues = getAppearanceValues()): ThemePalette | null => {
    const preset = getThemePreset(values.preset_id);
    return resolveMode(values.mode) === "dark" ? preset.dark : preset.light;
};

/** Hex primary color in effect (accent override, else the preset's), or null for the base theme. */
export const primaryColor = (values: AppearanceValues): string | null => values.accent_color ?? getActivePalette(values)?.primary ?? null;

const loadedFonts = new Set<string>();
const ensureFont = (font: FontOption) => {
    if (!font.load || loadedFonts.has(font.id)) return;
    loadedFonts.add(font.id);
    font.load().catch(() => loadedFonts.delete(font.id));
};

export const applyAppearance = (values: AppearanceValues = getAppearanceValues()) => {
    const root = document.documentElement;
    const resolved = resolveMode(values.mode);
    root.classList.remove("light", "dark");
    root.classList.add(resolved);

    for (const cssVar of [...Object.values(PALETTE_VARS), ...DERIVED_VARS]) root.style.removeProperty(cssVar);
    const palette = getActivePalette(values);
    if (palette) {
        for (const key of Object.keys(PALETTE_VARS) as (keyof ThemePalette)[]) root.style.setProperty(PALETTE_VARS[key], palette[key]);
        root.style.setProperty("--input", palette.border);
        root.style.setProperty("--secondary-foreground", palette.ink);
        root.style.setProperty("--accent-foreground", palette.ink);
        root.style.setProperty("--sidebar-primary", palette.primary);
        root.style.setProperty("--sidebar-primary-foreground", palette.primaryForeground);
        root.style.setProperty("--sidebar-accent-foreground", palette.ink);
        root.style.setProperty("--ring", `color-mix(in srgb, ${palette.primary} 35%, transparent)`);
        root.style.setProperty("--ash", palette.muted);
        root.style.setProperty("--stone", palette.border);
    }

    if (values.accent_color) {
        const foreground = readableForeground(values.accent_color);
        root.style.setProperty("--primary", values.accent_color);
        root.style.setProperty("--primary-foreground", foreground);
        root.style.setProperty("--sidebar-primary", values.accent_color);
        root.style.setProperty("--sidebar-primary-foreground", foreground);
        root.style.setProperty("--ring", `color-mix(in srgb, ${values.accent_color} 40%, transparent)`);
    }

    const sans = getFontOption(FontFamilyOptions, values.font_family);
    const mono = getFontOption(MonoFontFamilyOptions, values.mono_font_family);
    ensureFont(sans);
    ensureFont(mono);
    root.style.setProperty("--app-font-sans", sans.stack);
    root.style.setProperty("--app-font-mono", mono.stack);
    // Rem-based sizing: 14px is the design baseline, which maps to the browser default 16px root.
    root.style.fontSize = `${(16 * values.font_size) / DEFAULT_FONT_SIZE}px`;

    forceRepaint();
};

/**
 * Chromium/Electron can leave GPU-composited layers (anything dockview gives its own layer via
 * `transform`/`will-change` for drag/resize — i.e. most of this app's docked panels) showing their
 * *old* colors after a CSS custom property changes purely via `style.setProperty`, even though
 * every element is reading the new value correctly (`getComputedStyle` already reports it) — the
 * layer itself just never gets told to repaint. That's what made switching to a light preset look
 * "half applied": the routed page content repainted, but the surrounding dock chrome (project
 * rail, AI panel, dock tab strips) didn't, and kept showing the old theme until something else
 * (e.g. resizing the window) forced a repaint. Toggling `display` synchronously forces every
 * composited layer under `body` to tear down and repaint with current values, with no visible
 * flash since the browser doesn't paint mid-synchronous-script.
 */
const forceRepaint = () => {
    const { body } = document;
    const prevDisplay = body.style.display;
    body.style.display = "none";
    void body.offsetHeight;
    body.style.display = prevDisplay;
};

let initialized = false;

/** Call once at startup so the first paint uses the stored appearance and later changes apply live. */
export const initAppearance = () => {
    applyAppearance();
    if (initialized) return;
    initialized = true;
    useAppearanceStore.subscribe(() => applyAppearance());
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (getAppearanceValues().mode === "system") applyAppearance();
    });
};
