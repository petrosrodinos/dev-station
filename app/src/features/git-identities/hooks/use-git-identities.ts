import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { createGitIdentity, deleteGitIdentity, getGitIdentities, updateGitIdentity } from "../services/git-identities.services";

const KEY = ["git-identities"];

export const useGitIdentities = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: KEY, queryFn: getGitIdentities, enabled: !!isLoggedIn, staleTime: 60_000 });
};

const useIdentityMutation = <TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, successTitle: string, errorTitle: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEY });
            toast({ title: successTitle, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: errorTitle, description: error.message, variant: "error" }),
    });
};

export const useCreateGitIdentity = () => useIdentityMutation(createGitIdentity, "Identity added", "Could not add identity");
export const useUpdateGitIdentity = () => useIdentityMutation(updateGitIdentity, "Identity saved", "Could not save identity");
export const useDeleteGitIdentity = () => useIdentityMutation(deleteGitIdentity, "Identity removed", "Could not remove identity");
