import "server-only";
import { db } from "@/lib/db";
import { buildAcraPack, type AcraCheck, type AcraPack, type AcraScope, type AcraTemplate, type BalanceInput, type CashFlowInput, type PeriodInput, type PnlInput } from "@/lib/acra-xbrl";

type Num = { toString(): string } | number | null | undefined;
const n = (v: Num) => Number(v ?? 0);
const sum = <T,>(rows: T[], pick: (r: T) => Num) => rows.reduce((a, r) => a + n(pick(r)), 0);

// Twelve months ending in the year-end month of financial year `year`.
function fyWhere(year: number, fye: number) {
  if (fye === 12) return { year };
  return { OR: [{ year: year - 1, month: { gte: fye + 1 } }, { year, month: { lte: fye } }] };
}

async function periodOf(year: number, fye: number, scope: AcraScope): Promise<PeriodInput> {
  const subFilter = scope === "company" ? { subsidiaryId: null } : {};
  const [monthly, cash] = await Promise.all([
    db.monthlyFinancial.findMany({ where: { ...fyWhere(year, fye), ...subFilter } }),
    db.cashFlowMonthly.findMany({ where: fyWhere(year, fye) }),
  ]);
  const pnl: PnlInput | null =
    monthly.length === 0
      ? null
      : {
          revenue: sum(monthly, (r) => r.revenue),
          costOfSales: sum(monthly, (r) => r.opCost),
          sellExp: sum(monthly, (r) => r.sellExp),
          adminExp: sum(monthly, (r) => r.adminExp),
          rndExp: sum(monthly, (r) => r.rndExp),
          financeExp: sum(monthly, (r) => r.financeExp),
          employmentCost: sum(monthly, (r) => r.employmentCost),
          netProfit: sum(monthly, (r) => r.netProfit),
        };
  const cf: CashFlowInput | null = cash.length === 0 ? null : { ocf: sum(cash, (r) => r.ocf), icf: sum(cash, (r) => r.icf), fcf: sum(cash, (r) => r.fcf) };
  return { pnl, bs: null, cf };
}

// This app keeps ONE current balance-sheet snapshot per entity (equity and debt ratio), not a month-end archive — so only the three
// totals are known, and only "as of now". assets = equity ÷ (1 − debt ratio).
function derive(equity: number, debtRatio: number) {
  const assets = debtRatio < 100 ? equity / (1 - debtRatio / 100) : equity;
  return { assets, liabilities: assets - equity, equity };
}

export async function loadAcraPack(opts: { year: number; scope: AcraScope; template?: AcraTemplate; isZh: boolean }): Promise<AcraPack> {
  const setting = await db.systemSetting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const fye = setting.fyeMonth;
  const [current, prior, subs] = await Promise.all([periodOf(opts.year, fye, opts.scope), periodOf(opts.year - 1, fye, opts.scope), db.subsidiary.findMany()]);

  const entities = [{ equity: n(setting.equity), debt: n(setting.debtRatio) }, ...(opts.scope === "group" ? subs.map((s) => ({ equity: n(s.equity), debt: n(s.debtRatio) })) : [])];
  const totals = entities.map((e) => derive(e.equity, e.debt));
  const snapshot: BalanceInput = {
    totalAssets: totals.reduce((a, t) => a + t.assets, 0),
    totalLiabilities: totals.reduce((a, t) => a + t.liabilities, 0),
    totalEquity: totals.reduce((a, t) => a + t.equity, 0),
    cash: 0, clearing: 0, loans: 0, opAssets: 0, fixedAssets: 0, finAssets: 0, opLiabilities: 0, finLiabilities: 0, receivables: 0, inventory: 0, loansCurrent: 0, finLiabCurrent: 0, shareCapital: 0,
    detailed: false, equityDetailed: false, totalsOnly: true,
  };
  const hasSnapshot = snapshot.totalEquity !== 0 || snapshot.totalAssets !== 0;
  const t = (zh: string, en: string) => (opts.isZh ? zh : en);
  const extra: AcraCheck[] = [
    {
      id: "bs-snapshot",
      label: t("资产负债表来源", "Balance sheet source"),
      ok: false,
      detail: t(
        "本系统只保存一份当前的资产负债表快照（权益和负债率），没有按财年末存档，也没有科目明细，所以只能列出资产、负债、权益三个合计。要得到完整的年末报表，请把 Gaumga 的 Xero 接入主平台。",
        "This app keeps a single current balance-sheet snapshot (equity and debt ratio) — no year-end archive and no line detail — so only the three totals can be shown. Connect Gaumga's Xero to the main platform to get a complete year-end statement.",
      ),
    },
  ];
  // The snapshot describes today, so it is shown against the latest year only.
  const latestYear = await db.monthlyFinancial.aggregate({ _max: { year: true } });
  const isLatest = opts.year >= (latestYear._max.year ?? opts.year);
  const currentWithBs: PeriodInput = { ...current, bs: hasSnapshot && isLatest ? snapshot : null };
  const pack = buildAcraPack({
    entityName: setting.companyName,
    uen: setting.registrationNo,
    scope: opts.scope,
    year: opts.year,
    fyeMonth: fye,
    template: opts.template,
    accountingFramework: "SFRS_I",
    isZh: opts.isZh,
    current: currentWithBs,
    prior,
    extraChecks: extra,
  });
  // This app has no sync: say where its figures actually come from.
  for (const c of pack.checks) {
    if (c.id === "bs-present") c.detail = t("没有可用的资产负债表数据——请在「设置 → 集团设置 / 子公司」填写权益和负债率；本系统不保存年末存档。", "No balance-sheet figures are on file — enter equity and debt ratio under Settings (group / subsidiaries); this app does not archive year-ends.");
    if (c.id === "pl-employee") c.detail = t("为 0：要么没有人工成本，要么利润表导入时没有人工成本科目——请重新导入利润表后再看。", "It is 0: either there is none or the imported profit and loss had no employment-cost accounts — re-import the profit and loss and look again.");
  }
  return pack;
}
