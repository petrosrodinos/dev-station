import { PermissionKey, SystemRoleKey } from 'generated/prisma';
import {
  AccessActor,
  AccessDecision,
  AccessRequirement,
  DenialCodes,
  MemberTarget,
  RoleTarget,
} from '@/shared/interfaces/access.interface';
import { OrganizationMembership } from '@/shared/interfaces/membership.interface';

const allow = (): AccessDecision => ({ allowed: true });
const deny = (
  code: AccessDecision['code'],
  reason: string,
): AccessDecision => ({ allowed: false, code, reason });

export const toActor = (
  membership: OrganizationMembership,
): AccessActor<PermissionKey> => ({
  member_id: membership.member_id,
  permissions: new Set(membership.permissions),
  rank: membership.rank,
  is_owner: membership.role_key === SystemRoleKey.OWNER,
});

/** True when the requirement declares any access rule at all. */
export const isProtected = (req: AccessRequirement): boolean =>
  !!(req.all?.length || req.any?.length || req.owner_only || req.member_only);

/** Evaluates a route/action requirement against an actor. */
export const satisfies = <P extends string>(
  actor: AccessActor<P>,
  req: AccessRequirement<P>,
): AccessDecision => {
  if (req.owner_only && !actor.is_owner) {
    return deny(DenialCodes.OWNER_ONLY, 'Only an owner can do this');
  }

  const missing = (req.all ?? []).filter((p) => !actor.permissions.has(p));
  if (missing.length) {
    return deny(
      DenialCodes.MISSING_PERMISSION,
      `Missing permission: ${missing.join(', ')}`,
    );
  }

  if (req.any?.length && !req.any.some((p) => actor.permissions.has(p))) {
    return deny(
      DenialCodes.MISSING_PERMISSION,
      `Requires one of: ${req.any.join(', ')}`,
    );
  }

  return allow();
};

const outranks = (actor: AccessActor, rank: number) =>
  actor.is_owner || actor.rank > rank;

/** May `actor` hand out `role` (assign to a member or invite with it)? */
export const canAssignRole = (
  actor: AccessActor,
  role: RoleTarget,
): AccessDecision =>
  outranks(actor, role.rank)
    ? allow()
    : deny(
        DenialCodes.RANK_TOO_LOW,
        'You cannot assign a role at or above your own',
      );

/** May `actor` change or remove `member`? Never on themselves, never at/above their rank. */
export const canModifyMember = (
  actor: AccessActor,
  member: MemberTarget,
): AccessDecision => {
  if (member.member_id === actor.member_id) {
    return deny(
      DenialCodes.SELF_MODIFICATION,
      'You cannot change your own membership',
    );
  }
  return outranks(actor, member.rank)
    ? allow()
    : deny(
        DenialCodes.RANK_TOO_LOW,
        'You cannot manage a member at or above your own role',
      );
};

/** May `actor` grant every permission in `granted`? Only permissions they hold themselves. */
export const canGrantPermissions = <P extends string>(
  actor: AccessActor<P>,
  granted: readonly P[],
): AccessDecision => {
  if (actor.is_owner) return allow();
  const excess = granted.filter((p) => !actor.permissions.has(p));
  return excess.length
    ? deny(
        DenialCodes.GRANT_EXCEEDS_OWN,
        `You cannot grant permissions you do not hold: ${excess.join(', ')}`,
      )
    : allow();
};

/** May `actor` create a role with this rank? It must sit strictly below the actor. */
export const canCreateRole = (
  actor: AccessActor,
  rank: number,
): AccessDecision =>
  rank < actor.rank
    ? allow()
    : deny(DenialCodes.RANK_TOO_LOW, 'A new role must rank below your own');

/** May `actor` edit `role`, moving its permissions from `current` to `next`? */
export const canEditRole = <P extends string>(
  actor: AccessActor<P>,
  role: RoleTarget,
  current: readonly P[],
  next: readonly P[] | undefined,
): AccessDecision => {
  if (role.immutable) {
    return deny(DenialCodes.IMMUTABLE_ROLE, 'This role cannot be modified');
  }
  if (!outranks(actor, role.rank)) {
    return deny(
      DenialCodes.RANK_TOO_LOW,
      'You cannot edit a role at or above your own',
    );
  }
  if (!next) return allow();
  const added = next.filter((p) => !current.includes(p));
  return canGrantPermissions(actor, added);
};
