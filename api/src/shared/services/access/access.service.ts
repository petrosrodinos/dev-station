import { ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionKey } from 'generated/prisma';
import {
  AccessDecision,
  MemberTarget,
  RoleTarget,
} from '@/shared/interfaces/access.interface';
import { OrganizationMembership } from '@/shared/interfaces/membership.interface';
import {
  canAssignRole,
  canCreateRole,
  canEditRole,
  canGrantPermissions,
  canModifyMember,
  toActor,
} from '@/shared/utils/access/access.utils';

const enforce = (decision: AccessDecision) => {
  if (!decision.allowed) {
    throw new ForbiddenException({
      message: decision.reason,
      code: decision.code,
    });
  }
};

/** Role-hierarchy rules as throwing assertions; feature services call these before mutating. */
@Injectable()
export class AccessService {
  assertCanAssignRole(actor: OrganizationMembership, role: RoleTarget) {
    enforce(canAssignRole(toActor(actor), role));
  }

  assertCanModifyMember(actor: OrganizationMembership, member: MemberTarget) {
    enforce(canModifyMember(toActor(actor), member));
  }

  assertCanCreateRole(
    actor: OrganizationMembership,
    rank: number,
    permissions: PermissionKey[],
  ) {
    const a = toActor(actor);
    enforce(canCreateRole(a, rank));
    enforce(canGrantPermissions(a, permissions));
  }

  assertCanEditRole(
    actor: OrganizationMembership,
    role: RoleTarget,
    current: PermissionKey[],
    next: PermissionKey[] | undefined,
  ) {
    enforce(canEditRole(toActor(actor), role, current, next));
  }
}
