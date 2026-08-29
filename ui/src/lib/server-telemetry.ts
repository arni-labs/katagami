import "server-only";

import { after } from "next/server";
import {
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
// Transport: Datadog Logs HTTP intake.
//  - Prefer DD_API_KEY (server-only) on http-intake.logs as DD-API-KEY.
//  - Else the public RUM client token on browser-http-intake as a query
//    param — never as the DD-API-KEY header (that slot is the secret API
//    key; stuffing the browser token there is spoofable and the Greptile P1).
// Absent credentials → permanent no-op. Emission rides next/server after()
// so it never delays a response and still completes before Vercel freezes.

type AttrValue = string | number | boolean | undefined | null;
export type TelemetryStatus = "info" | "warn" | "error";

export function serverTelemetryEnabled(): boolean {
  return telemetryEnabled();
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
    // Surfaced to the function log, never to the caller: telemetry must not
    // break the route it observes.
    console.error(`[telemetry] emit failed for ${evt}`, err);
  }
}

/** Fire-and-forget an event without delaying the response: attributes are
 *  captured now, the POST runs in after(). Falls back to a detached promise
 *  outside a request scope (scripts, tests). */
export function trackServerEvent(
  evt: string,
  attributes: Record<string, AttrValue> = {},
  status: TelemetryStatus = "info",
): void {
  if (!serverTelemetryEnabled()) return;
  const send = () => emitServerEvent(evt, attributes, status);
  try {
    after(send);
  } catch {
    void send();
  }
}

// ---- Typed events (the API routes should use) ------------------------------

/** One MCP tool invocation at /mcp: which tool, which auth tier, how it went,
 *  how long it took, and (full tier only) the hashed caller. */
export function trackMcpToolCall(d: {
  tool: string;
  tier: "sample" | "full";
  outcome: "success" | "error" | "exception";
  durationMs: number;
  userHash?: string;
  errorKind?: string;
}): void {
  trackServerEvent(
    "mcp_tool_call",
    {
      tool: d.tool,
      tier: d.tier,
      outcome: d.outcome,
      duration_ms: d.durationMs,
      user_hash: d.userHash,
      error_kind: d.errorKind,
    },
    d.outcome === "success" ? "info" : "error",
  );
}
