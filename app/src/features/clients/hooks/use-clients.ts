import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, deleteClient, getClients, updateClient } from "../services/clients.services";
import { useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";

export const useGetClients = () => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({ queryKey: ["clients", orgId], queryFn: getClients, enabled: !!orgId });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createClient,
        onSuccess: (client) => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast({ title: "Client created", description: client.name, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not create client", description: error.message, variant: "error" }),
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Client updated", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not update client", description: error.message, variant: "error" }),
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast({ title: "Client deleted", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not delete client", description: error.message, variant: "error" }),
    });
};
