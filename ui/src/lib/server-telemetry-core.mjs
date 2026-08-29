// Testable pieces of server telemetry (ARN-436). server-telemetry.ts is the
// Next.js wrapper (after(), fetch). Tests import this file directly so they
// can exercise hash / PII / intake / cron auth without next/server.

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
    ...cleanAttrs(attributes),
  };
}

export { SERVICE };
