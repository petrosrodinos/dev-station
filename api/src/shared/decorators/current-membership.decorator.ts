import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationMembership } from '../interfaces/membership.interface';

export const CurrentMembership = createParamDecorator(
  (field: keyof OrganizationMembership | undefined, ctx: ExecutionContext) => {
    const membership: OrganizationMembership | undefined = ctx
      .switchToHttp()
      .getRequest().membership;
    return field ? membership?.[field] : membership;
  },
);
