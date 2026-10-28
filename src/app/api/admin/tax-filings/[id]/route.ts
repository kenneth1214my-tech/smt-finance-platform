import { db } from "@/lib/db";
import { taxFilingSchema } from "@/lib/validation";
import { itemHandlers } from "@/lib/admin/crudHandlers";
import { statutoryDueDate } from "@/lib/filing-due-server";

const base = itemHandlers(db.taxFiling, taxFilingSchema.partial());

export const DELETE = base.DELETE;

// If the edit changes the type, period or entity, the due date is recalculated by the IRAS rule rather than taken from the form.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (body) {
    const existing = await db.taxFiling.findUnique({ where: { id }, select: { type: true, periodLabel: true, subsidiaryId: true } });
    if (existing) {
      const due = await statutoryDueDate({
        type: (body.type as string) ?? existing.type,
        periodLabel: (body.periodLabel as string) ?? existing.periodLabel,
        subsidiaryId: "subsidiaryId" in body ? ((body.subsidiaryId as string) || null) : existing.subsidiaryId,
      });
      if (due) body.dueDate = due.toISOString();
    }
  }
  return base.PUT(new Request(req.url, { method: "PUT", headers: req.headers, body: JSON.stringify(body) }), ctx);
}
