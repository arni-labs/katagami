import "server-only";
import { importJWK } from "jose";
import { publicJwks, isAsConfigured, currentGeneration } from "./oauth-as";
import { verifyReadAccessToken } from "./catalog-auth-core.mjs";

export { readMcpAuthInfo, whoamiFromAuth } from "./catalog-auth-core.mjs";

export type ReadIdentity = { sub: string; email: string };

// Verify an MCP bearer for the gallery read server at /mcp (ARN-360). A
// valid, live access token minted by our own AS (ARN-151) for THIS resource
// with the `read` scope = full catalog. Contribute-adapter tokens
// (audience mcp.katagami.ai, scope contribute) do not unlock this catalog.
// The /mcp route 401s before this when there is no bearer — that challenge
// is the Grok Bot login card. "Valid" is strict on purpose:
//
//  - ES256, signed by the current AS key, with a required `exp`.
//  - Audience must be https://katagami.ai/mcp (the gallery read MCP).
//  - Scope must include `read`. A contribute-only token is rejected.
//  - It must be an ACCESS token, never a 60-second authorization code — those
//    are signed by the same key and would otherwise replay as bearers. Access
//    tokens carry no `typ`; codes carry `typ:"katagami_code"`.
//  - Revocation reaches this gate: the token's generation must still match the
//    principal's current generation (the "sign out everywhere" kill switch),
//    and, for agent tokens, the backing grant must still be Active — otherwise
//    a revoked token would keep full access until its 15-minute expiry.

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

// Small positive cache for grant liveness: one backend read per grant per
// window, so a human's revoke still takes effect in seconds without a backend
// round-trip on every single MCP call.
const grantCache = new Map<string, { active: boolean; at: number }>();
const GRANT_TTL_MS = 15_000;

async function grantIsActive(grantId: string): Promise<boolean> {
  const hit = grantCache.get(grantId);
  if (hit && Date.now() - hit.at < GRANT_TTL_MS) return hit.active;
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/tdata/AgentGrants('${encodeURIComponent(grantId)}')`,
      {
        headers: { "X-Tenant-Id": TENANT, ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
        cache: "no-store",
      },
    );
  } catch {
    return false; // transient failure: deny this call, but don't cache it
  }
  // Only cache a DEFINITIVE answer: 200 (Active or not) or 404 (grant gone).
  // A 5xx/other is transient — deny now, retry next call rather than pinning a
  // legitimate token to the sample tier for the whole cache window.
  if (!res.ok && res.status !== 404) return false;
  const active = res.status === 404 ? false : ((await res.json()) as { status?: string }).status === "Active";
  grantCache.set(grantId, { active, at: Date.now() });
  return active;
}

export async function verifyReadBearer(token: string): Promise<ReadIdentity | null> {
  if (!isAsConfigured()) return null;
  try {
    const { keys } = await publicJwks();
    if (!keys.length) return null;
    const key = await importJWK(keys[0], "ES256");
    return await verifyReadAccessToken(token, {
      key,
      issuer: process.env.KATAGAMI_AS_ISSUER,
      currentGeneration,
      grantIsActive,
    });
  } catch {
    return null;
  }
}
