// Access-token verification (the RFC 9728 protected-resource side).
//
// Tokens are ES256 JWTs minted by katagami.ai (ARN-151); we verify them
// statelessly against the AS JWKS, then check the anchoring AgentGrant is
// still Active so a human's revoke takes effect in seconds, never the full
// access-token lifetime.

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { config, jwksUrl } from "./config.js";
import type { Identity } from "./temper.js";

const jwks = createRemoteJWKSet(new URL(jwksUrl()));

// Small positive cache for grant liveness: one backend read per grant per
// 30s, so revocation latency stays ≤30s without a read per tool call.
const grantCache = new Map<string, { active: boolean; at: number }>();
const GRANT_CACHE_MS = 30_000;

async function grantIsActive(grantId: string): Promise<boolean> {
  const hit = grantCache.get(grantId);
  if (hit && Date.now() - hit.at < GRANT_CACHE_MS) return hit.active;
  const res = await fetch(
    `${config.temperUrl}/tdata/AgentGrants('${encodeURIComponent(grantId)}')`,
    {
      headers: {
        "X-Tenant-Id": config.temperTenant,
        Authorization: `Bearer ${config.temperApiKey}`,
      },
    },
  );
  const active = res.ok
    ? ((await res.json()) as { status?: string }).status === "Active"
    : false;
  grantCache.set(grantId, { active, at: Date.now() });
  return active;
}

export function identityFromAuth(auth: AuthInfo): Identity {
  const extra = (auth.extra ?? {}) as Record<string, string>;
  return {
    sub: extra.sub ?? "",
    email: extra.email ?? "",
    clientId: auth.clientId,
    grantId: extra.grantId ?? "",
    // The caller's raw access token, forwarded to Temper when
    // config.forwardCallerToken is on so the kernel verifies the caller
    // itself (RFC-0002 step 2).
    token: auth.token,
  };
}

export const tokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.resourceUrl,
      algorithms: ["ES256"],
    });
    const sub = String(payload.sub ?? "");
    const clientId = String(payload.client_id ?? "");
    const grantId = String(payload.grant_id ?? "");
    const scope = String(payload.scope ?? "");
    if (!sub || !clientId || !grantId) {
      throw new Error("Token is missing identity claims.");
    }
    if (!(await grantIsActive(grantId))) {
      throw new Error("The grant behind this token has been revoked.");
    }
    return {
      token,
      clientId,
      scopes: scope ? scope.split(" ") : [],
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
      resource: new URL(config.resourceUrl),
      extra: { sub, email: String(payload.email ?? ""), grantId },
    };
  },
};
