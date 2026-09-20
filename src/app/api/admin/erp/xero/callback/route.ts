import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { exchangeXeroCode, fetchXeroTenants } from "@/lib/xero";

const STATE_COOKIE = "xero_oauth_state";

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (oauthError || !code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?tab=data&xero=error", origin));
  }

  try {
    const redirectUri = `${origin}/api/admin/erp/xero/callback`;
    const tokens = await exchangeXeroCode(code, redirectUri);
    const tenants = await fetchXeroTenants(tokens.access_token);
    const tenant = tenants[0];

    const data = {
      tenantId: tenant?.tenantId ?? null,
      tenantName: tenant?.tenantName ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      connectedAt: new Date(),
    };
    await db.xeroConnection.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });

    return NextResponse.redirect(new URL("/settings?tab=data&xero=connected", origin));
  } catch (err) {
    console.error("Xero OAuth callback failed", err);
    return NextResponse.redirect(new URL("/settings?tab=data&xero=error", origin));
  }
}
