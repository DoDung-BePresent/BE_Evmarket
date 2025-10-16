-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('VEHICLE', 'BATTERY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingStatus" ADD VALUE 'AUCTION_LIVE';
ALTER TYPE "ListingStatus" ADD VALUE 'AUCTION_ENDED';

-- AlterTable
ALTER TABLE "Battery" ADD COLUMN     "auctionEndsAt" TIMESTAMP(3),
ADD COLUMN     "bidIncrement" DOUBLE PRECISION,
ADD COLUMN     "depositAmount" DOUBLE PRECISION,
ADD COLUMN     "isAuction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startingPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "auctionEndsAt" TIMESTAMP(3),
ADD COLUMN     "bidIncrement" DOUBLE PRECISION,
ADD COLUMN     "depositAmount" DOUBLE PRECISION,
ADD COLUMN     "isAuction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startingPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingType" "ListingType" NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "batteryId" TEXT,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bid_listingId_listingType_idx" ON "Bid"("listingId", "listingType");

-- CreateIndex
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_batteryId_fkey" FOREIGN KEY ("batteryId") REFERENCES "Battery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
