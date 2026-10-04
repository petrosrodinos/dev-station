import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { X } from "lucide-react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IDockviewReactProps,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import type { FloatingWindowPanel } from "@shared/contract";
import type { ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { useProject } from "@/features/projects/hooks/use-projects";
import { getBridge } from "@/lib/desktop";
import { cn } from "@/lib/utils";
import { ProjectContext } from "@/pages/workspace/pages/project/hooks/use-project-context";
import { TAB_PAGES, tabPermission } from "@/pages/workspace/pages/project/pages/tab-pages";
import { SessionTerminalPanel } from "@/pages/workspace/components/session-terminal-panel";

const PROJECT_TAB_COMPONENT = "project-tab";
const SESSION_TERMINAL_COMPONENT = "session-terminal";

const ProjectTabPanel: FC<IDockviewPanelProps<{ projectId: string; tab: ProjectTab }>> = ({ params }) => {
  const { can } = usePermissions();
  const { project, isPending } = useProject(params.projectId);
  const Page = TAB_PAGES[params.tab];
  const permission = tabPermission(params.tab);
  // No redirect here: a Navigate would move this whole floating window onto a workspace route.
  if (isPending || !project || !Page || (permission && !can(permission))) return null;
  return (
    <ProjectContext.Provider value={project}>
      <div className="@container h-full min-h-0 overflow-y-auto">
        <Page />
      </div>
    </ProjectContext.Provider>
  );
};

const SessionPanel: FC<IDockviewPanelProps<{ sessionId: string }>> = ({ params, api }) => {
  return <SessionTerminalPanel sessionId={params.sessionId} onNext={() => undefined} panelApi={api} />;
};

const DOCK_COMPONENTS: IDockviewReactProps["components"] = {
  [PROJECT_TAB_COMPONENT]: ProjectTabPanel,
  [SESSION_TERMINAL_COMPONENT]: SessionPanel,
};

const FloatingTabHeader: FC<IDockviewPanelHeaderProps> = ({ api }) => {
  const [active, setActive] = useState(api.isActive);
  const [title, setTitle] = useState(api.title ?? "");
  useEffect(() => {
    const disposables = [
      api.onDidActiveChange(() => setActive(api.isActive)),
      api.onDidTitleChange(() => setTitle(api.title ?? "")),
    ];
    return () => disposables.forEach((disposable) => disposable.dispose());
  }, [api]);
  return (
    <div
      className={cn(
        "group flex h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground",
        active && "border-foreground text-foreground",
      )}
      title={title}
    >
      <span>{title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          api.close();
        }}
        aria-label={`Dock ${title} back`}
        className="flex size-4 shrink-0 items-center justify-center rounded-xs text-ash opacity-0 hover:bg-surface-card hover:text-foreground group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  );
};

/**
 * Hosts several dock panels in one floating window. The main process owns which panels belong here and
 * pushes the full list; this component only mirrors it. Closing a panel here docks it back, and removals
 * that come from the main process are not echoed back to it.
 */
export const FloatingWindowDock: FC<{ panels: FloatingWindowPanel[] }> = ({ panels }) => {
  const apiRef = useRef<DockviewApi | null>(null);
  const panelsRef = useRef(panels);
  const reconcilingRef = useRef(false);

  const reconcile = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const wanted = panelsRef.current;
    const wantedIds = new Set(wanted.map((panel) => panel.panelId));
    reconcilingRef.current = true;
    try {
      for (const panel of api.panels) {
        if (!wantedIds.has(panel.id)) panel.api.close();
      }
      let anchor = api.panels[0];
      for (const panel of wanted) {
        if (api.getPanel(panel.panelId)) continue;
        const added = api.addPanel({
          id: panel.panelId,
          component: panel.componentType,
          title: panel.title,
          params: panel.params,
          position: anchor ? { referencePanel: anchor.id, direction: "within" } : undefined,
        });
        anchor ??= added;
      }
    } finally {
      reconcilingRef.current = false;
    }
  }, []);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      apiRef.current = event.api;
      event.api.onDidRemovePanel((panel) => {
        if (reconcilingRef.current) return;
        void getBridge().layout.closeFloatingPanel(panel.id);
      });
      reconcile();
    },
    [reconcile],
  );

  useEffect(() => {
    panelsRef.current = panels;
    reconcile();
  }, [panels, reconcile]);

  return (
    <div className="h-full min-h-0">
      <DockviewReact
        className="dockview-theme-abyss h-full"
        components={DOCK_COMPONENTS}
        defaultTabComponent={FloatingTabHeader}
        onReady={onReady}
      />
    </div>
  );
};
