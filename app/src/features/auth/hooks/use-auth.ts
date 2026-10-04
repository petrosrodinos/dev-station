import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { refreshAccountToken, signIn, signUp } from "../services/auth";
import type { SignInUser, SignUpUser } from "../interfaces/auth.interface";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { toast } from "@/hooks/use-toast";
import { discardCacheOnSignOut } from "@/config/query/persister";

export function useSignin() {
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: SignInUser) => signIn(data),
        onSuccess: (user) => {
            login(user);
            toast({ title: "Welcome back", description: "You are signed in.", duration: 2000 });
            navigate(Routes.workspace.root);
        },
        onError: (error: Error) => {
            toast({ title: "Could not sign in", description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useSignup() {
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: SignUpUser) => signUp(data),
        onSuccess: (user) => {
            login(user);
            toast({ title: "Account created", description: "Your workspace is ready.", duration: 2000 });
            navigate(Routes.workspace.root);
        },
        onError: (error: Error) => {
            toast({ title: "Could not sign up", description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useRefreshAccountToken() {
    const login = useAuthStore((state) => state.login);
    return useMutation({
        mutationFn: () => refreshAccountToken(),
        onSuccess: (user) => login(user),
    });
}

export function useSignOut() {
    const logout = useAuthStore((state) => state.logout);
    const resetWorkspace = useWorkspaceStore((state) => state.reset);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return () => {
        const unsynced = queryClient
            .getMutationCache()
            .getAll()
            .filter((mutation) => mutation.state.isPaused).length;
        if (unsynced > 0) {
            toast({
                title: "Signed out with unsynced changes",
                description: `${unsynced} ${unsynced === 1 ? "change is" : "changes are"} kept on this device and will sync the next time you sign in.`,
                variant: "warning",
                duration: 6000,
            });
        } else {
            discardCacheOnSignOut();
        }
        // The cache is cleared by the session teardown (config/query/persister), after its save has landed.
        // Clearing here would race that save and overwrite it with an empty snapshot.
        logout();
        resetWorkspace();
        navigate(Routes.auth.sign_in, { replace: true });
    };
}
