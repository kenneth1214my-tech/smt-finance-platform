import "server-only";
import { db } from "@/lib/db";
import { computeFilingDueDate } from "@/lib/filing-due";

/** The IRAS due date for a filing, from the entity's financial year-end — or null when the rule cannot work it out. */
export async function statutoryDueDate(f: { type?: string | null; periodLabel?: string | null; subsidiaryId?: string | null }): Promise<Date | null> {
  if (!f.type || !f.periodLabel) return null;
  const setting = await db.systemSetting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  let fye = setting.fyeMonth;
  if (f.subsidiaryId) {
    const sub = await db.subsidiary.findUnique({ where: { id: f.subsidiaryId }, select: { fyeMonth: true } });
    if (sub) fye = sub.fyeMonth;
  }
  const r = computeFilingDueDate({ jurisdiction: "SG", type: f.type, periodLabel: f.periodLabel, fyeMonth: fye });
  return r ? new Date(r.date + "T00:00:00.000Z") : null;
}
