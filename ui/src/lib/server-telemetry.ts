import "server-only";

import { after } from "next/server";

// Server-side telemetry for katagami.ai (ARN-436) — the sibling of the
// browser-side RUM layer in lib/analytics.ts, for the signals RUM structurally
// cannot see: MCP tool calls and sign-in outcomes happen in server routes,
// not in the visitor's browser.
//
// Transport: the Datadog Logs HTTP intake, authenticated with the SAME public
// RUM client token the browser SDK ships (client tokens may submit logs;
// verified live 2026-08-29 — a probe POSTed with the pub… token was queryable
// in the org seconds later). That works from Vercel serverless with no agent,
// no log drain, and no new secret. The metrics intake would need a real
// DD_API_KEY, which this project does not have — see infra/datadog/README.md
// for the upgrade path.
//
// Design rules, mirrored from analytics.ts:
//  - Absent credentials → permanent no-op; telemetry must never break a route.
//  - Nothing personally identifying leaves: Google subs travel only as
//    sha256 hashes (hashPrincipal), and identity-shaped attribute keys are
//    stripped at emit time so a future call site cannot leak by accident.
//  - Emission rides next/server's after() so it never delays a response and
//    still completes before Vercel freezes the function.

const SERVICE = "katagami-server";

function clientToken(): string {
  return process.env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN ?? "";
}

function intakeUrl(): string {
  const site = process.env.NEXT_PUBLIC_DD_RUM_SITE || "datadoghq.com";
  return `https://http-intake.logs.${site}/api/v2/logs`;
}

/** `production` on the production deploy, `preview` on previews, and
 *  `local-verify` everywhere else — every dashboard query is scoped to
 *  env:production, so local runs and previews never pollute the numbers. */
function telemetryEnv(): string {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "local-verify";
}

export function serverTelemetryEnabled(): boolean {
  return Boolean(clientToken());
}

/** sha256 of a principal id, truncated to 16 hex chars: stable per-user
 *  cardinality for dashboards with nothing reversible in the logs. Raw Google
 *  subs, emails, and bearer tokens must never be emitted. */
export async function hashPrincipal(sub: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sub),
  );
  return Buffer.from(digest).toString("hex").slice(0, 16);
}

type AttrValue = string | number | boolean | undefined | null;
export type TelemetryStatus = "info" | "warn" | "error";

// Identity-shaped keys are dropped at emit time — the PII rule enforced in
// code, not convention. Hashed ids go under user_hash.
const FORBIDDEN_ATTR_KEYS =
  /^(email|sub|token|bearer|authorization|name|picture|user|username)$/i;

function cleanAttrs(
  attributes: Record<string, AttrValue>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (v === undefined || v === null || v === "") continue;
    if (FORBIDDEN_ATTR_KEYS.test(k)) continue;
    out[k] = v;
  }
  return out;
}

/** POST one event to the logs intake and await the result. Use inside an
 *  after() callback or a cron route; never throws. */
export async function emitServerEvent(
  evt: string,
  attributes: Record<string, AttrValue> = {},
  status: TelemetryStatus = "info",
): Promise<void> {
  if (!serverTelemetryEnabled()) return;
  try {
    const res = await fetch(intakeUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": clientToken(),
      },
      body: JSON.stringify([
        {
          ddsource: SERVICE,
          ddtags: `env:${telemetryEnv()},service:${SERVICE}`,
          service: SERVICE,
          hostname: process.env.VERCEL_REGION || "vercel",
          status,
          message: evt,
          evt,
          ...cleanAttrs(attributes),
        },
      ]),
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
