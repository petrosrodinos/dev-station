import type { SkillKind, SkillProvider, SkillSummary } from "@shared/contract";

// DB-backed custom skills + favorites. Renderer-facing shapes keep the same lowercase provider/kind
// strings as the filesystem-scanned SkillSummary (see @shared/contract), so both sources share one
// set of dropdown options; the service layer translates to/from the API's UPPERCASE enum values.

export interface CustomSkill {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    body: string;
    provider: SkillProvider;
    kind: SkillKind;
    /** Visible to the whole organization when true; only to its creator when false. */
    is_public: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateSkillDto {
    name: string;
    description?: string | null;
    body: string;
    provider: SkillProvider;
    kind: SkillKind;
    is_public?: boolean;
}

export type UpdateSkillDto = Partial<CreateSkillDto>;

export const SkillFavoriteTargetKinds = {
    SYSTEM: "system",
    CUSTOM: "custom",
} as const;
export type SkillFavoriteTargetKind = (typeof SkillFavoriteTargetKinds)[keyof typeof SkillFavoriteTargetKinds];

export interface SkillFavorite {
    id: string;
    target_kind: SkillFavoriteTargetKind;
    /** The custom skill's id, or the system-scanned skill's stable scan id. */
    ref_id: string;
}

export interface FavoriteSkillDto {
    target_kind: SkillFavoriteTargetKind;
    ref_id: string;
}

/** A row in the merged Skills tab list — a filesystem-scanned skill or a custom (DB) one. */
export interface UnifiedSkill extends SkillSummary {
    source: "system" | "custom";
    is_favorite: boolean;
    /** The SkillFavorite record's own id, needed to unfavorite; null when not favorited. */
    favorite_id: string | null;
    /** Only set for source "custom" — the DB record already carries full content, no extra fetch needed. */
    body?: string;
    /** Only set for source "custom". */
    is_public?: boolean;
    created_by?: string;
}
