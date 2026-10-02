-- AlterTable
ALTER TABLE "workspace_layout_state" ADD COLUMN "project_dock_layout" JSONB NOT NULL DEFAULT '{}';
