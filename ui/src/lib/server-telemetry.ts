import "server-only";

import { after } from "next/server";
import {
  hashPrincipal,
  intakeAbortSignal,
  resolveLogsIntake,
  telemetryEnabled,
  logPayload,
} from "./server-telemetry-core.mjs";
import { recordMcpActivity, type ActivityFailure } from "./member-activity";

export { hashPrincipal, authorizeCronRequest } from "./server-telemetry-core.mjs";

// Server-side telemetry for katagami.ai (ARN-436) — the sibling of the
// browser-side RUM layer in lib/analytics.ts, for the signals RUM structurally
// cannot see: MCP tool calls and sign-in outcomes happen in server routes,
// not in the visitor's browser.
//
// Transport: Datadog Logs HTTP intake, authenticated only with a server-only
// DD_API_KEY. There is no public-RUM fallback — a browser token must not
// authenticate env:production service:katagami-server events. Unset key →
// permanent no-op (fail closed). Rita/Howl set DD_API_KEY in Vercel.
//
// Hash + emit run only inside runAfter() so a telemetry throw cannot 500 an
// MCP tool or skip the Google session cookie.

type AttrValue = string | number | boolean | undefined | null;
export type TelemetryStatus = "info" | "warn" | "error";

export function serverTelemetryEnabled(): boolean {
  return telemetryEnabled();
}

/**
 * Schedule work after the response. `after()` itself can throw (outside a
 * request scope); the task can too. Neither must break the route.
 */
export function runAfter(task: () => void | Promise<void>): void {
  const safe = () => {
    try {
      return Promise.resolve(task()).catch((err) => {
        console.error("[telemetry] after() task failed", err);
      });
    } catch (err) {
      console.error("[telemetry] after() task failed", err);
    }
  };
  try {
    after(safe);
  } catch {
    void safe();
  }
}

/** POST one event to the logs intake and await the result. Use inside an
 *  after() callback or a cron route; never throws. Returns true only when
 *  Datadog accepted the event — a caller that reports delivery (the members
 *  cron) must surface this real outcome, never "a key is configured". */
export async function emitServerEvent(
  evt: string,
  attributes: Record<string, AttrValue> = {},
  status: TelemetryStatus = "info",
): Promise<boolean> {
  const intake = resolveLogsIntake();
  if (!intake) return false;
  try {
    const res = await fetch(intake.url, {
      method: "POST",
      headers: intake.headers as HeadersInit,
      body: JSON.stringify([logPayload(evt, attributes, status)]),
      signal: intakeAbortSignal(),
    });
    if (!res.ok) {
      console.error(`[telemetry] intake ${res.status} for ${evt}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[telemetry] emit failed for ${evt}`, err);
    return false;
  }
}

/** Fire-and-forget an event without delaying the response. */
export function trackServerEvent(
  evt: string,
  attributes: Record<string, AttrValue> = {},
  status: TelemetryStatus = "info",
): void {
  if (!serverTelemetryEnabled()) return;
  runAfter(async () => {
    await emitServerEvent(evt, attributes, status);
  });
}

/** Surface a durable-rollup miss to Datadog. A dead rollup (Temper down,
 *  spec not installed, Cedar change) must show on the dashboard, never only
 *  in function logs. Await inside the same after() task. */
export async function reportActivityFailure(
  failure: ActivityFailure | null,
  userHash: string | undefined,
): Promise<void> {
  if (!failure) return;
  await emitServerEvent(
    "activity_dispatch_failed",
    { action: failure.action, error_kind: failure.errorKind, user_hash: userHash },
    "error",
  );
}

// ---- Typed events (the API routes should use) ------------------------------

/** One MCP tool invocation at /mcp. Hash + emit happen inside after() so a
 *  telemetry failure cannot 500 the tool. /mcp requires a bearer — there is
 *  no sample tier on this URL; 401s are counted separately as
 *  mcp_auth_challenge in app/mcp/route.ts so anonymous demand stays visible. */
export function trackMcpToolCall(d: {
  tool: string;
  outcome: "success" | "error" | "exception";
  durationMs: number;
  sub?: string;
  errorKind?: string;
}): void {
  const { tool, outcome, durationMs, sub, errorKind } = d;
  const eventAt = new Date(); // request-path time — the post-response task may cross midnight
  runAfter(async () => {
    let userHash: string | undefined;
    try {
      if (sub) {
        const hashed = await hashPrincipal(sub);
        if (typeof hashed === "string") userHash = hashed;
      }
    } catch (err) {
      console.error("[telemetry] hashPrincipal failed", err);
    }
    // Durable per-user rollup (ARN-451) — independent of the Datadog intake:
    // the Temper MemberActivityDay counters are what outlive log retention.
    // Started here, awaited AFTER the Datadog emit: serializing Temper (5s
    // bound) in front of the intake (2.5s bound) would let a hung kernel eat
    // the telemetry reserve and eat the mcp_tool_call event — the one path
    // that still works when Temper is down. Both stay bounded; neither
    // waits on the other.
    const activity = recordMcpActivity(userHash, outcome, eventAt);
    await emitServerEvent(
      "mcp_tool_call",
      {
        tool,
        // Only `full` is reachable on /mcp (required:true). Emit it so
        // dashboard queries that key on @tier:full stay populated. Never
        // emit sample — that path is gone; 401s emit mcp_auth_challenge.
        tier: "full",
        outcome,
        duration_ms: durationMs,
        user_hash: userHash,
        error_kind: errorKind,
      },
      outcome === "success" ? "info" : "error",
    );
    await reportActivityFailure(await activity, userHash);
  });
}
