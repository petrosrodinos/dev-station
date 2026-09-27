import type { IpcErrorCodes } from "../shared/contract";

type IpcErrorCode = (typeof IpcErrorCodes)[keyof typeof IpcErrorCodes];

/** An error whose message is safe to show to the user; everything else is reported generically. */
export class IpcError extends Error {
  readonly code?: IpcErrorCode;

  constructor(message: string, code?: IpcErrorCode) {
    super(message);
    this.name = "IpcError";
    this.code = code;
  }
}
