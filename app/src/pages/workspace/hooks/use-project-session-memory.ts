import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import type { OpenSessions } from "./use-open-sessions";

/**
 * Each project keeps its own current session: the focused session is remembered per project, and
 * switching to a project brings back the session last focused there (or its first open one).
 */
export const useProjectSessionMemory = ({ ordered }: OpenSessions) => {
  const activeProjectId = useWorkspaceStore((s) => s.active_project_id);
  const activeSessionId = useWorkspaceStore((s) => s.active_session_id);
  const remember = useWorkspaceStore((s) => s.rememberProjectSession);
  const setActiveSession = useWorkspaceStore((s) => s.setActiveSession);
  const previousProjectId = useRef(activeProjectId);

  useEffect(() => {
    const item = ordered.find((i) => i.id === activeSessionId);
    if (item) remember(item.project_id, item.id);
  }, [ordered, activeSessionId, remember]);

  useEffect(() => {
    if (previousProjectId.current === activeProjectId) return;
    previousProjectId.current = activeProjectId;
    if (!activeProjectId) return;
    const { active_session_id, session_by_project } = useWorkspaceStore.getState();
    if (ordered.find((i) => i.id === active_session_id)?.project_id === activeProjectId) return;
    const remembered = session_by_project[activeProjectId];
    const target = ordered.find((i) => i.id === remembered) ?? ordered.find((i) => i.project_id === activeProjectId);
    if (target) setActiveSession(target.id);
    // Only reacts to project switches; `ordered` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);
};
