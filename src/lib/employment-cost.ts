// Employment cost = payroll-type P&L accounts, picked by NAME (a chart of accounts has no "staff cost" flag).
// Deliberately narrow so non-staff costs (agent commissions, "allowance for doubtful debts") are never swept in.
const EMPLOYMENT_RE = /salar|wage|payroll|\bcpf\b|\bsdl\b|skills development|bonus|remunerat|director'?s?\s*fee|\bstaff\b|employee|worker levy|\bfwl\b|overtime|\bepf\b|\bsocso\b|\bperkeso\b|\bbpjs\b/i;

export function employmentCostOf(expenseLineItems: { label: string; value: number }[]): number {
  return expenseLineItems.filter((i) => EMPLOYMENT_RE.test(i.label)).reduce((a, i) => a + i.value, 0);
}
