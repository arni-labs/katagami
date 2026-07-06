import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedRedirectUri,
  isAsConfigured,
  registerClient,
} from "@/lib/oauth-as";

// RFC 7591 dynamic client registration. Open and mechanical by design (the
// MCP spec expects anonymous DCR): a registration carries metadata, never
// privilege — nothing moves until a human approves a grant on the consent
// screen. Public clients only (PKCE, no secrets).

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  if (!isAsConfigured()) {
    return NextResponse.json(
      { error: "temporarily_unavailable" },
      { status: 503, headers: CORS },
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata" },
      { status: 400, headers: CORS },
    );
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (
    redirectUris.length === 0 ||
    redirectUris.length > 10 ||
    !redirectUris.every(isAllowedRedirectUri)
  ) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description:
          "redirect_uris must be https URLs or loopback http URLs.",
      },
      { status: 400, headers: CORS },
    );
  }

  const clientName =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 120)
      : "Unnamed agent";

  const client = await registerClient({
    client_name: clientName,
    redirect_uris: redirectUris,
    client_uri: typeof body.client_uri === "string" ? body.client_uri : "",
    logo_uri: typeof body.logo_uri === "string" ? body.logo_uri : "",
  });

  return NextResponse.json(
    {
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS },
  );
}
