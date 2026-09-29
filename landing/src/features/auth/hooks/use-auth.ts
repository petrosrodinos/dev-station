import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signIn } from "../services/auth.services";
import type { SignInUser } from "../interfaces/auth.interface";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { toast } from "@/hooks/use-toast";
import { RoleTypes } from "@/features/user/interfaces/user.interface";

const ADMIN_ROLES: string[] = [RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN, RoleTypes.SUPPORT];

/** Admin console login — rejects any account without an admin-capable role. */
export function useAdminSignin() {
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();

    return useMutation({
        mutationFn: (data: SignInUser) => signIn(data),
        onSuccess: (user) => {
            if (!user.role || !ADMIN_ROLES.includes(user.role)) {
                logout();
                toast({ title: "Not authorized", description: "This account does not have admin access.", duration: 4000, variant: "error" });
                return;
            }
            login(user);
            // Straight to overview — skips the /dashboard root's redirect hop entirely.
            router.push(Routes.admin.overview);
        },
        onError: (error: Error) => {
            toast({ title: "Could not sign in", description: error.message, duration: 4000, variant: "error" });
        },
    });
}

export function useAdminSignOut() {
    const logout = useAuthStore((state) => state.logout);
    const queryClient = useQueryClient();
    const router = useRouter();

    return () => {
        logout();
        queryClient.clear();
        // Returns to the hidden admin login, never a public sign-in page — no hint that an admin area exists.
        router.replace(Routes.admin.login);
    };
}
