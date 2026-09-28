import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    disconnectConnection,
    getGithubRepositories,
    getIntegrations,
    getLinearIssue,
    getLinearIssues,
    getLinearProjects,
    getLinearTeamMembers,
    getLinearTeams,
    getLinearTeamStates,
    getNotionPage,
    getNotionPages,
    initiateConnection,
    refreshConnection,
    updateConnection,
    updateLinearIssue,
} from "../services/integrations.services";
import type { IntegrationProvider, LinearIssuesQuery } from "../interfaces/integrations.interfaces";
import { ConnectionStatuses } from "../interfaces/integrations.interfaces";
import { useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";

export const useGetIntegrations = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: ["integrations", orgId], queryFn: getIntegrations, enabled: !!orgId });
};

/** Active connections for one provider, default first — used by project pickers. */
export const useProviderConnections = (provider: IntegrationProvider) => {
    const query = useGetIntegrations();
    const connections = (query.data?.find((i) => i.provider === provider)?.connections ?? [])
        .filter((c) => c.status === ConnectionStatuses.ACTIVE)
        .sort((a, b) => Number(b.is_default) - Number(a.is_default));
    return { ...query, connections };
};

export const useInitiateConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: initiateConnection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["integrations"] });
            toast({ title: "Finish connecting in your browser", description: "Return here once you've authorized access.", duration: 4000 });
        },
        onError: (error: Error) => toast({ title: "Could not start connection", description: error.message, variant: "error" }),
    });
};

/** `silent` is for background polling after OAuth: only a successful connection is announced. */
export const useRefreshConnection = (options: { silent?: boolean } = {}) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: refreshConnection,
        onSuccess: (connection) => {
            queryClient.invalidateQueries({ queryKey: ["integrations"] });
            if (options.silent && connection.status !== ConnectionStatuses.ACTIVE) return;
            toast({
                title: connection.status === ConnectionStatuses.ACTIVE ? "Account connected" : "Connection not active yet",
                description: connection.external_account ?? connection.label,
                duration: 2500,
            });
        },
        onError: (error: Error) => {
            if (!options.silent) toast({ title: "Could not refresh connection", description: error.message, variant: "error" });
        },
    });
};

export const useUpdateConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateConnection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["integrations"] });
            toast({ title: "Connection updated", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update connection", description: error.message, variant: "error" }),
    });
};

export const useDisconnectConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: disconnectConnection,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["integrations"] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Account disconnected", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not disconnect", description: error.message, variant: "error" }),
    });
};

export const useGetGithubRepositories = (connectionId: string | null, search: string) =>
    useQuery({
        queryKey: ["github-repositories", connectionId, search],
        queryFn: () => getGithubRepositories(connectionId!, search),
        enabled: !!connectionId,
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

export const useGetLinearTeams = (connectionId: string | null) =>
    useQuery({ queryKey: ["linear-teams", connectionId], queryFn: () => getLinearTeams(connectionId!), enabled: !!connectionId, staleTime: 5 * 60_000 });

export const useGetLinearProjects = (connectionId: string | null, teamId: string | null) =>
    useQuery({
        queryKey: ["linear-projects", connectionId, teamId],
        queryFn: () => getLinearProjects(connectionId!, teamId),
        enabled: !!connectionId,
        staleTime: 5 * 60_000,
    });

export const useGetLinearIssues = (connectionId: string | null, query: LinearIssuesQuery) =>
    useQuery({
        queryKey: ["linear-issues", connectionId, query],
        queryFn: () => getLinearIssues(connectionId!, query),
        enabled: !!connectionId,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

export const useGetLinearIssue = (connectionId: string | null, issueId: string | null) =>
    useQuery({
        queryKey: ["linear-issue", connectionId, issueId],
        queryFn: () => getLinearIssue(connectionId!, issueId!),
        enabled: !!connectionId && !!issueId,
        staleTime: 30_000,
    });

export const useGetLinearTeamStates = (connectionId: string | null, teamId: string | null | undefined) =>
    useQuery({
        queryKey: ["linear-team-states", connectionId, teamId],
        queryFn: () => getLinearTeamStates(connectionId!, teamId!),
        enabled: !!connectionId && !!teamId,
        staleTime: 5 * 60_000,
    });

export const useGetLinearTeamMembers = (connectionId: string | null, teamId: string | null | undefined) =>
    useQuery({
        queryKey: ["linear-team-members", connectionId, teamId],
        queryFn: () => getLinearTeamMembers(connectionId!, teamId!),
        enabled: !!connectionId && !!teamId,
        staleTime: 5 * 60_000,
    });

export const useUpdateLinearIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateLinearIssue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["linear-issues"] });
            queryClient.invalidateQueries({ queryKey: ["linear-issue"] });
            toast({ title: "Issue updated", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update issue", description: error.message, variant: "error" }),
    });
};

export const useGetNotionPages = (connectionId: string | null, search: string) =>
    useQuery({
        queryKey: ["notion-pages", connectionId, search],
        queryFn: () => getNotionPages(connectionId!, search),
        enabled: !!connectionId,
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

export const useGetNotionPage = (connectionId: string | null, pageId: string | null) =>
    useQuery({
        queryKey: ["notion-page", connectionId, pageId],
        queryFn: () => getNotionPage(connectionId!, pageId!),
        enabled: !!connectionId && !!pageId,
        staleTime: 60_000,
    });
