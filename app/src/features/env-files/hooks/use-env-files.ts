import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listEnvFiles, readEnvFile, writeEnvFile } from "../services/env-files.services";
import { getErrorMessage, isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";

/** `.env*` files of the project. Only enabled once the user agreed to let Dev Station read them. */
export const useEnvFiles = (projectId: string, enabled: boolean) =>
    useQuery({ queryKey: ["env-files", projectId], queryFn: () => listEnvFiles(projectId), enabled: isDesktop() && enabled });

export const useEnvFile = (projectId: string, path: string | null, enabled: boolean) =>
    useQuery({
        queryKey: ["env-file", projectId, path],
        queryFn: () => readEnvFile(projectId, path!),
        enabled: isDesktop() && enabled && !!path,
        // Always read the file fresh: it may be edited outside Dev Station.
        staleTime: 0,
        refetchOnWindowFocus: false,
    });

export const useSaveEnvFile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: writeEnvFile,
        onSuccess: (content, vars) => {
            queryClient.setQueryData(["env-file", vars.projectId, vars.path], content);
            queryClient.invalidateQueries({ queryKey: ["env-files"] });
            queryClient.invalidateQueries({ queryKey: ["project-env-keys"] });
            toast({ title: "Environment file saved", description: "Restart running services to pick up the changes.", duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not save the file", description: getErrorMessage(error), variant: "error", duration: 6000 }),
    });
};
