import { NextResponse } from "next/server";
import { isAsConfigured, publicJwks } from "@/lib/oauth-as";

// Public signing keys: how the MCP adapter (and anything else fronting the
// commons) verifies access tokens without sharing a secret with this app.

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAsConfigured()) {
    return NextResponse.json({ keys: [] }, { status: 503 });
  }
  return NextResponse.json(await publicJwks(), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" },
  });
}
