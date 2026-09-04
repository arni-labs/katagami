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
 *  Vercel function duration limit (the countMembers lesson, ARN-436). Sized
 *  UNDER the /mcp TELEMETRY_RESERVE_MS (5s): the rollup runs concurrently
 *  with the Datadog intake in the after() task, and the whole task must fit
 *  the reserve even when Temper sits on this abort. */
export const ACTIVITY_DISPATCH_TIMEOUT_MS = 4_000;

async function recordActivity(
  userHash: string | undefined,
  action: "RecordLogin" | "RecordMcpCall" | "RecordMcpError",
  eventAt?: Date,
): Promise<boolean> {
  if (!isValidUserHash(userHash)) return false;
  // Bucket on the EVENT time the caller captured on the request path — this
  // code runs in a post-response task, and an event at 23:59:59Z must not
  // count on the next day just because after() started after midnight.
  const day = utcDayKey(eventAt);
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

/** Count one successful sign-in on the day it happened. */
export function recordLoginActivity(
  userHash: string | undefined,
  eventAt?: Date,
): Promise<boolean> {
  return recordActivity(userHash, "RecordLogin", eventAt);
}

/** Count one MCP tool call (any outcome; errors also bump mcp_errors). */
export function recordMcpActivity(
  userHash: string | undefined,
  outcome: "success" | "error" | "exception",
  eventAt?: Date,
): Promise<boolean> {
  return recordActivity(userHash, activityActionForOutcome(outcome), eventAt);
}
