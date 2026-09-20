-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DIRECTOR', 'FINANCE', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('GOOD', 'WARNING', 'SERIOUS', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ON_TRACK', 'AHEAD', 'DELAYED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MANAGEMENT', 'SPECIAL', 'STATUTORY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATED', 'GENERATING', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "subsidiaryId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subsidiaryId" TEXT,
    "requestedRole" "Role" NOT NULL DEFAULT 'VIEWER',
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subsidiary" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameZhTw" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameMs" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "segmentZh" TEXT NOT NULL,
    "segmentZhTw" TEXT NOT NULL,
    "segmentEn" TEXT NOT NULL,
    "segmentMs" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#2a78d6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subsidiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameZhTw" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameMs" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyFinancial" (
    "id" TEXT NOT NULL,
    "subsidiaryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,
    "netProfit" DECIMAL(14,2) NOT NULL,
    "grossMarginPct" DECIMAL(6,2) NOT NULL,
    "opCost" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionMonthlyFinancial" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,
    "netProfit" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "RegionMonthlyFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "subsidiaryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "revenueBudget" DECIMAL(14,2) NOT NULL,
    "costBudgetRate" DECIMAL(6,2) NOT NULL,
    "expenseBudgetRate" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankZh" TEXT NOT NULL,
    "bankEn" TEXT NOT NULL,
    "acctType" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowMonthly" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "ocf" DECIMAL(14,2) NOT NULL,
    "icf" DECIMAL(14,2) NOT NULL,
    "fcf" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "CashFlowMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ARCustomer" (
    "id" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "subsidiaryId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "agingDays" INTEGER NOT NULL,
    "status" "RiskSeverity" NOT NULL DEFAULT 'GOOD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ARCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "subsidiaryId" TEXT NOT NULL,
    "budget" DECIMAL(14,2) NOT NULL,
    "spent" DECIMAL(14,2) NOT NULL,
    "progressPct" INTEGER NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ON_TRACK',
    "owner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAlert" (
    "id" TEXT NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "subsidiaryId" TEXT,
    "entityLabel" TEXT NOT NULL,
    "textZh" TEXT NOT NULL,
    "textZhTw" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textMs" TEXT NOT NULL,
    "textId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDoc" (
    "id" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "period" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "importedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subsidiary_key_key" ON "Subsidiary"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Region_key_key" ON "Region"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFinancial_subsidiaryId_year_month_key" ON "MonthlyFinancial"("subsidiaryId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "RegionMonthlyFinancial_regionId_year_month_key" ON "RegionMonthlyFinancial"("regionId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_subsidiaryId_year_key" ON "Budget"("subsidiaryId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowMonthly_year_month_key" ON "CashFlowMonthly"("year", "month");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyFinancial" ADD CONSTRAINT "MonthlyFinancial_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionMonthlyFinancial" ADD CONSTRAINT "RegionMonthlyFinancial_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARCustomer" ADD CONSTRAINT "ARCustomer_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAlert" ADD CONSTRAINT "RiskAlert_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
