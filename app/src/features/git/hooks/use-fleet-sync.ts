import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { getGitStatus, gitFetch, gitPull } from "../services/git.services";
import { canFastForward, getAttentionReasons } from "../utils/attention.utils";
import type { FleetSyncResult, ProjectAttention } from "../interfaces/git-attention.interfaces";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useRuntimeStore } from "@/stores/runtime";
import { toast } from "@/hooks/use-toast";
import { ProjectLocalStates } from "@shared/contract";

/** Live attention state for every local project. Shares the `git-status` cache with each project card. */
export const useFleetAttention = (projects: Project[], localStates: Record<string, string> | undefined): ProjectAttention[] => {
    const local = projects.filter((p) => localStates?.[p.id] === ProjectLocalStates.LOCAL);
    const results = useQueries({
        queries: local.map((p) => ({ queryKey: ["git-status", p.id], queryFn: () => getGitStatus(p.id), refetchInterval: 20_000, refetchOnWindowFocus: true })),
    });
    const { processes, agents } = useRuntimeStore(useShallow((s) => ({ processes: s.processes, agents: s.agents })));
    return local
        .map((project, i) => {
            const git = results[i]?.data ?? null;
            const reasons = getAttentionReasons(
                git,
                Object.values(processes).filter((p) => p.project_id === project.id),
                Object.values(agents).filter((a) => a.project_id === project.id),
            );
            return { project, git, reasons };
        })
        .filter((a) => a.reasons.length > 0);
};

/** Fetch every project, then fast-forward the ones that are safely behind. Never touches dirty or diverged trees. */
export const useFleetSync = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (projects: Project[]): Promise<FleetSyncResult> => {
            const result: FleetSyncResult = { fetched: 0, pulled: [], failed: [], skipped: 0 };
            await Promise.all(
                projects.map(async (p) => {
                    try {
                        await gitFetch(p.id);
                        result.fetched += 1;
                        const git = await getGitStatus(p.id);
                        if (!canFastForward(git)) {
                            if (git.behind > 0) result.skipped += 1;
                            return;
                        }
                        await gitPull(p.id);
                        result.pulled.push(p.name);
                    } catch {
                        result.failed.push(p.name);
                    }
                }),
            );
            return result;
        },
        onSuccess: (r) => {
            ["git-status", "git-branches", "git-log"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            const parts = [`Fetched ${r.fetched}`];
            if (r.pulled.length) parts.push(`updated ${r.pulled.join(", ")}`);
            if (r.skipped) parts.push(`${r.skipped} behind with local work, left alone`);
            toast({ title: "Synced all projects", description: parts.join(" · "), duration: 4000 });
            if (r.failed.length) toast({ title: "Some projects failed to sync", description: r.failed.join(", "), variant: "error", duration: 6000 });
        },
        onError: (error: Error) => toast({ title: "Sync failed", description: error.message, variant: "error" }),
    });
};
