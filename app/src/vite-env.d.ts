/// <reference types="vite/client" />

import type { DevStationBridge } from "@shared/contract";

declare global {
  interface Window {
    /** Present only inside the Electron shell (exposed by the preload script). */
    devStation?: DevStationBridge;
  }

  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_APP_URL?: string;
  }
}
