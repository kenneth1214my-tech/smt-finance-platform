// Employment cost = payroll-type P&L accounts, picked by NAME (a chart of accounts has no "staff cost" flag).
// Deliberately narrow so non-staff costs (agent commissions, "allowance for doubtful debts") are never swept in.
const EMPLOYMENT_RE = /salar|wage|payroll|\bcpf\b|\bsdl\b|skills development|bonus|remunerat|director'?s?\s*fee|\bstaff\b|employee|worker levy|\bfwl\b|overtime|\bepf\b|\bsocso\b|\bperkeso\b|\bbpjs\b/i;

// Depreciation + amortisation = any P&L account whose name says so; feeds EBITDA (EBIT + D&A).
const DEPRECIATION_RE = /depreciat|amortis|amortiz/i;

export function depreciationOf(expenseLineItems: { label: string; value: number }[]): number {
  return expenseLineItems.filter((i) => DEPRECIATION_RE.test(i.label)).reduce((a, i) => a + i.value, 0);
}

export function employmentCostOf(expenseLineItems: { label: string; value: number }[]): number {
  return expenseLineItems.filter((i) => EMPLOYMENT_RE.test(i.label)).reduce((a, i) => a + i.value, 0);
}
