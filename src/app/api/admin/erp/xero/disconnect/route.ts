import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export async function POST() {
  await requireAdmin();
  await db.xeroConnection.deleteMany({ where: { id: "default" } });
  return NextResponse.json({ ok: true });
}
