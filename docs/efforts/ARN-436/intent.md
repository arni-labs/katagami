# Intent: Server-side Datadog telemetry for sign-ins and MCP usage
Author: Rita Agafonova (owner). Status: accepted. Linear: ARN-436.

## Problem
RUM only sees the browser. Sign-ins, the registered-members count, and every
MCP tool call at katagami.ai/mcp happen in Vercel server routes and emitted
nothing. There was no way to see registrations, logins, or catalog-MCP usage
in Datadog.

## Proposed outcome
Server routes emit `service:katagami-server` logs for MCP tool calls, Google
sign-in outcomes, and a daily members snapshot. Transport is the official
Logs intake authenticated with a server-only `DD_API_KEY` (no public-RUM
fallback). Unset key → fail closed. The members cron is fail-closed without
`CRON_SECRET`. Hash + emit run only inside a guarded `after()` so telemetry
cannot 500 an MCP tool or skip the Google session cookie. Gallery `/mcp`
stays `required: true` (401 + WWW-Authenticate); this effort sits on top of
ARN-360 / #268 and must not reopen anonymous initialize.

## Affected users and systems
Vercel gallery (`ui/`) server routes: `/mcp`, `/api/auth/google/callback`,
`/api/telemetry/members`. Datadog dashboard `2ki-8vx-p5u` (Accounts + MCP
usage groups). Log-based metrics `katagami.mcp.tool_calls`,
`katagami.auth.logins`, `katagami.members.total`. Rita/Howl set secrets in
Vercel; this repo does not invent them.

## Constraints
Do not undo #268: `required: true`, `SCOPE_READ`, contribute tokens stay off
gallery `/mcp`. Do not invent `CRON_SECRET`, `DD_API_KEY`, or
`KATAGAMI_TELEMETRY_PEPPER` in git. Do not publish Galley. Do not spend.
Do not fake a production Google `auth_login` e2e. Do not merge until Rei
re-scores the head.

## Open questions
None remaining for this head. Production `auth_login` e2e is a post-ship
verify (cannot complete a real Google exchange from this agent). Secrets
are a Howl/Rita Vercel step before merge, documented only.
