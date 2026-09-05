// Auth-attack tests for the gallery read-MCP bearer. Mints production-shaped
// ES256 JWTs and runs the same claim evaluator verifyReadBearer uses
// (catalog-auth-core), then source-locks catalog-auth.ts to that path.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateKeyPair, SignJWT } from "jose";
import { SCOPE_READ } from "../src/lib/mcp-oauth.mjs";
import { verifyReadAccessToken } from "../src/lib/catalog-auth-core.mjs";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const auth = read("src/lib/catalog-auth.ts");
const core = read("src/lib/catalog-auth-core.mjs");
const AUDIENCE = "https://katagami.ai/mcp";

const { publicKey, privateKey } = await generateKeyPair("ES256");

async function mint(claims, opts = {}) {
  let jwt = new SignJWT({
    scope: SCOPE_READ,
    auth_generation: 1,
    ...claims,
  }).setProtectedHeader({ alg: "ES256" });
  if (opts.sub !== false) jwt = jwt.setSubject(opts.sub ?? "user-1");
  if (opts.aud !== false) jwt = jwt.setAudience(opts.aud ?? AUDIENCE);
  if (opts.exp !== false) jwt = jwt.setExpirationTime(opts.exp ?? "15m");
  return jwt.sign(privateKey);
}

async function readBearer(token, ctx = { generation: 1, grantActive: true }) {
  try {
    return await verifyReadAccessToken(token, {
      key: publicKey,
      currentGeneration: async () => ctx.generation,
      grantIsActive: async () => ctx.grantActive,
    });
  } catch {
    return null;
  }
}

{
  const token = await mint({ typ: "katagami_code" });
  assert.equal(await readBearer(token), null, "code-as-bearer is rejected");
  console.log("ok: attack code-as-bearer rejected");
}

{
  const token = await mint({}, { aud: "https://evil.example/mcp" });
  assert.equal(await readBearer(token), null, "wrong aud is rejected");
  console.log("ok: attack wrong aud rejected");
}

{
  const token = await mint({}, { aud: "https://mcp.katagami.ai" });
  assert.equal(await readBearer(token), null, "contribute-adapter aud is rejected");
  console.log("ok: attack contribute-adapter aud rejected");
}

{
  const token = await mint({ scope: "contribute" });
  assert.equal(await readBearer(token), null, "contribute-only scope is rejected");
  console.log("ok: attack contribute-only scope rejected");
}

{
  const token = await mint({}, { exp: false });
  assert.equal(await readBearer(token), null, "missing exp is rejected");
  console.log("ok: attack missing exp rejected");
}

{
  const token = await mint();
  assert.equal(
    await readBearer(token, { generation: 2, grantActive: true }),
    null,
    "stale generation is rejected",
  );
  console.log("ok: attack stale generation rejected");
}

{
  const token = await mint({ grant_id: "grant-revoked" });
  assert.equal(
    await readBearer(token, { generation: 1, grantActive: false }),
    null,
    "revoked grant is rejected",
  );
  console.log("ok: attack revoked grant rejected");
}

{
  const token = await mint({ email: "a@b.c" });
  const id = await readBearer(token, { generation: 1, grantActive: true });
  assert.deepEqual(id, { sub: "user-1", email: "a@b.c" });
  console.log("ok: honest read token accepted");
}

{
  const token = await mint({ grant_id: "grant-live", email: "a@b.c" });
  const id = await readBearer(token, { generation: 1, grantActive: true });
  assert.deepEqual(id, { sub: "user-1", email: "a@b.c" });
  console.log("ok: honest agent token with live grant accepted");
}

const required = [
  [
    "catalog-auth delegates to verifyReadAccessToken",
    auth,
    /verifyReadAccessTokenDetailed\(token,/,
  ],
  [
    "catalog-auth threads currentGeneration",
    auth,
    /currentGeneration,/,
  ],
  [
    "catalog-auth threads grantIsActive",
    auth,
    /grantIsActive,/,
  ],
  [
    "core requires gallery /mcp audience only",
    core,
    /if \(!audienceIsReadMcp\(payload\.aud\)\) return "audience"/,
  ],
  [
    "core requires read scope",
    core,
    /if \(!scopeIncludesRead\(payload\.scope\)\) return "scope"/,
  ],
  [
    "core rejects any typ (authorization codes)",
    core,
    /if \(payload\.typ\) return "claims"/,
  ],
  [
    "core checks auth_generation",
    core,
    /if \(gen !== ctx\.generation\) return "generation"/,
  ],
  [
    "core checks grant_id liveness",
    core,
    /if \(grantId && !ctx\.grantActive\) return "grant_revoked"/,
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
  console.error(`\n${failed} catalog-auth source lock(s) failed.`);
  process.exit(1);
}
console.log("\ncatalog-auth attack tests hold.");
