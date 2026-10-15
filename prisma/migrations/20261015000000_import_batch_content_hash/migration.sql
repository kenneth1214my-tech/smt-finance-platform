-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_contentHash_key" ON "ImportBatch"("contentHash");
