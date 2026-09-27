import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActivity, getActivities } from "../services/activities.services";
import type { ActivitiesQuery } from "../interfaces/activities.interfaces";
import { useWorkspaceStore } from "@/stores/workspace";

export const useGetActivities = (query: ActivitiesQuery, enabled = true) => {
    const orgId = useWorkspaceStore((s) => s.active_organization_id);
    return useQuery({
        queryKey: ["activities", orgId, query],
        queryFn: () => getActivities(query),
        enabled: !!orgId && enabled,
        refetchInterval: 30_000,
    });
};

/**
 * Records a device-originated event in the project's activity feed. Deliberately silent (no toast):
 * the feed itself is the notification surface (Spec §27) and the triggering action already gave feedback.
 */
export const useRecordActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createActivity,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
        onError: () => {
            // Activity is best-effort; the originating action already reported its own result.
        },
    });
};
