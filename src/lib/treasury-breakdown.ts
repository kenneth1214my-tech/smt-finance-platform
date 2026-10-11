// Types and helpers for the per-KPI "breakdown & calculation" panels (see components/ui/KpiBreakdown).
// Pure — no I/O. On this platform cash flows are entered/imported monthly rather than derived from
// Xero balance sheets, so a cash-flow KPI breaks down into its monthly values.

export interface BreakdownRow {
  label: string;
  hint?: string;
  values: (number | null)[];
  kind?: "item" | "total" | "muted" | "check";
  format?: "pct" | "count"; // show values as a percentage / whole number instead of an amount
}
export interface BreakdownSection {
  id: string;
  title: string;
  result: number | null;
  resultFormat?: "pct" | "count";
  formula: string;
  cols: string[];
  rows: BreakdownRow[];
  notes?: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100 + 0;

/** One monthly series (e.g. operating cash flow) as a month-by-month table that adds up to the KPI. */
export function monthlyFlowSection(args: {
  id: string;
  title: string;
  formula: string;
  values: { month: number; value: number }[];
  monthNames: string[];
  isZh: boolean;
  notes?: string[];
}): BreakdownSection {
  const { id, title, formula, values, monthNames, isZh, notes } = args;
  const sorted = [...values].sort((a, b) => a.month - b.month);
  const total = r2(sorted.reduce((a, v) => a + v.value, 0));
  return {
    id,
    title,
    result: total,
    formula,
    cols: [isZh ? "金额" : "Amount"],
    rows: [
      ...sorted.map((v) => ({ label: monthNames[v.month - 1], values: [r2(v.value)] })),
      { label: isZh ? "合计" : "Total", values: [total], kind: "total" as const },
    ],
    notes,
  };
}
