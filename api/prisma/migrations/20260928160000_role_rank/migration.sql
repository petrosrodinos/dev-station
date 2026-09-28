-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 10;

-- Backfill: system roles get their fixed rank, existing custom roles sit between Viewer and Developer
UPDATE "roles" SET "rank" = 100 WHERE "key" = 'OWNER';
UPDATE "roles" SET "rank" = 80 WHERE "key" = 'ADMIN';
UPDATE "roles" SET "rank" = 60 WHERE "key" = 'MANAGER';
UPDATE "roles" SET "rank" = 40 WHERE "key" = 'DEVELOPER';
UPDATE "roles" SET "rank" = 20 WHERE "key" = 'VIEWER';
UPDATE "roles" SET "rank" = 30 WHERE "key" = 'CUSTOM';
