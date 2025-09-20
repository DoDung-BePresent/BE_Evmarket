/*
  Warnings:

  - You are about to drop the `Bid` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Fee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Listing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Watchlist` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `type` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('OAUTH', 'CREDENTIALS');

-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_bidderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_listingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Listing" DROP CONSTRAINT "Listing_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_reportedId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_reviewedId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_listingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Watchlist" DROP CONSTRAINT "Watchlist_listingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Watchlist" DROP CONSTRAINT "Watchlist_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "type" "public"."AccountType" NOT NULL;

-- DropTable
DROP TABLE "public"."Bid";

-- DropTable
DROP TABLE "public"."Fee";

-- DropTable
DROP TABLE "public"."Listing";

-- DropTable
DROP TABLE "public"."Payment";

-- DropTable
DROP TABLE "public"."Report";

-- DropTable
DROP TABLE "public"."Review";

-- DropTable
DROP TABLE "public"."Transaction";

-- DropTable
DROP TABLE "public"."Watchlist";

-- DropEnum
DROP TYPE "public"."ListingStatus";

-- DropEnum
DROP TYPE "public"."ListingType";

-- DropEnum
DROP TYPE "public"."ReportStatus";

-- DropEnum
DROP TYPE "public"."TransactionStatus";
