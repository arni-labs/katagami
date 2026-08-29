import { NextRequest, NextResponse } from "next/server";
import { isAsConfigured, registerClient } from "@/lib/oauth-as";
import { handleOauthRegister } from "@/lib/mcp-oauth.mjs";

// RFC 7591 dynamic client registration. Open and mechanical by design (the
// MCP spec expects anonymous DCR): a registration carries metadata, never
// privilege — nothing moves until a human approves a grant on the consent
// screen. Public clients only (PKCE, no secrets). Redirect validation lives
// in handleOauthRegister so a bad URI is 400 before the AS/Temper write.

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
  return handleOauthRegister(req, {
    isConfigured: isAsConfigured,
    register: registerClient,
  });
}
