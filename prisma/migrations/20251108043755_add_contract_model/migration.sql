-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "contractUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_transactionId_key" ON "Contract"("transactionId");

-- CreateIndex
CREATE INDEX "Contract_buyerId_idx" ON "Contract"("buyerId");

-- CreateIndex
CREATE INDEX "Contract_sellerId_idx" ON "Contract"("sellerId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
