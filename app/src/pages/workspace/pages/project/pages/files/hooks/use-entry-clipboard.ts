import { create } from "zustand";

export interface ClipboardEntry {
  projectId: string;
  path: string;
  mode: "cut" | "copy";
}

interface EntryClipboardState {
  entry: ClipboardEntry | null;
  set(entry: ClipboardEntry): void;
  clear(): void;
}

/** The file tree's own cut / copy buffer (separate from the system clipboard, which Copy Path uses). */
export const useEntryClipboard = create<EntryClipboardState>((set) => ({
  entry: null,
  set: (entry) => set({ entry }),
  clear: () => set({ entry: null }),
}));
