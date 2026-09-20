import { NextResponse } from "next/server";
import { requireUser, canApprove } from "@/lib/dal";
import { companyNameSchema } from "@/lib/validation";
import { getCompanyName, setCompanyName } from "@/lib/company";

export async function GET() {
  const user = await requireUser();
  if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const companyName = await getCompanyName();
  return NextResponse.json({ companyName });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = await req.json().catch(() => null);
  const parsed = companyNameSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const row = await setCompanyName(parsed.data.companyName);
  return NextResponse.json({ companyName: row.companyName });
}
