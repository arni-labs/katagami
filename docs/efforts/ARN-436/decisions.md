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

## Review round 2 (Codex + Fable panel, 2026-08-31)

## auth_login emits first; members_total moves to members_snapshot
- **Decision:** the sign-in after() task emits `auth_login` (registration, upsert_ok, user_hash) FIRST, then best-effort counts Members and emits a `members_snapshot` (`source:login`); `auth_login` no longer carries `members_total`. `countMembers` self-bounds at 5s (`AbortSignal.timeout`, default parameter — every caller is bounded).
- **Came up because:** Codex + Fable both found the unbounded `countMembers` awaited BEFORE `emitServerEvent("auth_login")`: with Temper hung, the after() task dies at the function duration limit and logins under-count exactly during incidents.
- **Options:** only bound the count (login still waits on Temper); emit first and keep members_total on auth_login (stale-order attribute); emit first + separate snapshot event (chosen).
- **Chose** reorder + separate event **because** the login event then has zero Temper dependencies, and members_total lands on the one event (`members_snapshot`) the dashboard already reads — sign-ins now also give the tile intraday freshness. Given up: a members_total facet on login events.
- **Where:** `ui/src/app/api/auth/google/callback/route.ts`, `ui/src/lib/oauth-as.ts` (`COUNT_MEMBERS_TIMEOUT_MS`), verified live: forced blackhole Temper → `TimeoutError` at 5.2s, bounded 502 on the cron, contract greps lock the order.

## @odata.count is strict — absence is an error, never zero
- **Decision:** shared `readODataCount()` (`ui/src/lib/odata-count.mjs`): missing/malformed `@odata.count` throws; numeric strings ("8", IEEE754-compat) parse. `countMembers` throws through it; the gallery hero counts (`odata.ts` countDesignLanguages/countLane) route through it too and keep their render-fallback in their existing catch (now with a console.error).
- **Came up because:** `body["@odata.count"] ?? 0` turned a field-less 200 into "0 registered users", indistinguishable from data loss.
- **Options:** return null and per-caller branching; throw (chosen); leave odata.ts as-is.
- **Chose** throw **because** both telemetry callers already have correct error paths (cron → 502, login snapshot → skip emit), and fixing the class in odata.ts was one import — the hero pages still render (their catch), but a malformed 200 now takes the error path and logs instead of silently shipping 0+demo.
- **Where:** `ui/src/lib/odata-count.mjs`, `ui/src/lib/oauth-as.ts`, `ui/src/lib/odata.ts:369,1253`, unit-tested in `check-telemetry-contract.mjs`.

## Invalid tool calls are visible: a second wrapper at tools/call
- **Decision:** keep the per-tool registerTool wrapper (layer 1) and add a wrapper around the SDK's `tools/call` request handler (layer 2), installed by patching `server.server.setRequestHandler` before any tool registers. Layer 1 marks the call context with a symbol; layer 2 emits only for calls layer 1 never saw.
- **Came up because:** `@modelcontextprotocol/server` v2 validates arguments BEFORE invoking the registered callback (`validateToolInput` → `ProtocolError` → `createToolError`, mcp-DXXb3Vv3.mjs:1400-1433), so zod rejections produced zero usage and zero errors. There IS no SDK hook for this — the request-handler patch is the observable seam.
- **Options:** single wrapper at tools/call only (loses the error-vs-exception split for handler throws); sniff error text (brittle); two layers with a tracked-flag (chosen).
- **Chose** two layers **because** layer 1 keeps clean outcome semantics and handler-only durations, while layer 2 structurally catches schema rejections (`error_kind:invalid_arguments` — accurate without text sniffing, since flagged calls are excluded) and unknown/disabled tools (`outcome:exception`). This also closes the noted gap: tools registered via legacy `server.tool()` or without inputSchema are dispatched through the same tools/call handler and get counted.
- **Where:** `ui/src/app/mcp/route.ts` (`withUsageTracking`), verified live: malformed `get_design_language` call → `@error_kind:invalid_arguments` indexed in Datadog; `no_such_tool` → `@outcome:exception @error_kind:ProtocolError`.

## Tool handlers race a budget that reserves telemetry headroom
- **Decision:** layer 1 races every handler against `TOOL_BUDGET_MS = maxDuration*1000 − 5000` (55s); on timeout the caller gets a clean isError result and telemetry emits `@error_kind:tool_budget_exceeded`.
- **Came up because:** after() shares the 60s maxDuration, so a call finishing near the limit had under a second to reach the intake — dropping exactly the slowest calls and biasing p95 downward.
- **Options:** raise maxDuration (moves the cliff); shorten only the intake timeout (cannot recover time already spent); cap the handler (chosen).
- **Chose** the handler cap **because** a 60s platform kill also destroys the RESPONSE — the cap converts an invisible kill into a visible, counted error with 5s of guaranteed emit headroom. Given up: tools may not legitimately run 55-60s (none comes close; catalog reads are sub-second).
- **Where:** `ui/src/app/mcp/route.ts`.

