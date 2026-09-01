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
