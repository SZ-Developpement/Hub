-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIF', 'INACTIF', 'PROSPECT');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIF';
