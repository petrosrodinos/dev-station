import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getProjectLocalStates,
    getWorkspaceConfig,
    inspectPath,
    inspectProject,
    setProjectPath,
    updateDeviceSettings,
} from "../services/local-workspace.services";
import { isDesktop } from "@/lib/desktop";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { toast } from "@/hooks/use-toast";
import type { ProjectLocalState } from "@shared/contract";
import { ProjectLocalStates } from "@shared/contract";

export const useWorkspaceConfig = () =>
    useQuery({ queryKey: ["workspace-config"], queryFn: getWorkspaceConfig, enabled: isDesktop(), staleTime: Infinity });

export const useUpdateDeviceSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDeviceSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workspace-config"] });
            queryClient.invalidateQueries({ queryKey: ["agent-adapters"] });
            toast({ title: "Device settings saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save settings", description: error.message, variant: "error" }),
    });
};

export const useSetProjectPath = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setProjectPath,
        onSuccess: (_config, vars) => {
            queryClient.invalidateQueries({ queryKey: ["workspace-config"] });
            queryClient.invalidateQueries({ queryKey: ["project-local-states"] });
            queryClient.invalidateQueries({ queryKey: ["git-status"] });
            toast({ title: vars.path ? "Local folder linked" : "Local folder unlinked", description: vars.path ?? undefined, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not link folder", description: error.message, variant: "error" }),
    });
};

/** LOCAL / IMPORTED / MISSING for every project in the active organization (Spec §26). */
export const useProjectLocalStates = () => {
    const { data: projects } = useGetProjects();
    const ids = (projects ?? []).map((p) => p.id);
    return useQuery({
        queryKey: ["project-local-states", ids],
        queryFn: () => getProjectLocalStates(ids),
        // A changed project list is a new key; keep the last answer meanwhile so every project
        // doesn't briefly read as "not local" (which disables Git status and blanks its UI).
        placeholderData: keepPreviousData,
        enabled: isDesktop() && ids.length > 0,
        refetchInterval: 20_000,
        refetchOnWindowFocus: true,
    });
};

export const useProjectLocalState = (projectId: string | null | undefined): ProjectLocalState | null => {
    const { data } = useProjectLocalStates();
    if (!projectId) return null;
    if (!isDesktop()) return ProjectLocalStates.IMPORTED;
    return data?.[projectId] ?? null;
};

export const useInspectProject = (projectId: string | null, enabled = true) =>
    useQuery({ queryKey: ["project-detection", projectId], queryFn: () => inspectProject(projectId!), enabled: isDesktop() && !!projectId && enabled });

export const useInspectPath = () => {
    return useMutation({
        mutationFn: inspectPath,
        onSuccess: (result) =>
            toast({ title: "Project inspected", description: `${result.services.length} service${result.services.length === 1 ? "" : "s"} detected`, duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not inspect folder", description: error.message, variant: "error" }),
    });
};
