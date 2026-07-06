import { NextRequest, NextResponse } from "next/server";
import {
  grantById,
  grantByRefreshHash,
  isAsConfigured,
  issueAccessToken,
  issueRefreshToken,
  mcpResource,
  pkceMatches,
  sha256Hex,
  verifyAuthCode,
} from "@/lib/oauth-as";

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
        scope: "contribute",
      },
      { headers: CORS },
    );
  }

  if (grantType === "refresh_token") {
    const presented = params.get("refresh_token") ?? "";
    const clientId = params.get("client_id") ?? "";
    if (!presented) return err("invalid_request", "refresh_token is required.");

    const grant = await grantByRefreshHash(await sha256Hex(presented));
    if (!grant) return err("invalid_grant", "Refresh token is unknown, rotated, or revoked.");
    if (clientId && grant.clientId !== clientId)
      return err("invalid_grant", "client_id does not match the grant.");

    const refreshToken = await issueRefreshToken(grant.grantId);
    const access = await issueAccessToken(origin, {
      sub: grant.memberSub,
      email: grant.memberEmail,
      name: grant.memberEmail,
      client_id: grant.clientId,
      grant_id: grant.grantId,
      resource: params.get("resource") || mcpResource(),
    });
    return NextResponse.json(
      {
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        refresh_token: refreshToken,
        scope: "contribute",
      },
      { headers: CORS },
    );
  }

  return err("unsupported_grant_type", "Use authorization_code or refresh_token.");
}
