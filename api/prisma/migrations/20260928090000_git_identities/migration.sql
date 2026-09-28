-- CreateTable
CREATE TABLE "git_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "git_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "git_identities_user_id_idx" ON "git_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "git_identities_user_id_label_key" ON "git_identities"("user_id", "label");

-- AddForeignKey
ALTER TABLE "git_identities" ADD CONSTRAINT "git_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: carry each user's existing single identity over as their default identity.
-- Missing name or email falls back to the empty string so nothing is dropped.
INSERT INTO "git_identities" ("id", "user_id", "label", "name", "email", "is_default", "updated_at")
SELECT gen_random_uuid()::text, "user_id", 'Default', COALESCE("git_name", ''), COALESCE("git_email", ''), true, CURRENT_TIMESTAMP
FROM "user_preferences"
WHERE "git_name" IS NOT NULL OR "git_email" IS NOT NULL;

-- The old user_preferences.git_name / git_email columns are intentionally kept for now
-- and will be dropped in a follow-up migration once the copy is verified.
