import { useMemo } from "react";
import type { XtermSource } from "@/components/ui/xterm-terminal";
import { createAgentTerminalSource, createShellTerminalSource } from "../services/terminal-source.services";

/** IO adapter for an agent session's PTY (live stdin/stdout + persisted scrollback). */
export const useAgentTerminalSource = (sessionId: string | null): XtermSource | null =>
    useMemo(() => (sessionId ? createAgentTerminalSource(sessionId) : null), [sessionId]);

/** IO adapter for an interactive project shell. */
export const useShellTerminalSource = (terminalId: string | null): XtermSource | null =>
    useMemo(() => (terminalId ? createShellTerminalSource(terminalId) : null), [terminalId]);
