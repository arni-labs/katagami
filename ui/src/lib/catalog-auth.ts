import "server-only";
import { importJWK, jwtVerify } from "jose";
import { publicJwks, isAsConfigured, mcpResource, currentGeneration } from "./oauth-as";

// Verify an MCP bearer for the READ tier (ARN-360). A valid, live access token
// minted by our own AS (ARN-151) = an authenticated Katagami user → full
// catalog; anything else → the anonymous sample. "Valid" is strict on purpose,
// because full-tier unlocks the whole art-style/language catalog:
//
//  - ES256, signed by the current AS key, with a required `exp`.
//  - Audience must name THIS resource (the MCP front door). A token minted for
//    another resource does not unlock the catalog here.
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

export type ReadIdentity = { sub: string; email: string };

/** Normalize a resource URI for comparison (trailing slash is not significant). */
function normRes(s: string): string {
  return s.trim().replace(/\/+$/, "");
}

/** Does the token's audience name THIS MCP's resource? Only this resource —
 *  a token minted for a dev adapter (KATAGAMI_EXTRA_RESOURCES) or any other
 *  resource must NOT unlock the catalog here. Trailing slash tolerated. */
function audienceMatches(aud: unknown): boolean {
  const want = normRes(mcpResource());
  const auds = Array.isArray(aud) ? aud : aud ? [aud] : [];
  return auds.some((a) => normRes(String(a)) === want);
}

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
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["ES256"],
      requiredClaims: ["exp", "sub", "aud", "auth_generation"],
      ...(process.env.KATAGAMI_AS_ISSUER ? { issuer: process.env.KATAGAMI_AS_ISSUER } : {}),
    });
    // Authorization codes are signed by the same key; never honor one as a bearer.
    if (payload.typ) return null;
    // Audience must be exactly this MCP's resource (jose treats an audience
    // array as alternatives, so it is checked here against the one resource).
    if (!audienceMatches(payload.aud)) return null;
    const sub = String(payload.sub ?? "");
    if (!sub) return null;
    // Kill switches: generation (sign-out-everywhere) and per-grant revoke.
    const gen = Number(payload.auth_generation ?? 0);
    if (gen !== (await currentGeneration(sub))) return null;
    const grantId = String(payload.grant_id ?? "");
    if (grantId && !(await grantIsActive(grantId))) return null;
    return { sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
