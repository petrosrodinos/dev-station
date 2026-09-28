import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, getMe, getPreferences, updateMe, updatePreferences } from "../services/users.services";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";

export const useGetMe = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: ["me"], queryFn: getMe, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useUpdateMe = () => {
    const queryClient = useQueryClient();
    const updateUser = useAuthStore((s) => s.updateUser);
    return useMutation({
        mutationFn: updateMe,
        onSuccess: (me) => {
            queryClient.invalidateQueries({ queryKey: ["me"] });
            updateUser({ full_name: me.full_name, avatar: me.avatar_url });
            toast({ title: "Profile updated", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not update profile", description: error.message, variant: "error" }),
    });
};

export const useChangePassword = () =>
    useMutation({
        mutationFn: changePassword,
        onSuccess: () => toast({ title: "Password changed", duration: 2000 }),
        onError: (error: Error) => toast({ title: "Could not change password", description: error.message, variant: "error" }),
    });

export const useGetPreferences = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: ["preferences"], queryFn: getPreferences, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useUpdatePreferences = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["preferences"] });
            toast({ title: "Preferences saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save preferences", description: error.message, variant: "error" }),
    });
};
