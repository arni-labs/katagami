// Server telemetry contract (ARN-436): sign-in + MCP usage stay wired,
// PII cannot reach Datadog, cron is closed without CRON_SECRET, production
// server events fail closed without DD_API_KEY, and hash+emit never run on
// the request path. Greps lock the wiring; the imports exercise the helpers.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
import {
  activityActionForOutcome,
  activityEntityId,
  isValidUserHash,
  utcDayKey,
} from "../src/lib/member-activity-core.mjs";
import {
  SESSION_ME_TIMEOUT_MS,
  sessionMeAbortSignal,
  waitForIdentityOrSignedOut,
} from "../src/lib/session-me-core.mjs";
import {
  accessPayloadRejection,
  AUTH_REJECTION_REASONS,
  clampRejectionReason,
  identityFromAccessPayload,
  joseRejectionReason,
  readMcpAuthInfo,
} from "../src/lib/catalog-auth-core.mjs";

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
const meRoute = read("src/app/api/auth/me/route.ts");
const analytics = read("src/lib/analytics.ts");
const rumInit = read("src/components/rum-init.tsx");
const userMenu = read("src/components/user-menu.tsx");
const sessionMe = read("src/lib/session-me.ts");
const signOutEverywhereForm = read("src/app/(site)/account/agents/SignOutEverywhere.tsx");
const sessionMeCore = read("src/lib/session-me-core.mjs");
const memberActivity = read("src/lib/member-activity.ts");
const odataMutations = read("src/lib/odata-mutations.ts");
const memberSpec = read("../katagami-commons/specs/member.ioa.toml");
const activitySpec = read("../katagami-commons/specs/member_activity_day.ioa.toml");
const activityCedarLoadedPath = "../katagami-commons/policies/member_activity.cedar";
const activityCedarServedPath = "../katagami-commons/specs/policies/member_activity.cedar";
const activityCedar = read(activityCedarLoadedPath);

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

{
  const server = createServer(() => {
    /* blackhole: accept, never write a response */
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();
  const started = Date.now();
  let aborted = false;
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: sessionMeAbortSignal(200) });
  } catch (err) {
    aborted = err?.name === "TimeoutError" || err?.name === "AbortError";
  }
  await new Promise((resolveClose) => server.close(resolveClose));
  assert.ok(aborted, "blackhole /api/auth/me must abort");
  assert.ok(Date.now() - started < 1500, "session-me abort must be prompt, not a platform stall");
  assert.equal(SESSION_ME_TIMEOUT_MS, 5_000, "session-me abort matches the 5s telemetry bound");
  console.log("ok: hung /api/auth/me aborts instead of stalling");
}

{
  // Hung me must not poison later initRum: identity wait times out as
  // signed-out, first init completes, a later call is a post-success
  // no-op — not the old initialized=true + wait-forever skip.
  let desired;
  let initialized = false;
  let inited = 0;
  async function initRumSim() {
    if (initialized) return;
    await waitForIdentityOrSignedOut({
      isKnown: () => desired !== undefined,
      markSignedOut: () => {
        if (desired === undefined) desired = null;
      },
      addWaiter: () => {
        /* hung me: setRumUser / clearRumUser never fire */
      },
      timeoutMs: 40,
    });
    inited += 1;
    initialized = true;
  }
  const started = Date.now();
  await initRumSim();
  assert.ok(Date.now() - started < 1000, "identity wait timeout must be prompt");
  assert.equal(desired, null, "hung me settles signed-out");
  assert.equal(inited, 1, "first init completed as signed-out");
  await initRumSim();
  assert.equal(inited, 1, "later initRum is a post-success no-op, not a poisoned skip");
  console.log("ok: hung me cannot poison later initRum");
}

{
  // Identity arriving before the timeout still wins (signed-in path).
  let desired;
  const waiters = [];
  const pending = waitForIdentityOrSignedOut({
    isKnown: () => desired !== undefined,
    markSignedOut: () => {
      if (desired === undefined) desired = null;
    },
    addWaiter: (w) => waiters.push(w),
    timeoutMs: 5_000,
  });
  desired = "9fc5a227c397eafb";
  for (const w of waiters) w();
  await pending;
  assert.equal(desired, "9fc5a227c397eafb", "arriving identity is not overwritten by the timeout");
  console.log("ok: identity arriving before the wait timeout is kept");
}

