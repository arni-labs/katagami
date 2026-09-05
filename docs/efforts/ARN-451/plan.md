# Plan: Per-user activity (ARN-451)
Spec: docs/efforts/ARN-451/spec.md

## What we are addressing
Close the four per-user gaps (RUM↔account join, hash→person mapping,
history beyond log retention, opaque bearer rejections) on PR #270, with
live verification against the real kernel, real Datadog, and production
Temper — ending with all three review harnesses plus Greptile satisfied.

## Expected end state
A signed-in visitor's views/copies/downloads carry `@usr.id`; any hash in
Datadog resolves to a person via one OData query; per-user daily counters
accrue in Temper regardless of Datadog state; rejected bearers are
diagnosable by reason; the katagami-commons spec delta is published to
Genesis and installed; all 14 identified members are backfilled; the
dashboard documents where to look for each question.

## Steps
1. Specs: `member.ioa.toml` Register + `member_activity_day.ioa.toml` +
   Cedar (both policy trees) + CSDL projection.
2. Server: `/api/auth/me` hash, `member-activity.ts` dispatches wired into
   the callback + `trackMcpToolCall` (parallel with the DD emit, bounded).
3. Client: `session-me.ts` shared fetch, `analytics.ts` setUser/clearUser
   with identity-aware buffering, RumInit join + resyncs, chip subscription.
4. Rejection reasons end to end (claim path → WeakMap → 401 counter →
   dashboard widget).
5. Vercel: mint + set `KATAGAMI_TELEMETRY_PEPPER` and `CRON_SECRET`.
6. Backfill production Members; verify by read-back.
7. Live e2e: local kernel stack + real DD intake + real RUM app
   (env local-verify), production /mcp probe for the pepper.
8. Genesis publish + hot install (owner-gated), dashboard push, README.
9. Review panel (Greptile, Grok, Codex, fresh Fable), fix everything, SDLC
   gates green.
