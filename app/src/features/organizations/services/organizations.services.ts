import axiosInstance, { getApiErrorMessage } from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
    CreateInvitationDto,
    CreateInvitationResponse,
    CreateOrganizationDto,
    CreateRoleDto,
    OrganizationInvitation,
    OrganizationMember,
    OrganizationSummary,
    PermissionCatalogItem,
    Role,
    UpdateRoleDto,
} from "../interfaces/organizations.interfaces";

export const getOrganizations = async (): Promise<OrganizationSummary[]> => {
    try {
        const response = await axiosInstance.get<OrganizationSummary[]>(ApiRoutes.organizations.prefix);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load organizations."));
    }
};

export const createOrganization = async (dto: CreateOrganizationDto): Promise<OrganizationSummary> => {
    try {
        const response = await axiosInstance.post<OrganizationSummary>(ApiRoutes.organizations.prefix, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the organization."));
    }
};

export const updateCurrentOrganization = async (dto: CreateOrganizationDto): Promise<OrganizationSummary> => {
    try {
        const response = await axiosInstance.patch<OrganizationSummary>(ApiRoutes.organizations.current, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the organization."));
    }
};

export const getMembers = async (): Promise<OrganizationMember[]> => {
    try {
        const response = await axiosInstance.get<OrganizationMember[]>(ApiRoutes.organizations.members);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load members."));
    }
};

export const updateMemberRole = async ({ memberId, role_id }: { memberId: string; role_id: string }): Promise<OrganizationMember> => {
    try {
        const response = await axiosInstance.patch<OrganizationMember>(ApiRoutes.organizations.member(memberId), { role_id });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to change the member's role."));
    }
};

export const removeMember = async (memberId: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.organizations.member(memberId));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to remove the member."));
    }
};

export const getInvitations = async (): Promise<OrganizationInvitation[]> => {
    try {
        const response = await axiosInstance.get<OrganizationInvitation[]>(ApiRoutes.organizations.invitations);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load invitations."));
    }
};

export const createInvitation = async (dto: CreateInvitationDto): Promise<CreateInvitationResponse> => {
    try {
        const response = await axiosInstance.post<CreateInvitationResponse>(ApiRoutes.organizations.invitations, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to invite the member."));
    }
};

export const resendInvitation = async (id: string): Promise<CreateInvitationResponse> => {
    try {
        const response = await axiosInstance.post<CreateInvitationResponse>(ApiRoutes.organizations.resend_invitation(id));
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to resend the invitation."));
    }
};

export const revokeInvitation = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.organizations.invitation(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to revoke the invitation."));
    }
};

export const acceptInvitation = async (token: string): Promise<OrganizationSummary> => {
    try {
        const response = await axiosInstance.post<OrganizationSummary>(ApiRoutes.organizations.accept_invitation, { token });
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "This invitation is invalid or has expired."));
    }
};

export const getRoles = async (): Promise<Role[]> => {
    try {
        const response = await axiosInstance.get<Role[]>(ApiRoutes.organizations.roles);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load roles."));
    }
};

export const createRole = async (dto: CreateRoleDto): Promise<Role> => {
    try {
        const response = await axiosInstance.post<Role>(ApiRoutes.organizations.roles, dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to create the role."));
    }
};

export const updateRole = async ({ id, ...dto }: UpdateRoleDto & { id: string }): Promise<Role> => {
    try {
        const response = await axiosInstance.patch<Role>(ApiRoutes.organizations.role(id), dto);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to update the role."));
    }
};

export const deleteRole = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.organizations.role(id));
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to delete the role."));
    }
};

export const getPermissionCatalog = async (): Promise<PermissionCatalogItem[]> => {
    try {
        const response = await axiosInstance.get<PermissionCatalogItem[]>(ApiRoutes.organizations.permissions);
        return response.data;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, "Failed to load permissions."));
    }
};
