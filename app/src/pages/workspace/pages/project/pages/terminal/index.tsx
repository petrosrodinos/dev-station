import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import { Plus, SquareTerminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { useCreateTerminal, useKillTerminal, useProjectTerminals } from "@/features/terminals/hooks/use-terminals";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { isDesktop } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { useProjectContext } from "../../hooks/use-project-context";
import { ShellTerminalPanel } from "./shell-terminal-panel";

const SHELL_PANEL_COMPONENT = "shell-terminal";

/** Custom tab so middle-click-to-close works here too (dockview's own default tab has no such support). */
const ShellTabHeader: FC<IDockviewPanelHeaderProps> = ({ api }) => {
  const [active, setActive] = useState(api.isActive);
  useEffect(() => {
    const disposable = api.onDidActiveChange(() => setActive(api.isActive));
    return () => disposable.dispose();
  }, [api]);

  return (
    <div
      role="tab"
      className={cn(
        "group flex h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground",
        active && "border-foreground text-foreground",
      )}
      title={api.title}
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onAuxClick={(e) => e.button === 1 && api.close()}
    >
      <SquareTerminal className="size-3.5 shrink-0" />
      <span className="max-w-32 truncate">{api.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          api.close();
        }}
        aria-label={`Close ${api.title}`}
        className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
};
const shellPanelId = (terminalId: string) => `shell:${terminalId}`;

/**
 * Integrated project shells (Spec §10) — scoped to the project directory, several per project.
 * Same multi-visible-terminal rework as agent sessions (see `session-terminal-stage.tsx`): every
 * terminal is its own dock panel, tabbed together by default but freely splittable, and dockview
 * keeps inactive tabs mounted so background shells stay live.
 */
const TerminalTab: FC = () => {
  const project = useProjectContext();
  const terminals = useProjectTerminals(project.id);
  const create = useCreateTerminal();
  const kill = useKillTerminal();
  const canEdit = usePermissions().can(PermissionKeys.PROJECTS_EDIT);

  const apiRef = useRef<DockviewApi | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const terminalsRef = useRef(terminals);
  terminalsRef.current = terminals;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  const ShellPanel = useCallback<FC<IDockviewPanelProps<{ terminalId: string }>>>(({ params }) => {
    const terminal = terminalsRef.current.find((t) => t.id === params.terminalId);
    return <ShellTerminalPanel terminalId={params.terminalId} alive={terminal?.alive ?? false} readOnly={!canEditRef.current} />;
  }, []);

  // dockview-react calls `updateOptions()` (a *forced full relayout*, unconditionally, regardless of
  // which option actually changed) whenever this prop gets a new identity — a fresh object literal
  // here on every render was re-triggering that relayout on every render, visible as the dock's
  // panels constantly jittering. Memoizing keeps the identity stable unless the panel component changes.
  const components: IDockviewReactProps["components"] = useMemo(() => ({ [SHELL_PANEL_COMPONENT]: ShellPanel }), [ShellPanel]);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    // A tab's native close button removes the panel directly; if that terminal is still a known,
    // live one (not something our own reconcile effect already dropped), kill its backing process too.
    event.api.onDidRemovePanel((panel) => {
      if (!panel.id.startsWith("shell:")) return;
      const terminalId = panel.id.slice("shell:".length);
      if (knownIdsRef.current.has(terminalId)) kill.mutate(terminalId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const existingIds = new Set(api.panels.map((p) => p.id));
    const wantedIds = new Set(terminals.map((t) => shellPanelId(t.id)));
    knownIdsRef.current = new Set(terminals.map((t) => t.id));

    for (const panel of api.panels) {
      if (!wantedIds.has(panel.id)) panel.api.close();
    }
    const anchor = api.panels.find((p) => wantedIds.has(p.id));
    for (const terminal of terminals) {
      const id = shellPanelId(terminal.id);
      if (existingIds.has(id)) continue;
      api.addPanel({
        id,
        component: SHELL_PANEL_COMPONENT,
        title: terminal.title,
        params: { terminalId: terminal.id },
        position: anchor ? { referencePanel: anchor.id, direction: "within" } : undefined,
      });
    }
  }, [terminals]);

  if (!isDesktop()) return <EmptyState className="py-16" icon={<SquareTerminal />} title="Terminals are available in the desktop app" />;

  const openNew = () => create.mutate({ projectId: project.id });

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-2 p-4">
      {canEdit && (
        <div className="flex shrink-0 justify-end">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={openNew} loading={create.isPending}>
            {!create.isPending && <Plus className="size-3.5" />} New terminal
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-terminal">
        {terminals.length ? (
          <DockviewReact className="dockview-theme-abyss h-full" components={components} defaultTabComponent={ShellTabHeader} onReady={onReady} />
        ) : (
          <EmptyState
            className="h-full"
            icon={<SquareTerminal />}
            title="No terminal open"
            description="Opens your default shell in the project folder."
            action={
              canEdit && (
                <Button size="sm" onClick={openNew} loading={create.isPending}>
                  Open terminal
                </Button>
              )
            }
          />
        )}
      </div>
    </div>
  );
};

export default TerminalTab;
