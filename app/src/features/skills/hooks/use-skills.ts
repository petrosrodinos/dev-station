import { useMutation, useQuery } from "@tanstack/react-query";
import { listSkills, readSkill, sendSkill } from "../services/skills.services";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";

export const useSkills = (projectId: string | null) =>
    useQuery({ queryKey: ["skills", projectId], queryFn: () => listSkills(projectId), enabled: isDesktop(), staleTime: 10_000, refetchOnWindowFocus: true });

export const useSkill = (skillId: string | null) =>
    useQuery({ queryKey: ["skill", skillId], queryFn: () => readSkill(skillId as string), enabled: isDesktop() && !!skillId, staleTime: 0 });

export const useSendSkill = () =>
    useMutation({
        mutationFn: sendSkill,
        onError: (error: Error) => toast({ title: "Could not send skill", description: error.message, variant: "error", duration: 6000 }),
    });
