import { NextRequest, NextResponse } from "next/server";
import {
  grantById,
  isAsConfigured,
  issueAccessToken,
  issueRefreshToken,
  mcpResource,
  pkceMatches,
  recordGrantUse,
  resolvePresentedRefresh,
  rotateRefreshTo,
  verifyAuthCode,
} from "@/lib/oauth-as";
import { trackServerEvent } from "@/lib/server-telemetry";

// OAuth 2.1 token endpoint: authorization_code (+PKCE, mandatory) and
// rotating refresh_token grants. Every token binds the owning human (sub)
// AND the acting agent (client_id); the grant entity is the revocation
// anchor — refresh dies with the grant, access tokens age out in minutes.

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function err(code: string, description: string, status = 400) {
  return NextResponse.json(
    { error: code, error_description: description },
    { status, headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  if (!isAsConfigured()) return err("temporarily_unavailable", "Authorization server is not configured.", 503);

  let params: URLSearchParams;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    params = new URLSearchParams(
      Object.entries((await req.json()) as Record<string, string>),
    );
  } else {
    params = new URLSearchParams(await req.text());
  }

  const grantType = params.get("grant_type");
  const origin = req.nextUrl.origin;

  if (grantType === "authorization_code") {
    const code = params.get("code") ?? "";
    const verifier = params.get("code_verifier") ?? "";
    const clientId = params.get("client_id") ?? "";
    const redirectUri = params.get("redirect_uri") ?? "";

    const payload = await verifyAuthCode(origin, code);
    if (!payload) return err("invalid_grant", "Authorization code is invalid or expired.");
    if (payload.client_id !== clientId) return err("invalid_grant", "client_id does not match the code.");
    if (payload.redirect_uri && payload.redirect_uri !== redirectUri)
      return err("invalid_grant", "redirect_uri does not match the code.");
    if (!verifier || !(await pkceMatches(verifier, payload.code_challenge)))
      return err("invalid_grant", "PKCE verification failed.");

    const grant = await grantById(payload.grant_id);
    if (!grant || grant.status !== "Active")
      return err("invalid_grant", "The grant behind this code is not active.");

    const refreshToken = await issueRefreshToken(grant.grantId);
    const access = await issueAccessToken(origin, {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      client_id: clientId,
      grant_id: grant.grantId,
      resource: payload.resource || mcpResource(),
    });
    return NextResponse.json(
      {
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        refresh_token: refreshToken,
        scope: access.scope,
      },
      { headers: CORS },
    );
  }

  if (grantType === "refresh_token") {
    const presented = params.get("refresh_token") ?? "";
    const clientId = params.get("client_id") ?? "";
    // Every outcome is counted: a refresh that fails logs a client out, and
    // until 2026-09-23 nothing recorded that it happened.
    const done = (outcome: "rotated" | "replayed" | "refused" | "unavailable", reason?: string) =>
      trackServerEvent("oauth_refresh", { outcome, reason }, outcome === "rotated" || outcome === "replayed" ? "info" : "warn");
    if (!presented) {
      done("refused", "missing_token");
      return err("invalid_request", "refresh_token is required.");
    }

    let resolved;
    try {
      resolved = await resolvePresentedRefresh(presented);
    } catch {
      // A backend blip is not a bad token: say so, so the client retries with
      // the token it holds instead of discarding the sign-in.
      done("unavailable", "lookup_failed");
      return err("temporarily_unavailable", "Could not check the refresh token just now; retry shortly.", 503);
    }
    if (resolved.kind === "invalid") {
      done("refused", "unknown_or_expired");
      return err("invalid_grant", "Refresh token is unknown, revoked, or was replaced too long ago.");
    }
    const grant = resolved.grant;
    if (clientId && grant.clientId !== clientId) {
      done("refused", "client_mismatch");
      return err("invalid_grant", "client_id does not match the grant.");
    }
    if (resolved.kind === "rotate") {
      try {
        await rotateRefreshTo(grant.grantId, resolved.next);
      } catch {
        // Nothing was stored, so the presented token is still current: retrying works.
        done("unavailable", "rotate_failed");
        return err("temporarily_unavailable", "Could not rotate the refresh token just now; retry shortly.", 503);
      }
    }
    await recordGrantUse(grant.grantId);

    const access = await issueAccessToken(origin, {
      sub: grant.memberSub,
      email: grant.memberEmail,
      name: grant.memberEmail,
      client_id: grant.clientId,
      grant_id: grant.grantId,
      resource: params.get("resource") || mcpResource(),
    });
    done(resolved.kind === "rotate" ? "rotated" : "replayed");
    return NextResponse.json(
      {
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        refresh_token: resolved.next,
        scope: access.scope,
      },
      { headers: CORS },
    );
  }

  return err("unsupported_grant_type", "Use authorization_code or refresh_token.");
}
