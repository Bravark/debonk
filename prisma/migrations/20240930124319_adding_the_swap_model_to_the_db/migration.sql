-- CreateTable
CREATE TABLE "Swap" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "swapMessageId" TEXT NOT NULL,
    "fromCurrency" TEXT,
    "toCurrency" TEXT,
    "fromAmount" TEXT,
    "toAmount" TEXT,
    "fromNetwork" TEXT,
    "toNetwork" TEXT,
    "transactionId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Swap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Swap_swapMessageId_key" ON "Swap"("swapMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Swap_transactionId_key" ON "Swap"("transactionId");

-- AddForeignKey
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_telegramId_fkey" FOREIGN KEY ("telegramId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;
