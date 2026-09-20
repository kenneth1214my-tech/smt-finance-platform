-- Adds monthly granularity for report types like "monthly_risk" that need more than one row
-- per (reportKey, periodYear) — e.g. January and February reports in the same year. Replaces
-- the single non-partial unique index with two partial ones, since a single index can't express
-- "unique per (key,year) when there's no month" AND "unique per (key,year,month) when there is
-- one" simultaneously (Postgres never treats NULL = NULL, so folding periodMonth into the
-- existing index unchanged would have silently let unlimited duplicate rows through for every
-- existing report type).
ALTER TABLE "ReportDoc" ADD COLUMN "periodMonth" INTEGER;

DROP INDEX IF EXISTS "ReportDoc_reportKey_periodYear_key";

CREATE UNIQUE INDEX "ReportDoc_key_year_no_month_key" ON "ReportDoc" ("reportKey", "periodYear") WHERE "periodMonth" IS NULL;
CREATE UNIQUE INDEX "ReportDoc_key_year_month_key" ON "ReportDoc" ("reportKey", "periodYear", "periodMonth") WHERE "periodMonth" IS NOT NULL;
