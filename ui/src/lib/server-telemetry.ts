import "server-only";

import { after } from "next/server";
import {
  hashPrincipal,
  resolveLogsIntake,
  telemetryEnabled,
  logPayload,
} from "./server-telemetry-core.mjs";

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
 *  after() callback or a cron route; never throws. */
export async function emitServerEvent(
  evt: string,
  attributes: Record<string, AttrValue> = {},
  status: TelemetryStatus = "info",
): Promise<void> {
  const intake = resolveLogsIntake();
  if (!intake) return;
  try {
    const res = await fetch(intake.url, {
      method: "POST",
      headers: intake.headers as HeadersInit,
      body: JSON.stringify([logPayload(evt, attributes, status)]),
    });
    if (!res.ok) {
      console.error(`[telemetry] intake ${res.status} for ${evt}`);
    }
  } catch (err) {
    console.error(`[telemetry] emit failed for ${evt}`, err);
  }
}

/** Fire-and-forget an event without delaying the response. */
export function trackServerEvent(
  evt: string,
  attributes: Record<string, AttrValue> = {},
  status: TelemetryStatus = "info",
): void {
  if (!serverTelemetryEnabled()) return;
  runAfter(() => emitServerEvent(evt, attributes, status));
}

// ---- Typed events (the API routes should use) ------------------------------

/** One MCP tool invocation at /mcp. Hash + emit happen inside after() so a
 *  telemetry failure cannot 500 the tool. /mcp requires a bearer — there is
 *  no sample tier on this URL; initialize 401s are untracked on purpose. */
export function trackMcpToolCall(d: {
  tool: string;
  outcome: "success" | "error" | "exception";
  durationMs: number;
  sub?: string;
  errorKind?: string;
}): void {
  const { tool, outcome, durationMs, sub, errorKind } = d;
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
    await emitServerEvent(
      "mcp_tool_call",
      {
        tool,
        outcome,
        duration_ms: durationMs,
        user_hash: userHash,
        error_kind: errorKind,
      },
      outcome === "success" ? "info" : "error",
    );
  });
}
