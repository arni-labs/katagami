# Spec: Server Datadog telemetry (ARN-436)
Status: accepted. Intent: docs/efforts/ARN-436/intent.md

## Requirements
1. Unauthenticated `POST /mcp` initialize and `tools/list` → HTTP 401 +
   `WWW-Authenticate` (same as production / #268). `withMcpAuth`
   `required: true`. `withUsageTracking` sits on top; `extra.sub` still
   stamps so `user_hash` works. Never restore `required: false`.
2. `GET /api/telemetry/members` without `CRON_SECRET`, with a missing
   bearer, or with a wrong bearer → 401 and no `members_total`. Unset
   secret is fail-closed, not an open local-dev path. Bearer compare is
   timing-safe (`timingSafeEqual` over SHA-256 digests).
3. `oauth-as.ts` keeps `SCOPE_READ` / `scopeForResource` / `readMcpResource`.
   Contribute-adapter tokens do not unlock gallery `/mcp`.
4. Server intake authenticates only with `DD_API_KEY` on
   `http-intake.logs.<site>/api/v2/logs`. Public RUM client token must not
   authenticate `env:production service:katagami-server`. Unset
   `DD_API_KEY` → `resolveLogsIntake()` is null; emit is a no-op.
5. Hash + emit run only inside guarded `runAfter()` (`next/server` `after()`
   wrapped so a throw cannot 500 a tool or skip `katagami_user`).
   `duration_ms` is handler time only.
6. MCP events stamp `@tier:full`. Never emit `@tier:sample`. Dashboard
   distinct-callers tile keys `@evt:mcp_tool_call @tier:full`. Every 401 on
   `/mcp` (initialize included) emits `mcp_auth_challenge` with `@has_auth`
   + `@method`, so anonymous demand and broken OAuth flows stay visible;
   the old tier tile is now the auth-challenge view.
7. `emitServerEvent` aborts hung intake (`AbortSignal.timeout(2500)`) and
   returns whether Datadog accepted the event. The members cron awaits the
   bounded count and the bounded emit and reports that REAL result as
   `emitted` — never `serverTelemetryEnabled()` (config is not delivery).
8. Successful Google sign-in skips `countMembers` when telemetry is
   fail-closed (`!serverTelemetryEnabled()`), emits `auth_login` BEFORE any
   Temper call, and carries `members_total` on a separate best-effort
   `members_snapshot` (`source:login`). `countMembers` self-bounds at
   `COUNT_MEMBERS_TIMEOUT_MS` (5s) for every caller.
9. `user_hash` is HMAC-SHA256(`KATAGAMI_TELEMETRY_PEPPER`, sub) truncated
   to 16 hex. Unset pepper omits `user_hash` (no repo-string fallback).
   Attributes ship on a per-event ALLOW-list (`EVENT_ATTRS`): undeclared
   keys never reach Datadog, values are primitives-only (strings capped),
   and Datadog routing keys (`status`, `service`, `ddtags`, `message`,
   `hostname`, …) cannot be overridden. A module-load invariant rejects
   identity-shaped or reserved allow-list entries.
10. `check-telemetry-contract.mjs` runs in `npm run test:auth` AND in
    `prebuild` (every Vercel build) and locks the behaviors above.
11. `@odata.count` is read strictly (`readODataCount`): a 200 without the
    field, or a non-numeric value, throws — never a silent zero on the
    registered-users tile or the gallery hero counts. The dashboard
    registered-users tiles read `@evt:members_snapshot` only and use no
    `default_zero`, so absence renders as absence.
12. Invalid tool calls are visible: the SDK validates arguments before the
    registered callback, so a second wrapper on the `tools/call` request
    handler emits `@error_kind:invalid_arguments` (and counts unknown
    tools) for calls the per-tool layer never saw. Tool handlers race a
    budget of `maxDuration − 5s` so the slowest calls keep telemetry
    headroom (`@error_kind:tool_budget_exceeded`).
13. `auth_login_failed` emits only for real-handshake shapes: `state`
    requires a `code` param (bare scanner GETs emit nothing), a Google
    `error` param is `consent`, a Google exchange failure is `google`,
    and a local session-mint failure is `session`.

## Design
`ui/src/lib/server-telemetry-core.mjs` is the testable core (hash, PII
strip, cron auth, intake resolve, abort signal). `server-telemetry.ts` is
the Next.js wrapper (`after()`, `fetch`). Job-shaped events:
`mcp_tool_call`, `auth_login`, `auth_login_failed`, `members_snapshot`.
Registered users = Temper `Members` with `has_identity eq true`.

## Policy / invariants
No public-RUM server intake. Cron closed when secret unset. Telemetry
cannot break sign-in or MCP. #268 connect-card contract stays closed.

## Deferred / out of scope
Production Google `auth_login` e2e (post-ship). Setting Vercel secrets
(`CRON_SECRET`, `DD_API_KEY`, `KATAGAMI_TELEMETRY_PEPPER`) — document
only; do not invent in git. `tierOf` still returns `sample` when no
auth extra is present (dead on `/mcp` while `required: true`). whoami
sample copy is a #268 leftover; do not reopen.
