-- New enum values must be committed before they can be used (the next migration backfills with them).

-- AlterEnum
ALTER TYPE "PermissionKey" ADD VALUE 'SECRETS_VIEW';
ALTER TYPE "PermissionKey" ADD VALUE 'SECRETS_MANAGE';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'SECRET_SET_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'SECRET_SET_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'SECRET_SET_DELETED';
