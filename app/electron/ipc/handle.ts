import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { z, type ZodType } from "zod";
import type { IpcResult } from "../shared/contract";
import { IpcErrorCodes } from "../shared/contract";
import { IpcError } from "./ipc-error";
import { logger } from "../utils/logger";
import { accessManager } from "../managers/access-manager";

let trustedSender: ((event: IpcMainInvokeEvent) => boolean) | null = null;

/** Only frames loaded from our own renderer may call privileged handlers. */
export function setTrustedSenderCheck(check: (event: IpcMainInvokeEvent) => boolean) {
  trustedSender = check;
}

/**
 * Registers an invoke handler whose arguments are validated with zod before reaching any manager.
 * Results are wrapped in an envelope so error messages reach the renderer intact.
 */
export function handle<S extends ZodType, R>(
  channel: string,
  schema: S,
  fn: (args: z.infer<S>) => Promise<R> | R,
  options: { requires?: readonly string[] } = {},
) {
  ipcMain.handle(channel, async (event, ...raw: unknown[]): Promise<IpcResult<R>> => {
    if (trustedSender && !trustedSender(event)) {
      logger.warn(`Rejected IPC ${channel} from untrusted frame ${event.senderFrame?.url}`);
      return { ok: false, error: "Untrusted sender", code: IpcErrorCodes.VALIDATION };
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      logger.warn(`Invalid IPC payload for ${channel}: ${parsed.error.message}`);
      return { ok: false, error: "Invalid request", code: IpcErrorCodes.VALIDATION };
    }

    const missing = options.requires ? accessManager.missing(options.requires) : [];
    if (missing.length) {
      logger.warn(`Rejected IPC ${channel}: missing permission ${missing.join(", ")}`);
      return { ok: false, error: `Missing permission: ${missing.join(", ")}`, code: IpcErrorCodes.FORBIDDEN };
    }

    try {
      const data = await fn(parsed.data);
      return { ok: true, data };
    } catch (error) {
      if (error instanceof IpcError) {
        return { ok: false, error: error.message, code: error.code };
      }
      logger.error(`IPC ${channel} failed`, error);
      return { ok: false, error: error instanceof Error ? error.message : "Unexpected error" };
    }
  });
}

// Reusable argument validators ------------------------------------------------

export const zId = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:.-]+$/);
export const zRelPath = z.string().max(4096).refine((p) => !p.includes("\0"), "Invalid path");
export const zAbsPath = z.string().min(1).max(4096).refine((p) => !p.includes("\0"), "Invalid path");
export const zCols = z.number().int().min(10).max(1000);
export const zRows = z.number().int().min(5).max(500);
