import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";
import { createGitIdentity, deleteGitIdentity, getGitIdentities, updateGitIdentity } from "../services/git-identities.services";
import type { CreateGitIdentityDto, GitIdentity, UpdateGitIdentityDto } from "../interfaces/git-identities.interfaces";

const KEY = ["git-identities"];

/** Mutation keys only. The functions and callbacks live in registerGitIdentityMutations (see config/query/mutation-defaults). */
export const GitIdentityMutationKeys = {
    create: ["git-identities", "create"],
    update: ["git-identities", "update"],
    delete: ["git-identities", "delete"],
} as const;

export const useGitIdentities = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: KEY, queryFn: getGitIdentities, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useCreateGitIdentity = () => useMutation<GitIdentity, Error, CreateGitIdentityDto>({ mutationKey: GitIdentityMutationKeys.create });

export const useUpdateGitIdentity = () =>
    useMutation<GitIdentity, Error, UpdateGitIdentityDto & { id: string }>({ mutationKey: GitIdentityMutationKeys.update });

export const useDeleteGitIdentity = () => useMutation<void, Error, string>({ mutationKey: GitIdentityMutationKeys.delete });

export const registerGitIdentityMutations = (queryClient: QueryClient) => {
    const refreshIdentities = () => queryClient.invalidateQueries({ queryKey: KEY });
    const reportFailure = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

    // Every identity write shares one scope so they replay in the order they were made.
    const scope = { id: "git-identities" };

    queryClient.setMutationDefaults(GitIdentityMutationKeys.create, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: createGitIdentity,
        onSuccess: () => {
            refreshIdentities();
            toast({ title: "Identity added", duration: 1500 });
        },
        onError: reportFailure("Could not add identity"),
    });

    queryClient.setMutationDefaults(GitIdentityMutationKeys.update, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateGitIdentity,
        onSuccess: () => {
            refreshIdentities();
            toast({ title: "Identity saved", duration: 1500 });
        },
        onError: reportFailure("Could not save identity"),
    });

    queryClient.setMutationDefaults(GitIdentityMutationKeys.delete, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: deleteGitIdentity,
        onSuccess: () => {
            refreshIdentities();
            toast({ title: "Identity removed", duration: 1500 });
        },
        onError: reportFailure("Could not remove identity"),
    });
};
