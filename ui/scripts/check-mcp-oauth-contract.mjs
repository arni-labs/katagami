// MCP OAuth handshake + gallery verifier contract.
// Hits the real claim path (verifyReadAccessToken / whoamiFromAuth /
// readMcpAuthInfo / handleOauthRegister) with production-shaped JWTs.
// Does not stub withMcpAuth to accept a magic bearer string.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateKeyPair, SignJWT } from "jose";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import {
  handleOauthRegister,
  isAllowedRedirectUri,
  mcpPublicOrigin,
  mcpResourceMetadataUrl,
  MCP_RESOURCE_METADATA_PATH,
  protectedResourceDocument,
  readMcpResource,
  SCOPE_READ,
  wwwAuthenticateHeader,
} from "../src/lib/mcp-oauth.mjs";
import {
  readMcpAuthInfo,
  verifyReadAccessToken,
  whoamiFromAuth,
} from "../src/lib/catalog-auth-core.mjs";

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

const WHOAMI_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "whoami", arguments: {} },
});

function mcpRequest(body, headers = {}) {
  return new Request("https://katagami.ai/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body,
  });
}

async function rpcResult(res) {
  const ctype = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (ctype.includes("text/event-stream")) {
    const line = text.split("\n").find((l) => l.startsWith("data:"));
    assert.ok(line, "SSE must include a data line");
    return JSON.parse(line.slice("data:".length).trim());
  }
  return JSON.parse(text);
}

const { publicKey, privateKey } = await generateKeyPair("ES256");
const READ_AUD = "https://katagami.ai/mcp";
const CONTRIBUTE_AUD = "https://mcp.katagami.ai";

async function mintProductionShape(claims = {}, opts = {}) {
  let jwt = new SignJWT({
    email: "rita@example.com",
    name: "Rita",
    client_id: "kc_test",
    grant_id: "",
    scope: SCOPE_READ,
    agent_type: "contributor",
    role: "contributor",
    auth_generation: 1,
    ...claims,
  }).setProtectedHeader({ alg: "ES256" });
  if (opts.sub !== false) jwt = jwt.setSubject(opts.sub ?? "google-sub-1");
  if (opts.aud !== false) jwt = jwt.setAudience(opts.aud ?? READ_AUD);
  if (opts.exp !== false) jwt = jwt.setExpirationTime(opts.exp ?? "15m");
  return jwt.sign(privateKey);
}

const verifyDeps = {
  key: publicKey,
  currentGeneration: async () => 1,
  grantIsActive: async () => true,
};

async function realVerify(token) {
  try {
    return await verifyReadAccessToken(token, verifyDeps);
  } catch {
    return null;
  }
}

const whoamiServer = createMcpHandler(
  (server) => {
    server.registerTool("whoami", { title: "whoami", description: "whoami", inputSchema: {} }, async (_a, extra) => {
      const auth = extra?.http?.authInfo;
      return {
        content: [{ type: "text", text: JSON.stringify(whoamiFromAuth(auth)) }],
      };
    });
  },
  { serverInfo: { name: "katagami", version: "0.1.0" } },
);

const realAuthHandler = withMcpAuth(
  whoamiServer,
  async (_req, bearer) => readMcpAuthInfo(bearer, realVerify),
  {
    required: true,
    resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
    resourceUrl: mcpPublicOrigin(),
  },
);

// --- Unauthenticated initialize → 401 + WWW-Authenticate --------------------

{
  const res = await realAuthHandler(mcpRequest(INIT_BODY));
  assert.equal(res.status, 401, "unauthenticated initialize must 401");
  const challenge = res.headers.get("www-authenticate") ?? "";
  assert.match(challenge, /Bearer/i);
  assert.match(
    challenge,
    /resource_metadata="https:\/\/katagami\.ai\/.well-known\/oauth-protected-resource"/,
  );
  const body = await res.json();
  assert.match(
    String(body.error_description ?? body.error ?? ""),
    /No authorization provided/i,
    "missing bearer must say no authorization was provided",
  );
  console.log("ok: unauthenticated initialize 401 + WWW-Authenticate");
}

