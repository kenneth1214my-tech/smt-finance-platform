import { Landmark, CalendarClock, AlertTriangle, Scale } from "lucide-react";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { getServerLocale } from "@/lib/i18n/locale";
import { getDictionary, withBaseCurrency, fmtMoney } from "@/lib/i18n/dictionaries";
import { getBaseCurrency } from "@/lib/currency";
import { computeCorporateTax, effectiveFilingStatus, currentGstQuarter } from "@/lib/tax";
import Topbar from "@/components/Topbar";
import KpiTile from "@/components/ui/KpiTile";
import TaxCenterClient from "./TaxCenterClient";
import KpiBreakdown from "@/components/ui/KpiBreakdown";
import { localizedName } from "@/lib/localize";
import { buildTaxKpiSections, type TaxProvisionView } from "@/lib/tax-kpi-breakdown";

const FILING_TYPE_LABEL: Record<string, string> = { ECI: "ECI", FORM_C_S: "Form C-S/C", GST_F5: "GST F5" };

// Prisma Decimal / Date instances aren't plain-serializable across the server->client
// boundary; round-trip through JSON so every field becomes a plain string/number.
function toPlain<T>(rows: T): T {
  return JSON.parse(JSON.stringify(rows));
}

export default async function TaxPage() {
  const user = await requireAdmin();
  const locale = await getServerLocale();
  const baseCurrency = await getBaseCurrency();
  const dict = withBaseCurrency(getDictionary(locale), locale, baseCurrency);
  const fmtM = (n: number) => fmtMoney(n, locale);

  const [subsidiaries, provisions, deferredItems, monthlyFinancials] = await Promise.all([
    db.subsidiary.findMany({ orderBy: { sortOrder: "asc" } }),
    db.corporateTaxProvision.findMany({ include: { subsidiary: true }, orderBy: [{ year: "desc" }] }),
    db.deferredTaxItem.findMany({ include: { subsidiary: true }, orderBy: [{ year: "desc" }] }),
    db.monthlyFinancial.findMany({ select: { subsidiaryId: true, year: true, netProfit: true } }),
  ]);

  // Net profit before tax, per entity per year, from financial data already on file
  // (MonthlyFinancial) — feeds the "generate draft provisions" shortcut so chargeable income
  // doesn't have to be retyped from a number the system already has.
  const netProfitByEntity: Record<string, Record<number, number>> = {};
  for (const mf of monthlyFinancials) {
    const key = mf.subsidiaryId ?? "HQ";
    netProfitByEntity[key] ??= {};
    netProfitByEntity[key][mf.year] = (netProfitByEntity[key][mf.year] ?? 0) + Number(mf.netProfit);
  }

  // Auto-create this quarter's GST F5 filing as a draft (due date only, figures left for the
  // user to fill in — see currentGstQuarter's doc comment) so the obligation is on the tracker as
  // soon as the quarter starts, not only once someone remembers to add it. skipDuplicates relies
  // on TaxFiling's (subsidiaryId, type, periodLabel) unique constraint to stay correct under
  // concurrent page loads — a plain "check then create" here raced and produced a real duplicate
  // in production (smt-finance-saas) before that constraint existed.
  const gstQuarter = currentGstQuarter();
  const entities: { subsidiaryId: string | null }[] = [{ subsidiaryId: null }, ...subsidiaries.map((s) => ({ subsidiaryId: s.id }))];
  await db.taxFiling.createMany({
    data: entities.map((e) => ({
      subsidiaryId: e.subsidiaryId,
      type: "GST_F5" as const,
      periodLabel: gstQuarter.periodLabel,
      dueDate: gstQuarter.dueDate,
      status: "UPCOMING" as const,
      notes: "Auto-created from the quarterly GST filing schedule — delete if this entity isn't GST-registered for this period.",
    })),
    skipDuplicates: true,
  });
  const filings = await db.taxFiling.findMany({ include: { subsidiary: true }, orderBy: [{ dueDate: "asc" }] });

  const currentYear = new Date().getFullYear();
  const netPayableCurrentYear = provisions
    .filter((p) => p.year === currentYear)
    .reduce((sum, p) => sum + computeCorporateTax(Number(p.chargeableIncome), Number(p.taxRatePct), Number(p.rebatePct), Number(p.rebateCap)).netTaxPayable, 0);

  const now = new Date();
  const upcomingFilings = filings.filter((f) => effectiveFilingStatus(f.status, f.dueDate, now) === "UPCOMING").length;
  const overdueFilings = filings.filter((f) => effectiveFilingStatus(f.status, f.dueDate, now) === "OVERDUE").length;
  const netDeferredTax = deferredItems.reduce((sum, d) => sum + Number(d.deferredTaxAmount), 0);

  // ---- Workings behind the four KPI tiles (see KpiBreakdown) ----
  const isZh = locale === "zh" || locale === "zh-Hant";
  const entityName = (s: Parameters<typeof localizedName>[0] | null) => (s ? localizedName(s, locale) : dict.m.taxGroupHQ);
  const kpiProvisions: TaxProvisionView[] = provisions
    .filter((p) => p.year === currentYear)
    .map((p) => {
      const rate = Number(p.taxRatePct);
      const c = computeCorporateTax(Number(p.chargeableIncome), rate, Number(p.rebatePct), Number(p.rebateCap));
      return {
        name: entityName(p.subsidiary),
        taxRatePct: rate,
        chargeableIncome: Number(p.chargeableIncome),
        exemptAmount: c.exemptAmount,
        taxableAfterExemption: c.taxableAfterExemption,
        grossTax: c.grossTax,
        rebateAmount: c.rebateAmount,
        netTaxPayable: c.netTaxPayable,
        effectiveRatePct: c.effectiveRatePct,
      };
    });
  const filingView = (f: (typeof filings)[number]) => ({ name: entityName(f.subsidiary), typeLabel: FILING_TYPE_LABEL[f.type] ?? f.type, periodLabel: f.periodLabel, dueDate: f.dueDate });
  const kpiSections = buildTaxKpiSections({
    jurisdiction: "SG",
    isZh,
    year: currentYear,
    provisions: kpiProvisions,
    upcoming: filings.filter((f) => effectiveFilingStatus(f.status, f.dueDate, now) === "UPCOMING").map(filingView),
    overdue: filings.filter((f) => effectiveFilingStatus(f.status, f.dueDate, now) === "OVERDUE").map(filingView),
    deferred: deferredItems.map((d) => ({ name: entityName(d.subsidiary), year: d.year, description: d.description, temporaryDifference: Number(d.temporaryDifference), deferredTax: Number(d.deferredTaxAmount) })),
    now,
  });

  // ACRA XBRL tab — the latest financial year that has already ended is the one being filed.
  const setting = await db.systemSetting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const fye = setting.fyeMonth;
  const curFyYear = now.getMonth() + 1 > fye ? now.getFullYear() + 1 : now.getFullYear();
  const defaultYear = new Date(Date.UTC(curFyYear, fye, 0)).getTime() < now.getTime() ? curFyYear : curFyYear - 1;
  // Each legal entity files its own statements: the company itself, every subsidiary, plus the (unfileable) group total.
  const acra = {
    years: [curFyYear, curFyYear - 1, curFyYear - 2, curFyYear - 3, curFyYear - 4],
    defaultYear,
    entities: [
      { id: "hq", name: setting.companyName, uen: setting.registrationNo },
      ...subsidiaries.map((s) => ({ id: s.id, name: s.nameEn, uen: s.registrationNo })),
      { id: "group", name: setting.companyName, uen: setting.registrationNo },
    ],
  };

  return (
    <>
      <Topbar dict={dict} locale={locale} title={dict.nav.tax} desc={dict.m.taxPageDesc} user={user} />
      <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-4 px-[26px] py-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile icon={Landmark} color="var(--cat-1)" label={dict.m.taxKpiNetPayable} value={fmtM(netPayableCurrentYear)} unit={dict.common.yi} />
          <KpiTile icon={CalendarClock} color="var(--status-warning)" label={dict.m.taxKpiUpcomingFilings} value={String(upcomingFilings)} />
          <KpiTile icon={AlertTriangle} color="var(--status-critical)" label={dict.m.taxKpiOverdueFilings} value={String(overdueFilings)} />
          <KpiTile icon={Scale} color="var(--cat-2)" label={dict.m.taxKpiDeferredTax} value={fmtM(netDeferredTax)} unit={dict.common.yi} />
        </div>

        <KpiBreakdown
          sections={kpiSections}
          locale={locale}
          unit={baseCurrency}
          heading={isZh ? "指标明细与计算过程" : "KPI breakdown & calculation"}
          hint={isZh ? "点击展开，查看每个税务指标的计算公式、逐项明细与说明，便于复核。" : "Click a KPI to see its formula, line items and an explanation so every figure can be re-checked."}
        />

        <TaxCenterClient
          locale={locale}
          unit={dict.common.yi}
          dict={dict}
          subsidiaries={toPlain(subsidiaries)}
          provisions={toPlain(provisions)}
          filings={toPlain(filings)}
          deferredItems={toPlain(deferredItems)}
          netProfitByEntity={netProfitByEntity}
          acra={acra}
        />
      </div>
    </>
  );
}
