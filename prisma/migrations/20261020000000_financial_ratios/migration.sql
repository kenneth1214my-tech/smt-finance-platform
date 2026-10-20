-- AlterTable
ALTER TABLE "MonthlyFinancial" ADD COLUMN "employmentCost" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN "sharesOutstanding" DECIMAL(18,0),
ADD COLUMN "sharePrice" DECIMAL(14,4),
ADD COLUMN "dividendPerShare" DECIMAL(14,4);
