import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminInstallAdoption, getAdminReleases, getAdminStats, getAdminUsers, updateAdminReleaseLimits } from "../services/admin.services";
import type { AdminUsersQuery } from "../interfaces/admin.interface";
import { toast } from "@/hooks/use-toast";

const ADMIN_RELEASES_KEY = ["admin-releases"];

export const useAdminStats = () =>
    useQuery({
        queryKey: ["admin-stats"],
        queryFn: getAdminStats,
    });

export const useAdminUsers = (query: AdminUsersQuery) =>
    useQuery({
        queryKey: ["admin-users", query],
        queryFn: () => getAdminUsers(query),
    });

export const useAdminReleases = () =>
    useQuery({
        queryKey: ADMIN_RELEASES_KEY,
        queryFn: getAdminReleases,
    });

export const useAdminInstallAdoption = () =>
    useQuery({
        queryKey: ["admin-installs"],
        queryFn: getAdminInstallAdoption,
    });

export const useUpdateAdminReleaseLimits = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAdminReleaseLimits,
        onSuccess: () => {
            toast({ title: "Release updated", duration: 2000 });
            queryClient.invalidateQueries({ queryKey: ADMIN_RELEASES_KEY });
        },
        onError: (error: Error) => {
            toast({ title: "Could not update release", description: error.message, duration: 4000, variant: "error" });
        },
    });
};
