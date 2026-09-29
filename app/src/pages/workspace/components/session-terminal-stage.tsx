import { useCallback, useEffect, useRef, type FC } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DockviewReact,
  type AddGroupOptions,
  type DockviewApi,
  type DockviewGroupPanel,
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
import type { SessionGroups } from "../hooks/use-session-groups";

const SESSION_PANEL_COMPONENT = "session-terminal";
const sessionPanelId = (sessionId: string) => `session:${sessionId}`;

/**
 * Multi-visible-session-terminal rework (docking system spec §C): every session in
 * `open_session_tabs` becomes its own dock panel instead of a single mounted terminal, so several
 * can be split/tabbed side by side and stay live in the background — dockview keeps inactive tab
 * panels mounted rather than unmounting them, which is exactly what's needed here. Deliberately a
 * nested dock instance (scoped to the AI panel's terminal area) rather than flattened into the
 * workspace-level dock root, so the existing session navigator/header chrome above it is untouched.
 */
export function SessionTerminalStage({ groups, onNext }: { groups: SessionGroups; onNext: () => void }) {
  const apiRef = useRef<DockviewApi | null>(null);
  // The default group's header is hidden — `SessionNavigator` above already shows a nicer,
  // project-grouped tab strip with the same open/close/select controls, so dockview's own generic
  // tab strip would just be a duplicate underneath it. A group created by dragging a tab into a
  // split still gets a normal header, since at that point it genuinely needs one.
  const defaultGroupRef = useRef<DockviewGroupPanel | null>(null);
  const openTabs = useWorkspaceStore((s) => s.open_session_tabs);
  const activeId = useWorkspaceStore((s) => s.active_session_id);
  const setActiveSession = useWorkspaceStore((s) => s.setActiveSession);
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const floatingIds = useLayoutStore((s) => s.floating);
  const { can } = usePermissions();

  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  const SessionPanel: FC<IDockviewPanelProps<{ sessionId: string }>> = useCallback(
    ({ params, api }) => <SessionTerminalPanel sessionId={params.sessionId} groups={groupsRef.current} onNext={() => onNextRef.current()} panelApi={api} />,
    [],
  );

  const components: IDockviewReactProps["components"] = { [SESSION_PANEL_COMPONENT]: SessionPanel };

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    try {
      // `direction` is required here — dockview throws "invalid direction 'undefined'"
      // without it, which silently prevented `hideHeader` from ever taking effect (the group
      // was never created, so every panel fell back into a normal, header-visible one).
      defaultGroupRef.current = event.api.addGroup({ hideHeader: true, direction: "within" } as AddGroupOptions);
    } catch (error) {
      console.error("Failed to create the hidden-header session group", error);
    }
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
    // handles so nothing below calls into a disposed dockview ("resource already disposed").
    if (!openTabs.length) {
      apiRef.current = null;
      defaultGroupRef.current = null;
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
        position: anchor
          ? { referencePanel: anchor.id, direction: "within" }
          : defaultGroupRef.current
            ? { referenceGroup: defaultGroupRef.current, direction: "within" }
            : undefined,
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

  return <DockviewReact className="dockview-theme-abyss min-h-0 flex-1" components={components} onReady={onReady} />;
}
