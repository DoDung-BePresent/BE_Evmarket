/*
  Warnings:

  - You are about to drop the column `listingId` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `listingType` on the `Bid` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Bid_listingId_listingType_idx";

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "listingId",
DROP COLUMN "listingType";

-- CreateIndex
CREATE INDEX "Bid_vehicleId_idx" ON "Bid"("vehicleId");

-- CreateIndex
CREATE INDEX "Bid_batteryId_idx" ON "Bid"("batteryId");
