import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createSecretSet, deleteSecretSet, getSecretSet, getSecretSets, updateSecretSet } from "../services/project-secrets.services";

const listKey = (projectId: string) => ["project-secret-sets", projectId] as const;
const setKey = (projectId: string, setId: string) => ["project-secret-set", projectId, setId] as const;

export const useSecretSets = (projectId: string, enabled = true) =>
    useQuery({ queryKey: listKey(projectId), queryFn: () => getSecretSets(projectId), enabled });

/** Decrypted values. Never kept around: refetched on every open and dropped as soon as nothing uses them. */
export const useSecretSet = (projectId: string, setId: string | null, enabled = true) =>
    useQuery({
        queryKey: setKey(projectId, setId ?? ""),
        queryFn: () => getSecretSet({ projectId, setId: setId! }),
        enabled: enabled && !!setId,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
    });

/** Secrets are never queued offline: a write either reaches the server now or fails loudly. */
export const useCreateSecretSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSecretSet,
        onSuccess: (set) => {
            queryClient.invalidateQueries({ queryKey: listKey(set.project_id) });
            toast({ title: "Shared secrets saved", description: set.name, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not save the secrets", description: error.message, variant: "error" }),
    });
};

export const useUpdateSecretSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSecretSet,
        onSuccess: (set) => {
            queryClient.invalidateQueries({ queryKey: listKey(set.project_id) });
            queryClient.removeQueries({ queryKey: setKey(set.project_id, set.id) });
            toast({ title: "Shared secrets updated", description: set.name, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not update the secrets", description: error.message, variant: "error" }),
    });
};

export const useDeleteSecretSet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSecretSet,
        onSuccess: (_void, vars) => {
            queryClient.invalidateQueries({ queryKey: listKey(vars.projectId) });
            queryClient.removeQueries({ queryKey: setKey(vars.projectId, vars.setId) });
            toast({ title: "Shared secrets deleted", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not delete the secrets", description: error.message, variant: "error" }),
    });
};
