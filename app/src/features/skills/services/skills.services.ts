import type { SendSkillInput, SkillDetail, SkillKind, SkillListResult, SkillProvider } from "@shared/contract";
import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { getBridge, getErrorMessage } from "@/lib/desktop";
import type { CreateSkillDto, CustomSkill, FavoriteSkillDto, SkillFavorite, SkillFavoriteTargetKind, UpdateSkillDto } from "../interfaces/skills.interfaces";

// Skills live on this device's disk; the Electron main process reads them (any provider format).
// Custom skills and favorites are server-side, shared across the organization/devices (see api/src/modules/skills).

const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        throw new Error(getErrorMessage(error, fallback));
    }
};

export const listSkills = (projectId: string | null): Promise<SkillListResult> => wrap(() => getBridge().skills.list(projectId), "Failed to read skills.");
export const readSkill = (skillId: string): Promise<SkillDetail> => wrap(() => getBridge().skills.read(skillId), "Failed to read the skill.");
export const sendSkill = (input: SendSkillInput): Promise<void> => wrap(() => getBridge().skills.send(input), "Failed to send the skill to the session.");
export const sendCustomSkill = (input: { session_id: string; name: string; kind: SkillKind; body: string; submit?: boolean }): Promise<void> =>
    wrap(() => getBridge().skills.sendCustom(input), "Failed to send the skill to the session.");

// --- Custom skills (DB-backed, org-wide) ------------------------------------------------------

const PROVIDER_TO_API: Record<SkillProvider, string> = { claude: "CLAUDE", cursor: "CURSOR", codex: "CODEX", gemini: "GEMINI", copilot: "COPILOT", generic: "GENERIC" };
const PROVIDER_FROM_API: Record<string, SkillProvider> = Object.fromEntries(Object.entries(PROVIDER_TO_API).map(([k, v]) => [v, k as SkillProvider]));

const KIND_TO_API: Record<SkillKind, string> = { skill: "SKILL", command: "COMMAND", rule: "RULE", context: "CONTEXT", doc: "DOC" };
const KIND_FROM_API: Record<string, SkillKind> = Object.fromEntries(Object.entries(KIND_TO_API).map(([k, v]) => [v, k as SkillKind]));

const TARGET_KIND_TO_API: Record<SkillFavoriteTargetKind, string> = { system: "SYSTEM", custom: "CUSTOM" };
const TARGET_KIND_FROM_API: Record<string, SkillFavoriteTargetKind> = { SYSTEM: "system", CUSTOM: "custom" };

interface ApiSkill {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    body: string;
    provider: string;
    kind: string;
    is_public: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

interface ApiSkillFavorite {
    id: string;
    target_kind: string;
    ref_id: string;
}

const fromApiSkill = (s: ApiSkill): CustomSkill => ({ ...s, provider: PROVIDER_FROM_API[s.provider] ?? "generic", kind: KIND_FROM_API[s.kind] ?? "skill" });
const fromApiFavorite = (f: ApiSkillFavorite): SkillFavorite => ({ id: f.id, target_kind: TARGET_KIND_FROM_API[f.target_kind] ?? "custom", ref_id: f.ref_id });

const toApiCreate = (dto: CreateSkillDto) => ({ ...dto, provider: PROVIDER_TO_API[dto.provider], kind: KIND_TO_API[dto.kind] });
const toApiUpdate = (dto: UpdateSkillDto) => ({
    ...dto,
    provider: dto.provider ? PROVIDER_TO_API[dto.provider] : undefined,
    kind: dto.kind ? KIND_TO_API[dto.kind] : undefined,
});

export const listCustomSkills = async (): Promise<CustomSkill[]> => {
    try {
        const response = await axiosInstance.get<ApiSkill[]>(ApiRoutes.skills.prefix);
        return response.data.map(fromApiSkill);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load custom skills."));
    }
};

export const createSkill = async (dto: CreateSkillDto): Promise<CustomSkill> => {
    try {
        const response = await axiosInstance.post<ApiSkill>(ApiRoutes.skills.prefix, toApiCreate(dto));
        return fromApiSkill(response.data);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the skill."));
    }
};

export const updateSkill = async ({ id, ...dto }: UpdateSkillDto & { id: string }): Promise<CustomSkill> => {
    try {
        const response = await axiosInstance.patch<ApiSkill>(ApiRoutes.skills.by_id(id), toApiUpdate(dto));
        return fromApiSkill(response.data);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the skill."));
    }
};

export const deleteSkill = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.skills.by_id(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the skill."));
    }
};

// --- Favorites ----------------------------------------------------------------------------------

export const listFavorites = async (): Promise<SkillFavorite[]> => {
    try {
        const response = await axiosInstance.get<ApiSkillFavorite[]>(ApiRoutes.skills.favorites);
        return response.data.map(fromApiFavorite);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load favorite skills."));
    }
};

export const addFavorite = async (dto: FavoriteSkillDto): Promise<SkillFavorite> => {
    try {
        const response = await axiosInstance.post<ApiSkillFavorite>(ApiRoutes.skills.favorites, { target_kind: TARGET_KIND_TO_API[dto.target_kind], ref_id: dto.ref_id });
        return fromApiFavorite(response.data);
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to favorite the skill."));
    }
};

export const removeFavorite = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.skills.favorite(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to unfavorite the skill."));
    }
};
