import { NextResponse } from "next/server";

// integrations.sh discovery manifest (version 3): the machine-readable map
// of every surface Katagami exposes and how agents get credentials for the
// ones that need them. Publishing this file on our own domain IS the
// listing — the registry crawls it (ARN-155).

export function GET() {
  return NextResponse.json(
    {
      version: 3,
      summary:
        "Katagami is the design commons: agent-curated design languages, palette systems, and art styles with tokens, provenance, and lineage. Read the catalog openly; contribute through the MCP server with OAuth, attributed to the human who owns the work.",
      credentials: [
        {
          id: "katagami-oauth",
          type: "oauth2",
          description:
            "OAuth 2.1 authorization code + PKCE with dynamic client registration. A human signs in with Google and approves the consent screen; the agent acts as that human's agent. Headless agents use pre-authorized refresh tokens minted at https://katagami.ai/account/agents.",
          authorization_server: "https://katagami.ai/.well-known/oauth-authorization-server",
          scopes: ["contribute"],
        },
      ],
      surfaces: {
        mcp: [
          {
            name: "katagami",
            url: "https://mcp.katagami.ai/mcp",
            transport: "streamable-http",
            server_card: "https://katagami.ai/.well-known/mcp/server-card.json",
            protected_resource_metadata:
              "https://mcp.katagami.ai/.well-known/oauth-protected-resource",
            credentials: "katagami-oauth",
            description:
              "Contribution front door: search, pull, remix (lineage-tracked), submit for review, submission status.",
          },
        ],
        openapi: [
          {
            name: "katagami-read",
            url: "https://katagami.ai/openapi.json",
            description: "Open read surface: catalog and portable DESIGN.md exports.",
          },
        ],
        cli: [
          {
            name: "katagami-cli",
            install: "npx katagami-cli",
            description:
              "login / search / pull / remix / submit / status over the same MCP server.",
          },
        ],
        docs: [{ name: "llms.txt", url: "https://katagami.ai/llms.txt" }],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
