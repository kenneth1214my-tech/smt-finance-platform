import { Wallet, TrendingUp, TrendingDown, Landmark, CreditCard, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getServerLocale } from "@/lib/i18n/locale";
import { getDictionary, withBaseCurrency, fmtMoney, scaleMoney } from "@/lib/i18n/dictionaries";
import { monthLabels, localizedName } from "@/lib/localize";
import { getBaseCurrency, getExchangeRates, convertToBase } from "@/lib/currency";
import Topbar from "@/components/Topbar";
import Card from "@/components/ui/Card";
import KpiTile from "@/components/ui/KpiTile";
import Ring from "@/components/ui/Ring";
import TrendChart from "@/components/ui/TrendChart";
import BarChart from "@/components/ui/BarChart";
import KpiBreakdown from "@/components/ui/KpiBreakdown";
import PeriodSelector from "@/components/PeriodSelector";
import { parsePeriod, isHistoricalPeriod } from "@/lib/period";
import { getReportYears } from "@/lib/period-server";
import { monthlyFlowSection, type BreakdownSection } from "@/lib/treasury-breakdown";

const fmt1 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const BANK_TYPE_KEY: Record<string, keyof ReturnType<typeof getDictionary>["m"]> = { main: "bankTypeMain", general: "bankTypeGeneral", fx: "bankTypeFx" };

