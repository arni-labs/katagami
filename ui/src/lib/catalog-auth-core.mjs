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

/**
 * Post-jose checks for a gallery access token. Rejects authorization codes
 * (`typ`), contribute-only tokens, and any audience other than /mcp.
 */
export function identityFromAccessPayload(payload, ctx) {
  if (payload.typ) return null;
  if (!audienceIsReadMcp(payload.aud)) return null;
  if (!scopeIncludesRead(payload.scope)) return null;
  const sub = String(payload.sub ?? "");
  if (!sub) return null;
  const gen = Number(payload.auth_generation ?? 0);
  if (gen !== ctx.generation) return null;
  const grantId = String(payload.grant_id ?? "");
  if (grantId && !ctx.grantActive) return null;
  return { sub, email: String(payload.email ?? "") };
}

/** The same jose + claim path verifyReadBearer uses after loading the AS key. */
export async function verifyReadAccessToken(token, deps) {
  const { payload } = await jwtVerify(token, deps.key, {
    algorithms: ["ES256"],
    requiredClaims: ["exp", "sub", "aud", "auth_generation"],
    ...(deps.issuer ? { issuer: deps.issuer } : {}),
  });
  const sub = String(payload.sub ?? "");
  if (!sub) return null;
  const grantId = String(payload.grant_id ?? "");
  return identityFromAccessPayload(payload, {
    generation: await deps.currentGeneration(sub),
    grantActive: grantId ? await deps.grantIsActive(grantId) : true,
  });
}

/**
 * Route verify callback. Missing bearer → undefined (mcp-handler: "No
 * authorization provided"). Present but invalid → throw (mcp-handler:
 * "Invalid token"). Never treat garbage as a missing header.
 */
export async function readMcpAuthInfo(bearer, verifyReadBearer) {
  if (!bearer) return undefined;
  const id = await verifyReadBearer(bearer);
  if (!id) {
    const err = new Error("invalid_token");
    err.name = "InvalidToken";
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
