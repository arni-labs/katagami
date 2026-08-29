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
   distinct-callers tile keys `@evt:mcp_tool_call @tier:full`. The old
   "anonymous sample vs signed-in full" title is gone.
7. `emitServerEvent` aborts hung intake (`AbortSignal.timeout(2500)`).
   Members cron schedules emit via `runAfter` and does not await Datadog
   on the request path.
8. Successful Google sign-in skips `countMembers` when telemetry is
   fail-closed (`!serverTelemetryEnabled()`).
9. `user_hash` is HMAC-SHA256(`KATAGAMI_TELEMETRY_PEPPER`, sub) truncated
   to 16 hex. Unset pepper omits `user_hash` (no repo-string fallback).
   Identity-shaped attribute keys are stripped at emit time.
10. `check-telemetry-contract.mjs` is part of `npm run test:auth` and locks
    the behaviors above.

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
