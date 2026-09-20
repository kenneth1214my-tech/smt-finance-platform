import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/dal";
import { isXeroConfigured, buildXeroAuthorizeUrl } from "@/lib/xero";

const STATE_COOKIE = "xero_oauth_state";

export async function GET(req: Request) {
  await requireAdmin();
  const origin = new URL(req.url).origin;

  if (!isXeroConfigured()) {
    return NextResponse.redirect(new URL("/settings?tab=data&xero=not_configured", origin));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${origin}/api/admin/erp/xero/callback`;
  return NextResponse.redirect(buildXeroAuthorizeUrl(redirectUri, state));
}
