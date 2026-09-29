-- CreateEnum
CREATE TYPE "SkillProvider" AS ENUM ('CLAUDE', 'CURSOR', 'CODEX', 'GEMINI', 'COPILOT', 'GENERIC');

-- CreateEnum
CREATE TYPE "SkillKind" AS ENUM ('SKILL', 'COMMAND', 'RULE', 'CONTEXT', 'DOC');

-- CreateEnum
CREATE TYPE "SkillFavoriteKind" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "provider" "SkillProvider" NOT NULL DEFAULT 'GENERIC',
    "kind" "SkillKind" NOT NULL DEFAULT 'SKILL',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "target_kind" "SkillFavoriteKind" NOT NULL,
    "ref_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skills_organization_id_idx" ON "skills"("organization_id");

-- CreateIndex
CREATE INDEX "skill_favorites_organization_id_idx" ON "skill_favorites"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_favorites_user_id_target_kind_ref_id_key" ON "skill_favorites"("user_id", "target_kind", "ref_id");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_favorites" ADD CONSTRAINT "skill_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_favorites" ADD CONSTRAINT "skill_favorites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
