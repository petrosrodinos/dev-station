import { z } from "zod";

export const inviteMemberSchema = z.object({
    email: z.string().trim().email("Enter a valid email"),
    role_id: z.string().min(1, "Choose a role"),
});
export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

export const roleSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    description: z.string().trim().max(300).optional(),
});
export type RoleFormData = z.infer<typeof roleSchema>;

export const organizationNameSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});
export type OrganizationNameFormData = z.infer<typeof organizationNameSchema>;

export const joinOrganizationSchema = z.object({
    token: z.string().trim().min(10, "Paste the full invite code"),
});
export type JoinOrganizationFormData = z.infer<typeof joinOrganizationSchema>;
