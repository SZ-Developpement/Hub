-- AlterTable
ALTER TABLE "user" ADD COLUMN     "banned" BOOLEAN DEFAULT false,
ADD COLUMN     "role" TEXT DEFAULT 'user';
