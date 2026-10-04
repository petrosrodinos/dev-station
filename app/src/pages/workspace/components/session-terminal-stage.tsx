import { useCallback, useEffect, useMemo, useRef, type FC } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDialogsStore } from "@/stores/dialogs";
import { useLayoutStore } from "@/stores/layout";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { SessionTerminalPanel } from "./session-terminal-panel";

const SESSION_PANEL_COMPONENT = "session-terminal";
const sessionPanelId = (sessionId: string) => `session:${sessionId}`;

/**
 * Multi-visible-session-terminal rework (docking system spec §C): every session in
 * `open_session_tabs` becomes its own dock panel instead of a single mounted terminal, so several
 * can be split/tabbed side by side and stay live in the background — dockview keeps inactive tab
 * panels mounted rather than unmounting them, which is exactly what's needed here. Deliberately a
 * nested dock instance (scoped to the AI panel's terminal area) rather than flattened into the
 * workspace-level dock root, so the existing session navigator/header chrome above it is untouched.
 *
 * dockview's own tab strip is hidden via the `.session-terminal-dock` CSS rule (see index.css) —
 * `SessionNavigator` above already provides the same select/close controls with a nicer UI, so a
 * second generic tab strip here would just be a duplicate. Hidden with plain CSS rather than
 * dockview's `hideHeader` group option: that option requires going through its `addGroup`/group
 * API correctly (undocumented internal branching that threw `invalid direction 'undefined'` for
 * us twice), whereas CSS can't get that wrong.
 */
export function SessionTerminalStage({ onNext }: { onNext: () => void }) {
  const apiRef = useRef<DockviewApi | null>(null);
  const openTabs = useWorkspaceStore((s) => s.open_session_tabs);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const setActiveSession = useWorkspaceStore((s) => s.setActiveSession);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const floatingIds = useLayoutStore((s) => s.floating);
  const { can } = usePermissions();

  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  const SessionPanel: FC<IDockviewPanelProps<{ sessionId: string }>> = useCallback(
    ({ params, api }) => <SessionTerminalPanel sessionId={params.sessionId} onNext={() => onNextRef.current()} panelApi={api} />,
    [],
  );

  // dockview-react calls `updateOptions()` (a *forced full relayout*, unconditionally, regardless of
  // which option actually changed) whenever any of these props gets a new identity — a fresh object
  // literal here on every render was re-triggering that relayout on every render this component made
  // (which, sitting under the always-visible AI panel, is often), visible as the dock's tabs/panels
  // constantly jittering. Memoizing keeps the identity stable unless the panel component itself changes.
  const components: IDockviewReactProps["components"] = useMemo(() => ({ [SESSION_PANEL_COMPONENT]: SessionPanel }), [SessionPanel]);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    event.api.onDidActivePanelChange(({ panel }) => {
      if (panel?.id.startsWith("session:")) setActiveSession(panel.id.slice("session:".length));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile dock panels against the flat list of open session tabs — add newly-opened ones
  // (tabbed alongside any existing ones, so today's "one strip of tabs" look is the default; the
  // user can still drag a tab out to see two terminals live at once), remove closed ones.
  useEffect(() => {
    // Closing the last tab swaps the dock for the empty state, which disposes it — drop the stale
    // handle so nothing below calls into a disposed dockview ("resource already disposed").
    if (!openTabs.length) {
      apiRef.current = null;
      return;
    }
    const api = apiRef.current;
    if (!api) return;
    const floatingPanelIds = new Set(floatingIds.map((f) => f.panelId));
    const existingIds = new Set(api.panels.map((p) => p.id));
    // A floated session's panel is intentionally absent from the dock — it's showing in its own
    // OS window instead — until that window closes (see `use-floating-panels-sync.ts`).
    const wantedIds = new Set(openTabs.filter((id) => !floatingPanelIds.has(sessionPanelId(id))).map(sessionPanelId));

    for (const panel of api.panels) {
      if (!wantedIds.has(panel.id)) panel.api.close();
    }
    const anchor = api.panels.find((p) => wantedIds.has(p.id));
    for (const sessionId of openTabs) {
      const id = sessionPanelId(sessionId);
      if (existingIds.has(id) || !wantedIds.has(id)) continue;
      api.addPanel({
        id,
        component: SESSION_PANEL_COMPONENT,
        params: { sessionId },
        position: anchor ? { referencePanel: anchor.id, direction: "within" } : undefined,
      });
    }
  }, [openTabs, floatingIds]);

  // Keep the dock's focused tab following the store's active session (e.g. after "next review").
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !activeId || !openTabs.length) return;
    api.getPanel(sessionPanelId(activeId))?.api.setActive();
  }, [activeId, openTabs.length]);

  if (!openTabs.length) {
    return (
      <EmptyState
        className="flex-1"
        icon={<Terminal />}
        title="No session open"
        description="Start Claude Code or Cursor CLI inside a project. The agent runs as a real CLI with its terminal embedded here."
        action={
          can(PermissionKeys.AI_START_AGENTS) && (
            <Button size="sm" onClick={() => openNewSession({ project_id: activeProjectId })}>
              New AI session
            </Button>
          )
        }
      />
    );
  }

  return <DockviewReact className="dockview-theme-abyss session-terminal-dock min-h-0 flex-1" components={components} onReady={onReady} />;
}