// --- Garbage bearer is not "No authorization provided" ----------------------

{
  const res = await realAuthHandler(
    mcpRequest(INIT_BODY, { authorization: "Bearer not-a-jwt" }),
  );
  assert.equal(res.status, 401, "garbage bearer must 401");
  const body = await res.json();
  const desc = String(body.error_description ?? body.error ?? "");
  assert.doesNotMatch(
    desc,
    /No authorization provided/i,
    "a sent Bearer must not be described as missing",
  );
  assert.match(desc, /Invalid token/i);
  console.log("ok: garbage bearer 401 is Invalid token, not missing");
}

// --- Real JWT: verifyReadAccessToken + initialize 200 + whoami full ---------

{
  const token = await mintProductionShape();
  const id = await realVerify(token);
  assert.deepEqual(id, { sub: "google-sub-1", email: "rita@example.com" });
  assert.deepEqual(whoamiFromAuth({ extra: { email: id.email } }), {
    tier: "full",
    signed_in_as: "rita@example.com",
    access: "the complete Katagami catalog",
  });

  const init = await realAuthHandler(
    mcpRequest(INIT_BODY, { authorization: `Bearer ${token}` }),
  );
  assert.equal(init.status, 200, "signed JWT initialize must 200");
  const initBody = await rpcResult(init);
  const protocol =
    initBody?.result?.protocolVersion ?? initBody?.protocolVersion ?? "";
  assert.ok(protocol, "initialize 200 must include a protocol version");

  const who = await realAuthHandler(
    mcpRequest(WHOAMI_BODY, { authorization: `Bearer ${token}` }),
  );
  assert.equal(who.status, 200, "signed JWT whoami must 200");
  const whoBody = await rpcResult(who);
  const text = whoBody?.result?.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  assert.equal(parsed.tier, "full");
  assert.equal(parsed.signed_in_as, "rita@example.com");
  console.log("ok: production-shaped JWT initialize 200 + whoami full");
}

// --- Contribute-adapter token does not unlock gallery /mcp ------------------

{
  const token = await mintProductionShape(
    { scope: "contribute" },
    { aud: CONTRIBUTE_AUD },
  );
  assert.equal(await realVerify(token), null, "contribute aud+scope rejected");
  const res = await realAuthHandler(
    mcpRequest(INIT_BODY, { authorization: `Bearer ${token}` }),
  );
  assert.equal(res.status, 401, "contribute token must 401 on gallery /mcp");
  console.log("ok: contribute-only token rejected on gallery /mcp");
}

{
  const token = await mintProductionShape({ scope: "contribute" });
  assert.equal(
    await realVerify(token),
    null,
    "read audience with contribute-only scope is rejected",
  );
  console.log("ok: contribute scope rejected even with /mcp audience");
}

// --- Path-scoped metadata ---------------------------------------------------

{
  const doc = protectedResourceDocument();
  assert.equal(doc.resource, "https://katagami.ai/mcp");
  assert.deepEqual(doc.authorization_servers, ["https://katagami.ai"]);
  assert.deepEqual(doc.bearer_methods_supported, ["header"]);
  assert.deepEqual(doc.scopes_supported, ["read"]);
  assert.equal(
    mcpResourceMetadataUrl(),
    "https://katagami.ai/.well-known/oauth-protected-resource",
  );
  assert.equal(wwwAuthenticateHeader(), `Bearer resource_metadata="${mcpResourceMetadataUrl()}"`);
  assert.equal(readMcpResource(), "https://katagami.ai/mcp");
  console.log("ok: path-scoped metadata resource=https://katagami.ai/mcp");
}

// --- DCR: real POST /api/oauth/register -------------------------------------

function registerPost(body) {
  return handleOauthRegister(
    new Request("https://katagami.ai/api/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    {
      isConfigured: () => true,
      register: async (meta) => ({
        client_id: "kc_test",
        client_name: meta.client_name,
        redirect_uris: meta.redirect_uris,
      }),
    },
  );
}

