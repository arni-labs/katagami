# Sign-in and the telemetry that watches it

## Sub-features
The Google sign-in round trip (`/api/auth/google/start` → Google → `/api/auth/google/callback` → session cookie), the session read at `/api/auth/me`, and the observability layer that reports on both: server events through `ui/src/lib/server-telemetry.ts` to the Datadog Logs intake, browser RUM through `ui/src/lib/analytics.ts`, and the durable per-member rollup in `ui/src/lib/member-activity.ts`.

The alerting set that reads these events lives in `infra/datadog/monitors/`. A monitor is only as true as the event it counts, so a change to either side is a change to both.

## How to get to it (user POV)
Someone clicks "Sign in" on katagami.ai, picks a Google account, and comes back signed in. Rita finds out from Datadog when that stops working for people.

## Driving it
The full round trip needs Google, so drive the halves you can and read the events:

```bash
# the forgery guard: a cookieless hit must stay silent, ours must not
curl -s -o /dev/null "http://localhost:3012/api/auth/google/callback?error=server_error"
curl -s -o /dev/null -H "Cookie: katagami_oauth_state=abc123" \
  "http://localhost:3012/api/auth/google/callback?error=server_error"
# start hands out the cookie
curl -s -D- -o /dev/null "http://localhost:3012/api/auth/google/start" | grep -i set-cookie
```

Then wait about a minute and read Datadog for `service:katagami-server @evt:auth_login_failed`, checking BOTH `env:local-verify` (where a local run must land) and `env:production` (where it must not appear).

For RUM, load any page in a real browser and check whether the SDK started and under which env.

## What proves it
The cookieless callback emits nothing; the same request carrying our own state cookie emits `reason:provider`. Nothing from a local run appears under `env:production` — the env tag requires `VERCEL_REGION`, which only a real Vercel invocation sets. RUM does not start at all on localhost, and on any non-katagami.ai host it tags `preview`, so a phone on the LAN or a preview deployment cannot page anyone through the site-errors monitor.

For a monitor change, the proof is an event you actually caused arriving with the attributes the monitor's query filters on. A query that matches nothing is indistinguishable from a system with no problems.

## Gotchas
`reason: "consent"` means the person declined; a Google outage is `reason: "provider"`, and the sign-in alert excludes only the former. Google also returns `access_denied` when a Workspace admin blocks the app, so an admin block files as a decline and the alert cannot see it — a known blind spot, not a bug to rediscover.

`reason: "state"` is deliberately ungated and therefore mintable by anyone with curl, because a missing cookie IS the failure that reason reports. `provider` needs our httpOnly cookie, which raises the cost from one request to two (`start` is unauthenticated) but does not make it unforgeable.

Events are emitted in an `after()` task, so a call followed immediately by killing the server loses its event. Never conclude "no event" without waiting.
