import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORGANIZATION_HEADER } from '../constants/headers';
import { readAccessRequirement } from '../decorators/access.decorator';
import { MembershipService } from '../services/access/membership.service';
import {
  isProtected,
  satisfies,
  toActor,
} from '../utils/access/access.utils';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the caller's membership in the organization named by the `x-organization-id` header
 * and enforces the route's access requirement. Must run after JwtGuard.
 *
 * Fails closed: a route behind this guard that declares no requirement is rejected, so an
 * endpoint can never be exposed by forgetting a decorator (use @OrgMemberOnly() on purpose).
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly memberships: MembershipService,
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

    const membership = await this.memberships.findActive(
      organizationId,
      request.user?.id,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    request.membership = membership;

    const requirement = readAccessRequirement(this.reflector, context);
    if (!isProtected(requirement)) {
      this.logger.error(
        `Route ${request.method} ${request.route?.path} declares no access requirement`,
      );
      throw new ForbiddenException('This route declares no access requirement');
    }

    const decision = satisfies(toActor(membership), requirement);
    if (!decision.allowed) {
      this.logger.warn(
        `Denied ${request.method} ${request.route?.path} for user ${request.user?.id} in org ${organizationId}: ${decision.code}`,
      );
      throw new ForbiddenException({
        message: decision.reason,
        code: decision.code,
      });
    }
    return true;
  }
}
