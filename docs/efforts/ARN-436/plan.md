# Plan: Server Datadog telemetry (ARN-436)
Spec: docs/efforts/ARN-436/spec.md

## What we are addressing
RUM cannot see server-route sign-ins or MCP tool calls. This plan is the
held-head close on `claude/datadog-tracking` / #269 after product FAILs
1–2 (MCP 401, members 401) were already closed: rewrite dead Decisions
(public RUM / open cron), add the effort chain + SDLC records, and make
cron bearer compare timing-safe.

## Approach
Keep telemetry sitting on master's connect-card (`required: true`). Emit
only through `DD_API_KEY`. Fail-close cron and intake. Guard every
`after()`. Stamp `@tier:full`. Abort hung intake. Skip `countMembers`
when fail-closed. Document secrets and post-ship `auth_login`. Do not merge.

## Steps
1. Core + wrapper + route wiring (already on the branch).
2. Contract suite in `test:auth` (already on the branch).
3. Timing-safe cron compare (`timingSafeEqual`).
4. `docs/efforts/ARN-436/{intent,spec,plan,decisions}.md`.
5. Rewrite PR #269 Decisions so they match the head (no RUM transport,
   cron 401 when secret unset). Strip the Greptile 3/5 dead-design body.
6. Address/close Greptile comments on this SHA.
7. Post planning/proof/review/decision-log records bound to the new head
   SHA only. Risk stays medium so the review gate cannot auto-merge.

## Files / surfaces touched
`ui/src/lib/server-telemetry-core.mjs`, `ui/src/lib/server-telemetry.ts`,
`ui/src/app/mcp/route.ts`, `ui/src/app/api/auth/google/callback/route.ts`,
`ui/src/app/api/telemetry/members/route.ts`, `ui/src/lib/oauth-as.ts`,
`ui/scripts/check-telemetry-contract.mjs`, `ui/vercel.json`,
`infra/datadog/`, `DEPLOYMENT.md`, `docs/efforts/ARN-436/`.

## Expected end state
Preview: `/mcp` 401 + WWW-Authenticate; members 401 without secret; no
public-RUM intake in code or copy. SDLC gates green on this SHA. Not
merged. Rei re-scores the new SHA only.
