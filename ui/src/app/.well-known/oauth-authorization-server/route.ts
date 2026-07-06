import { NextRequest, NextResponse } from "next/server";
import { issuer } from "@/lib/oauth-as";

// RFC 8414 authorization server metadata — what MCP clients discover after
// the protected resource (mcp.katagami.ai) points them here via RFC 9728.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const iss = issuer(req.nextUrl.origin);
  return NextResponse.json(
    {
      issuer: iss,
      authorization_endpoint: `${iss}/oauth/authorize`,
      token_endpoint: `${iss}/api/oauth/token`,
      registration_endpoint: `${iss}/api/oauth/register`,
      jwks_uri: `${iss}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["contribute"],
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
  );
}
