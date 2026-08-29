import { NextResponse } from "next/server";
import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { protectedResourceDocument } from "@/lib/mcp-oauth.mjs";

// RFC 9728 protected-resource metadata for the read MCP at /mcp.
// `resource` is the MCP URL itself (https://katagami.ai/mcp), not the
// origin — Grok Bot and other hosts bind the token audience to this
// identifier. The same document is served at the path-scoped URL
// /.well-known/oauth-protected-resource/mcp.

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(protectedResourceDocument(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
