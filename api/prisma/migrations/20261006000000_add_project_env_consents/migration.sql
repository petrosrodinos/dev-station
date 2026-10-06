-- CreateTable
CREATE TABLE "project_env_consents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_env_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_env_consents_user_id_idx" ON "project_env_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_env_consents_project_id_user_id_key" ON "project_env_consents"("project_id", "user_id");

-- AddForeignKey
ALTER TABLE "project_env_consents" ADD CONSTRAINT "project_env_consents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_env_consents" ADD CONSTRAINT "project_env_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