{
  // --- ARN-451: durable per-user activity rollup helpers --------------------
  assert.equal(utcDayKey(new Date("2026-08-31T23:59:59Z")), "2026-08-31");
  assert.equal(utcDayKey(new Date("2026-09-01T00:00:01Z")), "2026-09-01", "day buckets are UTC");
  assert.match(utcDayKey(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(activityEntityId("9fc5a227c397eafb", "2026-08-31"), "act:9fc5a227c397eafb:2026-08-31");
  assert.equal(activityActionForOutcome("success"), "RecordMcpCall");
  assert.equal(activityActionForOutcome("error"), "RecordMcpError");
  assert.equal(activityActionForOutcome("exception"), "RecordMcpError");
  console.log("ok: activity rollup keys on (user_hash, UTC day); errors route to RecordMcpError");
}

{
  // Only a real 16-hex hashPrincipal output may key a rollup row or land on a
  // Member — a raw sub, an email, or garbage must never become the key.
  const hashed = await hashPrincipal("google-oauth2|12345", {
    KATAGAMI_TELEMETRY_PEPPER: "contract-test-pepper",
  });
  assert.equal(isValidUserHash(hashed), true, "hashPrincipal output is a valid user_hash");
  for (const bad of [
    undefined, null, "", "google-oauth2|12345", "a@b.c", "9fc5a227c397eaf", // 15 hex
    "9FC5A227C397EAFB", // uppercase — not what hashPrincipal emits
    "9fc5a227c397eafb0", // 17 hex
  ]) {
    assert.equal(isValidUserHash(bad), false, `"${bad}" must not pass as a user_hash`);
  }
  console.log("ok: only 16-hex hashPrincipal output counts as a user_hash");
}

{
  // policies/ is the installed-app copy; specs/policies/ is what `temper
  // serve` and the e2e harness load. A one-sided add ships lockdown only
  // on install. Assert both copies exist and are byte-identical so npm
  // test cannot pass while the serve copy is absent.
  assert.ok(
    existsSync(resolve(activityCedarLoadedPath)),
    "policies/member_activity.cedar (installed-app copy) must exist",
  );
  assert.ok(
    existsSync(resolve(activityCedarServedPath)),
    "specs/policies/member_activity.cedar (temper serve copy) must exist",
  );
  assert.equal(
    activityCedar,
    read(activityCedarServedPath),
    "member_activity.cedar must match between policies/ and specs/policies/",
  );
  console.log("ok: member_activity.cedar exists in both policy trees and the copies match");
}

{
  // --- ARN-451: mcp_auth_challenge rejection reasons ------------------------
  // The vocabulary is CLOSED: every reason the claim path can produce is in
  // AUTH_REJECTION_REASONS, and anything else clamps to "unknown" — a rogue
  // string (or a token) can never ride @reason into Datadog.
  const base = {
    aud: "https://katagami.ai/mcp",
    scope: "read",
    sub: "s",
    auth_generation: 0,
  };
  const ctx = { generation: 0, grantActive: true };
  const cases = [
    [{ ...base, typ: "katagami_code" }, "claims"],
    [{ ...base, aud: "https://mcp.katagami.ai" }, "audience"],
    [{ ...base, scope: "contribute" }, "scope"],
    [{ ...base, sub: "" }, "claims"],
    [{ ...base, auth_generation: 1 }, "generation"],
  ];
  for (const [payload, want] of cases) {
    assert.equal(accessPayloadRejection(payload, ctx), want);
    assert.equal(identityFromAccessPayload(payload, ctx), null, `${want} must also reject identity`);
    assert.ok(AUTH_REJECTION_REASONS.has(want), `${want} must be in the closed vocabulary`);
  }
  assert.equal(
    accessPayloadRejection({ ...base, grant_id: "g1" }, { generation: 0, grantActive: false }),
    "grant_revoked",
  );
  assert.equal(accessPayloadRejection(base, ctx), null, "a good payload has no rejection");
  assert.deepEqual(identityFromAccessPayload({ ...base, email: "a@b.c" }, ctx), { sub: "s", email: "a@b.c" });
  assert.equal(joseRejectionReason({ code: "ERR_JWT_EXPIRED" }), "expired");
  assert.equal(joseRejectionReason({ code: "ERR_JWT_CLAIM_VALIDATION_FAILED" }), "claims");
  assert.equal(joseRejectionReason({ code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" }), "signature");
  assert.equal(joseRejectionReason({}), "signature");
  assert.equal(clampRejectionReason("expired"), "expired");
  assert.equal(clampRejectionReason("a@b.c stole my token"), "unknown", "free text clamps to unknown");
  assert.equal(clampRejectionReason(undefined), "unknown");
  // The thrown InvalidToken carries the clamped reason for the 401 counter.
  const thrown = await readMcpAuthInfo("bad-bearer", async () => ({ identity: null, reason: "expired" }))
    .then(() => null, (e) => e);
  assert.equal(thrown?.name, "InvalidToken");
  assert.equal(thrown?.rejectionReason, "expired");
  const legacyThrown = await readMcpAuthInfo("bad-bearer", async () => null)
    .then(() => null, (e) => e);
  assert.equal(legacyThrown?.rejectionReason, "unknown", "legacy null verifier still yields a clamped reason");
  // And the allow-list actually ships it — with reason declared, has_auth kept.
  assert.deepEqual(
    cleanAttrs("mcp_auth_challenge", { has_auth: true, method: "POST", reason: "expired", token: "x" }),
    { has_auth: true, method: "POST", reason: "expired" },
  );
  console.log("ok: mcp_auth_challenge rejection reasons — closed vocabulary, clamped, allow-listed");
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
  // --- ARN-451: RUM ↔ account join ------------------------------------------
  ["/api/auth/me hands the browser the HASH, never a sub key", meRoute,
    /^(?![\s\S]*\bsub:)[\s\S]*user_hash: userHash/],
  ["/api/auth/me hashes with hashPrincipal (peppered, truncated)", meRoute,
    /hashPrincipal\(user\.sub\)/],
  ["RUM setUser ships ONLY the id (no email/name fields)", analytics,
    /^(?![\s\S]*setUser\(\{[^}]*(email|name))[\s\S]*rum\.setUser\(\{ id: desiredUserHash \}\)/],
  ["RUM user is cleared when signed out", analytics, /rum\.clearUser\(\)/],
  ["RumInit joins the session hash into RUM on every page load", rumInit,
    /fetchSessionMe\(\)[\s\S]*setRumUser\(me\.user_hash\)/],
  ["RumInit clears the RUM user when there is no hash (incl. post-sign-out)", rumInit,
    /else clearRumUser\(\)/],
  ["initRum awaits session identity before flushing the pending buffer", analytics,
    /whenIdentityKnown\(\)[\s\S]*applyDesiredUser\(\)[\s\S]*flushPending\(\)/],
  ["flushPending will not replay the buffer anonymously once a signed-in hash is known", analytics,
    /if \(desiredUserHash && appliedUserHash !== desiredUserHash\) return;/],
  ["RumInit applies session identity before awaiting initRum's flush", rumInit,
    /initRum\(\)[\s\S]*await fetchSessionMe\(\)[\s\S]*setRumUser\(me\.user_hash\)[\s\S]*clearRumUser\(\)[\s\S]*await rumReady/],
  ["header chip and RUM join share ONE /api/auth/me fetch", userMenu,
    /^(?![\s\S]*fetch\("\/api\/auth\/me")[\s\S]*fetchSessionMe\(\)/],
  ["session helper memoizes the fetch (one request per page load)", sessionMe,
    /if \(!inflight\) \{/],
  ["session helper can drop the memoized fetch after revoke", sessionMe,
    /export function invalidateSessionMe[\s\S]*inflight = null/],
  ["sign-out-everywhere notifies other tabs via a storage key", sessionMe,
    /SESSION_REVOKED_STORAGE_KEY = "katagami-session-revoked"/],
  ["revoked-session path clears RUM (not only the initial else clearRumUser)", rumInit,
    /function dropRevokedRumUser\(\)(?:: void)? \{\s*invalidateSessionMe\(\);\s*clearRumUser\(\);/],
  ["visibility / soft-nav resync invalidates inflight then clears RUM when signed out", rumInit,
    /function resyncRumUser[\s\S]*invalidateSessionMe\(\)[\s\S]*else clearRumUser\(\)/],
  ["RumInit drops RUM user on cross-tab revoke (storage), not only initial else", rumInit,
    /SESSION_REVOKED_STORAGE_KEY[\s\S]*dropRevokedRumUser\(\)/],
  ["RumInit resyncs identity on visibilitychange (cross-tab sign-out-everywhere)", rumInit,
    /addEventListener\("visibilitychange", onVisibility\)/],
  ["RumInit resyncs identity on soft nav (root layout does not remount)", rumInit,
    /usePathname\(\)[\s\S]*resyncRumUser\(\)/],
  ["sign-out-everywhere invalidates the session fetch and clears RUM without remount", signOutEverywhereForm,
    /notifySessionRevoked\(\)[\s\S]*clearRumUser\(\)/],
  ["fetchSessionMe aborts hung /api/auth/me (5s telemetry bound)", sessionMe,
    /signal: sessionMeAbortSignal\(\)/],
  ["session-me abort helper is the 5s telemetry bound", sessionMeCore,
    /SESSION_ME_TIMEOUT_MS = 5_000/],
  ["initRum waits via waitForIdentityOrSignedOut (hung me → signed-out)", analytics,
    /waitForIdentityOrSignedOut\(\{/],
  ["initRum does not mark initialized before the identity wait", "" + (() => {
    const start = analytics.indexOf("export async function initRum");
    const end = analytics.indexOf("type AttrValue", start);
    const body = start >= 0 && end > start ? analytics.slice(start, end) : "";
    const waitAt = body.indexOf("whenIdentityKnown()");
    const initAt = body.indexOf("initialized = true");
    return waitAt >= 0 && initAt > waitAt;
  })(), /^true$/],
  ["a hung identity wait marks desiredUserHash signed-out", analytics,
    /if \(desiredUserHash === undefined\) desiredUserHash = null/],
  // --- ARN-451: user_hash on the Member row ---------------------------------
  ["Member spec declares user_hash on Register", memberSpec,
    /params = \["sub", "email", "display_name", "avatar_url", "user_hash"\]/],
  ["upsertMember persists the hash only when it IS a hash", oauthAs,
    /\.\.\.\(isValidUserHash\(userHash\) \? \{ user_hash: userHash \} : \{\}\)/],
  // --- ARN-451: durable per-user rollup in Temper ---------------------------
  ["activity spec counts logins, mcp_calls, mcp_errors as counters", activitySpec,
    /name = "logins"\ntype = "counter"[\s\S]*name = "mcp_calls"\ntype = "counter"[\s\S]*name = "mcp_errors"\ntype = "counter"/],
  ["an MCP error still counts as a call (RecordMcpError bumps both)", activitySpec,
    /name = "RecordMcpError"[\s\S]*\{ type = "increment", var = "mcp_calls" \}, \{ type = "increment", var = "mcp_errors" \}/],
  ["MemberActivityDay writes are locked to server-side principals", activityCedar,
    /forbid\(principal, action, resource is MemberActivityDay\)/],
  ["sign-in records the durable rollup BEFORE the Datadog fail-closed gate", callback,
    /recordLoginActivity\(userHash\);[\s\S]*if \(!serverTelemetryEnabled\(\)\) return;/],
  ["MCP tool calls record the durable rollup (any outcome)", telemetry,
    /recordMcpActivity\(userHash, outcome\)/],
  ["activity dispatch refuses non-hash keys (no raw sub can become a row)", memberActivity,
    /if \(!isValidUserHash\(userHash\)\) return false;/],
  ["activity dispatch is bounded (hung Temper costs a timeout, not the limit)", memberActivity,
    /AbortSignal\.timeout\(ACTIVITY_DISPATCH_TIMEOUT_MS\)/],
  ["dispatchAction actually honors the abort signal", odataMutations,
    /signal: opts\?\.signal/],
  ["dashboard has per-user MCP/login views keyed on @user_hash", dashboard,
    /@user_hash/],
  ["dashboard has a signed-in browsing view keyed on @usr.id", dashboard,
    /@usr\.id/],
  // --- ARN-451: rejection reasons on mcp_auth_challenge ---------------------
  ["mcp_auth_challenge allow-lists the rejection reason", core,
    /mcp_auth_challenge: new Set\(\["has_auth", "method", "reason"\]\)/],
  ["401 counter emits the reason only when a bearer was presented", mcp,
    /reason: hasAuth \? \(authRejectionReasons\.get\(req\) \?\? "unknown"\) : undefined/],
  ["verify callback stashes the rejection reason for the 401 counter", mcp,
    /authRejectionReasons\.set\(req, reason\)/],
  ["verifyReadBearer reports a CLAMPED reason (closed vocabulary)", read("src/lib/catalog-auth.ts"),
    /clampRejectionReason\(reason\)/],
  ["dashboard breaks auth challenges down by @reason", dashboard,
    /@evt:mcp_auth_challenge @has_auth:true/],
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
