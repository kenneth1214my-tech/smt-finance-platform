import "server-only";

const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";

// offline_access is required to receive a refresh token; the report/contact/transaction
// scopes cover what a future sync would need (P&L, AR, AP) so reconnecting isn't required
// once that sync is built.
const SCOPES = "offline_access accounting.reports.read accounting.contacts.read accounting.transactions.read";

export function isXeroConfigured(): boolean {
  return Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
}

export function buildXeroAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function exchangeXeroCode(code: string, redirectUri: string): Promise<XeroTokenResponse> {
  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Xero token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

interface XeroConnectionInfo {
  tenantId: string;
  tenantName: string;
}

export async function fetchXeroTenants(accessToken: string): Promise<XeroConnectionInfo[]> {
  const res = await fetch(CONNECTIONS_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Xero connections fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}
