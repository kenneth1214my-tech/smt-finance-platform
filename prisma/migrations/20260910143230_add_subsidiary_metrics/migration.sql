-- AlterTable
ALTER TABLE "Subsidiary" ADD COLUMN     "debtRatio" DECIMAL(6,2) NOT NULL DEFAULT 0,
ADD COLUMN     "riskRating" "RiskSeverity" NOT NULL DEFAULT 'GOOD',
ADD COLUMN     "roe" DECIMAL(6,2) NOT NULL DEFAULT 0;
