-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'AUCTION');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentDeadline" TIMESTAMP(3),
ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'SALE';
