import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SkillListResult } from "@shared/contract";
import {
    addFavorite,
    createSkill,
    deleteSkill,
    listCustomSkills,
    listFavorites,
    listSkills,
    readSkill,
    removeFavorite,
    sendCustomSkill,
    sendSkill,
    updateSkill,
} from "../services/skills.services";
import type { CreateSkillDto, CustomSkill, FavoriteSkillDto, SkillFavorite, UnifiedSkill, UpdateSkillDto } from "../interfaces/skills.interfaces";
import { isDesktop } from "@/lib/desktop";
import { useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";

const CUSTOM_KEY = ["skills", "custom"];
const FAVORITES_KEY = ["skills", "favorites"];

export const useCustomSkills = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: CUSTOM_KEY, queryFn: listCustomSkills, enabled: !!orgId, staleTime: 10_000 });
};

export const useFavorites = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: FAVORITES_KEY, queryFn: listFavorites, enabled: !!orgId, staleTime: 10_000 });
};

/** Merges filesystem-scanned skills (this device) with custom skills + favorites (this organization). */
export const useSkills = (projectId: string | null) => {
    const scanned = useQuery({ queryKey: ["skills", "scanned", projectId], queryFn: () => listSkills(projectId), enabled: isDesktop(), staleTime: 10_000, refetchOnWindowFocus: true });
    const custom = useCustomSkills();
    const favorites = useFavorites();

    const data: { skills: UnifiedSkill[]; scanned: SkillListResult["scanned"] } = useMemo(() => {
        const favoriteByRef = new Map((favorites.data ?? []).map((f) => [`${f.target_kind}:${f.ref_id}`, f]));
        const favoriteFor = (targetKind: "system" | "custom", refId: string): SkillFavorite | undefined => favoriteByRef.get(`${targetKind}:${refId}`);

        const systemSkills: UnifiedSkill[] = (scanned.data?.skills ?? []).map((s) => {
            const favorite = favoriteFor("system", s.id);
            return { ...s, source: "system", is_favorite: !!favorite, favorite_id: favorite?.id ?? null };
        });

        const customSkills: UnifiedSkill[] = (custom.data ?? []).map((s) => {
            const favorite = favoriteFor("custom", s.id);
            return {
                id: s.id,
                name: s.name,
                description: s.description ?? "",
                provider: s.provider,
                scope: "custom",
                kind: s.kind,
                path: "",
                size_bytes: s.body.length,
                meta: {},
                source: "custom",
                is_favorite: !!favorite,
                favorite_id: favorite?.id ?? null,
                body: s.body,
                is_public: s.is_public,
                created_by: s.created_by,
            };
        });

        const all = [...systemSkills, ...customSkills].sort((a, b) => (a.is_favorite === b.is_favorite ? 0 : a.is_favorite ? -1 : 1));
        return { skills: all, scanned: scanned.data?.scanned ?? [] };
    }, [scanned.data, custom.data, favorites.data]);

    return {
        data,
        isPending: scanned.isPending || custom.isPending,
        isFetching: scanned.isFetching || custom.isFetching || favorites.isFetching,
        error: scanned.error ?? custom.error ?? null,
        refetch: () => {
            void scanned.refetch();
            void custom.refetch();
            void favorites.refetch();
        },
    };
};

export const useSkill = (skillId: string | null) =>
    useQuery({ queryKey: ["skill", skillId], queryFn: () => readSkill(skillId as string), enabled: isDesktop() && !!skillId, staleTime: 0 });

export const useSendSkill = () =>
    useMutation({
        mutationFn: sendSkill,
        onError: (error: Error) => toast({ title: "Could not send skill", description: error.message, variant: "error", duration: 6000 }),
    });

export const useSendCustomSkill = () =>
    useMutation({
        mutationFn: sendCustomSkill,
        onError: (error: Error) => toast({ title: "Could not send skill", description: error.message, variant: "error", duration: 6000 }),
    });

export const useCreateSkill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CUSTOM_KEY });
            toast({ title: "Skill created", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not create skill", description: error.message, variant: "error" }),
    });
};

export const useUpdateSkill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars: UpdateSkillDto & { id: string }) => updateSkill(vars),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CUSTOM_KEY });
            toast({ title: "Skill saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save skill", description: error.message, variant: "error" }),
    });
};

export const useDeleteSkill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CUSTOM_KEY });
            queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
            toast({ title: "Skill deleted", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not delete skill", description: error.message, variant: "error" }),
    });
};

export const useFavoriteSkill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: FavoriteSkillDto) => addFavorite(dto),
        onMutate: async (dto) => {
            await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
            const previous = queryClient.getQueryData<SkillFavorite[]>(FAVORITES_KEY);
            const optimistic: SkillFavorite = { id: `optimistic-${dto.target_kind}-${dto.ref_id}`, target_kind: dto.target_kind, ref_id: dto.ref_id };
            queryClient.setQueryData<SkillFavorite[]>(FAVORITES_KEY, (prev) => [...(prev ?? []), optimistic]);
            return { previous };
        },
        onError: (error: Error, _dto, context) => {
            if (context?.previous) queryClient.setQueryData(FAVORITES_KEY, context.previous);
            toast({ title: "Could not favorite skill", description: error.message, variant: "error" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
    });
};

export const useUnfavoriteSkill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (favoriteId: string) => removeFavorite(favoriteId),
        onMutate: async (favoriteId) => {
            await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
            const previous = queryClient.getQueryData<SkillFavorite[]>(FAVORITES_KEY);
            queryClient.setQueryData<SkillFavorite[]>(FAVORITES_KEY, (prev) => prev?.filter((f) => f.id !== favoriteId));
            return { previous };
        },
        onError: (error: Error, _id, context) => {
            if (context?.previous) queryClient.setQueryData(FAVORITES_KEY, context.previous);
            toast({ title: "Could not unfavorite skill", description: error.message, variant: "error" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
    });
};

export type { CreateSkillDto, CustomSkill };
