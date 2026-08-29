// MCP OAuth handshake contract: Grok Bot only draws a connect card when
// unauthenticated initialize 401s with WWW-Authenticate pointing at RFC 9728
// metadata whose resource is https://katagami.ai/mcp. Source-locks the
// production wiring and drives the same mcp-handler wrapper the route uses.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import {
  isAllowedRedirectUri,
  mcpPublicOrigin,
  mcpResourceMetadataUrl,
  MCP_RESOURCE_METADATA_PATH,
  protectedResourceDocument,
  readMcpResource,
  wwwAuthenticateHeader,
} from "../src/lib/mcp-oauth.mjs";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const INIT_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "contract", version: "0" },
  },
});

function initRequest(headers = {}) {
  return new Request("https://katagami.ai/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: INIT_BODY,
  });
}

async function initializeResult(res) {
  const ctype = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (ctype.includes("text/event-stream")) {
    const line = text.split("\n").find((l) => l.startsWith("data:"));
    assert.ok(line, "SSE initialize must include a data line");
    return JSON.parse(line.slice("data:".length).trim());
  }
  return JSON.parse(text);
}

const stubServer = createMcpHandler(() => {}, {
  serverInfo: { name: "katagami", version: "0.1.0" },
});

const requiredAuth = withMcpAuth(
  stubServer,
  async (_req, bearer) => {
    if (bearer !== "valid-test-token") return undefined;
    return {
      token: bearer,
      clientId: "katagami-read",
      scopes: ["read"],
    };
  },
  {
    required: true,
    resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
    resourceUrl: mcpPublicOrigin(),
  },
);

// --- Unauthenticated initialize → 401 + WWW-Authenticate --------------------

{
  const res = await requiredAuth(initRequest());
  assert.equal(res.status, 401, "unauthenticated initialize must 401");
  const challenge = res.headers.get("www-authenticate") ?? "";
  assert.match(
    challenge,
    /Bearer/i,
    "WWW-Authenticate must be a Bearer challenge",
  );
  assert.match(
    challenge,
    /resource_metadata="https:\/\/katagami\.ai\/.well-known\/oauth-protected-resource"/,
    "WWW-Authenticate must point at origin protected-resource metadata",
  );
  console.log("ok: unauthenticated initialize 401 + WWW-Authenticate");
}

// --- Authenticated initialize → 200 ----------------------------------------

{
  const res = await requiredAuth(
    initRequest({ authorization: "Bearer valid-test-token" }),
  );
  assert.equal(res.status, 200, "authenticated initialize must 200");
  const body = await initializeResult(res);
  const protocol =
    body?.result?.protocolVersion ?? body?.protocolVersion ?? "";
  assert.ok(protocol, "initialize 200 must include a protocol version");
  console.log("ok: authenticated initialize 200");
}

// --- Path-scoped metadata resource -----------------------------------------

{
  const doc = protectedResourceDocument();
  assert.equal(doc.resource, "https://katagami.ai/mcp");
  assert.deepEqual(doc.authorization_servers, ["https://katagami.ai"]);
  assert.deepEqual(doc.bearer_methods_supported, ["header"]);
  assert.equal(
    mcpResourceMetadataUrl(),
    "https://katagami.ai/.well-known/oauth-protected-resource",
  );
  assert.equal(wwwAuthenticateHeader(), `Bearer resource_metadata="${mcpResourceMetadataUrl()}"`);
  assert.equal(readMcpResource(), "https://katagami.ai/mcp");
  console.log("ok: path-scoped metadata resource=https://katagami.ai/mcp");
}

// --- DCR accepts Cursor / Grok / loopback / https --------------------------

{
  const allowed = [
    "https://www.cursor.com/agents/mcp/oauth/callback",
    "cursor://anysphere.cursor-mcp/oauth/callback",
    "https://grok.x.ai/mcp/oauth/callback",
    "grok://oauth/callback",
    "http://127.0.0.1:8734/callback",
    "http://localhost:3000/callback",
    "vscode://mcp/oauth/callback",
  ];
  for (const uri of allowed) {
    assert.equal(isAllowedRedirectUri(uri), true, `should allow ${uri}`);
  }
  const blocked = [
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///etc/passwd",
    "http://evil.example/callback",
    "not-a-url",
    "",
  ];
  for (const uri of blocked) {
    assert.equal(isAllowedRedirectUri(uri), false, `should reject ${uri}`);
  }
  console.log("ok: DCR accepts Cursor/Grok/loopback redirects");
}

// --- Source lock: production route is required + points at metadata --------

const mcpRoute = read("src/app/mcp/route.ts");
const originMeta = read("src/app/.well-known/oauth-protected-resource/route.ts");
const pathMeta = read("src/app/.well-known/oauth-protected-resource/mcp/route.ts");
const as = read("src/lib/oauth-as.ts");
const catalogAuth = read("src/lib/catalog-auth.ts");

const required = [
  [" /mcp requires a bearer", mcpRoute, /required:\s*true/],
  [" /mcp does not keep optional auth", mcpRoute, /^(?![\s\S]*required:\s*false)[\s\S]*$/],
  [
    " /mcp points WWW-Authenticate at origin metadata",
    mcpRoute,
    /resourceMetadataPath:\s*MCP_RESOURCE_METADATA_PATH/,
  ],
  [" /mcp uses the public origin as resourceUrl", mcpRoute, /resourceUrl:\s*mcpPublicOrigin\(\)/],
  [
    "origin metadata serves protectedResourceDocument",
    originMeta,
    /protectedResourceDocument\(\)/,
  ],
  [
    "path-scoped metadata re-exports the origin document",
    pathMeta,
    /from "\.\.\/route"/,
  ],
  ["AS honors the gallery read-MCP resource", as, /readMcpResource\(\)/],
  [
    "catalog-auth accepts both MCP audiences",
    catalogAuth,
    /normRes\(readMcpResource\(\)\),\s*normRes\(mcpResource\(\)\)/,
  ],
];

let failed = 0;
for (const [name, source, pattern] of required) {
  if (pattern.test(source)) {
    console.log(`ok: ${name}`);
  } else {
    console.error(`MISSING: ${name}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} MCP OAuth contract check(s) failed.`);
  process.exit(1);
}
console.log("\nMCP OAuth handshake contract holds.");
