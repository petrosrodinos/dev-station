import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { createAgentCommand, deleteAgentCommand, getAgentCommands, updateAgentCommand } from "../services/agent-commands.services";

export const AGENT_COMMANDS_KEY = ["agent-commands"];

export const useAgentCommands = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: AGENT_COMMANDS_KEY, queryFn: getAgentCommands, enabled: !!isLoggedIn, staleTime: 60_000 });
};

const useCommandMutation = <TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, successTitle: string, errorTitle: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AGENT_COMMANDS_KEY });
            toast({ title: successTitle, duration: 1500 });
        },
        onError: (error: Error) => toast({ title: errorTitle, description: error.message, variant: "error" }),
    });
};

export const useCreateAgentCommand = () => useCommandMutation(createAgentCommand, "Command added", "Could not add command");
export const useUpdateAgentCommand = () => useCommandMutation(updateAgentCommand, "Command saved", "Could not save command");
export const useDeleteAgentCommand = () => useCommandMutation(deleteAgentCommand, "Command removed", "Could not remove command");
