import { useEffect, useState, type FC } from "react";
import { Plus, SquareTerminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { XtermTerminal } from "@/components/ui/xterm-terminal";
import { useCreateTerminal, useKillTerminal, useProjectTerminals } from "@/features/terminals/hooks/use-terminals";
import { useShellTerminalSource } from "@/features/terminals/hooks/use-terminal-source";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { useProjectContext } from "../../hooks/use-project-context";

/** Integrated project shells (Spec §10) — scoped to the project directory, several per project. */
const TerminalTab: FC = () => {
  const project = useProjectContext();
  const terminals = useProjectTerminals(project.id);
  const create = useCreateTerminal();
  const kill = useKillTerminal();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = terminals.find((t) => t.id === activeId) ?? terminals[terminals.length - 1] ?? null;
  const source = useShellTerminalSource(active?.id ?? null);

  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);

  if (!isDesktop()) return <EmptyState className="py-16" icon={<SquareTerminal />} title="Terminals are available in the desktop app" />;

  const openNew = () => create.mutate({ projectId: project.id }, { onSuccess: (t) => setActiveId(t.id) });

  return (
    <div className="flex h-full min-h-[420px] flex-col p-4">
      <div className="flex items-center gap-1 rounded-t-lg border border-b-0 bg-surface px-1.5 py-1">
        {terminals.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={cn("group flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs text-body hover:bg-surface-elevated", active?.id === t.id && "bg-surface-elevated text-foreground")}
          >
            <StatusDot status={t.alive ? "running" : "stopped"} />
            {t.title}
            <button
              onClick={(e) => {
                e.stopPropagation();
                kill.mutate(t.id);
              }}
              className="flex size-4 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100"
              aria-label={`Close ${t.title}`}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={openNew} loading={create.isPending}>
          {!create.isPending && <Plus className="size-3.5" />} New terminal
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-b-lg border bg-terminal">
        {active && source ? (
          <XtermTerminal key={active.id} source={source} sourceKey={active.id} readOnly={!active.alive} />
        ) : (
          <EmptyState
            className="h-full"
            icon={<SquareTerminal />}
            title="No terminal open"
            description="Opens your default shell in the project folder."
            action={
              <Button size="sm" onClick={openNew} loading={create.isPending}>
                Open terminal
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
};

export default TerminalTab;
