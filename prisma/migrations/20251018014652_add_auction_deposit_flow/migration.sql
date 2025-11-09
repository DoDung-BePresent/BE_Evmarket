/*
  Warnings:

  - The values [DEPOSIT_REFUND,DEPOSIT_FORFEIT] on the enum `FinancialTransactionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [HELD] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuctionDepositStatus" AS ENUM ('PAID', 'REFUNDED', 'FORFEITED');

-- AlterEnum
BEGIN;
CREATE TYPE "FinancialTransactionType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'LISTING_FEE', 'SALE_REVENUE', 'PURCHASE', 'REFUND', 'AUCTION_DEPOSIT', 'AUCTION_DEPOSIT_REFUND');
ALTER TABLE "FinancialTransaction" ALTER COLUMN "type" TYPE "FinancialTransactionType_new" USING ("type"::text::"FinancialTransactionType_new");
ALTER TYPE "FinancialTransactionType" RENAME TO "FinancialTransactionType_old";
ALTER TYPE "FinancialTransactionType_new" RENAME TO "FinancialTransactionType";
DROP TYPE "public"."FinancialTransactionType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'AUCTION_PAYMENT_PENDING';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED');
ALTER TABLE "public"."Transaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TABLE "FinancialTransaction" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "public"."TransactionStatus_old";
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- CreateTable
CREATE TABLE "AuctionDeposit" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "AuctionDepositStatus" NOT NULL DEFAULT 'PAID',
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "batteryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuctionDeposit_userId_vehicleId_key" ON "AuctionDeposit"("userId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionDeposit_userId_batteryId_key" ON "AuctionDeposit"("userId", "batteryId");

-- AddForeignKey
ALTER TABLE "AuctionDeposit" ADD CONSTRAINT "AuctionDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionDeposit" ADD CONSTRAINT "AuctionDeposit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionDeposit" ADD CONSTRAINT "AuctionDeposit_batteryId_fkey" FOREIGN KEY ("batteryId") REFERENCES "Battery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
