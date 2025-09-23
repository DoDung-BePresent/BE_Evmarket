/*
  Warnings:

  - Added the required column `year` to the `Battery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Battery" ADD COLUMN     "year" INTEGER NOT NULL;
