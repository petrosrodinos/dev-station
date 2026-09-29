import type { FC } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import { useShellTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { SquareTerminal } from "lucide-react";

/** One project shell as a standalone dock panel — see terminal tab `index.tsx` for the reconcile logic. */
export const ShellTerminalPanel: FC<{ terminalId: string; alive: boolean; readOnly: boolean }> = ({ terminalId, alive, readOnly }) => {
  const source = useShellTerminalSource(terminalId);
  if (!source) return <EmptyState className="h-full" icon={<SquareTerminal />} title="Terminal unavailable" />;
  return <XtermTerminal source={source} sourceKey={terminalId} readOnly={!alive || readOnly} className="h-full" />;
};
