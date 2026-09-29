import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAgentSession, deleteAgentSession, getAgentCatalog, getAgentSessions, updateAgentSession } from "../services/agent-sessions.services";
import { forgetAgentProcess, getAgentAdapters, openAgentExternally, restartAgentProcess, startAgentProcess, stopAgentProcess } from "../services/agent-runtime.services";
import type { AgentSession, AgentSessionsQuery, CreateAgentSessionDto } from "../interfaces/agent-sessions.interfaces";
import { linkProjectIssue } from "@/features/projects/services/projects.services";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { AgentRuntimeStatuses, type AgentRuntimeStatus, type AgentSessionInfo } from "@shared/contract";

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

/** Runtime status on this device wins over the last status the server knows about. */
export const mergeSessionStatus = (session: AgentSession, runtime?: AgentSessionInfo): AgentRuntimeStatus => runtime?.status ?? session.status;

/** A session is "live" on this device when its CLI process is running here. */
export const useRuntimeAgent = (sessionId: string | null) => useRuntimeStore((s) => (sessionId ? s.agents[sessionId] ?? null : null));

export interface StartSessionInput extends CreateAgentSessionDto {
    prompt: string | null;
    device_id: string | null;
    idle_threshold_seconds?: number;
}

/** Creates the session record, spawns the agent CLI locally, and opens it as a tab. */
export const useStartAgentSession = () => {
    const queryClient = useQueryClient();
    const upsertAgent = useRuntimeStore((s) => s.upsertAgent);
    const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
    const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

    return useMutation({
        mutationFn: async ({ prompt, idle_threshold_seconds, ...dto }: StartSessionInput) => {
            const session = await createAgentSession({ ...dto, initial_prompt: prompt });
            try {
                const runtime = await startAgentProcess({
                    session_id: session.id,
                    project_id: session.project_id,
                    agent_type: session.agent_type,
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
            toast({ title: `${session.name}`, description: "Agent session started", duration: 1500 });
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

export const useRestartAgentSession = () => {
    const upsertAgent = useRuntimeStore((s) => s.upsertAgent);
    return useMutation({
        mutationFn: restartAgentProcess,
        onSuccess: (info) => {
            upsertAgent(info);
            toast({ title: "Agent restarted", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not restart agent", description: error.message, variant: "error" }),
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
            toast({ title: "Session deleted", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not delete session", description: error.message, variant: "error" }),
    });
};

/** Takes a session out of the review queue; with a commit sha it also links that commit to the session record. */
export const useMarkSessionReviewed = () => {
    const queryClient = useQueryClient();
    const markReviewed = useWorkspaceStore((s) => s.markReviewed);
    return useMutation({
        mutationFn: async ({ id, commit_sha }: { id: string; commit_sha?: string | null }) => {
            if (commit_sha) await updateAgentSession({ id, commit_sha });
            return { commit_sha };
        },
        onMutate: ({ id }) => markReviewed(id),
        onSuccess: ({ commit_sha }) => {
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            // A commit already announced itself; only a plain "reviewed" needs its own confirmation.
            if (!commit_sha) toast({ title: "Marked as reviewed", duration: 1200 });
        },
        onError: (error: Error) => toast({ title: "Could not link the commit to this session", description: error.message, variant: "error" }),
    });
};

export const useRenameAgentSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAgentSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agent-sessions"] });
            toast({ title: "Session updated", duration: 1200 });
        },
        onError: (error: Error) => toast({ title: "Could not update session", description: error.message, variant: "error" }),
    });
};
