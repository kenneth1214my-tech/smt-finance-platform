import { NextResponse } from "next/server";
import { requireUser, canApprove } from "@/lib/dal";
import { db } from "@/lib/db";

// The company's UEN — ACRA XBRL filings are keyed on it.
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = (await req.json().catch(() => null)) as { registrationNo?: unknown; subsidiaryId?: unknown } | null;
  const value = typeof raw?.registrationNo === "string" ? raw.registrationNo.trim().toUpperCase() : "";
  if (value && !/^[A-Z0-9-]{4,20}$/.test(value)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (typeof raw?.subsidiaryId === "string" && raw.subsidiaryId) {
    const res = await db.subsidiary.updateMany({ where: { id: raw.subsidiaryId }, data: { registrationNo: value || null } });
    if (res.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ registrationNo: value || null });
  }
  const row = await db.systemSetting.upsert({ where: { id: "default" }, update: { registrationNo: value || null }, create: { id: "default", registrationNo: value || null }, select: { registrationNo: true } });
  return NextResponse.json({ registrationNo: row.registrationNo });
}
