-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SELLING', 'ADMIN', 'RND', 'FINANCE');

-- CreateTable
CREATE TABLE "ExpenseCategoryMapping" (
    "id" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategoryMapping_accountLabel_key" ON "ExpenseCategoryMapping"("accountLabel");
