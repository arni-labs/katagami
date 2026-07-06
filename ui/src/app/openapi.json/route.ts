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
