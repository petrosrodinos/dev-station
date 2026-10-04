import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createAgentSession, deleteAgentSession, getAgentCatalog, getAgentSessions, updateAgentSession } from "../services/agent-sessions.services";
import { forgetAgentProcess, getAgentAdapters, openAgentExternally, restartAgentProcess, startAgentProcess, stopAgentProcess } from "../services/agent-runtime.services";
import type { AgentSession, AgentSessionsQuery, CreateAgentSessionDto, UpdateAgentSessionDto } from "../interfaces/agent-sessions.interfaces";
import { getAgentCommands } from "@/features/agent-commands/services/agent-commands.services";
import { AGENT_COMMANDS_KEY } from "@/features/agent-commands/hooks/use-agent-commands";
import { linkProjectIssue } from "@/features/projects/services/projects.services";
import { useRuntimeStore } from "@/stores/runtime";
import { getWorkspaceStoreState, useWorkspaceStore } from "@/stores/workspace";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";
import { AgentRuntimeStatuses, type AgentRuntimeStatus, type AgentSessionInfo } from "@shared/contract";

/**
 * Mutation keys for the API-only session writes. Hooks that touch the local agent process (start, stop,
 * relaunch, close tab, delete) stay inline and are not queued.
 */
export const AgentSessionMutationKeys = {
    markReviewed: ["agent-sessions", "mark-reviewed"],
    rename: ["agent-sessions", "rename"],
} as const;

export const useAgentSessions = (query: AgentSessionsQuery = {}) => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({
        queryKey: ["agent-sessions", orgId, query],
        queryFn: () => getAgentSessions({ limit: 100, ...query }),
        enabled: !!orgId,
        refetchInterval: 30_000,
    });
};

export const useAgentAdapters = () => useQuery({ queryKey: ["agent-adapters"], queryFn: getAgentAdapters, enabled: isDesktop(), staleTime: 60_000 });

export const useAgentCatalog = () => useQuery({ queryKey: ["agent-catalog"], queryFn: getAgentCatalog, staleTime: Infinity });

/** Sessions whose CLI ran on this device; their process only exists while the app is open. */
export const ranOnDevice = (session: AgentSession | null, deviceId: string | null | undefined) => !!session?.device_id && session.device_id === deviceId;

/** Runtime status wins; a session that ran here with no live process has stopped. */
export const mergeSessionStatus = (session: AgentSession | null, runtime: AgentSessionInfo | null | undefined, deviceId: string | null | undefined): AgentRuntimeStatus | null => {
    if (runtime) return runtime.status;
    if (!session) return null;
    const recordedLive = session.status === AgentRuntimeStatuses.RUNNING || session.status === AgentRuntimeStatuses.AWAITING_INPUT;
    return recordedLive && ranOnDevice(session, deviceId) ? AgentRuntimeStatuses.STOPPED : session.status;
};

/** A session is "live" on this device when its CLI process is running here. */
export const useRuntimeAgent = (sessionId: string | null) => useRuntimeStore((s) => (sessionId ? s.agents[sessionId] ?? null : null));

export interface StartSessionInput extends CreateAgentSessionDto {
    prompt: string | null;
    device_id: string | null;
    idle_threshold_seconds?: number;
    /** Custom launch command (Settings → AI); the agent type's default command is used when omitted. */
    command_id?: string;
}

/** Creates the session record, spawns the agent CLI locally, and opens it as a tab. */
export const useStartAgentSession = () => {
    const queryClient = useQueryClient();
    const upsertAgent = useRuntimeStore((s) => s.upsertAgent);
    const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
    const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

    return useMutation({
        mutationFn: async ({ prompt, idle_threshold_seconds, command_id, ...dto }: StartSessionInput) => {
            const session = await createAgentSession({ ...dto, initial_prompt: prompt });
            try {
                // A stale or unreachable command list must never block starting the agent.
                const commands = await queryClient.fetchQuery({ queryKey: AGENT_COMMANDS_KEY, queryFn: getAgentCommands, staleTime: 60_000 }).catch(() => []);
                const custom = command_id ? commands.find((c) => c.id === command_id) : commands.find((c) => c.agent_type === session.agent_type && c.is_default);
                const runtime = await startAgentProcess({
                    session_id: session.id,
                    project_id: session.project_id,
                    agent_type: session.agent_type,
                    command: custom?.command,
                    name: session.name,
                    prompt,
                    idle_threshold_seconds,
                });
                if (dto.issue_external_id && dto.issue_provider) {
                    await linkProjectIssue({ id: dto.project_id, provider: dto.issue_provider, external_id: dto.issue_external_id, key: dto.issue_key, title: dto.issue_title }).catch(() => undefined);
                }
                return { session, runtime };
            } catch (error) {
                await updateAgentSession({ id: session.id, status: AgentRuntimeStatuses.CRASHED, ended_at: new Date().toISOString() }).catch(() => undefined);
                throw error;
            }
        },
        onSuccess: ({ session, runtime }) => {
            upsertAgent(runtime);
            setActiveProject(session.project_id);
            openSessionTab(session.id);
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["project-issues"] });
        },
        onError: (error: Error) => {
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            toast({ title: "Could not start AI session", description: error.message, variant: "error", duration: 7000 });
        },
    });
};

