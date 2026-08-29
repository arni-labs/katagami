# Decisions & Tradeoffs — ARN-436

## Members is the registered-user store
- **Decision:** "Registered users" = the Temper `Members` entity set, filtered `has_identity eq true`.
- **Came up because:** sessions are stateless (the signed cookie is the account), so it was unclear whether a user table exists.
- **Options:** invent a new store; count RUM sessions; use Members (upserted at every Google sign-in since ARN-151).
- **Chose** Members **because** it already is the durable account record — nothing new to build. The filter excludes placeholder rows Temper auto-creates on action-dispatch-to-missing-id.
- **Where:** `ui/src/lib/oauth-as.ts` (`countMembers`).

## Server intake is DD_API_KEY only (no public RUM)
- **Decision:** transport is the official Datadog Logs HTTP intake authenticated only with a server-only `DD_API_KEY`. Unset key → fail closed. There is no public-RUM client-token fallback.
- **Came up because:** the first head reused `NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN` on the Logs intake. Greptile P1 and Rei correctly scored that as forgeable `env:production service:katagami-server` events. Anyone who can read the browser bundle could impersonate sign-ins and MCP usage.
- **Options:** keep the public RUM token as intake auth; a Vercel→Datadog log drain; official intake with `DD_API_KEY` and fail-closed when unset.
- **Chose** `DD_API_KEY` fail-closed **because** a browser token must not authenticate production server logs. Given up: emit-on-preview without a key. Rita/Howl set the key in Vercel; this repo does not invent one.
- **Where:** `ui/src/lib/server-telemetry-core.mjs` (`resolveLogsIntake`), `ui/src/lib/server-telemetry.ts`, `DEPLOYMENT.md`, `infra/datadog/README.md`.

## Log-based metrics keep 15-month history
- **Decision:** created log-based metrics `katagami.mcp.tool_calls`, `katagami.auth.logins`, `katagami.members.total` (tagged env/tool/tier/outcome/registration).
- **Came up because:** log indexes retain ~15 days, so "registrations per day" would silently lose history.
- **Options:** accept 15-day log retention only; submit custom metrics from the route; create log-based metrics in Datadog.
- **Chose** log-based metrics **because** they keep 15 months and need no code on the request path. The dashboard still queries logs (richer facets); the metrics are the durable archive.
- **Where:** Datadog logs→metrics config, created 2026-08-29; dashboard `2ki-8vx-p5u`.

## PII is stripped; user_hash is peppered HMAC or omitted
- **Decision:** identity-shaped keys never reach Datadog. Google subs travel only as HMAC-SHA256(`KATAGAMI_TELEMETRY_PEPPER`, sub) truncated to 16 hex (`@user_hash`). Unset pepper omits `user_hash` rather than falling back to a repo string.
- **Came up because:** a repo pepper plus a small Members set is matchable, and a convention-only strip would leak on the next call site.
- **Options:** convention only; unsalted sha256 of sub; compiled repo pepper; env pepper with omit-if-unset; runtime strip + contract test.
- **Chose** env pepper + runtime strip + `check-telemetry-contract.mjs` **because** a future call site cannot leak by accident and an unset pepper cannot be inverted from git.
- **Where:** `ui/src/lib/server-telemetry-core.mjs` (`hashPrincipal`, `cleanAttrs`), `ui/scripts/check-telemetry-contract.mjs`.

## MCP tracking patches registerTool once
- **Decision:** instrumentation patches `registerTool` once instead of wrapping each handler.
- **Came up because:** per-handler wrappers hit the mcp-handler overload gotcha (annotating handler params breaks inference).
- **Options:** wrap 11 handlers; patch `registerTool` once; a separate proxy MCP.
- **Chose** the patch **because** handlers stay byte-identical and every future tool is tracked automatically.
- **Where:** `ui/src/app/mcp/route.ts` (`withUsageTracking`).

## No RUM setUser on the root layout
- **Decision:** do not call RUM `setUser` for signed-in visitors from the root layout.
- **Came up because:** linking RUM sessions to accounts looked attractive.
- **Options:** read the session cookie in the root layout and `setUser`; keep the layout cookie-free and put hashed identity on server logs only.
- **Chose** cookie-free layout **because** `check-auth-contract.mjs` enforces it (full-route cache preserved). Reading the session there would make every route dynamic.
- **Where:** `ui/src/app/layout.tsx` (unchanged), `ui/scripts/check-auth-contract.mjs`, server logs via `@user_hash`.

## Cron is fail-closed; compare is timing-safe
- **Decision:** `/api/telemetry/members` 401s when `CRON_SECRET` is unset, missing, or wrong. There is no open-when-unset local-dev path. Bearer compare uses `timingSafeEqual`.
- **Came up because:** a public route that counts Members and emits a log is a hammer-the-backend vector. An in-module rate limit was tried and removed (module state does not persist). The first head left the route open when the secret was unset; preview then leaked `members_total`. `===` on the bearer is not constant-time.
- **Options:** open when unset (local-dev convenience); 401 when unset; an in-module rate limit; timing-safe vs `===`.
- **Chose** fail-closed + timing-safe **because** a preview without the secret must not return `members_total`, and a wrong bearer must not be walked byte-by-byte. Rita/Howl set `CRON_SECRET` in Vercel before this route exists on master; do not invent a value in git.
- **Where:** `ui/src/lib/server-telemetry-core.mjs` (`authorizeCronRequest`), `ui/src/app/api/telemetry/members/route.ts`, `DEPLOYMENT.md`.

## Hash + emit only inside guarded after()
- **Decision:** `hashPrincipal` and Datadog emit run only inside `runAfter()`. Members cron does not await intake. Hung intake is aborted (`AbortSignal.timeout(2500)`). Successful sign-in skips `countMembers` when intake is fail-closed.
- **Came up because:** hashing on the request path 500'd the MCP tool when the hasher threw; unguarded `after()` could skip the Google cookie; awaiting intake stalled the cron; `countMembers` hit Temper even when emit was a no-op.
- **Options:** hash on the request path; unguarded `after()`; await intake on the cron; always count Members; guarded `runAfter` + abort + skip count when fail-closed.
- **Chose** the guarded path **because** telemetry must not 500 a tool, skip `katagami_user`, or stall cron HTTP.
- **Where:** `ui/src/lib/server-telemetry.ts` (`runAfter`, `emitServerEvent`, `trackMcpToolCall`), `ui/src/app/api/auth/google/callback/route.ts`, `ui/src/app/api/telemetry/members/route.ts`.

## MCP events stamp @tier:full only
- **Decision:** `trackMcpToolCall` emits `tier: "full"`. Never `@tier:sample`. Dashboard tiles that filter `@tier:full` stay populated; the sample-vs-full title is gone.
- **Came up because:** dropping `tier` emptied the dashboard; emitting `sample` would lie (`/mcp` is `required: true`).
- **Options:** omit tier; emit sample-vs-full; emit full only and retitle the panel.
- **Chose** full only **because** that is the only reachable tier on this URL. Initialize 401s stay untracked.
- **Where:** `ui/src/lib/server-telemetry.ts`, `infra/datadog/katagami-rum-dashboard.json`, `ui/scripts/check-telemetry-contract.mjs`.
