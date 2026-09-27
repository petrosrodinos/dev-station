import { PermissionKey, SystemRoleKey } from 'generated/prisma';

export interface OrganizationMembership {
  organization_id: string;
  member_id: string;
  role_id: string;
  role_key: SystemRoleKey;
  permissions: PermissionKey[];
}
