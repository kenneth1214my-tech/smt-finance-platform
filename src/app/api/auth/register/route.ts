import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = clientKeyFromRequest(req);
  const limit = rateLimit(`register-ip:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { name, email, phone, subsidiaryId, requestedRole, reason } = parsed.data;

  const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  const existingRequest = await db.accessRequest.findFirst({
    where: { email: email.toLowerCase(), status: "PENDING" },
  });
  if (existingRequest) {
    return NextResponse.json({ error: "already_pending" }, { status: 409 });
  }

  await db.accessRequest.create({
    data: {
      name,
      email: email.toLowerCase(),
      phone,
      subsidiaryId: subsidiaryId || null,
      requestedRole,
      reason,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}
