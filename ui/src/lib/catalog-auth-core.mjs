// Claim evaluation for the gallery read MCP. catalog-auth.ts supplies JWKS
// + Temper after jose verifies the signature; tests mint a production-shaped
// JWT and call the same functions — not a withMcpAuth stub.

import { jwtVerify } from "jose";
import { readMcpResource, SCOPE_READ } from "./mcp-oauth.mjs";

export function normRes(s) {
  return String(s ?? "")
    .trim()
    .replace(/\/+$/, "");
}

/** Gallery /mcp only. A contribute-adapter audience must not unlock this catalog. */
export function audienceIsReadMcp(aud) {
  const want = normRes(readMcpResource());
  const auds = Array.isArray(aud) ? aud : aud ? [aud] : [];
  return auds.some((a) => normRes(String(a)) === want);
}

export function scopeIncludesRead(scope) {
  if (typeof scope !== "string" || !scope.trim()) return false;
  return scope.split(/[\s]+/).includes(SCOPE_READ);
}

/** The complete, closed vocabulary of bearer-rejection reasons (ARN-451).
 *  These become the @reason attribute on mcp_auth_challenge, so the set MUST
 *  stay small, enumerable, and free of anything identity-shaped — never a
 *  token, client id, or sub. Anything outside this set is clamped to
 *  "unknown" before it can reach Datadog. */
export const AUTH_REJECTION_REASONS = new Set([
  "expired", // exp in the past — normal token aging
  "signature", // bad signature / malformed / wrong alg — probe or key drift
  "claims", // missing required claims, wrong typ, wrong issuer, no sub
  "audience", // token minted for another resource (e.g. the contribute adapter)
  "scope", // token lacks the read scope
  "generation", // signed-out-everywhere bumped past this token
  "grant_revoked", // the agent grant behind the token was revoked
  "as_unconfigured", // this deploy cannot verify anything (AS key absent)
  "unknown",
]);

export function clampRejectionReason(reason) {
  return AUTH_REJECTION_REASONS.has(reason) ? reason : "unknown";
}

/** Why a VERIFIED payload is still rejected — null means accepted. The single
 *  source of truth for the claim checks: identityFromAccessPayload derives
 *  from this, so the reason vocabulary can never drift from the actual gate. */
export function accessPayloadRejection(payload, ctx) {
  if (payload.typ) return "claims"; // an authorization code is not an access token
  if (!audienceIsReadMcp(payload.aud)) return "audience";
  if (!scopeIncludesRead(payload.scope)) return "scope";
  if (!String(payload.sub ?? "")) return "claims";
  const gen = Number(payload.auth_generation ?? 0);
  if (gen !== ctx.generation) return "generation";
  const grantId = String(payload.grant_id ?? "");
  if (grantId && !ctx.grantActive) return "grant_revoked";
  return null;
}

/** Map a jose verification throw to a rejection reason. */
export function joseRejectionReason(err) {
  const code = String(err?.code ?? "");
  if (code === "ERR_JWT_EXPIRED") return "expired";
  if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") return "claims";
  // bad signature, malformed JWT, wrong alg, wrong key type…
  return "signature";
}

/**
 * Post-jose checks for a gallery access token. Rejects authorization codes
 * (`typ`), contribute-only tokens, and any audience other than /mcp.
 */
export function identityFromAccessPayload(payload, ctx) {
  if (accessPayloadRejection(payload, ctx) !== null) return null;
  return { sub: String(payload.sub ?? ""), email: String(payload.email ?? "") };
}

/** The jose + claim path with the rejection reason attached (ARN-451):
 *  { identity, reason } where exactly one side is set. */
export async function verifyReadAccessTokenDetailed(token, deps) {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, deps.key, {
      algorithms: ["ES256"],
      requiredClaims: ["exp", "sub", "aud", "auth_generation"],
      ...(deps.issuer ? { issuer: deps.issuer } : {}),
    }));
  } catch (err) {
    return { identity: null, reason: joseRejectionReason(err), error: err };
  }
  const sub = String(payload.sub ?? "");
  if (!sub) return { identity: null, reason: "claims" };
  const grantId = String(payload.grant_id ?? "");
  const ctx = {
    generation: await deps.currentGeneration(sub),
    grantActive: grantId ? await deps.grantIsActive(grantId) : true,
  };
  const reason = accessPayloadRejection(payload, ctx);
  if (reason !== null) return { identity: null, reason };
  return {
    identity: { sub, email: String(payload.email ?? "") },
    reason: null,
  };
}

/** The same jose + claim path verifyReadBearer uses after loading the AS key. */
export async function verifyReadAccessToken(token, deps) {
  const { identity, error } = await verifyReadAccessTokenDetailed(token, deps);
  if (identity) return identity;
  // Preserve the historical contract exactly: a jose-level failure THROWS the
  // original jose error (callers catch), a claim-level rejection returns null.
  if (error) throw error;
  return null;
}

/**
 * Route verify callback. Missing bearer → undefined (mcp-handler: "No
 * authorization provided"). Present but invalid → throw (mcp-handler:
 * "Invalid token"). Never treat garbage as a missing header.
 *
 * Accepts either verifier shape: legacy (identity | null) or detailed
 * ({ identity, reason }). The throw carries `rejectionReason` — a value from
 * AUTH_REJECTION_REASONS, clamped — so the 401 counter can say WHY without
 * ever seeing the token.
 */
export async function readMcpAuthInfo(bearer, verifyReadBearer) {
  if (!bearer) return undefined;
  const out = await verifyReadBearer(bearer);
  const detailed = out !== null && typeof out === "object" && "identity" in out;
  const id = detailed ? out.identity : out;
  if (!id) {
    const err = new Error("invalid_token");
    err.name = "InvalidToken";
    err.rejectionReason = clampRejectionReason(detailed ? out.reason : "unknown");
    throw err;
  }
  return {
    token: bearer,
    clientId: "katagami-read",
    scopes: [SCOPE_READ],
    extra: { sub: id.sub, email: id.email },
  };
}

export function whoamiFromAuth(auth) {
  if (!auth) {
    return {
      tier: "sample",
      access: "unreachable on /mcp — this URL requires a bearer",
    };
  }
  return {
    tier: "full",
    signed_in_as: auth.extra?.email ?? "(a Google account)",
    access: "the complete Katagami catalog",
  };
}
