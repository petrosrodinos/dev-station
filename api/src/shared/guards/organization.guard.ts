import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberStatus, PermissionKey } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ORGANIZATION_HEADER } from '../constants/headers';
import { OrganizationMembership } from '../interfaces/membership.interface';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the caller's membership in the organization named by the `x-organization-id` header
 * and enforces @RequirePermissions(). Must run after JwtGuard.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.headers[ORGANIZATION_HEADER];

    if (
      typeof organizationId !== 'string' ||
      !UUID_PATTERN.test(organizationId)
    ) {
      throw new BadRequestException(
        `Missing or invalid ${ORGANIZATION_HEADER} header`,
      );
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: request.user?.id,
        },
      },
      include: { role: { include: { permissions: true } } },
    });

    if (!member || member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const membership: OrganizationMembership = {
      organization_id: organizationId,
      member_id: member.id,
      role_id: member.role_id,
      role_key: member.role.key,
      permissions: member.role.permissions.map((p) => p.permission),
    };
    request.membership = membership;

    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (required?.length) {
      const missing = required.filter(
        (p) => !membership.permissions.includes(p),
      );
      if (missing.length) {
        throw new ForbiddenException(
          `Missing permission: ${missing.join(', ')}`,
        );
      }
    }

    return true;
  }
}