{
  const ftp = await registerPost({ redirect_uris: ["ftp://evil.example/cb"] });
  assert.equal(ftp.status, 400);
  assert.equal((await ftp.json()).error, "invalid_redirect_uri");
  console.log("ok: POST /api/oauth/register rejects ftp://");

  const cursor = await registerPost({
    client_name: "Cursor",
    redirect_uris: ["cursor://anysphere.cursor-mcp/oauth/callback"],
  });
  assert.equal(cursor.status, 201, "cursor:// must register");
  console.log("ok: POST /api/oauth/register accepts cursor://");

  const grok = await registerPost({
    redirect_uris: ["grok://oauth/callback"],
  });
  assert.equal(grok.status, 201, "grok:// must register");
  console.log("ok: POST /api/oauth/register accepts grok://");
}

{
  const allowed = [
    "https://www.cursor.com/agents/mcp/oauth/callback",
    "cursor://anysphere.cursor-mcp/oauth/callback",
    "https://grok.x.ai/mcp/oauth/callback",
    "grok://oauth/callback",
    "http://127.0.0.1:8734/callback",
    "http://localhost:3000/callback",
  ];
  for (const uri of allowed) {
    assert.equal(isAllowedRedirectUri(uri), true, `should allow ${uri}`);
  }
  const blocked = [
    "ftp://evil.example/cb",
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///etc/passwd",
    "vscode://mcp/oauth/callback",
    "http://evil.example/callback",
    "not-a-url",
    "",
  ];
  for (const uri of blocked) {
    assert.equal(isAllowedRedirectUri(uri), false, `should reject ${uri}`);
  }
  console.log("ok: DCR allow-list is https / loopback / cursor / grok");
}

// --- Source lock ------------------------------------------------------------

const mcpRoute = read("src/app/mcp/route.ts");
const originMeta = read("src/app/.well-known/oauth-protected-resource/route.ts");
const pathMeta = read("src/app/.well-known/oauth-protected-resource/mcp/route.ts");
const as = read("src/lib/oauth-as.ts");
const catalogAuth = read("src/lib/catalog-auth.ts");
const core = read("src/lib/catalog-auth-core.mjs");
const connect = read("src/app/(site)/connect/page.tsx");
const register = read("src/app/api/oauth/register/route.ts");
const asMeta = read("src/app/.well-known/oauth-authorization-server/route.ts");

const required = [
  [" /mcp requires a bearer", mcpRoute, /required:\s*true/],
  [" /mcp uses readMcpAuthInfo + verifyReadBearer", mcpRoute, /readMcpAuthInfo\(bearer, verifyReadBearer\)/],
  [" /mcp whoami uses whoamiFromAuth", mcpRoute, /whoamiFromAuth\(authOf\(extra\)\)/],
  [" /mcp uses the public origin as resourceUrl", mcpRoute, /resourceUrl:\s*mcpPublicOrigin\(\)/],
  ["origin metadata serves protectedResourceDocument", originMeta, /protectedResourceDocument\(\)/],
  ["path-scoped metadata re-exports the origin document", pathMeta, /from "\.\.\/route"/],
  ["AS mints scope from resource", as, /scopeForResource\(resource\)/],
  ["catalog-auth calls verifyReadAccessToken", catalogAuth, /verifyReadAccessTokenDetailed\(token,/],
  ["core rejects non-read audience", core, /if \(!audienceIsReadMcp\(payload\.aud\)\) return "audience"/],
  ["core requires read scope", core, /if \(!scopeIncludesRead\(payload\.scope\)\) return "scope"/],
  ["register route POSTs handleOauthRegister", register, /handleOauthRegister\(req/],
  ["AS advertises read + contribute", asMeta, /scopes_supported: \["read", "contribute"\]/],
  [
    "connect page does not claim no-login sample",
    connect,
    /^(?![\s\S]*Works instantly with no login)(?![\s\S]*curated sample)[\s\S]*sign in with Google/,
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
