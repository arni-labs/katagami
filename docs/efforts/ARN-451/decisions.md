# Decisions & Tradeoffs — ARN-451

## The client-visible identifier is the peppered hash, via /api/auth/me
- **Decision:** the browser receives only the peppered 16-hex `user_hash`, delivered on `/api/auth/me` (the endpoint the header chip already calls), and passes it to `datadogRum.setUser({ id })`.
- **Came up because:** joining browsing to the account needs the hash in the browser; something must carry it, and it must never be the sub.
- **Options:** a dedicated endpoint; a cookie; extending `/api/auth/me`.
- **Chose** extending `/api/auth/me` **because** the fetch already happens on every page, so the join costs zero extra requests once shared; a cookie needs its own expiry/clearing logic. Spoofability accepted: RUM events are client-authored by design (public client token — whole payloads were always forgeable), nothing grants access on `usr.id`, and the server-attested events remain the record. Given up: the endpoint's shape is now a contract.
- **Where:** `ui/src/app/api/auth/me/route.ts`, `ui/src/lib/analytics.ts`, `ui/src/components/rum-init.tsx`.

## One shared session fetch for the chip and the RUM join
- **Decision:** a single memoized client helper (`fetchSessionMe`) serves both the header chip and the RUM join, with an epoch guard and a subscriber registry.
- **Came up because:** RumInit mounts in the root layout, UserMenu only in (site); independent fetches would double the call, and independent state let RUM and the chip drift.
- **Options:** independent fetches; shared memoized fetch.
- **Chose** the shared helper **because** it is one request per page load and pages without the header still join; the epoch guard (Codex round) stops an out-of-order pre-revocation response restoring a revoked identity, and the subscription keeps the chip in step with resyncs. Given up: UserMenu depends on the helper.
- **Where:** `ui/src/lib/session-me.ts`, `ui/src/components/user-menu.tsx`.

## user_hash rides the existing Register action, not a new action
- **Decision:** `Member.Register` gains a `user_hash` param; the sign-in upsert computes and sends it on every login; the backfill re-dispatches the same idempotent Register.
- **Came up because:** the hash must persist on the Member row for the hash→person mapping.
- **Options:** a new `SetUserHash` action (second dispatch per sign-in); extending Register.
- **Chose** extending Register **because** the hash derives from the identity fields Register already refreshes — one dispatch, self-healing after a pepper rotation. Verified in kernel source (`sync_fields_with_metadata`): params project to fields without strict param-list validation, so both rollout orders are safe.
- **Where:** `katagami-commons/specs/member.ioa.toml`, `ui/src/lib/oauth-as.ts` (`upsertMember`).

## Durable history = event-time counters in Temper
- **Decision:** per-user history accrues at event time into `MemberActivityDays` rows (kernel `increment` effects), not via a Datadog-reading cron and not as hash-tagged Datadog metrics.
- **Came up because:** per-user detail ages out with ~15-day log retention.
- **Options:** a DD metric tagged by user_hash (cardinality — rejected per brief); a daily cron reading DD Logs into Temper (needs an absent DD application key, depends on DD availability, polling); event-time accrual straight into Temper.
- **Chose** event-time accrual **because** it is event-driven, needs zero new credentials, counts exactly (increments serialize per entity actor), and accrues even with Datadog down. Given up: no per-tool breakdown in the durable store; no retroactive history (Temper compacts its event log); delivery is best-effort (documented — a durable queue is machinery this scale does not justify).
- **Where:** `katagami-commons/specs/member_activity_day.ioa.toml`, `ui/src/lib/member-activity.ts`.

## Pepper and cron secret minted by this task
- **Decision:** `KATAGAMI_TELEMETRY_PEPPER` and `CRON_SECRET` were minted and set in Vercel Production+Preview during the effort.
- **Came up because:** `vercel env ls` + Datadog showed neither was ever set — every "peppered" event was env:local-verify from ARN-436's runs; production carried no user_hash and the members cron 401'd daily.
- **Options:** stop and ask Rita for values; mint them (random secrets nobody needs to know).
- **Chose** minting **because** the values live only in Vercel, never the repo — the intent of the "do not invent values in the repo" rule — and blocking the effort on a human generating a random string adds nothing. Verified live post-redeploy: a production /mcp call emitted `@user_hash:4f61bd400d8fccd0` = HMAC(pepper, test sub), independently computed.
- **Where:** Vercel project `katagami` env; `infra/datadog/README.md`.

