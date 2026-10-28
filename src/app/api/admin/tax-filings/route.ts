import { db } from "@/lib/db";
import { taxFilingSchema } from "@/lib/validation";
import { listCreateHandlers } from "@/lib/admin/crudHandlers";
import { statutoryDueDate } from "@/lib/filing-due-server";

const base = listCreateHandlers(db.taxFiling, taxFilingSchema, {
  include: { subsidiary: true },
  orderBy: { dueDate: "asc" },
});

export const GET = base.GET;

// The due date is set by the IRAS rule (see filing-due.ts), not by whatever the form sent: statutory dates are not typed in.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return base.POST(new Request(req.url, { method: "POST", headers: req.headers, body: "null" }));
  const due = await statutoryDueDate({ type: body.type as string, periodLabel: body.periodLabel as string, subsidiaryId: (body.subsidiaryId as string) || null });
  const merged = due ? { ...body, dueDate: due.toISOString() } : body;
  return base.POST(new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(merged) }));
}
