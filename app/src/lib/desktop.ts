import type { DevStationBridge } from "@shared/contract";

export const isDesktop = (): boolean => typeof window !== "undefined" && !!window.devStation;

/** The preload bridge. Local workspace features only exist inside the desktop app. */
export const getBridge = (): DevStationBridge => {
  if (!window.devStation) {
    throw new Error("This action is only available in the Dev Station desktop app.");
  }
  return window.devStation;
};

// Bridge errors arrive as "[CODE] message" (custom Error properties don't survive the context bridge).
const CODE_PREFIX = /^(?:Error invoking remote method '[^']+': )?(?:Error: )?\[([A-Z_]+)\]\s*/;

/** Error code set by the main process (see IpcErrorCodes), if any. */
export const getBridgeErrorCode = (error: unknown): string | undefined =>
  error instanceof Error ? error.message.match(CODE_PREFIX)?.[1] : undefined;

export const getErrorMessage = (error: unknown, fallback = "Something went wrong."): string =>
  error instanceof Error && error.message ? error.message.replace(CODE_PREFIX, "") : fallback;
