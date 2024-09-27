-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralProfit" DOUBLE PRECISION NOT NULL DEFAULT 0.0000,
ADD COLUMN     "referredBy" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "referralCashOut" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "payoutAddress" TEXT NOT NULL,
    "transactionId" TEXT,
    "payoutHash" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referralCashOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referralCashOut_transactionId_key" ON "referralCashOut"("transactionId");

-- AddForeignKey
ALTER TABLE "referralCashOut" ADD CONSTRAINT "referralCashOut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