export default async function FundPage(props: PageProps<"/fund">) {
  const user = await requireUser();
  const locale = await getServerLocale();
  const isZh = locale === "zh" || locale === "zh-Hant";
  const fmtM = (n: number) => fmtMoney(n, locale);
  const period = parsePeriod(await props.searchParams);
  const reportYears = await getReportYears(period.year);
  // Bank balances are only stored as of the latest data (no month-end history on this platform), so for a
  // past period the cash flows follow the selection but the balance and the trend are labelled as latest.
  const historical = isHistoricalPeriod(period);

  const banks = await db.bankAccount.findMany({ include: { subsidiary: true }, orderBy: { balance: "desc" } });
  const cashflow = await db.cashFlowMonthly.findMany({ where: { year: period.year, month: { gte: period.fromMonth, lte: period.toMonth } }, orderBy: { month: "asc" } });
  const baseCurrency = await getBaseCurrency();
  const dict = withBaseCurrency(getDictionary(locale), locale, baseCurrency);
  const rates = await getExchangeRates();

  // Bank balances are entered per-account currency; convert each to the base currency before
  // summing, rather than adding raw CNY+USD+HKD figures together. When a currency has no
  // exchange rate on file yet, fall back to the raw amount and flag it instead of silently
  // misconverting.
  const bankRows = banks.map((b) => {
    const original = Number(b.balance);
    const converted = convertToBase(original, b.currency, baseCurrency, rates);
    return { ...b, original, converted: converted ?? original, hasRate: converted !== null };
  });
  const missingRateCurrencies = Array.from(new Set(bankRows.filter((b) => !b.hasRate).map((b) => b.currency)));

  const totalBank = bankRows.reduce((a, b) => a + b.converted, 0);
  const totalOcf = cashflow.reduce((a, c) => a + Number(c.ocf), 0);
  const totalIcf = cashflow.reduce((a, c) => a + Number(c.icf), 0);
  const totalFcf = cashflow.reduce((a, c) => a + Number(c.fcf), 0);

  const allMonthLabels = monthLabels(locale, 12);
  const months = cashflow.map((c) => allMonthLabels[c.month - 1]);
  const netFlows = cashflow.map((c) => Number(c.ocf) + Number(c.icf) + Number(c.fcf));
  const openingBalance = totalBank - netFlows.reduce((a, b) => a + b, 0);
  const balanceByMonth = netFlows.reduce<number[]>((acc, n) => {
    const prev = acc.length ? acc[acc.length - 1] : openingBalance;
    acc.push(Math.round((prev + n) * 100) / 100);
    return acc;
  }, []);

  // No credit-line model exists yet (not modeled in the schema) — shown as 0 rather than invented numbers
  // until a real CreditLine entity is added.
  const creditTotal = 0;
  const creditUsed = 0;
  const creditUsePct = creditTotal > 0 ? (creditUsed / creditTotal) * 100 : 0;

  // ---- Workings behind each KPI tile (see KpiBreakdown) ----
  const t = (zh: string, en: string) => (isZh ? zh : en);
  const allMonthNames = monthLabels(locale, 12);
  const flowSection = (id: string, title: string, formula: string, pick: (c: (typeof cashflow)[number]) => number): BreakdownSection =>
    cashflow.length > 0
      ? monthlyFlowSection({ id, title, formula, values: cashflow.map((c) => ({ month: c.month, value: pick(c) })), monthNames: allMonthNames, isZh, notes: [t("现金流量为按月录入/导入的数值，系统不另行推算。", "Cash-flow figures are the monthly values entered / imported; the system does not re-derive them.")] })
      : { id, title, result: null, formula: t("暂无现金流数据", "No cash-flow data"), cols: [], rows: [] };
  const notRecorded = t("系统中尚未记录银行授信额度，因此该指标显示为 0，并非实际测得的数值。", "No bank credit lines are recorded in the system, so this shows 0 — it is not a measured figure.");
  const breakdownSections: BreakdownSection[] = [
    {
      id: "cash",
      title: dict.m.cashBalance,
      result: totalBank,
      formula: t(`所有银行账户余额按汇率折合 ${baseCurrency} 后相加`, `Add up every bank account, each converted to ${baseCurrency}`),
      cols: [t(`折合 ${baseCurrency}`, `In ${baseCurrency}`)],
      rows: [
        ...bankRows.map((b) => ({
          label: `${locale === "en" ? b.bankEn : b.bankZh} · ${b.subsidiary ? localizedName(b.subsidiary, locale) : t("集团总部", "Group HQ")}`,
          hint: b.currency !== baseCurrency ? `${fmtM(b.original)} ${b.currency}${b.hasRate ? "" : t("（无汇率，按原值）", " (no rate on file, face value)")}` : undefined,
          values: [b.converted],
        })),
        { label: t("现金余额合计", "Cash balance"), values: [totalBank], kind: "total" as const },
      ],
    },
    flowSection("ocf", dict.m.ocf, t("所选年度各月经营活动现金流之和", "Sum of the monthly operating cash flow for the year"), (c) => Number(c.ocf)),
    flowSection("icf", dict.m.icfNet, t("所选年度各月投资活动现金流净额之和", "Sum of the monthly net investing cash flow for the year"), (c) => Number(c.icf)),
    flowSection("fcf", dict.m.fcfNet, t("所选年度各月筹资活动现金流净额之和", "Sum of the monthly net financing cash flow for the year"), (c) => Number(c.fcf)),
    { id: "credit", title: dict.m.creditTotal, result: creditTotal, formula: t("各银行授信额度（上限）之和", "Sum of the credit limits across banks"), cols: [], rows: [], notes: [notRecorded] },
    { id: "creditUse", title: dict.m.creditUse, result: creditUsePct, resultFormat: "pct", formula: t("已使用授信额度 ÷ 授信总额", "Credit used ÷ total credit limit"), cols: [], rows: [], notes: [notRecorded] },
  ];

  return (
    <>
      <Topbar dict={dict} locale={locale} title={dict.nav.fund} desc={dict.nav.fund} user={user} />
      <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-4 px-[26px] py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodSelector year={period.year} fromMonth={period.fromMonth} toMonth={period.toMonth} years={reportYears} isZh={isZh} />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            icon={Wallet}
            color="var(--cat-1)"
            label={dict.m.cashBalance}
            value={fmtM(totalBank)}
            unit={dict.common.yi}
            note={`${isZh ? `折合 ${baseCurrency}` : `in ${baseCurrency}`}${historical ? (isZh ? " · 最新余额（无月末历史）" : " · latest balances (no month-end history)") : ""}`}
          />
          <KpiTile icon={TrendingUp} color="var(--cat-3)" label={dict.m.ocf} value={fmtM(totalOcf)} unit={dict.common.yi} />
          <KpiTile icon={TrendingDown} color="var(--cat-2)" label={dict.m.icfNet} value={fmtM(totalIcf)} unit={dict.common.yi} />
          <KpiTile icon={Landmark} color="var(--cat-4)" label={dict.m.fcfNet} value={fmtM(totalFcf)} unit={dict.common.yi} />
          <KpiTile icon={CreditCard} color="var(--cat-5)" label={dict.m.creditTotal} value={fmtM(creditTotal)} unit={dict.common.yi} />
          <KpiTile icon={AlertTriangle} color="var(--status-warning)" label={dict.m.creditUse} value={fmt1(creditUsePct)} unit="%" note={`${fmtM(creditUsed)} ${dict.common.yi}`} />
        </div>

        <div data-pdf-hide>
          <KpiBreakdown
            sections={breakdownSections}
            locale={locale}
            unit={dict.common.yi}
            heading={t("指标明细与计算过程", "KPI breakdown & calculation")}
            hint={t("点击展开，查看每个指标的计算公式、逐项明细与核对结果，便于复核。", "Click a KPI to see its formula, line items and tie-out so every figure can be re-checked.")}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={dict.m.cashTrendCard} unit={dict.common.yi}>
            {historical ? (
              <p className="py-6 text-[12.5px] leading-relaxed" style={{ color: "var(--ink-400)" }}>
                {isZh ? "现金余额趋势按最新余额倒推，仅适用于截至最新月份的期间；所选期间的现金流请见下方。" : "The cash trend is worked back from the latest balance, so it is only shown for periods ending at the latest month — see the cash flows below for the selected period."}
              </p>
            ) : (
              <TrendChart labels={months} series={[{ name: dict.m.cashBalance, color: "var(--cat-1)", data: balanceByMonth.map((v) => scaleMoney(v, locale)) }]} />
            )}
          </Card>
          <Card title={dict.m.creditGaugeCard}>
            <div className="flex flex-wrap items-center gap-6">
              <Ring pct={creditUsePct} color="var(--status-warning)" size={120} />
              <div className="flex-1 space-y-1.5 text-[12.5px]" style={{ color: "var(--ink-600)" }}>
                <div>
                  {dict.m.creditTotal}：<b className="tabular-nums" style={{ color: "var(--ink-900)" }}>{fmtM(creditTotal)} {dict.common.yi}</b>
                </div>
                <div>
                  {isZh ? "已使用额度" : "Used amount"}：<b className="tabular-nums" style={{ color: "var(--ink-900)" }}>{fmtM(creditUsed)} {dict.common.yi}</b>
                </div>
                <div className="pt-1" style={{ color: "var(--ink-400)" }}>
                  {isZh
                    ? "建议：单一银行授信集中度较高，考虑分散融资渠道。"
                    : "Recommendation: credit is concentrated in one bank — consider diversifying funding sources."}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card title={dict.m.cfActivityCard} unit={dict.common.yi}>
          <BarChart
            labels={months}
            height={230}
            series={[
              { name: dict.m.ocfActivity, color: "var(--cat-3)", data: cashflow.map((c) => scaleMoney(Number(c.ocf), locale)) },
              { name: dict.m.icfActivity, color: "var(--cat-2)", data: cashflow.map((c) => scaleMoney(Math.abs(Number(c.icf)), locale)) },
              { name: dict.m.fcfActivity, color: "var(--cat-1)", data: cashflow.map((c) => scaleMoney(Math.abs(Number(c.fcf)), locale)) },
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium" style={{ color: "var(--ink-600)" }}>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--cat-3)" }} />{dict.m.ocfActivity}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--cat-2)" }} />{dict.m.icfActivity} ({isZh ? "绝对值" : "abs"})</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--cat-1)" }} />{dict.m.fcfActivity} ({isZh ? "绝对值" : "abs"})</span>
          </div>
        </Card>

        <Card title={dict.m.bankTableCard}>
          {missingRateCurrencies.length > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11.8px]" style={{ background: "color-mix(in srgb, var(--status-warning) 12%, transparent)", color: "var(--status-warning)" }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {isZh
                ? `以下币种尚未设置汇率，暂按原值计入合计：${missingRateCurrencies.join("、")}。请在「设置 → 货币设置」中补充汇率。`
                : `No exchange rate set for: ${missingRateCurrencies.join(", ")} — included in the total at face value. Add rates under Settings → Currency.`}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-[12.6px]">
              <thead>
                <tr className="text-left text-[11.3px] font-semibold" style={{ color: "var(--ink-400)" }}>
                  <th className="pb-2">{dict.m.thBank}</th>
                  <th className="pb-2">{isZh ? "所属主体" : "Owner"}</th>
                  <th className="pb-2">{dict.m.thAcctType}</th>
                  <th className="pb-2">{dict.m.thCcy}</th>
                  <th className="pb-2 text-right">{dict.m.thBalance}</th>
                  <th className="pb-2 text-right">{isZh ? `折合 ${baseCurrency}` : `In ${baseCurrency}`} ({dict.common.yi})</th>
                  <th className="pb-2 text-right">{dict.m.thShare}</th>
                </tr>
              </thead>
              <tbody>
                {bankRows.map((b) => (
                  <tr key={b.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2.5 font-semibold" style={{ color: "var(--ink-900)" }}>
                      {locale === "en" ? b.bankEn : b.bankZh}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--ink-400)" }}>
                      {b.subsidiary ? localizedName(b.subsidiary, locale) : isZh ? "集团总部" : "Group HQ"}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--ink-400)" }}>
                      {dict.m[BANK_TYPE_KEY[b.acctType]]}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--ink-400)" }}>
                      {b.currency}
                    </td>
                    <td className="tabular-nums py-2.5 text-right" style={{ color: b.original < 0 ? "var(--status-critical)" : undefined }}>
                      {fmtM(b.original)} {dict.common.yi} {b.currency}
                    </td>
                    <td className="tabular-nums py-2.5 text-right" style={{ color: b.converted < 0 ? "var(--status-critical)" : undefined }}>
                      {fmtM(b.converted)}
                      {!b.hasRate && <span title={isZh ? "无汇率，按原值计入" : "no rate on file, face value used"}> *</span>}
                    </td>
                    <td className="tabular-nums py-2.5 text-right">{fmt1(totalBank > 0 ? (b.converted / totalBank) * 100 : 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
