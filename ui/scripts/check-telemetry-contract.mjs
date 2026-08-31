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
  EVENT_ATTRS,
  hashPrincipal,
  intakeAbortSignal,
  isForbiddenAttrKey,
  logPayload,
  principalPepper,
  resolveLogsIntake,
  RESERVED_LOG_KEYS,
} from "../src/lib/server-telemetry-core.mjs";
import { readODataCount } from "../src/lib/odata-count.mjs";

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
const pkg = read("package.json");

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
  // The guarantee is a per-event ALLOW-list: a key a call site did not
  // declare in EVENT_ATTRS never ships. The review proved the old deny-list
  // passed every one of these natural identity keys — they must all drop.
  const identityKeys = [
    "email", "sub", "token", "bearer", "user_email", "access_token",
    "id_token", "google_sub", "signed_in_as",
    // the keys that PASSED the deny-list (review finding #5):
    "user_name", "display_name", "full_name", "caller_sub", "sub_id",
    "owner_sub", "principal_id", "gmail", "login", "handle", "identity",
    "account", "note",
  ];
  for (const evt of Object.keys(EVENT_ATTRS)) {
    const attrs = Object.fromEntries(identityKeys.map((k) => [k, "a@b.c"]));
    const stripped = cleanAttrs(evt, attrs);
    assert.deepEqual(stripped, {}, `identity keys must not ship on ${evt}`);
  }
  const login = cleanAttrs("auth_login", {
    user_hash: "abc123",
    registration: true,
    upsert_ok: true,
    email: "a@b.c",
  });
  assert.deepEqual(login, { user_hash: "abc123", registration: true, upsert_ok: true });
  const call = cleanAttrs("mcp_tool_call", {
    tool: "whoami",
    tier: "full",
    outcome: "success",
    duration_ms: 12,
    user_hash: "abc123",
    note: "a@b.c failed",
  });
  assert.deepEqual(call, {
    tool: "whoami",
    tier: "full",
    outcome: "success",
    duration_ms: 12,
    user_hash: "abc123",
  });
  // Unknown event → NO attributes ship at all (fail closed).
  assert.deepEqual(cleanAttrs("made_up_event", { anything: "x" }), {});
  // Non-primitive values never ship, and strings are capped.
  assert.deepEqual(cleanAttrs("auth_login_failed", { reason: { deep: "obj" } }), {});
  assert.equal(cleanAttrs("auth_login_failed", { reason: "x".repeat(500) }).reason.length, 200);
  assert.equal(isForbiddenAttrKey("user_hash"), false);
  console.log("ok: per-event allow-list — undeclared keys (incl. user_name/caller_sub/gmail) never ship");
}

{
  // Attribute spread must not override Datadog log routing: a future attr
  // named "status"/"service"/"ddtags" must not re-level or re-route events.
  for (const key of RESERVED_LOG_KEYS) {
    assert.equal(
      cleanAttrs("mcp_tool_call", { [key]: "evil" })[key],
      undefined,
      `reserved log key ${key} must be stripped`,
    );
  }
  const payload = logPayload(
    "mcp_tool_call",
    { status: "error", service: "evil", ddtags: "env:prod", message: "spoof", hostname: "evil", tool: "whoami" },
    "info",
    { VERCEL_ENV: "production", VERCEL_REGION: "iad1" },
  );
  assert.equal(payload.status, "info");
  assert.equal(payload.service, "katagami-server");
  assert.equal(payload.message, "mcp_tool_call");
  assert.equal(payload.hostname, "iad1");
  assert.match(payload.ddtags, /service:katagami-server/);
  assert.equal(payload.tool, "whoami");
  console.log("ok: reserved log-routing keys cannot be overridden by attributes");
}

