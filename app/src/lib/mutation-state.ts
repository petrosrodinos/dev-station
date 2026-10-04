import { onlineManager } from "@tanstack/react-query";

/**
 * True when a write submitted now will be parked in the offline outbox instead of sent. Dialogs use it to
 * close on submit: the outbox owns the write and says so in a toast, so the user isn't left on a spinner.
 */
export const willQueueWrite = (): boolean => !onlineManager.isOnline();

/**
 * A write parked in the outbox doesn't block the UI: it replays when the connection returns. Use this
 * instead of `isPending` wherever an in-flight write locks a dialog or button.
 */
export const isBlockingMutation = (mutation: { isPending: boolean; isPaused: boolean }): boolean => mutation.isPending && !mutation.isPaused;
