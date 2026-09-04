import "server-only";

import { dispatchAction } from "@/lib/odata-mutations";
import {
  activityActionForOutcome,
  activityEntityId,
  activityErrorKind,
  isCreateRaceError,
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

/** Null = recorded (or nothing to record); otherwise WHY the durable layer
 *  missed a count. Callers forward this to Datadog as
 *  activity_dispatch_failed — a dead rollup must be a visible signal, never
 *  only a server log line (Fable panel finding). */
export type ActivityFailure = {
  action: "RecordLogin" | "RecordMcpCall" | "RecordMcpError";
  errorKind: string;
};

async function recordActivity(
  userHash: string | undefined,
  action: "RecordLogin" | "RecordMcpCall" | "RecordMcpError",
  eventAt?: Date,
): Promise<ActivityFailure | null> {
  if (!isValidUserHash(userHash)) return null;
  // Bucket on the EVENT time the caller captured on the request path — this
  // code runs in a post-response task, and an event at 23:59:59Z must not
  // count on the next day just because after() started after midnight.
  const day = utcDayKey(eventAt);
  const dispatchOnce = () =>
    dispatchAction(
      "MemberActivityDays",
      activityEntityId(userHash as string, day),
      action,
      { user_hash: userHash, day },
      { signal: AbortSignal.timeout(ACTIVITY_DISPATCH_TIMEOUT_MS) },
    );
  try {
    await dispatchOnce();
    return null;
  } catch (err) {
    // First-of-day create race (verified live in production): two parallel
    // dispatches on the same missing id — one creates, the other 409s with
    // "retry against current state" and would silently lose its count.
    // The row exists now; one retry increments it.
    if (isCreateRaceError(err)) {
      try {
        await dispatchOnce();
        return null;
      } catch (retryErr) {
        console.error(`[activity] ${action} retry after create race failed`, retryErr);
        return { action, errorKind: activityErrorKind(retryErr) as string };
      }
    }
    console.error(`[activity] ${action} dispatch failed`, err);
    return { action, errorKind: activityErrorKind(err) as string };
  }
}

/** Count one successful sign-in on the day it happened. */
export function recordLoginActivity(
  userHash: string | undefined,
  eventAt?: Date,
): Promise<ActivityFailure | null> {
  return recordActivity(userHash, "RecordLogin", eventAt);
}

/** Count one MCP tool call (any outcome; errors also bump mcp_errors). */
export function recordMcpActivity(
  userHash: string | undefined,
  outcome: "success" | "error" | "exception",
  eventAt?: Date,
): Promise<ActivityFailure | null> {
  return recordActivity(userHash, activityActionForOutcome(outcome), eventAt);
}
