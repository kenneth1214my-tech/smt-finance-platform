import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, canApprove } from "@/lib/dal";
import { updateUserSchema } from "@/lib/validation";

export async function PUT(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const admin = await requireUser();
  if (!canApprove(admin.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.email !== target.email) {
    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const user = await db.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      subsidiaryId: parsed.data.subsidiaryId || null,
    },
  });

  return NextResponse.json({ ok: true, user });
}
