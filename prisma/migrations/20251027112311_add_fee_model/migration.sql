-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('REGULAR_SALE', 'AUCTION_SALE');

-- AlterEnum
ALTER TYPE "FinancialTransactionType" ADD VALUE 'COMMISSION_FEE';

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "type" "FeeType" NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fee_type_key" ON "Fee"("type");
