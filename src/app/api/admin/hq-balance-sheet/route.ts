import { NextResponse } from "next/server";
import { requireUser, canApprove } from "@/lib/dal";
import { db } from "@/lib/db";
import { hqBalanceSheetSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();
  if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const row = await db.systemSetting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  return NextResponse.json({ equity: row.equity, debtRatio: row.debtRatio });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = await req.json().catch(() => null);
  const parsed = hqBalanceSheetSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const row = await db.systemSetting.upsert({ where: { id: "default" }, update: parsed.data, create: { id: "default", ...parsed.data } });
  return NextResponse.json({ equity: row.equity, debtRatio: row.debtRatio });
}
