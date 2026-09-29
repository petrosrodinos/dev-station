import { create } from "zustand";
import { AppUpdateStates, type AppUpdateStatus } from "@shared/contract";

// electron-updater's live status (checking/downloading/downloaded/...), pushed from the main
// process. Populated once by DesktopEventsProvider; read anywhere (status bar badge, Settings ->
// About) via this store rather than each component re-subscribing to the IPC channel.

interface AppUpdateStoreState {
    status: AppUpdateStatus;
    setStatus: (status: AppUpdateStatus) => void;
}

export const useAppUpdateStore = create<AppUpdateStoreState>((set) => ({
    status: { state: AppUpdateStates.IDLE },
    setStatus: (status) => set({ status }),
}));
