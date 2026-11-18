import "server-only";
import { db } from "@/lib/db";
import { computeJvRollForward, type JvYearResult } from "@/lib/joint-venture";

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
        ledgerSource,
      };
    });
  } catch {
    return [];
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
}

const EMPTY: JvPosition = { hasJointVenture: false, groupResult: 0, profitAdjustment: 0, investmentCarrying: 0, balanceAdjustment: 0, unrecognisedLosses: 0, alreadyInExpenses: 0 };

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

export async function loadJvPosition(year: number): Promise<JvPosition> {
  return positionForYear(await loadJointVentures(), year);
}
