import { AuthRole, PermissionKey, SystemRoleKey } from 'generated/prisma';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: { id: string; name: string; key: SystemRoleKey; rank: number };
  permissions: PermissionKey[];
}

export interface Me {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AuthRole;
  organizations: OrganizationSummary[];
}
