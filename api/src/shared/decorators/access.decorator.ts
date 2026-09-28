import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionKey } from 'generated/prisma';
import { AccessRequirement } from '@/shared/interfaces/access.interface';

export const ACCESS_ALL_KEY = 'access:all';
export const ACCESS_ANY_KEY = 'access:any';
export const ACCESS_OWNER_KEY = 'access:owner';
export const ACCESS_MEMBER_KEY = 'access:member';

/** Caller must hold EVERY listed permission in the active organization. */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(ACCESS_ALL_KEY, permissions);

/** Caller must hold AT LEAST ONE of the listed permissions. */
export const RequireAnyPermission = (...permissions: PermissionKey[]) =>
  SetMetadata(ACCESS_ANY_KEY, permissions);

/** Only organization owners. */
export const RequireOwner = () => SetMetadata(ACCESS_OWNER_KEY, true);

/**
 * Explicitly opts a route into "any active member of the organization". An unprotected route
 * must be a deliberate decision, never an omission (see access-coverage.spec.ts).
 */
export const OrgMemberOnly = () => SetMetadata(ACCESS_MEMBER_KEY, true);

/** Reads the merged (handler overrides class) access requirement of a route. */
export const readAccessRequirement = (
  reflector: Reflector,
  target: ExecutionContext | { handler: object; cls: object },
): AccessRequirement<PermissionKey> => {
  const targets = (
    'getHandler' in target
      ? [target.getHandler(), target.getClass()]
      : [target.handler, target.cls]
  ) as Function[];
  const get = <T>(key: string) => reflector.getAllAndOverride<T>(key, targets);
  return {
    all: get<PermissionKey[]>(ACCESS_ALL_KEY),
    any: get<PermissionKey[]>(ACCESS_ANY_KEY),
    owner_only: get<boolean>(ACCESS_OWNER_KEY),
    member_only: get<boolean>(ACCESS_MEMBER_KEY),
  };
};
