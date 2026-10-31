-- CreateTable
CREATE TABLE "project_secret_sets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payload" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "variable_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_secret_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_secret_sets_organization_id_idx" ON "project_secret_sets"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_secret_sets_project_id_name_key" ON "project_secret_sets"("project_id", "name");

-- AddForeignKey
ALTER TABLE "project_secret_sets" ADD CONSTRAINT "project_secret_sets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_secret_sets" ADD CONSTRAINT "project_secret_sets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_secret_sets" ADD CONSTRAINT "project_secret_sets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_secret_sets" ADD CONSTRAINT "project_secret_sets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: system roles are seeded per organization, so existing organizations need the new
-- permissions added to match the presets in shared/config/permissions (Viewer gets none).
INSERT INTO "role_permissions" ("id", "role_id", "permission")
SELECT gen_random_uuid()::text, r."id", p.permission::"PermissionKey"
FROM "roles" r
JOIN (VALUES
    ('OWNER', 'SECRETS_VIEW'),
    ('OWNER', 'SECRETS_MANAGE'),
    ('ADMIN', 'SECRETS_VIEW'),
    ('ADMIN', 'SECRETS_MANAGE'),
    ('MANAGER', 'SECRETS_VIEW'),
    ('MANAGER', 'SECRETS_MANAGE'),
    ('DEVELOPER', 'SECRETS_VIEW')
) AS p(role_key, permission) ON r."key"::text = p.role_key
WHERE r."is_system" = true
ON CONFLICT ("role_id", "permission") DO NOTHING;
