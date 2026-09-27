import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from 'generated/prisma';

export const PERMISSIONS_KEY = 'required_permissions';

/** Requires every listed permission in the organization named by the `x-organization-id` header. */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
