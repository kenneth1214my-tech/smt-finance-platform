// WARNING: this script deletes and replaces bank accounts, AR customers, projects, risk
// alerts, report docs, and 2026 budgets with fictional demo data. It is a dev-only fixture
// generator, kept for local/staging use — do NOT run it against the production database
// (same DATABASE_URL used by local dev in this project) once real data has been entered.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Not importing src/lib/password.ts here: it has `import "server-only"`, which only
// resolves inside Next's build/runtime, not in this standalone tsx script.
function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

const SUBSIDIARIES = [
  { key: "mfg", nameZh: "SMT制造", nameZhTw: "SMT製造", nameEn: "SMT Manufacturing", nameMs: "SMT制造", nameId: "SMT制造", segmentZh: "制造业务", segmentZhTw: "製造業務", segmentEn: "Manufacturing", segmentMs: "Perkilangan", segmentId: "Manufaktur", colorHex: "#1baf7a", sortOrder: 1, roe: 14.2, debtRatio: 52.3, riskRating: "GOOD" as const },
  { key: "cons", nameZh: "SMT消费品", nameZhTw: "SMT消費品", nameEn: "SMT Consumer Goods", nameMs: "SMT消费品", nameId: "SMT消费品", segmentZh: "消费业务", segmentZhTw: "消費業務", segmentEn: "Consumer Goods", segmentMs: "Barangan Pengguna", segmentId: "Barang Konsumen", colorHex: "#2a78d6", sortOrder: 2, roe: 16.8, debtRatio: 44.7, riskRating: "GOOD" as const },
  { key: "nrg", nameZh: "SMT能源", nameZhTw: "SMT能源", nameEn: "SMT Energy", nameMs: "SMT能源", nameId: "SMT能源", segmentZh: "能源业务", segmentZhTw: "能源業務", segmentEn: "Energy", segmentMs: "Tenaga", segmentId: "Energi", colorHex: "#eb6834", sortOrder: 3, roe: 11.5, debtRatio: 58.9, riskRating: "WARNING" as const },
  { key: "oth", nameZh: "SMT供应链", nameZhTw: "SMT供應鏈", nameEn: "SMT Supply Chain", nameMs: "SMT供应链", nameId: "SMT供应链", segmentZh: "其他业务", segmentZhTw: "其他業務", segmentEn: "Supply Chain / Other", segmentMs: "Rantaian Bekalan", segmentId: "Rantai Pasok", colorHex: "#4a3aa7", sortOrder: 4, roe: 6.4, debtRatio: 63.1, riskRating: "SERIOUS" as const },
  { key: "tech", nameZh: "SMT科技服务", nameZhTw: "SMT科技服務", nameEn: "SMT Tech Services", nameMs: "SMT科技服务", nameId: "SMT科技服务", segmentZh: "科技服务", segmentZhTw: "科技服務", segmentEn: "Tech Services", segmentMs: "Perkhidmatan Teknologi", segmentId: "Layanan Teknologi", colorHex: "#e87ba4", sortOrder: 5, roe: 19.3, debtRatio: 31.5, riskRating: "GOOD" as const },
];

const REGIONS = [
  { key: "east", nameZh: "华东地区", nameZhTw: "華東地區", nameEn: "East China", nameMs: "China Timur", nameId: "China Timur", sortOrder: 1, revShare: 143.2 / 430.6, profitShare: 10.4 / 26.9, yoy: 12.8 },
  { key: "south", nameZh: "华南地区", nameZhTw: "華南地區", nameEn: "South China", nameMs: "China Selatan", nameId: "China Selatan", sortOrder: 2, revShare: 98.6 / 430.6, profitShare: 6.9 / 26.9, yoy: 8.1 },
  { key: "north", nameZh: "华北地区", nameZhTw: "華北地區", nameEn: "North China", nameMs: "China Utara", nameId: "China Utara", sortOrder: 3, revShare: 74.5 / 430.6, profitShare: 4.6 / 26.9, yoy: -1.6 },
  { key: "central", nameZh: "华中地区", nameZhTw: "華中地區", nameEn: "Central China", nameMs: "China Tengah", nameId: "China Tengah", sortOrder: 4, revShare: 68.1 / 430.6, profitShare: 3.2 / 26.9, yoy: -9.8 },
  { key: "southwest", nameZh: "西南地区", nameZhTw: "西南地區", nameEn: "Southwest China", nameMs: "China Barat Daya", nameId: "China Barat Daya", sortOrder: 5, revShare: 46.2 / 430.6, profitShare: 1.8 / 26.9, yoy: 6.7 },
];

