import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME_PRESET_ID } from "@/config/constants/themes/theme-presets";
import { DEFAULT_FONT_FAMILY_ID, DEFAULT_FONT_SIZE, DEFAULT_MONO_FONT_FAMILY_ID } from "@/config/constants/dropdowns/settings/font-family.options";

// Device-persisted appearance so the first paint is correct; mirrored to the server preferences for cross-device sync.

export type ThemeMode = "light" | "dark" | "system";

export interface AppearanceValues {
    mode: ThemeMode;
    preset_id: string;
    accent_color: string | null;
    font_size: number;
    font_family: string;
    mono_font_family: string;
}

interface AppearanceState extends AppearanceValues {
    /** True once the user changed something on this device; server values no longer override local ones. */
    customized: boolean;
}

interface AppearanceActions {
    update(patch: Partial<AppearanceValues>): void;
    hydrateFromServer(values: AppearanceValues): void;
    resetAll(): void;
}

export const DEFAULT_APPEARANCE: AppearanceValues = {
    mode: "dark",
    preset_id: DEFAULT_THEME_PRESET_ID,
    accent_color: null,
    font_size: DEFAULT_FONT_SIZE,
    font_family: DEFAULT_FONT_FAMILY_ID,
    mono_font_family: DEFAULT_MONO_FONT_FAMILY_ID,
};

const STORE_KEY = "appearance";

/** Carries over the legacy `theme` key (light/dark/system) the first time the new store is created. */
const legacyMode = (): ThemeMode => {
    try {
        const stored = localStorage.getItem("theme");
        return stored === "light" || stored === "dark" || stored === "system" ? stored : DEFAULT_APPEARANCE.mode;
    } catch {
        return DEFAULT_APPEARANCE.mode;
    }
};

export const useAppearanceStore = create<AppearanceState & AppearanceActions>()(
    persist(
        (set) => ({
            ...DEFAULT_APPEARANCE,
            mode: legacyMode(),
            customized: false,
            update: (patch) => set({ ...patch, customized: true }),
            hydrateFromServer: (values) => set({ ...values, customized: false }),
            resetAll: () => set({ ...DEFAULT_APPEARANCE, customized: true }),
        }),
        { name: STORE_KEY },
    ),
);

export const getAppearanceValues = (): AppearanceValues => {
    const { mode, preset_id, accent_color, font_size, font_family, mono_font_family } = useAppearanceStore.getState();
    return { mode, preset_id, accent_color, font_size, font_family, mono_font_family };
};
