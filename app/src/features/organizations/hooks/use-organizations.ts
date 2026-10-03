import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    acceptInvitation,
    createInvitation,
    createOrganization,
    createRole,
    deleteRole,
    getInvitations,
    getMembers,
    getOrganizations,
    getPermissionCatalog,
    getRoles,
    removeMember,
    resendInvitation,
    revokeInvitation,
    updateCurrentOrganization,
    updateMemberRole,
    updateRole,
} from "../services/organizations.services";
import { useMemo } from "react";
import { satisfiesRequirement, type AccessActor } from "@/lib/access.utils";
import { SystemRoleKeys, type AccessRequirement, type PermissionKey } from "../interfaces/organizations.interfaces";
import { useGetMe } from "@/features/users/hooks/use-users";
import { useWorkspaceStore } from "@/stores/workspace";
import { toast } from "@/hooks/use-toast";

const useOrgId = () => useWorkspaceStore((s) => s.active_organization_id);

export const useGetOrganizations = () => useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });

/** The active organization (from /users/me) with the caller's role and permissions. */
export const useCurrentOrganization = () => {
    const orgId = useOrgId();
    const { data: me, ...rest } = useGetMe();
    const organization = me?.organizations.find((o) => o.id === orgId) ?? null;
    return { organization, me, ...rest };
};

/**
 * The single entry point for UI access checks — never compare role names in components.
 * `ready` is false while the profile is still loading (do not redirect/hide on an unready check).
 */
export const usePermissions = () => {
    const { organization, me, isPending } = useCurrentOrganization();
    return useMemo(() => {
        const permissions = new Set<PermissionKey>(organization?.permissions ?? []);
        const actor: AccessActor<PermissionKey> | null =
            organization && me
                ? { user_id: me.id, rank: organization.role.rank, is_owner: organization.role.key === SystemRoleKeys.OWNER, permissions }
                : null;
        return {
            ready: !isPending,
            permissions,
            actor,
            can: (requirement: AccessRequirement) => satisfiesRequirement(permissions, requirement),
            canAll: (...list: PermissionKey[]) => satisfiesRequirement(permissions, { all: list }),
            canAny: (...list: PermissionKey[]) => satisfiesRequirement(permissions, { any: list }),
        };
    }, [organization, me, isPending]);
};

export const useCreateOrganization = () => {
    const queryClient = useQueryClient();
    const setActiveOrganization = useWorkspaceStore((s) => s.setActiveOrganization);
    return useMutation({
        mutationFn: createOrganization,
        onSuccess: (org) => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["me"] });
            setActiveOrganization(org.id);
            toast({ title: "Organization created", description: org.name, duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not create organization", description: error.message, variant: "error" }),
    });
};

export const useUpdateOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCurrentOrganization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["me"] });
            toast({ title: "Organization updated", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not update organization", description: error.message, variant: "error" }),
    });
};

export const useGetMembers = () => {
    const orgId = useOrgId();
    return useQuery({ queryKey: ["members", orgId], queryFn: getMembers, enabled: !!orgId });
};

export const useUpdateMemberRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateMemberRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["members"] });
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast({ title: "Role updated", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not change role", description: error.message, variant: "error" }),
    });
};

export const useRemoveMember = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeMember,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["members"] });
            toast({ title: "Member removed", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not remove member", description: error.message, variant: "error" }),
    });
};

export const useGetInvitations = (enabled = true) => {
    const orgId = useOrgId();
    return useQuery({ queryKey: ["invitations", orgId], queryFn: getInvitations, enabled: !!orgId && enabled });
};

export const useCreateInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createInvitation,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({ title: "Invitation created", description: `Invite sent to ${data.invitation.email}`, duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not invite member", description: error.message, variant: "error" }),
    });
};

export const useResendInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resendInvitation,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({ title: "Invitation resent", description: `New invite code sent to ${data.invitation.email}`, duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not resend invitation", description: error.message, variant: "error" }),
    });
};

export const useRevokeInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: revokeInvitation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({ title: "Invitation revoked", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not revoke invitation", description: error.message, variant: "error" }),
    });
};

export const useAcceptInvitation = () => {
    const queryClient = useQueryClient();
    const setActiveOrganization = useWorkspaceStore((s) => s.setActiveOrganization);
    return useMutation({
        mutationFn: acceptInvitation,
        onSuccess: (org) => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["me"] });
            setActiveOrganization(org.id);
            toast({ title: "Joined organization", description: org.name, duration: 2500 });
        },
        onError: (error: Error) => toast({ title: "Could not accept invitation", description: error.message, variant: "error" }),
    });
};

export const useGetRoles = () => {
    const orgId = useOrgId();
    return useQuery({ queryKey: ["roles", orgId], queryFn: getRoles, enabled: !!orgId });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast({ title: "Role created", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not create role", description: error.message, variant: "error" }),
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["me"] });
            toast({ title: "Role updated", duration: 1500 });
        },
        onError: (error: Error) => toast({ title: "Could not update role", description: error.message, variant: "error" }),
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast({ title: "Role deleted", duration: 2000 });
        },
        onError: (error: Error) => toast({ title: "Could not delete role", description: error.message, variant: "error" }),
    });
};

export const useGetPermissionCatalog = () => useQuery({ queryKey: ["permission-catalog"], queryFn: getPermissionCatalog, staleTime: Infinity });