## Attributes ship on a per-event allow-list; routing keys are reserved
- **Decision:** `cleanAttrs(evt, attrs)` keeps only keys declared in `EVENT_ATTRS[evt]`; unknown events ship no attrs (loudly); values are primitives-only with strings capped at 200 chars; `RESERVED_LOG_KEYS` (status/service/ddtags/message/hostname/…) can never be overridden; a module-load invariant rejects any allow-list entry that is identity-shaped or reserved. The old deny-regexes stay as that invariant's belt.
- **Came up because:** execution proved the deny-list passed user_name, caller_sub, gmail, handle, and friends, and a spread-last attr named "status" could re-level events.
- **Options:** grow the deny-list (loses the same race next month); allow-list per event (chosen).
- **Chose** the allow-list **because** the guarantee flips from "we predicted every bad name" to "a call site cannot ship an undeclared key at all". The invariant already earned its keep: it rejected our own `has_bearer` attr name (matched the bearer pattern) — renamed `has_auth`.
- **Where:** `ui/src/lib/server-telemetry-core.mjs`, contract tests feed every reviewer-listed identity key through every event and assert empty.

## The members cron reports delivery, not configuration
- **Decision:** `emitServerEvent` returns whether Datadog accepted the event; `/api/telemetry/members` awaits the bounded count (5s) and the bounded intake (2.5s) and returns that real result as `emitted`.
- **Came up because:** `emitted: serverTelemetryEnabled()` reflected config — a revoked key showed green forever.
- **Options:** keep fire-and-forget and log only; await and report (chosen).
- **Chose** awaiting **because** both awaits are bounded (worst case ~7.5s on a daily cron) and the cron is the one place a human checks delivery.
- **Where:** `ui/src/lib/server-telemetry.ts`, `ui/src/app/api/telemetry/members/route.ts`, verified live: `{"ok":true,"members_total":10,"emitted":true}` with the probe indexed in Datadog.

## Dashboard: absence looks like absence; 401s get the dead tile's slot
- **Decision:** the "Registered users (total)" tile drops `default_zero` and reads `@evt:members_snapshot` only (the sole `members_total` carrier now); "Registered users over time" follows; the informationally-dead "Auth tier (full)" toplist becomes "Auth challenges — 401s (fresh client vs rejected token)" over the new `mcp_auth_challenge` event (`@has_auth` false = anonymous demand meeting the connect card, true = rejected/expired token).
- **Came up because:** `default_zero` over a window with no snapshot rendered "0 registered users" — identical to data loss; and with `/mcp` fully authed, a broken OAuth flow was indistinguishable from waning interest (Rita explicitly wants authed-vs-unauthed demand visible).
- **Options:** keep default_zero (lies); N/A on empty windows (chosen). For 401s: a new tile row vs replacing the constant-valued tier tile (chosen — tier is a facet on every event and a metric tag either way).
- **Where:** `infra/datadog/katagami-rum-dashboard.json`, `ui/src/app/mcp/route.ts` (`withAuthChallengeCount` on GET-SSE/POST/DELETE), verified live: both `has_auth:true` and `has_auth:false` challenges indexed.

## auth_login_failed is bot-proof and names the failing dependency
- **Decision:** the callback emits `reason:state` only when a `code` param actually came back; a Google `error` param (user denied consent, …) emits `reason:consent`; a bare cookie-less GET (scanner shape) emits nothing. The Google exchange and local session minting are separate try blocks: `reason:google` = Google failed, `reason:session` = we could not mint the session (redirects to `/signin?error=session` with its own copy).
- **Came up because:** any bot GET to the callback pumped a warn event and an intake POST (cost + noise drowning real failures), and a `signSession` outage was indistinguishable from a Google outage.
- **Options:** rate-limit emission (module state does not persist on Vercel); tag bot-shaped hits separately (still pays intake per scan); emit only on real-handshake shapes (chosen).
- **Chose** the code/error gate **because** a scanner cannot cheaply fake a Google redirect shape by accident, and the consent case (no code, explicit error) still gets counted. Given up: visibility into raw scanner volume on this URL (that lives in access logs, not paid telemetry).
- **Where:** `ui/src/app/api/auth/google/callback/route.ts`, `ui/src/app/(site)/signin/page.tsx`, verified live: bare GET → zero events; `?error=access_denied` → `reason:consent`; `?code=x&state=y` → `reason:state` — exactly those, indexed.

## Contract check gates every build, not only npm test
- **Decision:** `check-telemetry-contract.mjs` runs in `prebuild` (Vercel runs it on every deploy) as well as `npm test`, and now locks all of the above (allow-list behavior, reserved keys, strict count, emit order, budget, auth-challenge wiring, cron delivery reporting — including a check that prebuild itself stays wired).
- **Came up because:** the reviewer noted the check only ran under npm test, which nothing gates.
- **Where:** `ui/package.json` (`prebuild`), `ui/scripts/check-telemetry-contract.mjs`.

## Noted, judged, not changed
- **Single intake attempt, no retry:** kept. A retry queue inside a serverless after() adds machinery and can spend the headroom just reserved; a 503 burst loses only that window's events, and the daily cron + 15-month log-based metrics restore the durable trends. Telemetry here is best-effort by contract.
- **First-sign-in race (duplicate Members):** real but rare — two concurrent first callbacks for one sub can double-create Members and double-count a registration. The correct fix is a uniqueness constraint on `sub` in the Temper app (backend), not another read-then-write dance in the UI. Left as a linked residual risk on ARN-436.
- **Legacy `server.tool()` / schema-less tools bypassing tracking:** closed structurally by the tools/call layer (see above) — any tool the SDK dispatches is counted regardless of how it was registered.
