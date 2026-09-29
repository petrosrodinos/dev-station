import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// UI/navigation state of the workspace shell. Persisted per device so project context survives restarts.

export const AiPanelModes = {
    TERMINAL: "terminal",
    SESSIONS: "sessions",
} as const;
export type AiPanelMode = (typeof AiPanelModes)[keyof typeof AiPanelModes];

export interface ProjectPreviewPrefs {
    previewOpen: boolean;
    previewWidth: number;
    previewServiceId: string | null;
    /** Review layout: the preview fills the project area so it sits side by side with the AI panel. */
    previewExpanded: boolean;
}

export const DEFAULT_PREVIEW_WIDTH = 480;
export const DEFAULT_PREVIEW_PREFS: ProjectPreviewPrefs = { previewOpen: false, previewWidth: DEFAULT_PREVIEW_WIDTH, previewServiceId: null, previewExpanded: false };

interface WorkspaceState {
    active_organization_id: string | null;
    active_project_id: string | null;
    /** Session ids open in the AI panel's session list, in the order they were opened. */
    open_session_tabs: string[];
    active_session_id: string | null;
    ai_panel_mode: AiPanelMode;
    ai_panel_open: boolean;
    /** Sessions that finished/await input and haven't been looked at yet (drives nav-rail badges). */
    attention_session_ids: string[];
    /** Sessions the user reviewed (committed or marked reviewed) since the agent last finished. */
    reviewed_session_ids: string[];
    /** Last focused session per project, restored when switching back to that project. */
    session_by_project: Record<string, string>;
    session_list_collapsed: boolean;
    /** Per-project preview panel state (open, width in px, previewed service). */
    preview_by_project: Record<string, ProjectPreviewPrefs>;
}

interface WorkspaceActions {
    setActiveOrganization(id: string | null): void;
    setActiveProject(id: string | null): void;
    openSessionTab(id: string, focus?: boolean): void;
    closeSessionTab(id: string): void;
    setActiveSession(id: string | null): void;
    setAiPanelMode(mode: AiPanelMode): void;
    setAiPanelOpen(open: boolean): void;
    markAttention(id: string): void;
    clearAttention(id: string): void;
    markReviewed(id: string): void;
    clearReviewed(id: string): void;
    rememberProjectSession(projectId: string, sessionId: string): void;
    setSessionListCollapsed(collapsed: boolean): void;
    setProjectPreview(projectId: string, patch: Partial<ProjectPreviewPrefs>): void;
    reset(): void;
}

const initialValues: WorkspaceState = {
    active_organization_id: null,
    active_project_id: null,
    open_session_tabs: [],
    active_session_id: null,
    ai_panel_mode: AiPanelModes.TERMINAL,
    ai_panel_open: true,
    attention_session_ids: [],
    reviewed_session_ids: [],
    session_by_project: {},
    session_list_collapsed: false,
    preview_by_project: {},
};

const STORE_KEY = "workspace";

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
    devtools(
        persist(
            (set) => ({
                ...initialValues,
                setActiveOrganization: (id) =>
                    set((s) => (s.active_organization_id === id ? s : { ...s, active_organization_id: id, active_project_id: null })),
                setActiveProject: (id) => set({ active_project_id: id }),
                openSessionTab: (id, focus = true) =>
                    set((s) => ({
                        open_session_tabs: s.open_session_tabs.includes(id) ? s.open_session_tabs : [...s.open_session_tabs, id],
                        active_session_id: focus ? id : s.active_session_id,
                        ai_panel_mode: focus ? AiPanelModes.TERMINAL : s.ai_panel_mode,
                        ai_panel_open: focus ? true : s.ai_panel_open,
                        attention_session_ids: focus ? s.attention_session_ids.filter((x) => x !== id) : s.attention_session_ids,
                    })),
                closeSessionTab: (id) =>
                    set((s) => {
                        const tabs = s.open_session_tabs.filter((x) => x !== id);
                        const idx = s.open_session_tabs.indexOf(id);
                        const nextActive = s.active_session_id === id ? tabs[Math.min(idx, tabs.length - 1)] ?? null : s.active_session_id;
                        return {
                            open_session_tabs: tabs,
                            active_session_id: nextActive,
                            attention_session_ids: s.attention_session_ids.filter((x) => x !== id),
                            reviewed_session_ids: s.reviewed_session_ids.filter((x) => x !== id),
                        };
                    }),
                setActiveSession: (id) =>
                    set((s) => ({ active_session_id: id, attention_session_ids: id ? s.attention_session_ids.filter((x) => x !== id) : s.attention_session_ids })),
                setAiPanelMode: (mode) => set({ ai_panel_mode: mode }),
                setAiPanelOpen: (open) => set({ ai_panel_open: open }),
                markAttention: (id) =>
                    set((s) => (s.attention_session_ids.includes(id) ? s : { attention_session_ids: [...s.attention_session_ids, id] })),
                clearAttention: (id) => set((s) => ({ attention_session_ids: s.attention_session_ids.filter((x) => x !== id) })),
                markReviewed: (id) =>
                    set((s) => ({
                        reviewed_session_ids: s.reviewed_session_ids.includes(id) ? s.reviewed_session_ids : [...s.reviewed_session_ids, id],
                        attention_session_ids: s.attention_session_ids.filter((x) => x !== id),
                    })),
                clearReviewed: (id) => set((s) => (s.reviewed_session_ids.includes(id) ? { reviewed_session_ids: s.reviewed_session_ids.filter((x) => x !== id) } : s)),
                rememberProjectSession: (projectId, sessionId) =>
                    set((s) => (s.session_by_project[projectId] === sessionId ? s : { session_by_project: { ...s.session_by_project, [projectId]: sessionId } })),
                setSessionListCollapsed: (collapsed) => set({ session_list_collapsed: collapsed }),
                setProjectPreview: (projectId, patch) =>
                    set((s) => ({
                        preview_by_project: {
                            ...s.preview_by_project,
                            [projectId]: { ...DEFAULT_PREVIEW_PREFS, ...s.preview_by_project[projectId], ...patch },
                        },
                    })),
                reset: () => set(initialValues),
            }),
            { name: STORE_KEY },
        ),
    ),
);

export const getWorkspaceStoreState = () => useWorkspaceStore.getState();
