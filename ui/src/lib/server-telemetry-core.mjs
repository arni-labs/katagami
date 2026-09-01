// Testable pieces of server telemetry (ARN-436). server-telemetry.ts is the
// Next.js wrapper (after(), fetch). Tests import this file directly so they
// can exercise hash / PII / intake / cron auth without next/server.

import { createHash, timingSafeEqual } from "node:crypto";

const SERVICE = "katagami-server";

/** HMAC pepper for user_hash. Unset → hashPrincipal returns undefined and
 *  events omit user_hash. Rita/Howl set KATAGAMI_TELEMETRY_PEPPER in Vercel;
 *  this file does not invent a fallback string (a repo pepper plus 8 members
 *  is matchable). */
export function principalPepper(env = process.env) {
  return env.KATAGAMI_TELEMETRY_PEPPER || "";
}

const ALLOWED_ATTR_KEYS = new Set(["user_hash"]);

// Exact names plus common variants (user_email, access_token, id_token, …).
// user_hash is allow-listed so the hashed principal still ships. This is a
// BELT, not the guarantee: the review proved a deny-list passes the most
// natural identity keys (user_name, caller_sub, gmail, handle, …). The
// guarantee is the per-event allow-list in EVENT_ATTRS below — an attribute
// key a call site did not declare here never reaches Datadog.
const FORBIDDEN_EXACT =
  /^(e-?mails?|subs?|tokens?|bearers?|authorization|names?|pictures?|users?|usernames?|user_ids?|userids?|google_subs?|access_tokens?|id_tokens?|refresh_tokens?|raw_subs?|principals?|signed_in_as|passw(or)?ds?|secrets?|cookies?|api[_-]?keys?)$/i;
const FORBIDDEN_PART =
  /(^|_|-)(email|e-?mail|token|bearer|authorization|password|passwd|secret|cookie|api[_-]?key|google_sub|raw_sub|id_token|access_token)(_|-|$)/i;

export function isForbiddenAttrKey(key) {
  if (ALLOWED_ATTR_KEYS.has(key)) return false;
  return FORBIDDEN_EXACT.test(key) || FORBIDDEN_PART.test(key);
}

/** Datadog log-routing keys. An attribute spread must never override these —
 *  a future attr named "status" would silently re-level events, "ddtags"
 *  would re-route them. Stripped unconditionally, allow-list or not. */
export const RESERVED_LOG_KEYS = new Set([
  "ddsource",
  "ddtags",
  "service",
  "hostname",
  "status",
  "message",
  "evt",
  "timestamp",
  "date",
  "trace_id",
  "span_id",
]);

/** The full attribute vocabulary, per event. Adding an attribute means
 *  adding it here (and to the README table) — a call site cannot leak a new
 *  key by accident, whatever it is named. */
export const EVENT_ATTRS = {
  auth_login: new Set(["registration", "upsert_ok", "user_hash"]),
  auth_login_failed: new Set(["reason"]),
  mcp_tool_call: new Set(["tool", "tier", "outcome", "duration_ms", "user_hash", "error_kind"]),
  mcp_auth_challenge: new Set(["has_auth", "method"]),
  members_snapshot: new Set(["members_total", "source"]),
};

// Module-load invariant: no allow-listed key may be identity-shaped or a
// routing key. Runs on every import (tests, build, runtime), so a bad
// allow-list edit fails loudly before it ships.
for (const [evt, keys] of Object.entries(EVENT_ATTRS)) {
  for (const key of keys) {
    if (RESERVED_LOG_KEYS.has(key)) {
      throw new Error(`telemetry: ${evt} allow-lists reserved log key "${key}"`);
    }
    if (isForbiddenAttrKey(key)) {
      throw new Error(`telemetry: ${evt} allow-lists identity-shaped key "${key}"`);
    }
  }
}

/** Bound attr values too: primitives only, strings capped — a free-text blob
 *  ("a@b.c failed") must not ride an allowed key into the index at length. */
const MAX_ATTR_STRING = 200;

export function cleanAttrs(evt, attributes) {
  const allowed = EVENT_ATTRS[evt];
  if (!allowed) {
    // Unknown event → no attributes at all (fail closed), and say so:
    // a dev who forgot to register the event must see it, not lose data.
    console.error(`[telemetry] event "${evt}" has no attribute allow-list; attrs dropped`);
    return {};
  }
  const out = {};
  for (const [k, v] of Object.entries(attributes ?? {})) {
    if (!allowed.has(k) || RESERVED_LOG_KEYS.has(k)) continue;
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "string") {
      out[k] = v.slice(0, MAX_ATTR_STRING);
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

/** HMAC-SHA256(pepper, sub), truncated to 16 hex. Returns undefined when
 *  KATAGAMI_TELEMETRY_PEPPER is unset — never a raw unsalted digest. */
export async function hashPrincipal(sub, env = process.env) {
  const pepper = principalPepper(env);
  if (!pepper) return undefined;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sub));
  return Buffer.from(sig).toString("hex").slice(0, 16);
}

/** Constant-time string compare. Hash both sides first so unequal lengths
 *  still go through `timingSafeEqual` (which throws on length mismatch). */
function timingSafeStringEqual(left, right) {
  const ha = createHash("sha256").update(String(left)).digest();
  const hb = createHash("sha256").update(String(right)).digest();
  return timingSafeEqual(ha, hb);
}

/** Cron routes 401 when the secret is unset or the bearer does not match.
 *  Unset secret is a closed door, not an open local-dev path — a preview
 *  without CRON_SECRET must not return members_total. Compare is
 *  timing-safe so a wrong bearer cannot be walked byte-by-byte. */
export function authorizeCronRequest(authorizationHeader, secret) {
  if (!secret || typeof authorizationHeader !== "string") return false;
  return timingSafeStringEqual(authorizationHeader, `Bearer ${secret}`);
}

function logsSite(env) {
  return env.NEXT_PUBLIC_DD_RUM_SITE || "datadoghq.com";
}

/** Datadog intake must not stall a Vercel response. Hung intake → abort. */
export const INTAKE_FETCH_TIMEOUT_MS = 2500;

export function intakeAbortSignal(timeoutMs = INTAKE_FETCH_TIMEOUT_MS) {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Resolve the Datadog logs intake.
 *
 * Server events fail closed without `DD_API_KEY`. The public RUM client
 * token must not authenticate `env:production service:katagami-server`
 * (anyone who can read the browser bundle could forge those events).
 * Rita/Howl set `DD_API_KEY` in Vercel; do not invent a value.
 * @returns {{ url: string, headers: Record<string, string> } | null}
 */
export function resolveLogsIntake(env = process.env) {
  const site = logsSite(env);
  const apiKey = env.DD_API_KEY || "";
  if (!apiKey) return null;
  return {
    url: `https://http-intake.logs.${site}/api/v2/logs`,
    headers: {
      "Content-Type": "application/json",
      "DD-API-KEY": apiKey,
    },
  };
}

export function telemetryEnabled(env = process.env) {
  return resolveLogsIntake(env) !== null;
}

export function telemetryEnv(env = process.env) {
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return "local-verify";
}

export function logPayload(evt, attributes, status, env = process.env) {
  return {
    ddsource: SERVICE,
    ddtags: `env:${telemetryEnv(env)},service:${SERVICE}`,
    service: SERVICE,
    hostname: env.VERCEL_REGION || "vercel",
    status,
    message: evt,
    evt,
    ...cleanAttrs(evt, attributes),
  };
}

export { SERVICE };
