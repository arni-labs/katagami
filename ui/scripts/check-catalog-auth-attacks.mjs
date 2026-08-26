// Auth-attack tests for the read-MCP bearer (ARN-360 leftover on PR 253).
// The verifier already requires MCP audience + exp and rejects codes /
// stale generation / revoked grants. These tests mint ES256 JWTs and
// replay the four attacks, then lock the catalog-auth source to the
// same checks so a refactor cannot drop one silently.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateKeyPair, SignJWT, jwtVerify } from "jose";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const auth = read("src/lib/catalog-auth.ts");
const AUDIENCE = "https://mcp.katagami.ai";

const { publicKey, privateKey } = await generateKeyPair("ES256");

async function mint(claims, opts = {}) {
  let jwt = new SignJWT(claims).setProtectedHeader({ alg: "ES256" });
  if (opts.sub !== false) jwt = jwt.setSubject(opts.sub ?? "user-1");
  if (opts.aud !== false) jwt = jwt.setAudience(opts.aud ?? AUDIENCE);
  if (opts.exp !== false) jwt = jwt.setExpirationTime(opts.exp ?? "15m");
  return jwt.sign(privateKey);
}

async function verifyJose(token) {
  try {
    return await jwtVerify(token, publicKey, {
      algorithms: ["ES256"],
      audience: [AUDIENCE],
      requiredClaims: ["exp", "sub"],
    });
  } catch {
    return null;
  }
}

/** Post-jose checks, copied from verifyReadBearer. A grep below binds them. */
function afterVerify(payload, ctx) {
  if (payload.typ) return null;
  const sub = String(payload.sub ?? "");
  if (!sub) return null;
  const gen = Number(payload.auth_generation ?? 0);
  if (gen !== ctx.generation) return null;
  const grantId = String(payload.grant_id ?? "");
  if (grantId && !ctx.grantActive) return null;
  return { sub, email: String(payload.email ?? "") };
}

async function readBearer(token, ctx = { generation: 1, grantActive: true }) {
  const verified = await verifyJose(token);
  if (!verified) return null;
  return afterVerify(verified.payload, ctx);
}

// --- Attacks ----------------------------------------------------------------

{
  const token = await mint({ typ: "katagami_code", auth_generation: 1 });
  // jose accepts it (same key, aud+exp present) — the typ check is what stops the replay.
  assert.ok(await verifyJose(token), "code JWT is a valid signature");
  assert.equal(await readBearer(token), null, "code-as-bearer is rejected");
  console.log("ok: attack code-as-bearer rejected");
}

{
  const token = await mint({ auth_generation: 1 }, { aud: "https://evil.example/mcp" });
  assert.equal(await verifyJose(token), null, "wrong aud fails jwtVerify");
  assert.equal(await readBearer(token), null, "wrong aud is rejected");
  console.log("ok: attack wrong aud rejected");
}

{
  const token = await mint({ auth_generation: 1 }, { exp: false });
  assert.equal(await verifyJose(token), null, "missing exp fails jwtVerify");
  assert.equal(await readBearer(token), null, "missing exp is rejected");
  console.log("ok: attack missing exp rejected");
}

{
  const token = await mint({ auth_generation: 1 });
  assert.equal(
    await readBearer(token, { generation: 2, grantActive: true }),
    null,
    "stale generation is rejected",
  );
  console.log("ok: attack stale generation rejected");
}

{
  const token = await mint({ auth_generation: 1, grant_id: "grant-revoked" });
  assert.equal(
    await readBearer(token, { generation: 1, grantActive: false }),
    null,
    "revoked grant is rejected",
  );
  console.log("ok: attack revoked grant rejected");
}

{
  const token = await mint({ auth_generation: 1, email: "a@b.c" });
  const id = await readBearer(token, { generation: 1, grantActive: true });
  assert.deepEqual(id, { sub: "user-1", email: "a@b.c" });
  console.log("ok: honest access token accepted");
}

{
  const token = await mint(
    { auth_generation: 1, grant_id: "grant-live", email: "a@b.c" },
  );
  const id = await readBearer(token, { generation: 1, grantActive: true });
  assert.deepEqual(id, { sub: "user-1", email: "a@b.c" });
  console.log("ok: honest agent token with live grant accepted");
}

// --- Source lock ------------------------------------------------------------

const required = [
  [
    "verifier requires MCP audience (this resource only, not dev-adapter extras)",
    auth,
    /if \(!audienceMatches\(payload\.aud\)\) return null/,
  ],
  [
    "verifier requires exp, sub, aud, and auth_generation",
    auth,
    /requiredClaims: \["exp", "sub", "aud", "auth_generation"\]/,
  ],
  [
    "verifier rejects any typ (authorization codes)",
    auth,
    /if \(payload\.typ\) return null/,
  ],
  [
    "verifier checks auth_generation against currentGeneration",
    auth,
    /const gen = Number\(payload\.auth_generation \?\? 0\);\s*if \(gen !== \(await currentGeneration\(sub\)\)\) return null/,
  ],
  [
    "verifier checks grant_id liveness",
    auth,
    /const grantId = String\(payload\.grant_id \?\? ""\);\s*if \(grantId && !\(await grantIsActive\(grantId\)\)\) return null/,
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
