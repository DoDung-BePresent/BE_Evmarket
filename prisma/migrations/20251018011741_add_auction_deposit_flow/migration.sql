/*
  Warnings:

  - The values [AUCTION_RELEASE] on the enum `FinancialTransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FinancialTransactionType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PURCHASE', 'AUCTION_DEPOSIT', 'DEPOSIT_REFUND', 'DEPOSIT_FORFEIT');
ALTER TABLE "FinancialTransaction" ALTER COLUMN "type" TYPE "FinancialTransactionType_new" USING ("type"::text::"FinancialTransactionType_new");
ALTER TYPE "FinancialTransactionType" RENAME TO "FinancialTransactionType_old";
ALTER TYPE "FinancialTransactionType_new" RENAME TO "FinancialTransactionType";
DROP TYPE "public"."FinancialTransactionType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'HELD';
