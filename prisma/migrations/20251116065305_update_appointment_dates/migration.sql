/*
  Warnings:

  - You are about to drop the column `buyerProposedDate` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `sellerProposedDate` on the `Appointment` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "buyerProposedDate",
DROP COLUMN "sellerProposedDate",
ADD COLUMN     "buyerProposedDates" TIMESTAMP(3)[],
ADD COLUMN     "sellerProposedDates" TIMESTAMP(3)[];
