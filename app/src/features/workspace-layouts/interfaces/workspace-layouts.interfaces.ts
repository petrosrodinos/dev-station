/** A floated-panel's real OS window bounds, serialized alongside a preset's dockview tree. */
export interface FloatingPanelBounds {
    panelId: string;
    componentType: string;
    params: Record<string, unknown>;
    bounds: { x: number; y: number; width: number; height: number };
    displayId?: number;
}

export interface WorkspaceLayoutPreset {
    id: string;
    user_id: string;
    name: string;
    is_default: boolean;
    layout_version: number;
    /** Opaque DockviewApi.toJSON() tree. */
    layout: Record<string, unknown>;
    floating: FloatingPanelBounds[];
    created_at: string;
    updated_at: string;
}

export interface WorkspaceLayoutState {
    id: string;
    user_id: string;
    active_preset_id: string | null;
    preset_by_project: Record<string, string>;
    updated_at: string;
}

export interface CreateLayoutDto {
    name: string;
    layout: Record<string, unknown>;
    floating?: FloatingPanelBounds[];
}

export interface UpdateLayoutDto {
    name?: string;
    layout?: Record<string, unknown>;
    floating?: FloatingPanelBounds[];
}

export interface UpdateLayoutStateDto {
    active_preset_id?: string;
    project_id?: string;
    preset_id?: string;
}
