// Pure pieces of the durable per-user activity rollup (ARN-451).
// member-activity.ts is the Next.js wrapper that dispatches to Temper; tests
// import this file directly to exercise day keys, entity ids, and action
// routing without server-only.

/** UTC calendar day, YYYY-MM-DD. Rollup rows bucket on this so a day means
 *  the same thing from every Vercel region. */
export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Deterministic MemberActivityDay entity id. Dispatching an action on a
 *  missing id auto-creates the row in Active (the PrincipalGenerations
 *  pattern), so one id per (user_hash, day) IS the upsert. */
export function activityEntityId(userHash, day) {
  return `act:${userHash}:${day}`;
}

/** Which MemberActivityDay action a tool-call outcome maps to. Errors are
 *  still calls — RecordMcpError increments mcp_calls too (spec effect). */
export function activityActionForOutcome(outcome) {
  return outcome === "success" ? "RecordMcpCall" : "RecordMcpError";
}

/** A user_hash worth persisting: the 16-hex truncated HMAC hashPrincipal
 *  emits, and nothing else. A raw sub, an email, or an empty string must
 *  never become a rollup key (or a Member field). */
export function isValidUserHash(userHash) {
  return typeof userHash === "string" && /^[0-9a-f]{16}$/.test(userHash);
}

/** Closed error-kind vocabulary for a failed activity dispatch — these ride
 *  to Datadog on activity_dispatch_failed, so the set must stay small and
 *  free of anything response- or identity-shaped. */
export const ACTIVITY_ERROR_KINDS = new Set([
  "timeout",
  "http_4xx",
  "http_5xx",
  "network",
  "exception",
]);

export function activityErrorKind(err) {
  const name = String(err?.name ?? "");
  if (name === "TimeoutError" || name === "AbortError") return "timeout";
  const m = /failed (\d{3})\b/.exec(String(err?.message ?? ""));
  if (m) {
    const status = Number(m[1]);
    if (status >= 500) return "http_5xx";
    if (status >= 400) return "http_4xx";
  }
  if (name === "TypeError") return "network"; // fetch network failures throw TypeError
  return "exception";
}

/** The kernel's auto-create race: two first-of-day dispatches on the same
 *  missing id — one creates the row, the other gets 409 "action
 *  authorization became stale; retry against current state". Verified live
 *  in production (2026-09-04): without a retry that count is silently lost.
 *  The kernel message itself names the contract: retry once. */
export function isCreateRaceError(err) {
  const msg = String(err?.message ?? "");
  return msg.includes("authorization became stale") || /failed 409\b/.test(msg);
}
