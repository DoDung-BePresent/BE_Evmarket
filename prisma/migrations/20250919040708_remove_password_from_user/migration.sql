/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `password` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `provider` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."Provider" AS ENUM ('GOOGLE', 'CREDENTIALS');

-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "password" TEXT NOT NULL,
DROP COLUMN "provider",
ADD COLUMN     "provider" "public"."Provider" NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "password";

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");
