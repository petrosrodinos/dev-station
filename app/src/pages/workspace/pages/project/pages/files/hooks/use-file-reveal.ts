import { create } from "zustand";

export interface RevealRequest {
  path: string;
  /** 1-based. */
  line: number;
  /** 0-based. */
  column: number;
  length: number;
  /** Bumped per request so clicking the same match twice still scrolls. */
  nonce: number;
}

interface FileRevealState {
  request: RevealRequest | null;
  reveal(target: Omit<RevealRequest, "nonce">): void;
}

/** A pending "jump to this match" for the code editor: search results set it, the editor consumes it once the file is loaded. */
export const useFileRevealStore = create<FileRevealState>((set, get) => ({
  request: null,
  reveal: (target) => set({ request: { ...target, nonce: (get().request?.nonce ?? 0) + 1 } }),
}));
