import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { changePassword, getMe, getPreferences, updateMe, updatePreferences } from "../services/users.services";
import type { Me, UpdateMeDto, UpdatePreferenceDto, UserPreference } from "../interfaces/users.interfaces";
import type { RailPosition } from "@/config/constants/dropdowns/settings/rail-position.options";
import { getAuthStoreState, useAuthStore } from "@/stores/auth";
import { toast } from "@/hooks/use-toast";
import { QUEUED_MUTATION_POLICY } from "@/config/query/offline-policy";

const PREFERENCES_KEY = ["preferences"];

/** Mutation keys only. The functions and callbacks live in registerUserMutations (see config/query/mutation-defaults). */
export const UserMutationKeys = {
    updateMe: ["users", "update-me"],
    updatePreferences: ["users", "update-preferences"],
    updateRailPosition: ["users", "update-rail-position"],
} as const;

export const useGetMe = () => {
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    return useQuery({ queryKey: ["me"], queryFn: getMe, enabled: !!isLoggedIn, staleTime: 60_000 });
};

export const useUpdateMe = () => useMutation<Me, Error, UpdateMeDto>({ mutationKey: UserMutationKeys.updateMe });

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

export const useUpdatePreferences = () => useMutation<UserPreference, Error, UpdatePreferenceDto>({ mutationKey: UserMutationKeys.updatePreferences });

/** Rail position saves through the preferences endpoint, with its own key so its variables stay a plain RailPosition. */
export const useUpdateRailPosition = () => useMutation<UserPreference, Error, RailPosition>({ mutationKey: UserMutationKeys.updateRailPosition });

export const registerUserMutations = (queryClient: QueryClient) => {
    // Every account write shares one scope so they replay in the order they were made.
    const scope = { id: "users" };

    queryClient.setMutationDefaults(UserMutationKeys.updateMe, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updateMe,
        onSuccess: (me) => {
            queryClient.invalidateQueries({ queryKey: ["me"] });
            getAuthStoreState().updateUser({ full_name: me.full_name, avatar: me.avatar_url });
            toast({ title: "Profile updated", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not update profile", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(UserMutationKeys.updatePreferences, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: updatePreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
            toast({ title: "Preferences saved", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not save preferences", description: error.message, variant: "error" }),
    });

    queryClient.setMutationDefaults(UserMutationKeys.updateRailPosition, {
        ...QUEUED_MUTATION_POLICY,
        scope,
        mutationFn: (position: RailPosition) => updatePreferences({ rail_position: position }),
        onSuccess: (saved) => {
            const previous = queryClient.getQueryData<UserPreference>(PREFERENCES_KEY);
            if (previous) queryClient.setQueryData<UserPreference>(PREFERENCES_KEY, { ...previous, rail_position: saved.rail_position });
            queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
        },
        onError: (error: Error) => toast({ title: "Moved, but not saved to your account", description: error.message, variant: "error" }),
    });
};
