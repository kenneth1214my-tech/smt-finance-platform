-- Prevent duplicate filings per entity per (type, period) — mirrors the same fix in
-- smt-finance-saas, closing a race condition in the auto-create quarterly GST F5 logic (two
-- concurrent page loads both seeing "no row yet" could otherwise create a duplicate).
CREATE UNIQUE INDEX "TaxFiling_subsidiaryId_type_periodLabel_key" ON "TaxFiling"("subsidiaryId", "type", "periodLabel");

-- Postgres treats NULLs as distinct in a unique index, so a partial index enforces the same for
-- HQ-level rows (subsidiaryId IS NULL) — single-tenant here, so no organizationId column needed.
CREATE UNIQUE INDEX "TaxFiling_hq_type_periodLabel_key" ON "TaxFiling"("type", "periodLabel") WHERE "subsidiaryId" IS NULL;
