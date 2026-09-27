import type { XtermSource } from "@/components/ui/xterm-terminal";
import { getBridge } from "@/lib/desktop";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";

// PTY IO adapters consumed by the presentational <XtermTerminal />.

export const createAgentTerminalSource = (sessionId: string): XtermSource => ({
    loadScrollback: () => getBridge().agents.scrollback(sessionId),
    subscribe: (onData) => getBridge().agents.onData((e) => e.id === sessionId && onData(e.data)),
    write: (data) => void getBridge().agents.write(sessionId, data).catch(() => undefined),
    resize: (cols, rows) => void getBridge().agents.resize(sessionId, cols, rows).catch(() => undefined),
    openLink: (url) => void openUrl(url),
});

export const createShellTerminalSource = (terminalId: string): XtermSource => ({
    loadScrollback: () => getBridge().terminals.scrollback(terminalId),
    subscribe: (onData) => getBridge().terminals.onData((e) => e.id === terminalId && onData(e.data)),
    write: (data) => void getBridge().terminals.write(terminalId, data).catch(() => undefined),
    resize: (cols, rows) => void getBridge().terminals.resize(terminalId, cols, rows).catch(() => undefined),
    openLink: (url) => void openUrl(url),
});
