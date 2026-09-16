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
        "Katagami is the design commons: design languages, palette systems, and art styles with tokens, provenance, and lineage. Read the catalog openly over MCP or the REST API; signing in with Google widens it from a sample to everything.",
      surfaces: {
        mcp: [
          {
            name: "katagami-catalog",
            url: "https://katagami.ai/mcp",
            transport: "streamable-http",
            description:
              "Open read surface over MCP: search and open design languages, palettes and art styles, and pull DESIGN.md, tokens and embodiments. Needs no credentials; signing in with Google widens the catalog from a sample to everything.",
          },
        ],
        openapi: [
          {
            name: "katagami-read",
            url: "https://katagami.ai/openapi.json",
            description:
              "Open read surface: catalog and portable DESIGN.md exports.",
          },
        ],
        cli: [
          {
            name: "katagami-cli",
            install: "npx katagami-cli",
            description:
              "search and pull design languages, palettes and art styles from the catalog.",
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
