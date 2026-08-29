// Server telemetry contract (ARN-436): sign-in + MCP usage stay wired,
// PII cannot reach Datadog, cron is closed without CRON_SECRET, and the
// public RUM token is never sent as DD-API-KEY. Greps lock the wiring;
// the imports below exercise the helpers (this file used to be grep-only).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  authorizeCronRequest,
  cleanAttrs,
  hashPrincipal,
  isForbiddenAttrKey,
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

// --- Behavioral -------------------------------------------------------------

{
  assert.equal(authorizeCronRequest("Bearer x", undefined), false, "unset secret is closed");
  assert.equal(authorizeCronRequest("Bearer x", ""), false, "empty secret is closed");
  assert.equal(authorizeCronRequest(null, "s3cret"), false, "missing bearer is closed");
  assert.equal(authorizeCronRequest("Bearer fake", "s3cret"), false, "wrong bearer is closed");
  assert.equal(authorizeCronRequest("Bearer s3cret", "s3cret"), true, "matching bearer is open");
  console.log("ok: cron auth 401s when CRON_SECRET is unset or bearer is wrong");
}

{
  const rum = resolveLogsIntake({
    NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-rum-token",
    NEXT_PUBLIC_DD_RUM_SITE: "datadoghq.com",
  });
  assert.ok(rum, "RUM token enables browser intake");
  assert.equal(rum.headers["DD-API-KEY"], undefined, "RUM token is not DD-API-KEY");
  assert.match(rum.url, /browser-http-intake\.logs\.datadoghq\.com/);
  assert.match(rum.url, /dd-api-key=pub-rum-token/);
  console.log("ok: RUM client token is not sent as DD-API-KEY");
}

{
  const api = resolveLogsIntake({
    DD_API_KEY: "real-api-key",
    NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN: "pub-rum-token",
  });
  assert.equal(api.headers["DD-API-KEY"], "real-api-key");
  assert.notEqual(api.headers["DD-API-KEY"], "pub-rum-token");
  assert.match(api.url, /https:\/\/http-intake\.logs\./);
  console.log("ok: DD_API_KEY path uses the server key, not the RUM token");
}

{
  assert.equal(resolveLogsIntake({}), null);
  console.log("ok: no credentials → intake is null (no-op)");
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
  const hashed = await hashPrincipal(sub);
  const raw = createHash("sha256").update(sub).digest("hex").slice(0, 16);
  assert.match(hashed, /^[0-9a-f]{16}$/);
  assert.notEqual(hashed, raw, "hash is not a raw unsalted sha256-16 of the sub");
  assert.equal(hashed, await hashPrincipal(sub), "hash is stable");
  assert.notEqual(hashed, await hashPrincipal("other-sub"));
  console.log("ok: hashPrincipal is peppered HMAC, not raw unsalted sha256-16");
}

// --- Wiring greps -----------------------------------------------------------

const required = [
  [" /mcp still requires a bearer (do not restore required:false)", mcp, /required:\s*true/],
  [" /mcp still uses readMcpAuthInfo", mcp, /readMcpAuthInfo\(bearer, verifyReadBearer\)/],
  [" /mcp still sets resourceUrl", mcp, /resourceUrl:\s*mcpPublicOrigin\(\)/],
  ["MCP tools are auto-instrumented", mcp, /withUsageTracking\(server\)/],
  ["MCP events carry tool, tier, outcome, duration", mcp, /trackMcpToolCall\(\{\s*tool: name,\s*tier: tierOf\(extra\),\s*outcome/],
  ["MCP caller identity is hashed from extra.sub", mcp, /sub \? await hashPrincipal\(sub\) : undefined/],
  ["AS still exports SCOPE_READ", oauthAs, /export \{[^}]*SCOPE_READ/],
  ["AS still mints scope from resource", oauthAs, /scopeForResource\(resource\)/],
  ["successful sign-ins emit auth_login", callback, /emitServerEvent\("auth_login"/],
  ["registration is the Member-created flag, not a guess", callback, /registration = \(await upsertMember\(user\)\)\.created/],
  ["failed sign-ins are visible too", callback, /auth_login_failed/],
  ["Google exchange throws emit auth_login_failed", callback, /Google exchange failed/],
  ["upsert failure omits registration", callback, /\.\.\.\(upsertOk \? \{ registration \} : \{\}\)/],
  ["upsertMember reports created-vs-existing", oauthAs, /Promise<\{ created: boolean \}>/],
  ["countMembers filters on has_identity", oauthAs, /has_identity eq true/],
  ["daily members snapshot emits members_total", snapshot, /emitServerEvent\("members_snapshot"/],
  ["members snapshot uses authorizeCronRequest", snapshot, /authorizeCronRequest\(/],
  ["members snapshot cron is scheduled", vercelJson, /\/api\/telemetry\/members/],
  ["emission rides next/server after()", telemetry, /after\(send\)/],
  ["telemetry no-ops without credentials", telemetry, /if \(!intake\) return/],
  ["hash is peppered HMAC, not raw sha256(sub)", core, /PRINCIPAL_PEPPER/],
  ["RUM token path is browser intake, not DD-API-KEY", core, /browser-http-intake\.logs/],
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

if (/"DD-API-KEY"\s*:\s*clientToken\(\)/.test(telemetry) || /"DD-API-KEY"\s*:\s*rumToken/.test(core)) {
  console.error("MISSING: RUM client token must not be assigned to DD-API-KEY");
  failed += 1;
} else {
  console.log("ok: no RUM client token assigned to DD-API-KEY");
}

if (failed > 0) {
  console.error(`\n${failed} telemetry contract check(s) failed.`);
  process.exit(1);
}
console.log("\ntelemetry contract holds.");
