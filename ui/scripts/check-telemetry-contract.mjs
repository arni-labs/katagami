// Server telemetry contract (ARN-436): sign-in + MCP usage stay wired,
// PII cannot reach Datadog, cron is closed without CRON_SECRET, production
// server events fail closed without DD_API_KEY, and hash+emit never run on
// the request path. Greps lock the wiring; the imports exercise the helpers.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
import {
  authorizeCronRequest,
  cleanAttrs,
  hashPrincipal,
  intakeAbortSignal,
  isForbiddenAttrKey,
  principalPepper,
  resolveLogsIntake,
} from "../src/lib/server-telemetry-core.mjs";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const telemetry = read("src/lib/server-telemetry.ts");
const core = read("src/lib/server-telemetry-core.mjs");
const mcp = read("src/app/mcp/route.ts");
const callback = read("src/app/api/auth/google/callback/route.ts");
const oauthAs = read("src/lib/oauth-as.ts");
const snapshot = read("src/app/api/telemetry/members/route.ts");
const vercelJson = read("vercel.json");
const dashboard = read("../infra/datadog/katagami-rum-dashboard.json");

// --- Behavioral -------------------------------------------------------------

{
  assert.equal(authorizeCronRequest("Bearer x", undefined), false, "unset secret is closed");
  assert.equal(authorizeCronRequest("Bearer x", ""), false, "empty secret is closed");
  assert.equal(authorizeCronRequest(null, "s3cret"), false, "missing bearer is closed");
  assert.equal(authorizeCronRequest("Bearer fake", "s3cret"), false, "wrong bearer is closed");
  assert.equal(authorizeCronRequest("Bearer s3cret", "s3cret"), true, "matching bearer is open");
  assert.equal(
    authorizeCronRequest("Bearer s3cretX", "s3cret"),
    false,
    "length-mismatch bearer is closed (timing-safe path)",
  );
  console.log("ok: cron auth 401s when CRON_SECRET is unset or bearer is wrong");
}

