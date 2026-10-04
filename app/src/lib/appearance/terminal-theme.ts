import type { ITheme } from "@xterm/xterm";
import { MonoFontFamilyOptions, DEFAULT_FONT_SIZE, getFontOption } from "@/config/constants/dropdowns/settings/font-family.options";
import { getActivePalette, primaryColor } from "@/lib/appearance/apply-appearance";
import type { AppearanceValues } from "@/stores/appearance";

const BASE_BACKGROUND = "#050505";
const BASE_FOREGROUND = "#d7f7dd";

const ANSI: ITheme = {
    black: "#1a1a1b",
    red: "#ff6161",
    green: "#59d499",
    yellow: "#ffc533",
    blue: "#57c1ff",
    magenta: "#c49bff",
    cyan: "#4fd1c5",
    white: "#cdcdcd",
    brightBlack: "#6a6b6c",
    brightRed: "#ff8a8a",
    brightGreen: "#8be3b8",
    brightYellow: "#ffd76a",
    brightBlue: "#8fd6ff",
    brightMagenta: "#d7b8ff",
    brightCyan: "#7fe3da",
    brightWhite: "#ffffff",
};

/**
 * Terminal colors follow the active preset's terminal surface; ANSI colors stay fixed for tool-output legibility.
 * The surface is dark in every mode, so the text color comes from the dark palette too: a light-mode ink
 * would be dark-on-dark here.
 */
export const buildTerminalTheme = (values: AppearanceValues): ITheme => {
    const palette = getActivePalette({ ...values, mode: "dark" });
    const background = palette?.terminal ?? BASE_BACKGROUND;
    const foreground = palette ? palette.ink : BASE_FOREGROUND;
    const accent = primaryColor(values) ?? BASE_FOREGROUND;
    return { ...ANSI, background, foreground, cursor: accent, cursorAccent: background, selectionBackground: `${accent}55` };
};

export const buildTerminalFont = (values: AppearanceValues) => ({
    fontFamily: getFontOption(MonoFontFamilyOptions, values.mono_font_family).stack,
    fontSize: (12.5 * values.font_size) / DEFAULT_FONT_SIZE,
});
