import type { StateStorage } from "zustand/middleware";
import { isDesktop } from "@/lib/desktop";

/**
 * zustand storage adapter: inside Electron the value is encrypted with the OS keychain (safeStorage)
 * by the main process; in a plain browser (dev:web) it falls back to localStorage.
 */
export const secureStateStorage: StateStorage = {
  getItem: async (name) => {
    if (isDesktop()) return (await window.devStation!.secure.get(name as "auth")) ?? null;
    return localStorage.getItem(name);
  },
  setItem: async (name, value) => {
    if (isDesktop()) return window.devStation!.secure.set(name as "auth", value);
    localStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    if (isDesktop()) return window.devStation!.secure.remove(name as "auth");
    localStorage.removeItem(name);
  },
};
