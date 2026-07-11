import { NextResponse } from "next/server";

// OpenAPI description of Katagami's open read surface. Writes go through
// the MCP server (see /llms.txt and /.well-known/integrations.json) — this
// document is deliberately read-only.

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Katagami read API",
    version: "1.0.0",
    description:
      "Open, unauthenticated reads over the Katagami design commons. Contribution happens through the MCP server at https://mcp.katagami.ai/mcp (OAuth 2.1).",
  },
  servers: [{ url: "https://katagami.ai" }],
  paths: {
    "/api/search": {
      get: {
        operationId: "searchByMeaning",
        summary:
          "Free-text semantic search over the published commons — ranks languages, palettes, and art styles by meaning, not substring",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            description: "The phrase to rank by meaning, e.g. 'warm editorial serif'",
            schema: { type: "string" },
          },
          {
            name: "lane",
            in: "query",
            required: false,
            description: "Restrict to one lane; omit to search across all lanes",
            schema: { type: "string", enum: ["language", "palette", "art-style"] },
          },
          {
            name: "k",
            in: "query",
            required: false,
            description: "How many results (default 8, max 25)",
            schema: { type: "integer", minimum: 1, maximum: 25, default: 8 },
          },
          {
            name: "format",
            in: "query",
            required: false,
            description: "concise (default) or detailed (adds tags, medium, summary)",
            schema: { type: "string", enum: ["concise", "detailed"], default: "concise" },
          },
        ],
        responses: {
          "200": {
            description:
              "Ranked results: each carries a stable id, kind, similarity score, gallery url, and (for languages) design_md_url",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    model: { type: "string" },
                    lane: { type: "string" },
                    count: { type: "integer" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          kind: {
                            type: "string",
                            enum: ["language", "palette", "art-style"],
                          },
                          name: { type: "string" },
                          score: { type: "number" },
                          url: { type: "string" },
                          design_md_url: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Missing 'q' or unknown 'lane'" },
        },
      },
    },
    "/language/{id}/DESIGN.md": {
      get: {
        operationId: "getDesignMd",
        summary: "Portable DESIGN.md export of a published design language",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Validated DESIGN.md with YAML design-token front matter",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
          "404": { description: "Unknown language" },
        },
      },
    },
    "/language/{id}": {
      get: {
        operationId: "getLanguagePage",
        summary: "Human-readable page for one design language",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "HTML" } },
      },
    },
    "/palettes/{id}": {
      get: {
        operationId: "getPalettePage",
        summary: "Human-readable page for one palette system",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "HTML" } },
      },
    },
    "/art-styles/{id}": {
      get: {
        operationId: "getArtStylePage",
        summary: "Human-readable page for one art style",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "HTML" } },
      },
    },
    "/llms.txt": {
      get: {
        operationId: "getLlmsTxt",
        summary: "Plain-language agent documentation for the whole commons",
        responses: {
          "200": { description: "text/plain", content: { "text/plain": { schema: { type: "string" } } } },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
