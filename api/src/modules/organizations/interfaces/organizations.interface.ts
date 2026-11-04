import { MemberStatus, PermissionKey, SystemRoleKey } from 'generated/prisma';

export interface RoleRef {
  id: string;
  name: string;
  key: SystemRoleKey;
  rank: number;
}

export interface OrganizationMemberView {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  role: RoleRef;
  status: MemberStatus;
  joined_at: Date;
}

export interface RoleView extends RoleRef {
  description: string | null;
  is_system: boolean;
  permissions: PermissionKey[];
  member_count: number;
}

export interface InvitationView {
  id: string;
  email: string;
  role: RoleRef;
  expires_at: Date;
  created_at: Date;
}

/** An invitation as seen by the invited user: includes the organization, never the invite code. */
export interface MyInvitationView extends InvitationView {
  organization: { id: string; name: string };
  invited_by_name: string | null;
}
