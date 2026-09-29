-- CreateTable
CREATE TABLE "workspace_layout_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "layout_version" INTEGER NOT NULL DEFAULT 1,
    "layout" JSONB NOT NULL,
    "floating" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_layout_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_layout_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "active_preset_id" TEXT,
    "preset_by_project" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_layout_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_layout_presets_user_id_idx" ON "workspace_layout_presets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_layout_presets_user_id_name_key" ON "workspace_layout_presets"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_layout_state_user_id_key" ON "workspace_layout_state"("user_id");

-- AddForeignKey
ALTER TABLE "workspace_layout_presets" ADD CONSTRAINT "workspace_layout_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_layout_state" ADD CONSTRAINT "workspace_layout_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_layout_state" ADD CONSTRAINT "workspace_layout_state_active_preset_id_fkey" FOREIGN KEY ("active_preset_id") REFERENCES "workspace_layout_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
