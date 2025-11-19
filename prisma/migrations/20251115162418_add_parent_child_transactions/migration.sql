-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "_CartBatteriesTransaction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CartBatteriesTransaction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CartBatteriesTransaction_B_index" ON "_CartBatteriesTransaction"("B");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CartBatteriesTransaction" ADD CONSTRAINT "_CartBatteriesTransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "Battery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CartBatteriesTransaction" ADD CONSTRAINT "_CartBatteriesTransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
