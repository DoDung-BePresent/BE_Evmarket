-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "disputeReason" TEXT;
