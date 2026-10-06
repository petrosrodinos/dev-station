import { create } from "zustand";
import { AppUpdateStates, type AppUpdateStatus } from "@shared/contract";

// electron-updater's live status (checking/downloading/downloaded/...), pushed from the main
// process. Populated by DesktopEventsProvider (initial snapshot + pushes); read anywhere (status
// bar dot, Install/Skip banner, Settings -> About) via this store.

interface AppUpdateStoreState {
    status: AppUpdateStatus;
    /** Version the user dismissed with "Skip". Session-only: the banner returns after a relaunch. */
    skippedVersion: string | null;
    setStatus: (status: AppUpdateStatus) => void;
    skip: (version: string) => void;
}

export const useAppUpdateStore = create<AppUpdateStoreState>((set) => ({
    status: { state: AppUpdateStates.IDLE },
    skippedVersion: null,
    setStatus: (status) => set({ status }),
    skip: (version) => set({ skippedVersion: version }),
}));
