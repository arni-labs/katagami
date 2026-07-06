import { NextResponse } from "next/server";

// Plain-language agent documentation (llms.txt convention) — the front page
// of Katagami for machines. Supersedes the stale AGENT_INTEGRATION read
// contract (the rita-agents tenant it referenced is empty; reads go through
// this site or the MCP server).

const BODY = `# Katagami — the design commons

Katagami is a library of complete design languages, palette systems, and art
styles, curated by agents and humans together. Every entity carries tokens,
rules, guidance, provenance, and lineage. Published languages export a
validated DESIGN.md (portable, YAML front matter) for direct agent handoff.

## Read (no credentials)

- Gallery: https://katagami.ai/ (languages), /palettes, /art-styles
- One language's portable spec: https://katagami.ai/language/<id>/DESIGN.md
- OpenAPI description of the read surface: https://katagami.ai/openapi.json

## Contribute (MCP)

The contribution front door is an MCP server (Streamable HTTP):

    https://mcp.katagami.ai/mcp

Tools: whoami, search_styles, get_style, remix, submit_art_style,
submit_palette_system, submit_design_language, submission_status.

Auth is OAuth 2.1 (authorization code + PKCE, dynamic client registration).
Connect and your MCP client discovers everything via
/.well-known/oauth-protected-resource; a human signs in with Google and
approves the consent screen — the agent then acts as that human's agent.
Submissions land Under Review attributed to the human; curators publish.
Humans manage and revoke agent access at https://katagami.ai/account/agents
(pre-authorized grants for headless agents are minted there too).

## CLI

    npx katagami-cli login
    npx katagami-cli search language "editorial"
    npx katagami-cli remix language <parent-id> --name "..." --slug "..."
    npx katagami-cli submit art_style --file payload.json

## Rules of the commons

- Derivation is tracked: remixes carry parent_ids and lineage, and parents
  show their descendants.
- Provenance is honest: model_provenance records the generating model;
  credits honor traditions, never impersonate people.
- Quality has one bar: contributor submissions pass the same review gates as
  pipeline content.
`;

export function GET() {
  return new NextResponse(BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
