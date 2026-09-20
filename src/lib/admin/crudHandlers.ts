import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { requireUser, canApprove } from "@/lib/dal";

/**
 * Generic REST handler factory for admin-managed tables.
 * `delegate` is a Prisma model delegate (e.g. db.subsidiary); `createSchema`/`updateSchema`
 * validate the request body. Every route requires ADMIN or DIRECTOR.
 */
export function listCreateHandlers<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: any,
  createSchema: ZodType<T>,
  findManyArgs?: Record<string, unknown>
) {
  async function GET() {
    const user = await requireUser();
    if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const rows = await delegate.findMany(findManyArgs || {});
    return NextResponse.json({ rows });
  }

  async function POST(req: Request) {
    const user = await requireUser();
    if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const raw = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
    const row = await delegate.create({ data: parsed.data });
    return NextResponse.json({ row });
  }

  return { GET, POST };
}

export function itemHandlers<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: any,
  updateSchema: ZodType<T>
) {
  async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const user = await requireUser();
    if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { id } = await ctx.params;
    const raw = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
    const row = await delegate.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ row });
  }

  async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const user = await requireUser();
    if (!canApprove(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { id } = await ctx.params;
    await delegate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return { PUT, DELETE };
}
