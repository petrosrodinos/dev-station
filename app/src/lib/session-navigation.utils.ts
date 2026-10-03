import type { NavigateFunction } from "react-router-dom";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { isDesktop } from "@/lib/desktop";
import { Routes } from "@/routes/routes";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";

interface JumpOptions {
  fallbackProjectId?: string | null;
  /**
   * Review the session's result: also shows the project's preview (in the side-by-side review
   * layout when the preview was closed). Pass the project list so projects without services are skipped.
   */
  review?: { projects: Project[] | undefined };
}

/** Switches to the session's project (keeping the open tab) and focuses the session. Returns false when the project is unknown. */
export function jumpToSession(sessionId: string, navigate: NavigateFunction, options: JumpOptions = {}): boolean {
  const workspace = useWorkspaceStore.getState();
  const projectId = useRuntimeStore.getState().agents[sessionId]?.project_id ?? options.fallbackProjectId;
  if (!projectId) return false;
  workspace.setActiveProject(projectId);
  navigate(Routes.workspace.project(projectId));
  workspace.openSessionTab(sessionId);

  const project = options.review?.projects?.find((p) => p.id === projectId);
  if (project && project.services.length > 0 && isDesktop() && !workspace.preview_by_project[projectId]?.previewOpen) {
    workspace.setProjectPreview(projectId, { previewOpen: true, previewExpanded: true });
  }
  return true;
}
