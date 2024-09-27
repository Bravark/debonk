/*
  Warnings:

  - You are about to drop the column `isStimulation` on the `Position` table. All the data in the column will be lost.
  - You are about to drop the column `stumulationBalance` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Position" DROP COLUMN "isStimulation",
ADD COLUMN     "isSimulation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stumulationBalance",
ADD COLUMN     "simulationBalance" DECIMAL(65,30) NOT NULL DEFAULT 10;
