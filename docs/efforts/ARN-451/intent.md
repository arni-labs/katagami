# Intent: Per-user activity — join RUM to accounts, map hashes to people, outlive log retention
Author: Rita Agafonova (owner). Status: accepted. Linear: ARN-451 (child of ARN-436).

## Problem
ARN-436 shipped per-event telemetry, but three per-user gaps remained:
RUM browsing could not be tied to an account (no `datadogRum.setUser`);
a `@user_hash` seen in Datadog could not be mapped back to a person; and
every per-user detail aged out with ~15-day log index retention. A fourth
gap surfaced mid-effort from real production traffic: 152 rejected /mcp
bearers in 3 days were indistinguishable (expired token, wrong audience,
probing bot — all just `has_auth:true`).

## Proposed outcome
After sign-in, RUM events carry the same peppered `user_hash` server events
carry (`@usr.id`), cleared on sign-out — hash only, never the sub. The hash
is stored on the Temper Member row (spec change, Genesis publish) with the
existing members backfilled, so `Members?$filter=user_hash eq '<hash>'`
answers "which of my users is this". Per-user login/MCP history accrues at
event time into durable Temper `MemberActivityDays` rows (per-user-per-day
counters), not Datadog metrics tagged by hash. Rejected bearers carry a
closed-vocabulary `@reason`.

## Non-goals
No per-tool breakdown in the durable store (Datadog keeps the 15-day
detail). No retroactive history (Temper compacts its event log; history
accrues from now). No authorization decisions on `usr.id` — RUM stays
product analytics; the server-attested events remain the record.
