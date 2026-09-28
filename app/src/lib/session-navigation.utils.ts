import type { NavigateFunction } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";

/** Switches to the session's project and focuses its tab. Returns false when the project is unknown. */
export function jumpToSession(sessionId: string, navigate: NavigateFunction, fallbackProjectId?: string | null): boolean {
  const workspace = useWorkspaceStore.getState();
  const projectId = useRuntimeStore.getState().agents[sessionId]?.project_id ?? fallbackProjectId;
  if (!projectId) return false;
  workspace.setActiveProject(projectId);
  navigate(Routes.workspace.project(projectId));
  workspace.openSessionTab(sessionId);
  return true;
}

/** Jumps to the most recent session that finished / needs input and hasn't been looked at yet. */
export function jumpToAttentionSession(navigate: NavigateFunction): boolean {
  const { attention_session_ids } = useWorkspaceStore.getState();
  for (let i = attention_session_ids.length - 1; i >= 0; i--) {
    if (jumpToSession(attention_session_ids[i], navigate)) return true;
  }
  return false;
}
