import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionKey, SystemRoleKey } from 'generated/prisma';
import { OrganizationMembership } from '@/shared/interfaces/membership.interface';
import {
  OrgMemberOnly,
  RequireAnyPermission,
  RequireOwner,
  RequirePermissions,
} from '@/shared/decorators/access.decorator';
import { MembershipService } from '@/shared/services/access/membership.service';
import { OrganizationGuard } from './organization.guard';

const ORG_ID = '11111111-1111-4111-8111-111111111111';

class Routes {
  @RequirePermissions(PermissionKey.PROJECTS_EDIT)
  edit() {}

  @RequireAnyPermission(
    PermissionKey.ORG_MANAGE_MEMBERS,
    PermissionKey.ORG_MANAGE_ROLES,
  )
  anyOf() {}

  @RequireOwner()
  ownerOnly() {}

  @OrgMemberOnly()
  memberOnly() {}

  forgotten() {}
}

const membership = (
  role_key: SystemRoleKey,
  permissions: PermissionKey[],
): OrganizationMembership => ({
  organization_id: ORG_ID,
  member_id: 'm1',
  role_id: 'r1',
  role_key,
  rank: 50,
  permissions,
});

const run = async (
  handler: keyof Routes,
  found: OrganizationMembership | null,
) => {
  const request: any = {
    headers: { 'x-organization-id': ORG_ID },
    user: { id: 'u1' },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
  } as unknown as ExecutionContext;
  const resolver = { findActive: async () => found } as unknown as MembershipService;
  const guard = new OrganizationGuard(new Reflector(), resolver);
  return { result: await guard.canActivate(context), request };
};

describe('OrganizationGuard', () => {
  it('allows a caller holding the required permission and exposes the membership', async () => {
    const m = membership(SystemRoleKey.DEVELOPER, [PermissionKey.PROJECTS_EDIT]);
    const { result, request } = await run('edit', m);
    expect(result).toBe(true);
    expect(request.membership).toBe(m);
  });

  it('rejects a caller missing the permission', async () => {
    await expect(
      run('edit', membership(SystemRoleKey.VIEWER, [PermissionKey.PROJECTS_VIEW])),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts any one of the alternatives', async () => {
    const m = membership(SystemRoleKey.CUSTOM, [PermissionKey.ORG_MANAGE_ROLES]);
    expect((await run('anyOf', m)).result).toBe(true);
    await expect(
      run('anyOf', membership(SystemRoleKey.VIEWER, [])),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('restricts owner-only routes to owners', async () => {
    const all = Object.values(PermissionKey);
    await expect(
      run('ownerOnly', membership(SystemRoleKey.ADMIN, all)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (await run('ownerOnly', membership(SystemRoleKey.OWNER, all))).result,
    ).toBe(true);
  });

  it('lets any active member through @OrgMemberOnly', async () => {
    expect(
      (await run('memberOnly', membership(SystemRoleKey.VIEWER, []))).result,
    ).toBe(true);
  });

  it('fails closed on a route that declares no requirement', async () => {
    await expect(
      run('forgotten', membership(SystemRoleKey.OWNER, Object.values(PermissionKey))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-members', async () => {
    await expect(run('edit', null)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
