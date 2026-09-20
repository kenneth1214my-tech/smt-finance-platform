import "server-only";
import { db } from "@/lib/db";

export { CURRENCY_OPTIONS } from "@/lib/currency-options";

/** Reads the singleton base-currency setting, creating the default row on first access. */
export async function getBaseCurrency(): Promise<string> {
  const row = await db.systemSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", baseCurrency: "CNY" },
  });
  return row.baseCurrency;
}

export async function setBaseCurrency(currency: string) {
  return db.systemSetting.upsert({
    where: { id: "default" },
    update: { baseCurrency: currency },
    create: { id: "default", baseCurrency: currency },
  });
}

/** Reads the singleton FYE-month setting, creating the default row on first access. */
export async function getFyeMonth(): Promise<number> {
  const row = await db.systemSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return row.fyeMonth;
}

export async function setFyeMonth(fyeMonth: number) {
  return db.systemSetting.upsert({
    where: { id: "default" },
    update: { fyeMonth },
    create: { id: "default", fyeMonth },
  });
}

export async function getExchangeRates(): Promise<Record<string, number>> {
  const rows = await db.exchangeRate.findMany();
  const map: Record<string, number> = {};
  for (const r of rows) map[r.currency] = Number(r.rateToBase);
  return map;
}

/**
 * Converts `amount` (in `currency`) into the base currency, given a currency->rate map
 * (1 unit of `currency` = rate units of base). Returns null when the currency isn't the
 * base and no rate has been entered yet — callers should surface that instead of guessing.
 */
export function convertToBase(amount: number, currency: string, baseCurrency: string, rates: Record<string, number>): number | null {
  if (currency === baseCurrency) return amount;
  const rate = rates[currency];
  if (rate === undefined) return null;
  return amount * rate;
}
