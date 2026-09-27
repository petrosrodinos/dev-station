import { useMutation } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { createTerminal, killTerminal } from "../services/terminals.services";
import { useRuntimeStore } from "@/stores/runtime";
import { toast } from "@/hooks/use-toast";

export const useProjectTerminals = (projectId: string | null) =>
    useRuntimeStore(useShallow((s) => Object.values(s.terminals).filter((t) => t.project_id === projectId).sort((a, b) => a.created_at.localeCompare(b.created_at))));

export const useCreateTerminal = () => {
    const upsert = useRuntimeStore((s) => s.upsertTerminal);
    return useMutation({
        mutationFn: createTerminal,
        onSuccess: (info) => {
            upsert(info);
            toast({ title: `Terminal opened — ${info.title}`, duration: 1200 });
        },
        onError: (error: Error) => toast({ title: "Could not open terminal", description: error.message, variant: "error" }),
    });
};

export const useKillTerminal = () => {
    const remove = useRuntimeStore((s) => s.removeTerminal);
    return useMutation({
        mutationFn: killTerminal,
        onSuccess: (_r, id) => {
            remove(id);
            toast({ title: "Terminal closed", duration: 1200 });
        },
        onError: (error: Error) => toast({ title: "Could not close terminal", description: error.message, variant: "error" }),
    });
};
