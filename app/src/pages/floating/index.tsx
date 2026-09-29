import { useEffect, useMemo, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { RequirePermission } from "@/components/access/require-permission";
import { SessionTerminalPanel } from "@/pages/workspace/components/session-terminal-panel";
import { useSessionGroups } from "@/pages/workspace/hooks/use-session-groups";
import { ProjectContext } from "@/pages/workspace/pages/project/hooks/use-project-context";
import { TAB_PAGES, tabPermission } from "@/pages/workspace/pages/project/pages/tab-pages";
import type { ProjectTab } from "@/config/constants/dropdowns/projects/project-tab.options";
import { useProject } from "@/features/projects/hooks/use-projects";
import { Routes } from "@/routes/routes";

/**
 * Bare window a floated dock panel opens into (docking system §C) — no top bar/rail/status bar,
 * just the panel's own content plus a minimal title bar. Loaded by
 * `electron/managers/floating-panel-manager.ts` into a real OS `BrowserWindow`, at this same
 * renderer bundle's `/floating` route, so it reuses every existing provider (auth, React Query,
 * Zustand stores hydrated from the same localStorage) with no separate bootstrap. See
 * `use-floating-panels-sync.ts` for how closing this window "docks it back".
 */
const FloatingPanelPage: FC = () => {
  const [search] = useSearchParams();
  const componentType = search.get("componentType") ?? "";
  const title = search.get("title") ?? "Dev Station";
  const params = useMemo<Record<string, unknown>>(() => {
    try {
      return JSON.parse(search.get("params") ?? "{}");
    } catch {
      return {};
    }
  }, [search]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="flex h-screen flex-col bg-canvas text-foreground">
      <div className="app-drag flex h-8 shrink-0 items-center justify-between border-b px-3 text-[0.7188rem] text-muted-foreground">
        <span className="truncate">{title}</span>
        <button className="app-no-drag rounded-xs p-0.5 hover:bg-surface-elevated hover:text-foreground" onClick={() => window.close()} aria-label="Close and dock back">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <FloatingPanelContent componentType={componentType} params={params} />
      </div>
    </div>
  );
};

const FloatingPanelContent: FC<{ componentType: string; params: Record<string, unknown> }> = ({ componentType, params }) => {
  const groups = useSessionGroups();

  if (componentType === "session-terminal" && typeof params.sessionId === "string") {
    return <SessionTerminalPanel sessionId={params.sessionId} groups={groups} onNext={() => undefined} />;
  }
  if (componentType === "project-tab" && typeof params.projectId === "string" && typeof params.tab === "string") {
    return <ProjectTabHost projectId={params.projectId} tab={params.tab as ProjectTab} />;
  }
  return <EmptyState className="h-full" title="Unsupported floating panel" />;
};

const ProjectTabHost: FC<{ projectId: string; tab: ProjectTab }> = ({ projectId, tab }) => {
  const { project, isPending } = useProject(projectId);
  const Page = TAB_PAGES[tab];
  if (isPending || !project || !Page) return null;
  const permission = tabPermission(tab);
  const content = permission ? (
    <RequirePermission permission={permission} redirectTo={Routes.workspace.project(projectId)}>
      <Page />
    </RequirePermission>
  ) : (
    <Page />
  );
  return <ProjectContext.Provider value={project}>{content}</ProjectContext.Provider>;
};

export default FloatingPanelPage;
