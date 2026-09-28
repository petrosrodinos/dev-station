import { Injectable } from '@nestjs/common';
import { MemberStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrganizationMembership } from '@/shared/interfaces/membership.interface';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's ACTIVE membership in the organization, or null. */
  async findActive(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | null> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: userId,
        },
      },
      include: { role: { include: { permissions: true } } },
    });
    if (!member || member.status !== MemberStatus.ACTIVE) return null;

    return {
      organization_id: organizationId,
      member_id: member.id,
      role_id: member.role_id,
      role_key: member.role.key,
      rank: member.role.rank,
      permissions: member.role.permissions.map((p) => p.permission),
    };
  }
}
