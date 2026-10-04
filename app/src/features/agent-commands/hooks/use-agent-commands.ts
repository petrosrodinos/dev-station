import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";
import { createAgentCommand, deleteAgentCommand, getAgentCommands, updateAgentCommand } from "../services/agent-commands.services";
import type { AgentCommand, CreateAgentCommandDto, UpdateAgentCommandDto } from "../interfaces/agent-commands.interfaces";

export const AGENT_COMMANDS_KEY = ["agent-commands"];

/** Mutation keys only. The functions and callbacks live in registerAgentCommandMutations (see config/query/mutation-defaults). */
export const AgentCommandMutationKeys = {
    create: ["agent-commands", "create"],
    update: ["agent-commands", "update"],
    delete: ["agent-commands", "delete"],
} as const;

export const useAgentCommands = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: AGENT_COMMANDS_KEY, queryFn: getAgentCommands, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useCreateAgentCommand = () => useMutation<AgentCommand, Error, CreateAgentCommandDto>({ mutationKey: AgentCommandMutationKeys.create });

export const useUpdateAgentCommand = () =>
    useMutation<AgentCommand, Error, UpdateAgentCommandDto & { id: string }>({ mutationKey: AgentCommandMutationKeys.update });

export const useDeleteAgentCommand = () => useMutation<void, Error, string>({ mutationKey: AgentCommandMutationKeys.delete });

export const registerAgentCommandMutations = (queryClient: QueryClient) => {
    const refreshCommands = () => queryClient.invalidateQueries({ queryKey: AGENT_COMMANDS_KEY });
    const reportFailure = (title: string) => (error: Error) => toast({ title, description: error.message, variant: "error" });

    // Every command write shares one scope so they replay in the order they were made.
    const scope = { id: "agent-commands" };

    queryClient.setMutationDefaults(AgentCommandMutationKeys.create, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: createAgentCommand,
        onSuccess: () => {
            refreshCommands();
            toast({ title: "Command added", duration: 1500 });
        },
        onError: reportFailure("Could not add command"),
    });

    queryClient.setMutationDefaults(AgentCommandMutationKeys.update, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateAgentCommand,
        onSuccess: () => {
            refreshCommands();
            toast({ title: "Command saved", duration: 1500 });
        },
        onError: reportFailure("Could not save command"),
    });

    queryClient.setMutationDefaults(AgentCommandMutationKeys.delete, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: deleteAgentCommand,
        onSuccess: () => {
            refreshCommands();
            toast({ title: "Command removed", duration: 1500 });
        },
        onError: reportFailure("Could not remove command"),
    });
};
