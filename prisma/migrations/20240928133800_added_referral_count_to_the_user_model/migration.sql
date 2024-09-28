-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCountDirect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralCountIndirect" INTEGER NOT NULL DEFAULT 0;
