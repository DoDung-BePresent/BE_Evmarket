-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "disputeImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
