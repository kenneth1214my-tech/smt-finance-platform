-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "investmentInSubsidiaries" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dueToSubsidiaries" DECIMAL(14,2) NOT NULL DEFAULT 0;
