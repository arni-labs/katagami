// Server telemetry contract (ARN-436): the Datadog signals for sign-ins and
// MCP usage stay wired, and nothing personally identifying can reach Datadog.
// Source-greps in the style of the other check-* scripts.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const telemetry = read("src/lib/server-telemetry.ts");
const mcp = read("src/app/mcp/route.ts");
const callback = read("src/app/api/auth/google/callback/route.ts");
const oauthAs = read("src/lib/oauth-as.ts");
const snapshot = read("src/app/api/telemetry/members/route.ts");
const vercelJson = read("vercel.json");

const required = [
  // PII never reaches Datadog: identity-shaped keys are stripped at emit
  // time, and principals travel only as sha256 hashes.
  [
    "identity-shaped attribute keys are stripped at emit time",
    telemetry,
    /FORBIDDEN_ATTR_KEYS[\s\S]*email\|sub\|token\|bearer/,
  ],
  ["principals are hashed, never raw", telemetry, /sha256|SHA-256/i],
  ["hash is truncated (nothing reversible to store)", telemetry, /slice\(0, 16\)/],
  // Absent credentials → permanent no-op (mirrors lib/analytics.ts).
  [
    "telemetry is a no-op without the client token",
    telemetry,
    /if \(!serverTelemetryEnabled\(\)\) return/,
  ],
  // Emission must not delay responses and must survive the function freeze.
  ["emission rides next/server after()", telemetry, /after\(send\)/],
  // MCP usage: every tool is auto-instrumented via the patched registerTool,
  // so a future tool cannot be added untracked.
  ["MCP tools are auto-instrumented", mcp, /withUsageTracking\(server\)/],
  ["MCP events carry tool, tier, outcome, duration", mcp, /trackMcpToolCall\(\{\s*tool: name,\s*tier: tierOf\(extra\),\s*outcome/],
  ["MCP caller identity is hashed", mcp, /sub \? await hashPrincipal\(sub\) : undefined/],
  // Auth events: logins distinct from registrations, failures visible.
  ["successful sign-ins emit auth_login", callback, /emitServerEvent\("auth_login"/],
  ["registration is the Member-created flag, not a guess", callback, /registration = \(await upsertMember\(user\)\)\.created/],
  ["failed sign-ins are visible too", callback, /auth_login_failed/],
  ["upsertMember reports created-vs-existing", oauthAs, /Promise<\{ created: boolean \}>/],
  // Registered users count from the real source of truth, excluding the
  // auto-created placeholder rows.
  ["countMembers filters on has_identity", oauthAs, /has_identity eq true/],
  ["daily members snapshot emits members_total", snapshot, /emitServerEvent\("members_snapshot"/],
  ["members snapshot cron is scheduled", vercelJson, /\/api\/telemetry\/members/],
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
  console.error(`\n${failed} telemetry contract check(s) failed.`);
  process.exit(1);
}
console.log("\ntelemetry contract holds.");
