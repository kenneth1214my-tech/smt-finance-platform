import { requireUser, canApprove } from "@/lib/dal";
import { db } from "@/lib/db";
import { getServerLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getBaseCurrency, getFyeMonth } from "@/lib/currency";
import { getCompanyName } from "@/lib/company";
import { isXeroConfigured } from "@/lib/xero";
import Topbar from "@/components/Topbar";
import SettingsClient from "@/components/settings/SettingsClient";

// Prisma Decimal / Date instances aren't plain-serializable across the server->client
// boundary; round-trip through JSON so every field becomes a plain string/number.
function toPlain<T>(rows: T): T {
  return JSON.parse(JSON.stringify(rows));
}

export default async function SettingsPage() {
  const user = await requireUser();
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const isAdmin = canApprove(user.role);

  const [
    pendingRequests,
    users,
    subsidiaries,
    regions,
    monthlyFinancials,
    regionFinancials,
    budgets,
    banks,
    cashflow,
    arCustomers,
    payables,
    projects,
    risks,
    reports,
    baseCurrency,
    fyeMonth,
    exchangeRates,
    importBatches,
    companyName,
    systemSetting,
    xeroConnection,
  ] = await Promise.all([
    isAdmin ? db.accessRequest.findMany({ where: { status: "PENDING" }, include: { subsidiary: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.user.findMany({ include: { subsidiary: true }, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    db.subsidiary.findMany({ orderBy: { sortOrder: "asc" } }),
    isAdmin ? db.region.findMany({ orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
    isAdmin ? db.monthlyFinancial.findMany({ include: { subsidiary: true }, orderBy: [{ year: "desc" }, { month: "desc" }] }) : Promise.resolve([]),
    isAdmin ? db.regionMonthlyFinancial.findMany({ include: { region: true }, orderBy: [{ year: "desc" }, { month: "desc" }] }) : Promise.resolve([]),
    isAdmin ? db.budget.findMany({ include: { subsidiary: true }, orderBy: { year: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.bankAccount.findMany({ include: { subsidiary: true }, orderBy: { balance: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.cashFlowMonthly.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }) : Promise.resolve([]),
    isAdmin ? db.aRCustomer.findMany({ include: { subsidiary: true }, orderBy: { balance: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.payable.findMany({ include: { subsidiary: true }, orderBy: { balance: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.project.findMany({ include: { subsidiary: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.riskAlert.findMany({ include: { subsidiary: true }, orderBy: { occurredAt: "desc" } }) : Promise.resolve([]),
    isAdmin ? db.reportDoc.findMany({ orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    isAdmin ? getBaseCurrency() : Promise.resolve("CNY"),
    isAdmin ? getFyeMonth() : Promise.resolve(12),
    isAdmin ? db.exchangeRate.findMany({ orderBy: { currency: "asc" } }) : Promise.resolve([]),
    isAdmin ? db.importBatch.findMany({ include: { importedBy: true }, orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([]),
    isAdmin ? getCompanyName() : Promise.resolve(""),
    isAdmin ? db.systemSetting.findUnique({ where: { id: "default" } }) : Promise.resolve(null),
    isAdmin ? db.xeroConnection.findUnique({ where: { id: "default" } }) : Promise.resolve(null),
  ]);

  return (
    <>
      <Topbar dict={dict} locale={locale} title={dict.nav.settings} user={user} />
      <div className="mx-auto w-full max-w-[1480px] flex-1 px-[26px] py-5">
        <SettingsClient
          dict={dict}
          locale={locale}
          isAdmin={isAdmin}
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserEmail={user.email}
          pendingRequests={toPlain(pendingRequests)}
          users={toPlain(users)}
          subsidiaries={toPlain(subsidiaries)}
          regions={toPlain(regions)}
          monthlyFinancials={toPlain(monthlyFinancials)}
          regionFinancials={toPlain(regionFinancials)}
          budgets={toPlain(budgets)}
          banks={toPlain(banks)}
          cashflow={toPlain(cashflow)}
          arCustomers={toPlain(arCustomers)}
          payables={toPlain(payables)}
          projects={toPlain(projects)}
          risks={toPlain(risks)}
          reports={toPlain(reports)}
          baseCurrency={baseCurrency}
          fyeMonth={fyeMonth}
          exchangeRates={toPlain(exchangeRates)}
          importBatches={toPlain(importBatches)}
          companyName={companyName}
          hqEquity={systemSetting ? Number(systemSetting.equity) : 0}
          hqDebtRatio={systemSetting ? Number(systemSetting.debtRatio) : 0}
          hqHeadcount={systemSetting?.headcount ?? 0}
          xeroConnected={Boolean(xeroConnection?.connectedAt)}
          xeroTenantName={xeroConnection?.tenantName ?? null}
          xeroConfigured={isXeroConfigured()}
        />
      </div>
    </>
  );
}