{
  // @odata.count: absent or malformed throws — never a fake zero on the
  // "Total registered users" tile (or the gallery hero counts).
  assert.equal(readODataCount({ "@odata.count": 8 }), 8);
  assert.equal(readODataCount({ "@odata.count": "8" }), 8, "IEEE754-compat string count parses");
  assert.equal(readODataCount({ "@odata.count": 0 }), 0, "a real zero is still zero");
  assert.throws(() => readODataCount({}), /missing or malformed/);
  assert.throws(() => readODataCount({ "@odata.count": "eight" }), /missing or malformed/);
  assert.throws(() => readODataCount({ "@odata.count": -1 }), /missing or malformed/);
  assert.throws(() => readODataCount(null), /missing or malformed/);
  console.log("ok: @odata.count absent/malformed throws instead of counting 0");
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
  ["members cron reports REAL delivery, not config", snapshot, /const emitted = await emitServerEvent\("members_snapshot"/],
  ["members cron does not report config as delivery", snapshot, /^(?![\s\S]*emitted: serverTelemetryEnabled\(\))[\s\S]*$/],
  ["members cron snapshot is tagged source:cron", snapshot, /source: "cron"/],
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
  ["dashboard surfaces MCP auth challenges (401s)", dashboard, /@evt:mcp_auth_challenge/],
  ["registered-users tiles read members_snapshot only", dashboard, /@evt:members_snapshot"/],
  ["registered-users tile shows absence as absence (no default_zero)", dashboard, /^(?![\s\S]*default_zero\(m\))[\s\S]*$/],
  ["pepper comes from env, not a repo string", core, /KATAGAMI_TELEMETRY_PEPPER/],
  ["no compile-time PRINCIPAL_PEPPER fallback", core, /^(?![\s\S]*PRINCIPAL_PEPPER = )[\s\S]*principalPepper/],
  ["no RUM-token server intake", core, /if \(!apiKey\) return null/],
  // --- ARN-436 review round 2 ---------------------------------------------
  ["auth_login is emitted BEFORE countMembers (a hung Temper cannot eat the login)", callback,
    /emitServerEvent\("auth_login"[\s\S]*countMembers\(\)/],
  ["auth_login does not carry members_total (it rides members_snapshot)", "" + (() => {
    // Structural, not proximity: slice the auth_login emit call and make
    // sure members_total is not among its attributes.
    const start = callback.indexOf('emitServerEvent("auth_login"');
    const end = callback.indexOf("});", start);
    return start >= 0 && end > start && !callback.slice(start, end).includes("members_total");
  })(), /^true$/],
  ["login-path members snapshot is tagged source:login", callback, /source: "login"/],
  ["state-mismatch emits only when a code came back (bots stay silent)", callback,
    /else if \(code\) \{\s*trackServerEvent\("auth_login_failed", \{ reason: "state" \}/],
  ["Google consent errors are their own reason", callback, /reason: "consent"/],
  ["signSession failures are reason:session, not reason:google", callback, /reason: "session"/],
  ["countMembers is bounded by default", oauthAs, /AbortSignal\.timeout\(COUNT_MEMBERS_TIMEOUT_MS\)/],
  ["countMembers reads @odata.count strictly (absent throws, never 0)", oauthAs,
    /readODataCount\(await res\.json\(\)\)/],
  ["SDK-level tools/call wrapper sees zod rejections (invalid calls are visible)", mcp,
    /setRequestHandler[\s\S]*invalid_arguments/],
  ["tool handlers reserve telemetry headroom under maxDuration", mcp,
    /TOOL_BUDGET_MS = maxDuration \* 1000 - TELEMETRY_RESERVE_MS/],
  ["budget-exceeded calls are tracked, not silently killed", mcp, /tool_budget_exceeded/],
  ["/mcp 401s emit mcp_auth_challenge (anonymous demand is visible)", mcp,
    /trackServerEvent\("mcp_auth_challenge"/],
  ["all /mcp verbs go through the auth-challenge counter", mcp,
    /export \{ get as GET, trackedHandler as POST, trackedHandler as DELETE \}/],
  ["telemetry contract runs on every build (prebuild), not only npm test", pkg,
    /"prebuild":[^\n]*check-telemetry-contract\.mjs/],
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
