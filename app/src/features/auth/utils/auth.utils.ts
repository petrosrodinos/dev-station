import type { LoggedInUser, RoleType } from "@/features/user/interfaces/user.interface";
import type { AuthResponse } from "../interfaces/auth.interface";

export const generateInitials = (value: string | null | undefined) => {
    if (!value) return "?";
    return value
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
};

export const formatAuthUser = (data: AuthResponse): LoggedInUser => ({
    user_uuid: data.user.id,
    email: data.user.email,
    access_token: data.access_token,
    expires_in: data.expires_in,
    avatar: data.user.avatar_url ?? null,
    full_name: data.user.full_name ?? data.user.email.split("@")[0],
    role: (data.user.role as RoleType) ?? null,
});
