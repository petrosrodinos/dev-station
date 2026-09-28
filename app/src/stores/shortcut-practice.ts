import { create } from "zustand";
import { persist } from "zustand/middleware";

// Device-only high scores for the shortcut challenge.

interface ShortcutPracticeState {
    best_score: number;
    best_streak: number;
}

interface ShortcutPracticeActions {
    recordRun(run: { score: number; best_streak: number }): void;
}

const STORE_KEY = "shortcut-practice";

export const useShortcutPracticeStore = create<ShortcutPracticeState & ShortcutPracticeActions>()(
    persist(
        (set) => ({
            best_score: 0,
            best_streak: 0,
            recordRun: (run) => set((s) => ({ best_score: Math.max(s.best_score, run.score), best_streak: Math.max(s.best_streak, run.best_streak) })),
        }),
        { name: STORE_KEY },
    ),
);
