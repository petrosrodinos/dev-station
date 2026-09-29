import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { refreshAccountToken, signIn, signUp } from "../services/auth";
import type { SignInUser, SignUpUser } from "../interfaces/auth.interface";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { toast } from "@/hooks/use-toast";
import { RoleTypes } from "@/features/user/interfaces/user.interface";

const ADMIN_ROLES: string[] = [RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN, RoleTypes.SUPPORT];

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

/** Admin console login — same credential check, but rejects any non-admin-capable role. */
export function useAdminSignin() {
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: SignInUser) => signIn(data),
        onSuccess: (user) => {
            if (!user.role || !ADMIN_ROLES.includes(user.role)) {
                logout();
                toast({ title: "Not authorized", description: "This account does not have admin access.", duration: 4000, variant: "error" });
                return;
            }
            login(user);
            navigate(Routes.admin.root);
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
        logout();
        resetWorkspace();
        queryClient.clear();
        navigate(Routes.auth.sign_in, { replace: true });
    };
}