// Monthly revenue/profit/margin, Jan-Aug 2026, group totals split proportionally per subsidiary below.
const REV_M = [44.8, 31.2, 48.5, 52.1, 54.6, 58.3, 60.8, 80.3];
const NP_M = [2.4, 1.1, 2.6, 2.9, 3.2, 3.6, 4.0, 7.1];
const GM_M = [30.1, 28.7, 30.8, 31.2, 31.9, 32.4, 32.8, 33.1];
const SHARE: Record<string, number> = { mfg: 0.34, cons: 0.25, nrg: 0.19, oth: 0.13, tech: 0.09 };

async function main() {
  console.log("Seeding subsidiaries...");
  const subMap: Record<string, string> = {};
  for (const s of SUBSIDIARIES) {
    const rec = await db.subsidiary.upsert({ where: { key: s.key }, update: s, create: s });
    subMap[s.key] = rec.id;
  }

  console.log("Seeding regions...");
  const regionMap: Record<string, string> = {};
  for (const r of REGIONS) {
    const { revShare, profitShare, yoy, ...regionFields } = r;
    void revShare; void profitShare; void yoy;
    const rec = await db.region.upsert({ where: { key: r.key }, update: regionFields, create: regionFields });
    regionMap[r.key] = rec.id;
  }

  console.log("Seeding monthly financials...");
  // Real YoY per subsidiary (used to also seed a 2025 baseline so growth can be computed honestly from data, not faked).
  const SUB_YOY: Record<string, number> = { mfg: 9.4, cons: 15.2, nrg: 6.1, oth: -3.8, tech: 24.6 };
  for (const [key, share] of Object.entries(SHARE)) {
    for (let i = 0; i < REV_M.length; i++) {
      const month = i + 1;
      const revenue = REV_M[i] * share;
      const netProfit = NP_M[i] * share;
      await db.monthlyFinancial.upsert({
        where: { subsidiaryId_year_month: { subsidiaryId: subMap[key], year: 2026, month } },
        update: {},
        create: {
          subsidiaryId: subMap[key],
          year: 2026,
          month,
          revenue: Math.round(revenue * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          grossMarginPct: GM_M[i],
          opCost: Math.round(revenue * (1 - GM_M[i] / 100) * 100) / 100,
        },
      });
      const prevRevenue = revenue / (1 + SUB_YOY[key] / 100);
      const prevMargin = Math.max(GM_M[i] - 1.4, 5);
      await db.monthlyFinancial.upsert({
        where: { subsidiaryId_year_month: { subsidiaryId: subMap[key], year: 2025, month } },
        update: {},
        create: {
          subsidiaryId: subMap[key],
          year: 2025,
          month,
          revenue: Math.round(prevRevenue * 100) / 100,
          netProfit: Math.round((netProfit / (1 + SUB_YOY[key] / 100)) * 100) / 100,
          grossMarginPct: prevMargin,
          opCost: Math.round(prevRevenue * (1 - prevMargin / 100) * 100) / 100,
        },
      });
    }
  }

  console.log("Seeding regional monthly financials...");
  for (const r of REGIONS) {
    for (let i = 0; i < REV_M.length; i++) {
      const month = i + 1;
      const revenue = REV_M[i] * r.revShare;
      const netProfit = NP_M[i] * r.profitShare;
      await db.regionMonthlyFinancial.upsert({
        where: { regionId_year_month: { regionId: regionMap[r.key], year: 2026, month } },
        update: {},
        create: { regionId: regionMap[r.key], year: 2026, month, revenue: Math.round(revenue * 100) / 100, netProfit: Math.round(netProfit * 100) / 100 },
      });
      await db.regionMonthlyFinancial.upsert({
        where: { regionId_year_month: { regionId: regionMap[r.key], year: 2025, month } },
        update: {},
        create: {
          regionId: regionMap[r.key],
          year: 2025,
          month,
          revenue: Math.round((revenue / (1 + r.yoy / 100)) * 100) / 100,
          netProfit: Math.round((netProfit / (1 + r.yoy / 100)) * 100) / 100,
        },
      });
    }
  }

  console.log("Seeding users...");
  const users = [
    { name: "陈立群", email: "admin@smt-group.com", password: "admin123", role: "ADMIN" as const, sub: null },
    { name: "林志远", email: "director@smt-group.com", password: "director123", role: "DIRECTOR" as const, sub: null },
    { name: "李婉如", email: "finance@smt-group.com", password: "finance123", role: "FINANCE" as const, sub: "mfg" },
    { name: "张国栋", email: "manager@smt-group.com", password: "manager123", role: "MANAGER" as const, sub: "mfg" },
  ];
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        subsidiaryId: u.sub ? subMap[u.sub] : null,
        status: "ACTIVE",
      },
    });
  }

  console.log("Seeding pending access requests...");
  const pending = [
    { name: "周美玲", email: "zhou.ml@smt-group.com", phone: "138****2210", sub: "cons", role: "FINANCE" as const, reason: "负责消费品板块月度经营分析，需要财务数据查看权限" },
    { name: "Ahmad Faisal", email: "ahmad.faisal@smt-group.com", phone: "139****7734", sub: "nrg", role: "MANAGER" as const, reason: "新任能源子公司区域经理，需要子公司经营看板权限" },
    { name: "林建成", email: "lin.jc@smt-group.com", phone: "137****5560", sub: null, role: "VIEWER" as const, reason: "集团审计部门季度抽查，需要只读查看权限" },
  ];
  for (const p of pending) {
    const existing = await db.accessRequest.findFirst({ where: { email: p.email, status: "PENDING" } });
    if (existing) continue;
    await db.accessRequest.create({
      data: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        subsidiaryId: p.sub ? subMap[p.sub] : null,
        requestedRole: p.role,
        reason: p.reason,
        status: "PENDING",
      },
    });
  }

  console.log("Seeding budgets...");
  await db.budget.deleteMany({ where: { year: 2026 } });
  const budgetRates: Record<string, { cost: number; expense: number; pace: number }> = {
    mfg: { cost: 97.4, expense: 91.2, pace: 0.86 },
    cons: { cost: 95.1, expense: 86.8, pace: 0.92 },
    nrg: { cost: 99.6, expense: 90.3, pace: 0.79 },
    oth: { cost: 101.8, expense: 94.5, pace: 0.71 },
    tech: { cost: 88.9, expense: 79.6, pace: 0.95 },
  };
  for (const s of SUBSIDIARIES) {
    const totalRevenue = REV_M.reduce((a, b) => a + b, 0) * SHARE[s.key];
    await db.budget.create({
      data: {
        subsidiaryId: subMap[s.key],
        year: 2026,
        revenueBudget: Math.round((totalRevenue / budgetRates[s.key].pace) * 100) / 100,
        costBudgetRate: budgetRates[s.key].cost,
        expenseBudgetRate: budgetRates[s.key].expense,
      },
    });
  }

  console.log("Seeding bank accounts...");
  await db.bankAccount.deleteMany({});
  const banks = [
    { bankZh: "中国建设银行", bankEn: "China Construction Bank", acctType: "main", balance: 52.4, currency: "CNY" },
    { bankZh: "招商银行", bankEn: "China Merchants Bank", acctType: "general", balance: 34.1, currency: "CNY" },
    { bankZh: "中国银行", bankEn: "Bank of China", acctType: "fx", balance: 18.9, currency: "USD" },
    { bankZh: "上海浦发银行", bankEn: "SPD Bank", acctType: "general", balance: 12.6, currency: "CNY" },
    { bankZh: "渣打银行", bankEn: "Standard Chartered", acctType: "fx", balance: 6.3, currency: "HKD" },
  ];
  for (const b of banks) await db.bankAccount.create({ data: b });

  console.log("Seeding monthly cash flow...");
  const OCF_M = [3.1, 1.6, 3.0, 3.3, 3.5, 3.8, 4.0, 5.2];
  const ICF_M = [-2.4, -1.1, -2.0, -3.2, -1.8, -2.6, -3.4, -4.9];
  const FCF_M = [1.2, -0.8, 0.6, 1.9, -1.1, 0.4, 2.2, -0.6];
  for (let i = 0; i < OCF_M.length; i++) {
    const month = i + 1;
    await db.cashFlowMonthly.upsert({
      where: { year_month: { year: 2026, month } },
      update: { ocf: OCF_M[i], icf: ICF_M[i], fcf: FCF_M[i] },
      create: { year: 2026, month, ocf: OCF_M[i], icf: ICF_M[i], fcf: FCF_M[i] },
    });
  }

  console.log("Seeding AR customers...");
  await db.aRCustomer.deleteMany({});
  const arCustomers = [
    { nameZh: "恒盛地产集团", nameEn: "Hengsheng Property Group", sub: "oth", balance: 1.82, agingDays: 212, status: "CRITICAL" as const },
    { nameZh: "金辉建工", nameEn: "Jinhui Construction", sub: "mfg", balance: 0.96, agingDays: 143, status: "SERIOUS" as const },
    { nameZh: "万景商业", nameEn: "Wanjing Commercial", sub: "cons", balance: 0.74, agingDays: 88, status: "WARNING" as const },
    { nameZh: "启辰能源贸易", nameEn: "Qichen Energy Trading", sub: "nrg", balance: 0.61, agingDays: 52, status: "WARNING" as const },
    { nameZh: "云帆科技", nameEn: "Yunfan Tech", sub: "tech", balance: 0.38, agingDays: 24, status: "GOOD" as const },
    { nameZh: "嘉和物流", nameEn: "Jiahe Logistics", sub: "oth", balance: 0.33, agingDays: 19, status: "GOOD" as const },
  ];
  for (const c of arCustomers) {
    await db.aRCustomer.create({
      data: { nameZh: c.nameZh, nameEn: c.nameEn, subsidiaryId: subMap[c.sub], balance: c.balance, agingDays: c.agingDays, status: c.status },
    });
  }

  console.log("Seeding projects...");
  await db.project.deleteMany({});
  const projects = [
    { nameZh: "云璟产业园", nameEn: "Yunjing Industrial Park", sub: "mfg", budget: 38.6, spent: 24.1, progressPct: 58, status: "DELAYED" as const, owner: "陈昱" },
    { nameZh: "SMT智造基地二期", nameEn: "SMT Smart Manufacturing Base Phase II", sub: "mfg", budget: 26.4, spent: 19.8, progressPct: 79, status: "ON_TRACK" as const, owner: "林知行" },
    { nameZh: "海悦城市综合体", nameEn: "Haiyue Mixed-use Complex", sub: "oth", budget: 52.0, spent: 31.5, progressPct: 61, status: "ON_TRACK" as const, owner: "周明远" },
    { nameZh: "新能源光伏产业园", nameEn: "New Energy PV Industrial Park", sub: "nrg", budget: 44.8, spent: 38.6, progressPct: 88, status: "AHEAD" as const, owner: "赵启帆" },
    { nameZh: "消费品华南仓配中心", nameEn: "Consumer Goods South China DC", sub: "cons", budget: 9.6, spent: 8.9, progressPct: 94, status: "AHEAD" as const, owner: "黄以宁" },
    { nameZh: "科技服务云平台升级", nameEn: "Tech Services Cloud Platform Upgrade", sub: "tech", budget: 6.2, spent: 3.1, progressPct: 47, status: "DELAYED" as const, owner: "苏婉青" },
  ];
  for (const p of projects) {
    await db.project.create({
      data: { nameZh: p.nameZh, nameEn: p.nameEn, subsidiaryId: subMap[p.sub], budget: p.budget, spent: p.spent, progressPct: p.progressPct, status: p.status, owner: p.owner },
    });
  }

  console.log("Seeding risk alerts...");
  await db.riskAlert.deleteMany({});
  const risks = [
    { severity: "SERIOUS" as const, category: "opRisk", tag: "revDecline", sub: null, entityLabel: "华中区域", date: "2026-09-08", textZh: "华中地区营业收入同比下降 9.8%，主要受地产竣工交付放缓影响", textZhTw: "華中地區營業收入同比下降 9.8%，主要受地產竣工交付放緩影響", textEn: "Central China revenue down 9.8% YoY, mainly due to slower property handovers", textMs: "Hasil China Tengah turun 9.8% YoY, disebabkan penyerahan hartanah yang perlahan", textId: "Pendapatan China Tengah turun 9,8% YoY, akibat perlambatan serah terima properti" },
    { severity: "WARNING" as const, category: "costRisk", tag: "costUp", sub: "mfg", entityLabel: "SMT制造", date: "2026-09-07", textZh: "主要原材料（钢材、铝材）采购成本环比上升 6.5%", textZhTw: "主要原材料（鋼材、鋁材）採購成本環比上升 6.5%", textEn: "Key raw material (steel, aluminium) costs up 6.5% MoM", textMs: "Kos bahan mentah utama (keluli, aluminium) naik 6.5% MoM", textId: "Biaya bahan baku utama (baja, aluminium) naik 6,5% MoM" },
    { severity: "CRITICAL" as const, category: "creditRisk", tag: "arRisk", sub: "oth", entityLabel: "SMT供应链", date: "2026-09-06", textZh: "对某地产客户应收账款逾期达 1.35 亿元，账龄已超 180 天", textZhTw: "對某地產客戶應收帳款逾期達 1.35 億元，帳齡已超 180 天", textEn: "A property-developer customer's AR is overdue RMB 135M, aged over 180 days", textMs: "Belum terima pelanggan hartanah tertunggak RMB135 juta, lebih 180 hari", textId: "Piutang klien properti menunggak RMB135 juta, lebih dari 180 hari" },
    { severity: "WARNING" as const, category: "marketRisk", tag: "fxRisk", sub: null, entityLabel: "海外业务", date: "2026-09-05", textZh: "美元兑人民币波动导致海外业务本月汇兑损失约 0.42 亿元", textZhTw: "美元兌人民幣波動導致海外業務本月匯兌損失約 0.42 億元", textEn: "USD/RMB volatility caused an FX loss of ~RMB 42M in overseas operations this month", textMs: "Turun naik USD/RMB menyebabkan kerugian tukaran ~RMB42 juta", textId: "Volatilitas USD/RMB menyebabkan kerugian kurs ~RMB42 juta" },
    { severity: "SERIOUS" as const, category: "opRisk", tag: "projDelay", sub: "mfg", entityLabel: "云璟产业园项目", date: "2026-09-04", textZh: "“云璟产业园”项目工程形象进度滞后计划 11 个百分点", textZhTw: "“雲璟產業園”項目工程形象進度滯後計劃 11 個百分點", textEn: "\"Yunjing Industrial Park\" physical progress is 11pp behind plan", textMs: "Kemajuan fizikal projek \"Yunjing\" 11mp di belakang jadual", textId: "Progres fisik proyek \"Yunjing\" 11pp di belakang jadwal" },
    { severity: "WARNING" as const, category: "liquidityRisk", tag: "creditConc", sub: "nrg", entityLabel: "SMT能源", date: "2026-09-03", textZh: "短期借款集中于单一银行，授信集中度达 46%，建议分散融资渠道", textZhTw: "短期借款集中於單一銀行，授信集中度達 46%，建議分散融資管道", textEn: "Short-term borrowing concentrated in one bank (46%) — diversify funding sources", textMs: "Pinjaman jangka pendek tertumpu pada satu bank (46%) — pelbagaikan sumber", textId: "Pinjaman jangka pendek terkonsentrasi di satu bank (46%) — diversifikasi sumber dana" },
    { severity: "CRITICAL" as const, category: "complianceRisk", tag: "taxAudit", sub: "cons", entityLabel: "SMT消费品", date: "2026-08-30", textZh: "子公司收到税务机关专项核查通知，涉及2025年度增值税进项抵扣", textZhTw: "子公司收到稅務機關專項核查通知，涉及2025年度增值稅進項抵扣", textEn: "Subsidiary received a tax audit notice regarding 2025 VAT input credits", textMs: "Anak syarikat menerima notis audit cukai berkaitan kredit VAT 2025", textId: "Anak usaha menerima pemberitahuan audit pajak terkait kredit PPN 2025" },
    { severity: "GOOD" as const, category: "opRisk", tag: "closed", sub: "tech", entityLabel: "SMT科技服务", date: "2026-08-27", textZh: "研发费用加计扣除备案已完成整改，风险解除", textZhTw: "研發費用加計扣除備案已完成整改，風險解除", textEn: "R&D super-deduction filing remediation complete — risk closed", textMs: "Pemfailan potongan R&D telah dibetulkan — risiko ditutup", textId: "Pengajuan potongan super R&D telah diperbaiki — risiko ditutup" },
  ];
  for (const r of risks) {
    await db.riskAlert.create({
      data: {
        severity: r.severity,
        category: r.category,
        tag: r.tag,
        subsidiaryId: r.sub ? subMap[r.sub] : null,
        entityLabel: r.entityLabel,
        textZh: r.textZh,
        textZhTw: r.textZhTw,
        textEn: r.textEn,
        textMs: r.textMs,
        textId: r.textId,
        occurredAt: new Date(r.date),
      },
    });
  }

  console.log("Seeding report documents...");
  await db.reportDoc.deleteMany({});
  const reports = [
    { nameZh: "集团合并利润表", nameEn: "Consolidated Income Statement", type: "MANAGEMENT" as const, status: "GENERATED" as const, period: "2026-08", gen: "2026-09-02T08:15:00Z" },
    { nameZh: "集团合并资产负债表", nameEn: "Consolidated Balance Sheet", type: "MANAGEMENT" as const, status: "GENERATED" as const, period: "2026-08", gen: "2026-09-02T08:15:00Z" },
    { nameZh: "集团合并现金流量表", nameEn: "Consolidated Cash Flow Statement", type: "MANAGEMENT" as const, status: "GENERATED" as const, period: "2026-08", gen: "2026-09-02T08:16:00Z" },
    { nameZh: "分子公司经营简报", nameEn: "Subsidiary Operating Brief", type: "MANAGEMENT" as const, status: "GENERATED" as const, period: "2026-08", gen: "2026-09-03T10:20:00Z" },
    { nameZh: "预算执行分析报告", nameEn: "Budget Execution Report", type: "MANAGEMENT" as const, status: "GENERATED" as const, period: "2026-Q3", gen: "2026-09-08T16:40:00Z" },
    { nameZh: "应收账款账龄分析表", nameEn: "AR Aging Analysis", type: "SPECIAL" as const, status: "GENERATED" as const, period: "2026-08", gen: "2026-09-04T09:05:00Z" },
    { nameZh: "风险预警月报", nameEn: "Monthly Risk Report", type: "SPECIAL" as const, status: "GENERATED" as const, period: "2026-08", gen: "2026-09-05T11:30:00Z" },
    { nameZh: "年度审计财务报表", nameEn: "Audited Annual Financial Statements", type: "STATUTORY" as const, status: "ARCHIVED" as const, period: "2025", gen: "2026-04-18T14:00:00Z" },
    { nameZh: "9月合并利润表", nameEn: "September Consolidated Income Statement", type: "MANAGEMENT" as const, status: "GENERATING" as const, period: "2026-09", gen: null },
  ];
  for (const r of reports) {
    await db.reportDoc.create({
      data: { nameZh: r.nameZh, nameEn: r.nameEn, type: r.type, status: r.status, period: r.period, generatedAt: r.gen ? new Date(r.gen) : null },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
