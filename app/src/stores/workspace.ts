import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { ProjectTabs } from "@/config/constants/dropdowns/projects/project-tab.options";

/**
 * Tabs a project starts with open, before the user has opened/closed anything (the rest — Terminal,
 * AI Sessions, Skills — stay closed until picked from the dock's "+" menu, keeping a fresh project
 * from opening every section at once).
 */
export const DEFAULT_OPEN_PROJECT_TAB_IDS: string[] = [ProjectTabs.OVERVIEW, ProjectTabs.GIT, ProjectTabs.FILES, ProjectTabs.INTEGRATIONS];

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
    /** Address typed into the preview bar; null follows the previewed service's URL. */
    previewUrl: string | null;
    /** Review layout: the preview fills the project area so it sits side by side with the AI panel. */
    previewExpanded: boolean;
}

/** A file open in the Files tab's editor row. Unpinned = the single-click preview tab, replaced by the next single click. */
export interface OpenFileTab {
    path: string;
    pinned: boolean;
}

export const DEFAULT_FILES_TREE_WIDTH = 320;
export const DEFAULT_PREVIEW_WIDTH = 480;
export const DEFAULT_PREVIEW_PREFS: ProjectPreviewPrefs = { previewOpen: false, previewWidth: DEFAULT_PREVIEW_WIDTH, previewServiceId: null, previewUrl: null, previewExpanded: false };

interface WorkspaceState {
    active_organization_id: string | null;
    active_project_id: string | null;
    /** Session ids open in the AI panel's session list, in the order they were opened. */
    open_session_tabs: string[];
    active_session_id: string | null;
    ai_panel_mode: AiPanelMode;
    ai_panel_open: boolean;
    /** Sidebar edge chosen on this device; wins over the account value so a move applies even if the save fails. */
    rail_position: RailPosition | null;
    /** Project sidebar folded to a thin strip on this device; the strip keeps a button to bring it back. */
    rail_collapsed: boolean;
    /** Sessions that finished/await input and haven't been looked at yet (drives nav-rail badges). */
    attention_session_ids: string[];
    /** Sessions the user reviewed (committed or marked reviewed) since the agent last finished. */
    reviewed_session_ids: string[];
    /** Last focused session per project, restored when switching back to that project. */
    session_by_project: Record<string, string>;
    /** Per-project preview panel state (open, width in px, previewed service). */
    preview_by_project: Record<string, ProjectPreviewPrefs>;
    /** Which project tabs are open as dock panels, per project (Phase 2 of the docking system: project tab pages became dockable). */
    open_project_tabs: Record<string, string[]>;
    /** Each project's dock arrangement (splits/groups/sizes) as `DockviewApi.toJSON()`, per project — restored on revisit so a split layout survives navigating away/reloading, not just which tabs are open. */
    project_dock_layout: Record<string, Record<string, unknown>>;
    /** Files open in each project's Files tab editor row, in tab order (double-click keeps a file open). */
    open_file_tabs: Record<string, OpenFileTab[]>;
    /** Width in px of the Files tab's folder tree panel on this device. */
    files_tree_width: number;
}

interface WorkspaceActions {
    setActiveOrganization(id: string | null): void;
    setActiveProject(id: string | null): void;
    openSessionTab(id: string, focus?: boolean): void;
    closeSessionTab(id: string): void;
    setActiveSession(id: string | null): void;
    setAiPanelMode(mode: AiPanelMode): void;
    setAiPanelOpen(open: boolean): void;
    setRailPosition(position: RailPosition | null): void;
    setRailCollapsed(collapsed: boolean): void;
    markAttention(id: string): void;
    clearAttention(id: string): void;
    markReviewed(id: string): void;
    clearReviewed(id: string): void;
    rememberProjectSession(projectId: string, sessionId: string): void;
    setProjectPreview(projectId: string, patch: Partial<ProjectPreviewPrefs>): void;
    openProjectTab(projectId: string, tab: string): void;
    closeProjectTab(projectId: string, tab: string): void;
    saveProjectDockLayout(projectId: string, layout: Record<string, unknown>): void;
    setOpenFileTabs(projectId: string, tabs: OpenFileTab[]): void;
    setFilesTreeWidth(width: number): void;
    reset(): void;
}

const initialValues: WorkspaceState = {
    active_organization_id: null,
    active_project_id: null,
    open_session_tabs: [],
    active_session_id: null,
    ai_panel_mode: AiPanelModes.TERMINAL,
    ai_panel_open: true,
    rail_position: null,
    rail_collapsed: false,
    attention_session_ids: [],
    reviewed_session_ids: [],
    session_by_project: {},
    preview_by_project: {},
    open_project_tabs: {},
    project_dock_layout: {},
    open_file_tabs: {},
    files_tree_width: DEFAULT_FILES_TREE_WIDTH,
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
                setRailPosition: (position) => set({ rail_position: position }),
                setRailCollapsed: (collapsed) => set({ rail_collapsed: collapsed }),
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
                setProjectPreview: (projectId, patch) =>
                    set((s) => ({
                        preview_by_project: {
                            ...s.preview_by_project,
                            [projectId]: { ...DEFAULT_PREVIEW_PREFS, ...s.preview_by_project[projectId], ...patch },
                        },
                    })),
                openProjectTab: (projectId, tab) =>
                    set((s) => {
                        const open = s.open_project_tabs[projectId] ?? DEFAULT_OPEN_PROJECT_TAB_IDS;
                        return open.includes(tab) ? s : { open_project_tabs: { ...s.open_project_tabs, [projectId]: [...open, tab] } };
                    }),
                closeProjectTab: (projectId, tab) =>
                    set((s) => {
                        // Materialize the default set before removing one, otherwise the first-ever close
                        // would wipe every other default tab instead of just this one.
                        const open = s.open_project_tabs[projectId] ?? DEFAULT_OPEN_PROJECT_TAB_IDS;
                        return { open_project_tabs: { ...s.open_project_tabs, [projectId]: open.filter((t) => t !== tab) } };
                    }),
                saveProjectDockLayout: (projectId, layout) =>
                    set((s) => ({ project_dock_layout: { ...s.project_dock_layout, [projectId]: layout } })),
                setOpenFileTabs: (projectId, tabs) =>
                    set((s) => ({ open_file_tabs: { ...s.open_file_tabs, [projectId]: tabs } })),
                setFilesTreeWidth: (width) => set({ files_tree_width: width }),
                reset: () => set(initialValues),
            }),
            { name: STORE_KEY },
        ),
    ),
);

export const getWorkspaceStoreState = () => useWorkspaceStore.getState();
