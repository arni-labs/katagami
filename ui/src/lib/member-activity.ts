import "server-only";

import { dispatchAction } from "@/lib/odata-mutations";
import {
  activityActionForOutcome,
  activityEntityId,
  isValidUserHash,
  utcDayKey,
} from "./member-activity-core.mjs";

// Durable per-user activity rollup (ARN-451) — the layer that outlives
// Datadog's ~15-day log retention. One MemberActivityDay row per
// (user_hash, UTC day) in Temper, accrued at event time with kernel-side
// counter increments (serialized per entity actor, so concurrent serverless
// invocations cannot lose counts).
//
// Deliberately independent of DD_API_KEY: this is the record that must
// survive Datadog being down or unconfigured. It IS gated on the pepper —
// no user_hash, nothing to key a row on.
//
// Best-effort like the rest of the post-response telemetry: a Temper hiccup
// logs and returns false, never throws into the caller's after() task.

/** A hung Temper must cost a bounded wait in a post-response task, never the
 *  Vercel function duration limit (the countMembers lesson, ARN-436). */
export const ACTIVITY_DISPATCH_TIMEOUT_MS = 5_000;

async function recordActivity(
  userHash: string | undefined,
  action: "RecordLogin" | "RecordMcpCall" | "RecordMcpError",
): Promise<boolean> {
  if (!isValidUserHash(userHash)) return false;
  const day = utcDayKey();
  try {
    await dispatchAction(
      "MemberActivityDays",
      activityEntityId(userHash as string, day),
      action,
      { user_hash: userHash, day },
      { signal: AbortSignal.timeout(ACTIVITY_DISPATCH_TIMEOUT_MS) },
    );
    return true;
  } catch (err) {
    console.error(`[activity] ${action} dispatch failed`, err);
    return false;
  }
}

/** Count one successful sign-in for today. */
export function recordLoginActivity(
  userHash: string | undefined,
): Promise<boolean> {
  return recordActivity(userHash, "RecordLogin");
}

/** Count one MCP tool call (any outcome; errors also bump mcp_errors). */
export function recordMcpActivity(
  userHash: string | undefined,
  outcome: "success" | "error" | "exception",
): Promise<boolean> {
  return recordActivity(userHash, activityActionForOutcome(outcome));
}
