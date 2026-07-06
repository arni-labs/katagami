// Katagami MCP server (ARN-152) — the contribution front door at
// mcp.katagami.ai. Streamable HTTP transport, stateless: every request
// carries a bearer token from the katagami.ai authorization server, and
// each request builds a fresh server+transport pair.

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { config } from "./config.js";
import { tokenVerifier } from "./auth.js";
import { buildServer } from "./tools.js";

const app = express();
app.use(express.json({ limit: "16mb" }));

// RFC 9728 protected-resource metadata + a mirror of the AS metadata, so a
// stock MCP client can discover the whole OAuth dance from this URL alone.
app.use(
  mcpAuthMetadataRouter({
    oauthMetadata: {
      issuer: config.issuer,
      authorization_endpoint: `${config.issuer}/oauth/authorize`,
      token_endpoint: `${config.issuer}/api/oauth/token`,
      registration_endpoint: `${config.issuer}/api/oauth/register`,
      jwks_uri: `${config.issuer}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["contribute"],
    },
    resourceServerUrl: new URL(config.resourceUrl),
    scopesSupported: ["contribute"],
    resourceName: "Katagami design commons",
  }),
);

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

const bearer = requireBearerAuth({
  verifier: tokenVerifier,
  requiredScopes: ["contribute"],
  resourceMetadataUrl: `${config.resourceUrl}/.well-known/oauth-protected-resource`,
});

app.post("/mcp", bearer, async (req, res) => {
  // Stateless: one server+transport per request; auth rides on req.auth.
  const server = buildServer(req.auth!);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Stateless transport: no server-push streams or sessions to resume/delete.
for (const method of ["get", "delete"] as const) {
  app[method]("/mcp", bearer, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed: stateless transport" },
      id: null,
    });
  });
}

app.listen(config.port, () => {
  console.log(
    `katagami-mcp listening on :${config.port} (resource ${config.resourceUrl}, AS ${config.issuer}, backend ${config.temperUrl})`,
  );
});
