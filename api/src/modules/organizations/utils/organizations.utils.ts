import { Prisma, SystemRoleKey } from 'generated/prisma';
import { SystemRoles } from '@/shared/config/permissions';
import { uniqueSlug } from '@/shared/utils/slug/slug.utils';

/**
 * Creates an organization with its system roles and makes `userId` the OWNER.
 * Must be called inside a Prisma transaction.
 */
export const createOrganizationWithOwner = async (
  tx: Prisma.TransactionClient,
  userId: string,
  name: string,
) => {
  const organization = await tx.organization.create({
    data: { name, slug: uniqueSlug(name), created_by: userId },
  });

  const roles = await Promise.all(
    SystemRoles.map((role) =>
      tx.role.create({
        data: {
          organization_id: organization.id,
          name: role.name,
          key: role.key,
          description: role.description,
          is_system: true,
          permissions: {
            create: role.permissions.map((permission) => ({ permission })),
          },
        },
      }),
    ),
  );

  const ownerRole = roles.find((role) => role.key === SystemRoleKey.OWNER);

  await tx.organizationMember.create({
    data: {
      organization_id: organization.id,
      user_id: userId,
      role_id: ownerRole.id,
    },
  });

  return organization;
};

export const organizationSummaryInclude = {
  organization: true,
  role: { include: { permissions: true } },
} satisfies Prisma.OrganizationMemberInclude;

type MembershipWithOrg = Prisma.OrganizationMemberGetPayload<{
  include: typeof organizationSummaryInclude;
}>;

export const toOrganizationSummary = (membership: MembershipWithOrg) => ({
  id: membership.organization.id,
  name: membership.organization.name,
  slug: membership.organization.slug,
  role: {
    id: membership.role.id,
    name: membership.role.name,
    key: membership.role.key,
  },
  permissions: membership.role.permissions.map((p) => p.permission),
});