{
  assert.equal(
    resolveLogsIntake({ NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-rum-token" }),
    null,
    "RUM token alone does not enable server intake",
  );
  console.log("ok: public RUM token does not authenticate server events");
}

{
  const api = resolveLogsIntake({
    DD_API_KEY: "real-api-key",
    NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-rum-token",
  });
  assert.ok(api);
  assert.equal(api.headers["DD-API-KEY"], "real-api-key");
  assert.notEqual(api.headers["DD-API-KEY"], "pub-rum-token");
  assert.match(api.url, /https:\/\/http-intake\.logs\./);
  assert.doesNotMatch(api.url, /browser-http-intake/);
  console.log("ok: DD_API_KEY path uses the server key, not the RUM token");
}

{
  assert.equal(resolveLogsIntake({}), null);
  console.log("ok: no DD_API_KEY → intake is null (fail closed)");
}

{
  const stripped = cleanAttrs({
    email: "a@b.c",
    sub: "google-sub",
    token: "tok",
    bearer: "b",
    user_email: "a@b.c",
    access_token: "tok",
    id_token: "jwt",
    google_sub: "google-sub",
    signed_in_as: "a@b.c",
    user_hash: "abc123",
    members_total: 8,
    registration: true,
    tool: "whoami",
  });
  assert.equal(stripped.email, undefined);
  assert.equal(stripped.sub, undefined);
  assert.equal(stripped.token, undefined);
  assert.equal(stripped.user_email, undefined);
  assert.equal(stripped.access_token, undefined);
  assert.equal(stripped.id_token, undefined);
  assert.equal(stripped.google_sub, undefined);
  assert.equal(stripped.signed_in_as, undefined);
  assert.equal(stripped.user_hash, "abc123");
  assert.equal(stripped.members_total, 8);
  assert.equal(stripped.registration, true);
  assert.equal(stripped.tool, "whoami");
  assert.equal(isForbiddenAttrKey("user_hash"), false);
  console.log("ok: PII keys (exact + variants) stripped; user_hash kept");
}

{
  const sub = "google-oauth2|12345";
  const env = { KATAGAMI_TELEMETRY_PEPPER: "contract-test-pepper" };
  const hashed = await hashPrincipal(sub, env);
  const raw = createHash("sha256").update(sub).digest("hex").slice(0, 16);
  assert.match(hashed, /^[0-9a-f]{16}$/);
  assert.notEqual(hashed, raw, "hash is not a raw unsalted sha256-16 of the sub");
  assert.equal(hashed, await hashPrincipal(sub, env), "hash is stable");
  assert.notEqual(hashed, await hashPrincipal("other-sub", env));
  assert.equal(await hashPrincipal(sub, {}), undefined, "unset pepper omits user_hash");
  assert.equal(principalPepper({}), "");
  console.log("ok: hashPrincipal uses env pepper; unset pepper omits user_hash");
}

{
  const server = createServer(() => {
    /* blackhole: accept, never write a response */
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();
  const started = Date.now();
  let aborted = false;
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: intakeAbortSignal(200) });
  } catch (err) {
    aborted = err?.name === "TimeoutError" || err?.name === "AbortError";
  }
  await new Promise((resolveClose) => server.close(resolveClose));
  assert.ok(aborted, "blackhole intake must abort");
  assert.ok(Date.now() - started < 1500, "abort must be prompt, not a platform stall");
  console.log("ok: hung intake aborts instead of stalling");
}

// --- Wiring greps -----------------------------------------------------------

const required = [
  [" /mcp still requires a bearer (do not restore required:false)", mcp, /required:\s*true/],
  [" /mcp still uses readMcpAuthInfo", mcp, /readMcpAuthInfo\(bearer, verifyReadBearer\)/],
  [" /mcp still sets resourceUrl", mcp, /resourceUrl:\s*mcpPublicOrigin\(\)/],
  ["MCP tools are auto-instrumented", mcp, /withUsageTracking\(server\)/],
  ["MCP events carry tool, outcome, duration (no sample tier)", mcp, /trackMcpToolCall\(\{\s*tool: name,\s*outcome/],
  ["MCP wrapper does not hash on the request path", mcp, /^(?![\s\S]*hashPrincipal)[\s\S]*trackMcpToolCall/],
  ["MCP wrapper passes extra.sub into after(), not a precomputed hash", mcp, /sub: authOf\(extra\)\?\.extra\?\.sub/],
  ["AS still exports SCOPE_READ", oauthAs, /export \{[^}]*SCOPE_READ/],
  ["AS still mints scope from resource", oauthAs, /scopeForResource\(resource\)/],
  ["successful sign-ins emit auth_login", callback, /emitServerEvent\("auth_login"/],
  ["registration is the Member-created flag, not a guess", callback, /registration = \(await upsertMember\(user\)\)\.created/],
  ["failed sign-ins are visible too", callback, /auth_login_failed/],
  ["Google exchange throws emit auth_login_failed", callback, /Google exchange failed/],
  ["upsert failure omits registration", callback, /\.\.\.\(upsertOk \? \{ registration \} : \{\}\)/],
  ["sign-in after() is guarded (cookie cannot be skipped)", callback, /runAfter\(/],
  ["callback does not call after() unguarded", callback, /^(?![\s\S]*\bafter\()[\s\S]*runAfter/],
  ["upsertMember reports created-vs-existing", oauthAs, /Promise<\{ created: boolean \}>/],
  ["countMembers filters on has_identity", oauthAs, /has_identity eq true/],
  ["daily members snapshot emits members_total", snapshot, /emitServerEvent\("members_snapshot"/],
  ["members snapshot does not await Datadog on the request path", snapshot, /runAfter\(\(\) => emitServerEvent\("members_snapshot"/],
  ["members snapshot uses authorizeCronRequest", snapshot, /authorizeCronRequest\(/],
  ["cron bearer compare is timing-safe", core, /timingSafeEqual/],
  ["sign-in skips countMembers when intake is fail-closed", callback, /if \(!serverTelemetryEnabled\(\)\) return/],
  ["members snapshot cron is scheduled", vercelJson, /\/api\/telemetry\/members/],
  ["runAfter guards next/server after()", telemetry, /export function runAfter/],
  ["hash+emit for MCP tools runs inside runAfter", telemetry, /runAfter\(async \(\) => \{[\s\S]*hashPrincipal/],
  ["MCP emit stamps @tier:full (dashboard filters match)", telemetry, /tier: "full"/],
  ["telemetry no-ops without credentials", telemetry, /if \(!intake\) return/],
  ["intake fetch is aborted on hang", telemetry, /signal: intakeAbortSignal\(\)/],
  ["dashboard distinct-callers tile keys on @tier:full", dashboard, /@evt:mcp_tool_call @tier:full/],
  ["dashboard does not claim a sample-vs-full split", dashboard, /Auth tier \(full/],
  ["pepper comes from env, not a repo string", core, /KATAGAMI_TELEMETRY_PEPPER/],
  ["no compile-time PRINCIPAL_PEPPER fallback", core, /^(?![\s\S]*PRINCIPAL_PEPPER = )[\s\S]*principalPepper/],
  ["no RUM-token server intake", core, /if \(!apiKey\) return null/],
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

if (/"DD-API-KEY"\s*:\s*clientToken\(\)/.test(telemetry) || /NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN/.test(core)) {
  console.error("MISSING: RUM client token must not be used for server intake");
  failed += 1;
} else {
  console.log("ok: no RUM client token on the server intake path");
}

if (/tier:\s*tierOf|tier:\s*"sample"/.test(mcp) || /tier:\s*"sample"/.test(telemetry)) {
  console.error("MISSING: /mcp telemetry must not emit a dead sample tier");
  failed += 1;
} else {
  console.log("ok: /mcp telemetry does not emit @tier:sample");
}

if (/anonymous sample vs signed-in full/.test(dashboard)) {
  console.error("MISSING: dashboard still claims a sample-vs-full MCP split");
  failed += 1;
} else {
  console.log("ok: dashboard no longer claims anonymous sample vs signed-in full");
}

if (failed > 0) {
  console.error(`\n${failed} telemetry contract check(s) failed.`);
  process.exit(1);
}
console.log("\ntelemetry contract holds.");
