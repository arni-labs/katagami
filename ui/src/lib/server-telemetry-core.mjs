// Testable pieces of server telemetry (ARN-436). server-telemetry.ts is the
// Next.js wrapper (after(), fetch). Tests import this file directly so they
// can exercise hash / PII / intake / cron auth without next/server.

const SERVICE = "katagami-server";

/** Compile-time pepper — not a Rita-provisioned secret. Stops user_hash from
 *  being a raw unsalted sha256 of the Google sub (rainbow-table reversible). */
const PRINCIPAL_PEPPER = "katagami.telemetry.v1";

const ALLOWED_ATTR_KEYS = new Set(["user_hash"]);

// Exact names plus common variants (user_email, access_token, id_token, …).
// user_hash is allow-listed so the hashed principal still ships.
const FORBIDDEN_EXACT =
  /^(e-?mails?|subs?|tokens?|bearers?|authorization|names?|pictures?|users?|usernames?|user_ids?|userids?|google_subs?|access_tokens?|id_tokens?|refresh_tokens?|raw_subs?|principals?|signed_in_as|passw(or)?ds?|secrets?|cookies?|api[_-]?keys?)$/i;
const FORBIDDEN_PART =
  /(^|_|-)(email|e-?mail|token|bearer|authorization|password|passwd|secret|cookie|api[_-]?key|google_sub|raw_sub|id_token|access_token)(_|-|$)/i;

export function isForbiddenAttrKey(key) {
  if (ALLOWED_ATTR_KEYS.has(key)) return false;
  return FORBIDDEN_EXACT.test(key) || FORBIDDEN_PART.test(key);
}

export function cleanAttrs(attributes) {
  const out = {};
  for (const [k, v] of Object.entries(attributes ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (isForbiddenAttrKey(k)) continue;
    out[k] = v;
  }
  return out;
}

/** HMAC-SHA256(pepper, sub), truncated to 16 hex. Stable per sub, not a raw
 *  unsalted digest of the Google subject. */
export async function hashPrincipal(sub) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PRINCIPAL_PEPPER),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sub));
  return Buffer.from(sig).toString("hex").slice(0, 16);
}

/** Cron routes 401 when the secret is unset or the bearer does not match.
 *  Unset secret is a closed door, not an open local-dev path — a preview
 *  without CRON_SECRET must not return members_total. */
export function authorizeCronRequest(authorizationHeader, secret) {
  if (!secret) return false;
  return authorizationHeader === `Bearer ${secret}`;
}

function logsSite(env) {
  return env.NEXT_PUBLIC_DD_RUM_SITE || "datadoghq.com";
}

/**
 * Resolve the Datadog logs intake.
 *
 * - `DD_API_KEY` (server-only) → official logs intake + DD-API-KEY header.
 * - else the public RUM client token → browser-http-intake with the token
 *   as a query param. Never put the RUM token in a DD-API-KEY header
 *   (Greptile P1: that header is the secret-API-key slot).
 * @returns {{ url: string, headers: Record<string, string> } | null}
 */
export function resolveLogsIntake(env = process.env) {
  const site = logsSite(env);
  const apiKey = env.DD_API_KEY || "";
  const rumToken = env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN || "";
  /** @type {Record<string, string>} */
  const json = { "Content-Type": "application/json" };
  if (apiKey) {
    return {
      url: `https://http-intake.logs.${site}/api/v2/logs`,
      headers: { ...json, "DD-API-KEY": apiKey },
    };
  }
  if (rumToken) {
    const qs = new URLSearchParams({
      "dd-api-key": rumToken,
      ddsource: "browser",
    });
    return {
      url: `https://browser-http-intake.logs.${site}/api/v2/logs?${qs}`,
      headers: json,
    };
  }
  return null;
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
    ...cleanAttrs(attributes),
  };
}

export { SERVICE };
