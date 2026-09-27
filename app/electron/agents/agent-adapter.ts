import type { AgentRuntimeStatus, AgentType } from "../shared/contract";

/**
 * A pluggable AI coding agent CLI (Spec §12/§13). Adding a new agent means adding one adapter —
 * the manager, IPC and UI are agent-agnostic.
 */
export interface AgentAdapter {
  type: AgentType;
  name: string;
  /** Executable looked up on PATH unless the user configured an explicit path. */
  defaultExecutable: string;
  /** Arguments for a new interactive session, optionally seeded with an initial prompt. */
  buildArgs(prompt: string | null): string[];
  /** Arguments to continue the most recent session in an external terminal window. */
  resumeArgs(): string[];
  /**
   * Optional structured status signal from recent (ANSI-stripped) output. Return null to fall back
   * to the generic heuristics (process exit / output idle).
   */
  inferStatus?(recentOutput: string): AgentRuntimeStatus | null;
}
