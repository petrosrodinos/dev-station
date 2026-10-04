import { keepPreviousData, useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import {
    archiveNotionPage,
    createNotionPage,
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
    updateNotionPage,
} from "../services/integrations.services";
import type {
    CreateNotionPageDto,
    InitiateConnectionResponse,
    IntegrationConnection,
    IntegrationProvider,
    LinearIssue,
    LinearIssuesQuery,
    NotionPageContent,
    UpdateLinearIssueDto,
    UpdateNotionPageDto,
} from "../interfaces/integrations.interfaces";
import { ConnectionStatuses } from "../interfaces/integrations.interfaces";
import { useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";

/** Mutation keys only. The functions and callbacks live in registerIntegrationMutations (see config/query/mutation-defaults). */
export const IntegrationMutationKeys = {
    initiateConnection: ["integrations", "initiate-connection"],
    refreshConnection: ["integrations", "refresh-connection"],
    pollConnection: ["integrations", "poll-connection"],
    updateConnection: ["integrations", "update-connection"],
    disconnectConnection: ["integrations", "disconnect-connection"],
    updateLinearIssue: ["integrations", "update-linear-issue"],
    createNotionPage: ["integrations", "create-notion-page"],
    updateNotionPage: ["integrations", "update-notion-page"],
    archiveNotionPage: ["integrations", "archive-notion-page"],
} as const;

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

export const useInitiateConnection = () =>
    useMutation<InitiateConnectionResponse, Error, { provider: IntegrationProvider; label?: string }>({ mutationKey: IntegrationMutationKeys.initiateConnection });

/** `silent` is for background polling after OAuth: only a successful connection is announced. Polling has its own key, so the registry needs no hook argument. */
export const useRefreshConnection = (options: { silent?: boolean } = {}) =>
    useMutation<IntegrationConnection, Error, string>({
        mutationKey: options.silent ? IntegrationMutationKeys.pollConnection : IntegrationMutationKeys.refreshConnection,
    });

export const useUpdateConnection = () =>
    useMutation<IntegrationConnection, Error, { id: string; label?: string; is_default?: boolean }>({ mutationKey: IntegrationMutationKeys.updateConnection });

export const useDisconnectConnection = () => useMutation<void, Error, string>({ mutationKey: IntegrationMutationKeys.disconnectConnection });

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

export const useUpdateLinearIssue = () =>
    useMutation<LinearIssue, Error, UpdateLinearIssueDto & { connectionId: string; issueId: string }>({ mutationKey: IntegrationMutationKeys.updateLinearIssue });

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

export const useCreateNotionPage = () =>
    useMutation<NotionPageContent, Error, CreateNotionPageDto & { connectionId: string }>({ mutationKey: IntegrationMutationKeys.createNotionPage });

export const useUpdateNotionPage = () =>
    useMutation<NotionPageContent, Error, UpdateNotionPageDto & { connectionId: string; pageId: string }>({ mutationKey: IntegrationMutationKeys.updateNotionPage });

export const useArchiveNotionPage = () =>
    useMutation<void, Error, { connectionId: string; pageId: string }>({ mutationKey: IntegrationMutationKeys.archiveNotionPage });

export const registerIntegrationMutations = (queryClient: QueryClient) => {
    const refreshIntegrations = () => queryClient.invalidateQueries({ queryKey: ["integrations"] });
    const announceRefresh = (connection: IntegrationConnection) =>
        toast({
            title: connection.status === ConnectionStatuses.ACTIVE ? "Account connected" : "Connection not active yet",
            description: connection.external_account ?? connection.label,
            duration: 2500,
        });

    // Queued writes edit the user's own integration data. They pause offline and replay in order.
    const queuedScope = { id: "integrations" };

    // OAuth and destructive calls fail fast. They keep the default networkMode and never queue.
    queryClient.setMutationDefaults(IntegrationMutationKeys.initiateConnection, {
        mutationFn: initiateConnection,
        onSuccess: () => {
            refreshIntegrations();
            toast({ title: "Finish connecting in your browser", description: "Return here once you've authorized access.", duration: 4000 });
        },
        onError: (error: Error) => toast({ title: "Could not start connection", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.refreshConnection, {
        mutationFn: refreshConnection,
        onSuccess: (connection) => {
            refreshIntegrations();
            announceRefresh(connection);
        },
        onError: (error: Error) => toast({ title: "Could not refresh connection", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.pollConnection, {
        mutationFn: refreshConnection,
        onSuccess: (connection) => {
            refreshIntegrations();
            if (connection.status === ConnectionStatuses.ACTIVE) announceRefresh(connection);
        },
        // Background polling is silent on failure; the next poll or a manual refresh reports it.
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.updateConnection, {
        ...QUEUED_MUTATION_POLICY,
        scope: queuedScope,
        mutationFn: updateConnection,
        onSuccess: () => {
            refreshIntegrations();
            toast({ title: "Connection updated", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update connection", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.disconnectConnection, {
        mutationFn: disconnectConnection,
        onSuccess: () => {
            refreshIntegrations();
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Account disconnected", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not disconnect", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.updateLinearIssue, {
        ...QUEUED_MUTATION_POLICY,
        scope: queuedScope,
        mutationFn: updateLinearIssue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["linear-issues"] });
            queryClient.invalidateQueries({ queryKey: ["linear-issue"] });
            toast({ title: "Issue updated", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update issue", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.createNotionPage, {
        mutationFn: createNotionPage,
        onSuccess: (page, { connectionId }) => {
            queryClient.setQueryData(["notion-page", connectionId, page.id], page);
            queryClient.invalidateQueries({ queryKey: ["notion-pages", connectionId] });
            toast({ title: "Page created", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not create page", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.updateNotionPage, {
        ...QUEUED_MUTATION_POLICY,
        scope: queuedScope,
        mutationFn: updateNotionPage,
        onSuccess: (page, { connectionId }) => {
            queryClient.setQueryData(["notion-page", connectionId, page.id], page);
            queryClient.invalidateQueries({ queryKey: ["notion-pages", connectionId] });
            toast({ title: "Page saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save page", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(IntegrationMutationKeys.archiveNotionPage, {
        mutationFn: archiveNotionPage,
        onSuccess: (_, { connectionId, pageId }) => {
            queryClient.removeQueries({ queryKey: ["notion-page", connectionId, pageId] });
            queryClient.invalidateQueries({ queryKey: ["notion-pages", connectionId] });
            toast({ title: "Page moved to trash", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not archive page", description: error.message, variant: "error" }),
    });
};