export const useStopAgentSession = () =>
    useMutation({
        mutationFn: stopAgentProcess,
        onSuccess: () => toast({ title: "Agent stopped", duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not stop agent", description: error.message, variant: "error" }),
    });

/** Restarts a live session in place, or resumes its saved conversation after the app was reopened. */
export const useRelaunchAgentSession = () => {
    const queryClient = useQueryClient();
    const upsertAgent = useRuntimeStore((s) => s.upsertAgent);
    return useMutation({
        mutationFn: async ({ session, runtime }: { session: AgentSession | null; runtime: AgentSessionInfo | null }) => {
            if (runtime) return restartAgentProcess(runtime.id);
            if (!session) throw new Error("Session details are still loading.");
            const commands = await queryClient.fetchQuery({ queryKey: AGENT_COMMANDS_KEY, queryFn: getAgentCommands, staleTime: 60_000 }).catch(() => []);
            const custom = commands.find((c) => c.agent_type === session.agent_type && c.is_default);
            return startAgentProcess({
                session_id: session.id,
                project_id: session.project_id,
                agent_type: session.agent_type,
                command: custom?.command,
                name: session.name,
                prompt: null,
            });
        },
        onSuccess: (info) => {
            upsertAgent(info);
            toast({ title: "Session resumed", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not resume session", description: error.message, variant: "error" }),
    });
};

/** Closes a tab. When `stopProcess` is set the CLI process is terminated too; otherwise it keeps running. */
export const useCloseSessionTab = () => {
    const closeSessionTab = useWorkspaceStore((s) => s.closeSessionTab);
    const removeAgent = useRuntimeStore((s) => s.removeAgent);
    return useMutation({
        mutationFn: async ({ id, stopProcess }: { id: string; stopProcess: boolean }) => {
            if (stopProcess && isDesktop()) await forgetAgentProcess(id);
            return { id, stopProcess };
        },
        onSuccess: ({ id, stopProcess }) => {
            closeSessionTab(id);
            if (stopProcess) removeAgent(id);
            toast({ title: stopProcess ? "Session stopped and closed" : "Session closed — agent keeps running", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not close session", description: error.message, variant: "error" }),
    });
};

export const useOpenAgentExternally = () =>
    useMutation({
        mutationFn: openAgentExternally,
        onSuccess: () => toast({ title: "Opened in external terminal", duration: 1500 }),
        onError: (error: Error) => toast({ title: "Could not open external terminal", description: error.message, variant: "error" }),
    });

/** Deletes the session record, stopping its local CLI process and closing its tab first. */
export const useDeleteAgentSession = () => {
    const queryClient = useQueryClient();
    const closeSessionTab = useWorkspaceStore((s) => s.closeSessionTab);
    const removeAgent = useRuntimeStore((s) => s.removeAgent);
    return useMutation({
        mutationFn: async (id: string) => {
            if (isDesktop()) await forgetAgentProcess(id).catch(() => undefined);
            await deleteAgentSession(id);
            return id;
        },
        onSuccess: (id) => {
            closeSessionTab(id);
            removeAgent(id);
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
        },
        onError: (error: Error) => toast({ title: "Could not delete session", description: error.message, variant: "error" }),
    });
};

/** Bulk variant of useDeleteAgentSession — deletes every id independently and reports one toast for the batch. */
export const useDeleteAgentSessions = () => {
    const queryClient = useQueryClient();
    const closeSessionTab = useWorkspaceStore((s) => s.closeSessionTab);
    const removeAgent = useRuntimeStore((s) => s.removeAgent);
    return useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.allSettled(
                ids.map(async (id) => {
                    if (isDesktop()) await forgetAgentProcess(id).catch(() => undefined);
                    await deleteAgentSession(id);
                    return id;
                }),
            );
            const deleted = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
            const errors = results.flatMap((r) => (r.status === "rejected" ? [r.reason as Error] : []));
            return { deleted, errors };
        },
        onSuccess: ({ deleted, errors }) => {
            for (const id of deleted) {
                closeSessionTab(id);
                removeAgent(id);
            }
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            if (errors.length) toast({ title: `Could not delete ${errors.length} of ${deleted.length + errors.length} sessions`, description: errors[0]?.message, variant: "error" });
        },
    });
};

/** Takes a session out of the review queue; with a commit sha it also links that commit to the session record. */
export const useMarkSessionReviewed = () =>
    useMutation<{ commit_sha?: string | null }, Error, { id: string; commit_sha?: string | null }>({ mutationKey: AgentSessionMutationKeys.markReviewed });

export const useRenameAgentSession = () =>
    useMutation<AgentSession, Error, UpdateAgentSessionDto & { id: string }>({ mutationKey: AgentSessionMutationKeys.rename });

export const registerAgentSessionMutations = (queryClient: QueryClient) => {
    // Session writes share one scope so they replay in the order they were made.
    const scope = { id: "agent-sessions" };

    queryClient.setMutationDefaults(AgentSessionMutationKeys.markReviewed, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: async ({ id, commit_sha }: { id: string; commit_sha?: string | null }) => {
            if (commit_sha) await updateAgentSession({ id, commit_sha });
            return { commit_sha };
        },
        // Optimistic: the session leaves the review queue immediately, including while offline.
        onMutate: ({ id }) => getWorkspaceStoreState().markReviewed(id),
        onSuccess: ({ commit_sha }) => {
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            // A commit already announced itself; only a plain "reviewed" needs its own confirmation.
            if (!commit_sha) toast({ title: "Marked as reviewed", duration: 1200 });
        },
        onError: (error: Error) => toast({ title: "Could not link the commit to this session", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(AgentSessionMutationKeys.rename, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateAgentSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            toast({ title: "Session updated", duration: 1200 });
        },
        onError: (error: Error) => toast({ title: "Could not update session", description: error.message, variant: "error" }),
    });
};
