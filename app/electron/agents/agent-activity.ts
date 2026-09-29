// Type-only import keeps this module runnable under the node:test type-stripping runner.
import type { AgentRuntimeStatus } from "../shared/contract";

/** Output this soon after the user submitted is the CLI echoing/acknowledging it, not the agent working. */
export const ECHO_WINDOW_MS = 1200;

export interface ResumeCheck {
  /** When the agent went idle (entered AWAITING_INPUT). */
  awaitingSince: number;
  /** When the user last submitted input (a line ending in Enter) to the agent. */
  lastSubmitAt: number;
  now: number;
  /** Adapter status hint for the new output chunk alone. */
  hinted: AgentRuntimeStatus | null;
}

/**
 * Whether output from an idle agent means it started working again. TUI agents keep redrawing
 * while idle (resizes when the terminal is re-fitted, status lines, focus changes), so plain output
 * is not enough: the agent must show it is working, or the user must have sent it something.
 * Otherwise every redraw would restart the idle timer and re-announce the session as finished.
 */
export function resumesWork({ awaitingSince, lastSubmitAt, now, hinted }: ResumeCheck): boolean {
  if (hinted === "RUNNING") return true;
  return lastSubmitAt > awaitingSince && now - lastSubmitAt >= ECHO_WINDOW_MS;
}

/** Whether data written to the agent's PTY submits something (Enter), as opposed to typing or navigation keys. */
export const isSubmit = (data: string) => data.includes("\r") || data.includes("\n");
