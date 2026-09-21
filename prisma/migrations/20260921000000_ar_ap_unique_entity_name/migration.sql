-- One row per (entity, contact name) for ARCustomer/Payable — re-importing or re-adding the
-- same contact should update their balance/aging, never create a duplicate. Two partial indexes
-- per model because Postgres never treats NULL = NULL in a plain unique index (same
-- nullable-subsidiaryId pattern already used elsewhere in this schema).
CREATE UNIQUE INDEX "ARCustomer_sub_name_key" ON "ARCustomer"("subsidiaryId", "nameZh") WHERE "subsidiaryId" IS NOT NULL;
CREATE UNIQUE INDEX "ARCustomer_name_hq_key" ON "ARCustomer"("nameZh") WHERE "subsidiaryId" IS NULL;

CREATE UNIQUE INDEX "Payable_sub_name_key" ON "Payable"("subsidiaryId", "nameZh") WHERE "subsidiaryId" IS NOT NULL;
CREATE UNIQUE INDEX "Payable_name_hq_key" ON "Payable"("nameZh") WHERE "subsidiaryId" IS NULL;
