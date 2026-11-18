import "server-only";
import { db } from "@/lib/db";
import { computeJvRollForward, validateJvInputs, type JvIssue, type JvYearResult } from "@/lib/joint-venture";

// Prisma's "table / column does not exist": the database has not been migrated yet. That is the only failure treated as "no joint ventures".
// Anything else is a real error and is raised, so a broken load can never quietly leave a joint venture out of the Group statements.
const isNotMigrated = (err: unknown) => {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
  return code === "P2021" || code === "P2022";
};

export interface JointVentureView {
  id: string;
  name: string;
  country: string;
  ownershipPct: number;
  currency: string;
  acquiredOn: string | null;
  investmentAccountName: string | null;
  years: JvYearResult[];
  /** Where each year's HQ ledger carrying amount came from (this platform has no Xero balance-sheet history: typed in, or cost). */
  ledgerSource: Record<number, "input" | "xero" | "xero-nil" | "cost">;
  /** Problems in the yearly figures that would give a wrong Group statement (see validateJvInputs). */
  issues: JvIssue[];
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Every joint venture with its equity-method schedule worked out year by year. [] when none, or the tables are not there yet (not migrated). */
export async function loadJointVentures(): Promise<JointVentureView[]> {
  try {
    const jvs = await db.jointVenture.findMany({ include: { periods: true }, orderBy: { createdAt: "asc" } });
    return jvs.map((jv) => {
      const ledgerSource: Record<number, "input" | "xero" | "xero-nil" | "cost"> = {};
      const inputs = jv.periods.map((p) => {
        ledgerSource[p.year] = p.hqLedgerCarrying === null ? "cost" : "input";
        return {
          year: p.year,
          capitalAdded: num(p.capitalAdded),
          jvNetResult: num(p.jvNetResult),
          jvNetAssets: p.jvNetAssets === null ? null : num(p.jvNetAssets),
          dividendsReceived: num(p.dividendsReceived),
          translation: num(p.translation),
          impairment: num(p.impairment),
          hqLedgerCarrying: p.hqLedgerCarrying === null ? null : num(p.hqLedgerCarrying),
          hqLedgerExpense: num(p.hqLedgerExpense),
        };
      });
      return {
        id: jv.id,
        name: jv.name,
        country: jv.country,
        ownershipPct: num(jv.ownershipPct),
        currency: jv.currency,
        acquiredOn: jv.acquiredOn ? jv.acquiredOn.toISOString().slice(0, 10) : null,
        investmentAccountName: jv.investmentAccountName,
        years: computeJvRollForward(num(jv.ownershipPct), inputs),
        issues: validateJvInputs(num(jv.ownershipPct), inputs, computeJvRollForward(num(jv.ownershipPct), inputs)),
        ledgerSource,
      };
    });
  } catch (err) {
    if (isNotMigrated(err)) return [];
    console.error("joint venture load failed", err);
    throw err;
  }
}

export interface JvPosition {
  hasJointVenture: boolean;
  groupResult: number;
  profitAdjustment: number;
  investmentCarrying: number;
  balanceAdjustment: number;
  unrecognisedLosses: number;
  /** The year's charge already sitting in HQ's own expenses, shown as a reversing line so the Group P&L adds up. */
  alreadyInExpenses: number;
  /** True when the joint-venture figures could not be loaded: the Group statements then leave the joint venture out, and say so. */
  loadFailed: boolean;
}

const EMPTY: JvPosition = { hasJointVenture: false, groupResult: 0, profitAdjustment: 0, investmentCarrying: 0, balanceAdjustment: 0, unrecognisedLosses: 0, alreadyInExpenses: 0, loadFailed: false };

/** The Group's joint-venture position for a year. A year with no schedule row carries the last earlier row's balances and contributes no result. */
export function positionForYear(jvs: JointVentureView[], year: number): JvPosition {
  const out = { ...EMPTY };
  for (const jv of jvs) {
    const upTo = jv.years.filter((y) => y.year <= year);
    const last = upTo[upTo.length - 1];
    if (!last) continue;
    out.hasJointVenture = true;
    out.investmentCarrying += last.closing;
    out.balanceAdjustment += last.balanceAdjustment;
    out.unrecognisedLosses += last.unrecognisedCarriedForward;
    if (last.year === year) {
      out.groupResult += last.groupResult;
      out.profitAdjustment += last.profitAdjustment;
      out.alreadyInExpenses += last.hqLedgerExpense;
    }
  }
  const r2 = (n: number) => Math.round(n * 100) / 100 + 0;
  return { ...out, groupResult: r2(out.groupResult), profitAdjustment: r2(out.profitAdjustment), investmentCarrying: r2(out.investmentCarrying), balanceAdjustment: r2(out.balanceAdjustment), unrecognisedLosses: r2(out.unrecognisedLosses), alreadyInExpenses: r2(out.alreadyInExpenses) };
}

export interface JvTaxItem {
  name: string;
  year: number;
  /** Share of the joint venture's loss HQ's own ledger charges to its P&L: not deductible. */
  charge: number;
  /** Dividends received: normally exempt (one-tier / foreign-sourced dividend rules), to be confirmed. */
  dividends: number;
}

/** The joint-venture amounts the tax computation has to deal with, per year. */
export function jvTaxItems(jvs: JointVentureView[]): JvTaxItem[] {
  const out: JvTaxItem[] = [];
  for (const jv of jvs) {
    for (const y of jv.years) {
      if (y.hqLedgerExpense > 0.005 || y.dividendsReceived > 0.005) out.push({ name: jv.name, year: y.year, charge: y.hqLedgerExpense, dividends: y.dividendsReceived });
    }
  }
  return out;
}

export async function loadJvPosition(year: number): Promise<JvPosition> {
  try {
    return positionForYear(await loadJointVentures(), year);
  } catch {
    // Already logged by the loader. The consolidated pages show a notice instead of failing.
    return { ...EMPTY, loadFailed: true };
  }
}
