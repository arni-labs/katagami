import { NextResponse } from "next/server";
import { mcpResource } from "@/lib/oauth-as";

// MCP server card (SEP-1649 well-known): how clients and registries
// discover the Katagami MCP server from the katagami.ai domain.

export function GET() {
  const contributionOrigin = mcpResource().replace(/\/$/, "");
  return NextResponse.json(
    {
      name: "ai.katagami/commons",
      title: "Katagami design commons",
      description:
        "Search, pull, remix, and submit design languages, palette systems, and art styles. Remixes carry lineage; submissions land under curator review, attributed to the human who authorized the agent.",
      url: `${contributionOrigin}/mcp`,
      transport: { type: "streamable-http" },
      authentication: {
        type: "oauth2",
        protected_resource_metadata:
          `${contributionOrigin}/.well-known/oauth-protected-resource`,
      },
      capabilities: { tools: true },
      tools_preview: [
        "whoami",
        "search_styles",
        "katagami_search",
        "get_style",
        "remix",
        "import_art_style_proof_image",
        "submit_art_style",
        "submit_palette_system",
        "submit_design_language",
        "submission_status",
      ],
      publisher: { name: "Katagami", url: "https://katagami.ai" },
      documentation: "https://katagami.ai/llms.txt",
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