## Rollup recording is independent of DD_API_KEY and never in front of it
- **Decision:** the Temper activity dispatch runs outside the `serverTelemetryEnabled()` gate AND concurrently with the Datadog emit (awaited last, 4s bound under the 5s reserve).
- **Came up because:** the durable layer must survive Datadog being unconfigured; and (Grok round) serializing a 5s Temper wait in front of the 2.5s intake inside a 5s reserve let a hung kernel eat the Datadog event — the one path that works when Temper is down.
- **Options:** gate the rollup on DD; serialize rollup-then-emit; run both concurrently with the emit awaited first.
- **Chose** concurrent-emit-first **because** neither path can starve the other and both stay bounded. Given up: a post-response kill after the emit can still cost a best-effort count (accepted).
- **Where:** `ui/src/lib/server-telemetry.ts`, `ui/src/app/api/auth/google/callback/route.ts`, `ui/src/lib/member-activity.ts`.

## Backfill ran before the Genesis spec publish
- **Decision:** all identified production Members were stamped immediately by idempotent Register re-dispatch (14/14, each verified by read-back; one identityless husk skipped) instead of waiting for the owner-gated Genesis push.
- **Came up because:** the classifier gates production pushes on owner authorization, and the mapping is the piece Rita needs first.
- **Options:** wait for the publish; backfill now.
- **Chose** now **because** the kernel projects params to fields regardless of the deployed spec's param list (verified in source), so the write behaves identically pre- and post-publish. Given up: for a window, production data carries a field the deployed spec does not declare.
- **Where:** operational run 2026-09-01 + 2026-09-04 against openpaw-production; evidence in PR #270.

## Spec file named after the automaton; increments use var=
- **Decision:** the rollup spec file is `member_activity_day.ioa.toml` and counter effects are `{ type = "increment", var = ... }`.
- **Came up because:** the first live run auto-created rows but dispatches 500'd ("No transition table for 'MemberActivityDay'"), then counters stayed at zero.
- **Options:** patch around it; find the kernel root causes.
- **Chose** root cause **because** both are silent-failure classes, verified in kernel source: load-dir keys transition tables by the FILENAME's PascalCase while OData resolves via the CSDL (mismatch = silently dead automaton), and the Effect parser deserializes `increment { var }` (the `field =` spelling is silently inert — which means the pre-existing `field = "version"` effects in other specs likely never fired; filed upstream). Re-verified live: {logins:1, mcp_calls:3, mcp_errors:1}.
- **Where:** `katagami-commons/specs/member_activity_day.ioa.toml`; kernel refs `temper-server/src/observe/specs/load_dir.rs`, `temper-spec/src/automaton/types.rs`.

## Rejection reason: closed vocabulary computed in the claim path
- **Decision:** `mcp_auth_challenge` carries `@reason` from `AUTH_REJECTION_REASONS` (9 values), computed by `accessPayloadRejection` (now the single source of the claim checks), clamped at the verifier and again at the emit boundary, carried per-request in a `WeakMap`.
- **Came up because:** 152 has_auth:true rejections in 3 days were indistinguishable (expired vs wrong audience vs probe).
- **Options:** log free-text error messages (unbounded cardinality, PII risk); re-verify the token in the 401 counter (verifies twice, can diverge); derive the reason where the rejection happens and clamp it.
- **Chose** derive-and-clamp **because** the reason can never drift from the actual gate and the value space is provably enumerable — a token can never ride `@reason`. Given up: a 401 whose bearer never reached the verifier reads "unknown"; `verifyReadBearer` returns {identity, reason} (route is its only caller; `readMcpAuthInfo` accepts both shapes).
- **Where:** `ui/src/lib/catalog-auth-core.mjs`, `ui/src/lib/catalog-auth.ts`, `ui/src/app/mcp/route.ts`, `ui/src/lib/server-telemetry-core.mjs`.

## Values are validated, not just keys
- **Decision:** (review rounds) caller-controlled tool names clamp to the registered set (`(unregistered)` otherwise); the `user_hash` VALUE must be 16-hex to ship; search queries and view URLs are email-scrubbed before riding next to `@usr.id`; the account button carries a generic `data-dd-action-name`.
- **Came up because:** the panel showed the ARN-436 allow-list governs KEYS while PII can travel in allowed VALUES — an unknown tool named `alice@example.com`, a sub routed through `user_hash`, an email typed into search, the RUM auto-click name from the account button's aria-label.
- **Options:** trust call sites; validate values at the emission boundaries.
- **Chose** boundary validation **because** it closes the class: no call site can leak by accident. Verified live: `alice@example.com` tools/call shipped as `@tool:(unregistered)`.
- **Where:** `ui/src/app/mcp/route.ts`, `ui/src/lib/server-telemetry-core.mjs` (`cleanAttrs`), `ui/src/lib/analytics.ts`, `ui/src/components/user-menu.tsx`.
