import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// UI/navigation state of the workspace shell. Persisted per device so project context survives restarts.

export const AiPanelModes = {
    TERMINAL: "terminal",
    SESSIONS: "sessions",
} as const;
export type AiPanelMode = (typeof AiPanelModes)[keyof typeof AiPanelModes];

interface WorkspaceState {
    active_organization_id: string | null;
    active_project_id: string | null;
    /** Session ids open as tabs in the global tab strip, in display order. */
    open_session_tabs: string[];
    active_session_id: string | null;
    ai_panel_mode: AiPanelMode;
    ai_panel_open: boolean;
    /** Sessions that finished/await input and haven't been looked at yet (drives nav-rail badges). */
    attention_session_ids: string[];
    collapsed_client_ids: string[];
}

interface WorkspaceActions {
    setActiveOrganization(id: string | null): void;
    setActiveProject(id: string | null): void;
    openSessionTab(id: string, focus?: boolean): void;
    closeSessionTab(id: string): void;
    reorderSessionTabs(ids: string[]): void;
    setActiveSession(id: string | null): void;
    setAiPanelMode(mode: AiPanelMode): void;
    setAiPanelOpen(open: boolean): void;
    markAttention(id: string): void;
    clearAttention(id: string): void;
    toggleClientCollapsed(id: string): void;
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
    collapsed_client_ids: [],
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
                        return { open_session_tabs: tabs, active_session_id: nextActive };
                    }),
                reorderSessionTabs: (ids) => set({ open_session_tabs: ids }),
                setActiveSession: (id) =>
                    set((s) => ({ active_session_id: id, attention_session_ids: id ? s.attention_session_ids.filter((x) => x !== id) : s.attention_session_ids })),
                setAiPanelMode: (mode) => set({ ai_panel_mode: mode }),
                setAiPanelOpen: (open) => set({ ai_panel_open: open }),
                markAttention: (id) =>
                    set((s) => (s.attention_session_ids.includes(id) ? s : { attention_session_ids: [...s.attention_session_ids, id] })),
                clearAttention: (id) => set((s) => ({ attention_session_ids: s.attention_session_ids.filter((x) => x !== id) })),
                toggleClientCollapsed: (id) =>
                    set((s) => ({
                        collapsed_client_ids: s.collapsed_client_ids.includes(id) ? s.collapsed_client_ids.filter((x) => x !== id) : [...s.collapsed_client_ids, id],
                    })),
                reset: () => set(initialValues),
            }),
            { name: STORE_KEY },
        ),
    ),
);

export const getWorkspaceStoreState = () => useWorkspaceStore.getState();
