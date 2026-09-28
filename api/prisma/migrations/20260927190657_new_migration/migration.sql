/*
  Warnings:

  - You are about to drop the column `client_id` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_client_id_fkey";

-- DropIndex
DROP INDEX "projects_client_id_idx";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "client_id";

-- DropTable
DROP TABLE "clients";
