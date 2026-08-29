# Katagami visitor & usage analytics (Datadog RUM)

This is how we see what's getting traction on katagami.ai: unique visits, page
views, which languages get viewed and clicked, and which artifacts get copied and
downloaded. It's powered by Datadog RUM (Real User Monitoring) wired into the
Next.js app in `ui/`.

Tracking starts the day credentials go live — there is **no historical backfill**.

## What's instrumented

- **Unique visits & page views** — automatic. The RUM SDK tracks a session per
  visitor and a view per route, so every `/language/<id>` visit is captured with
  no per-page code. This is the primary signal for language/page traction.
- **Custom events** (`ui/src/lib/analytics.ts`), fired from shared components so
  coverage is generic, not per-button:
  - `language_click` — clicks into a language, with `source` (card, related,
    lineage, taxonomy, search) for attribution.
  - `copy` — copy-to-clipboard, with `artifact` (design_md, shadcn_md, katagami,
    link, color, tokens_css, recipe, prompt, remix_brief, …).
  - `download` — DESIGN.md / shadcn / css downloads, with `file` + `format`.
  - `language_view` — a language DETAIL page was viewed, carrying the readable
    `language_name` + `language_id` (+ `slug`). The automatic page view only
    knows the id from the URL; this adds the name so languages can be ranked by
    name and deduped to unique visitors.
  - `search` — search terms (truncated to 100 chars) + result counts.
  - `compare`, `nav_click` — compare-tray selections and primary-nav clicks.
  - `copy` and `download` now also carry `language_name` (alongside
    `language_id`) so copies/downloads can be attributed to a named language.
- Everything else (filters, tabs, shuffle, etc.) is still captured by RUM's
  automatic interaction tracking (`trackUserInteractions`), so the long tail is
  covered without bespoke code.

No PII: `defaultPrivacyLevel: mask-user-input`, no session replay.

## Going live — three steps

1. **Create the RUM application** (one time): Datadog → Digital Experience → RUM
   → **New Application** → JavaScript. Copy the generated `applicationId` and
   `clientToken`. (This can't be done from the MCP/API tools we have; it's a
   couple of clicks, or use the Datadog API with an App key.)

2. **Set env vars in Vercel** (the app is deployed on Vercel, project `katagami`)
   → Settings → Environment Variables, then redeploy:

   | Variable | Required | Default |
   | --- | --- | --- |
   | `NEXT_PUBLIC_DD_RUM_APPLICATION_ID` | yes | — |
   | `NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN` | yes | — |
   | `NEXT_PUBLIC_DD_RUM_SITE` | no | `datadoghq.com` |
   | `NEXT_PUBLIC_DD_RUM_SERVICE` | no | `katagami-web` |
   | `NEXT_PUBLIC_DD_RUM_ENV` | no | `production` |
   | `NEXT_PUBLIC_DD_RUM_SAMPLE_RATE` | no | `100` |

   These are `NEXT_PUBLIC_*`, so they're inlined at **build time** — redeploy
   after setting them. Without them the analytics layer is a complete no-op, so
   local dev and previews are unaffected.

3. **Import the dashboard**: Datadog → Dashboards → New Dashboard → **Import
   dashboard JSON** → paste `katagami-rum-dashboard.json`. Every query is scoped
   to `env:production` (literal) so `env:local-verify` test events are excluded.
   The top row leads with a **Unique visitors** tile
   (`CARDINALITY(@usr.anonymous_id)`); the "Languages & engagement" group ranks
   languages by **unique visitors** — page views and most-clicked group by
   readable `@context.language_name` (from the `language_view` / `language_click`
   events, post-deploy only, no backfill). A **take-it clicks** tile ranks
   languages by the take-it actions on their page (copy / download / link /
   tokens / DESIGN.md / with shadcn); those are auto-captured button clicks that
   carry the page URL but not the name, so it keys on `@view.url_path` (id) to
   capture the full volume — historical included. Each language row links through
   to katagami.ai, and the group also lists the buttons clicked on language pages.

## Facets (confirmed against live data)

Verified end-to-end against the real RUM app on 2026-06-23 by emitting events
and querying them back:

- Custom action name → `@action.target.name` (e.g. `language_click`, `copy`,
  `download`, `nav_click`, `search`), with `@action.type:custom`.
- Custom attributes → `@context.<key>`: `@context.source`, `@context.artifact`,
  `@context.file`, `@context.query`, `@context.language_name`, `@context.language_id`.
- Sessions/views are standard RUM facets (`@type`, `@view.url_path`, `@geo.country`,
  `@device.type`, `@session.referrer`).
- Each event also carries `@usr.anonymous_id`, so unique *visitors* (not just
  sessions) are counted with `CARDINALITY(@usr.anonymous_id)` — surfaced as the
  "Unique visitors" tile.

The dashboard JSON already uses these exact facets — no calibration needed.

> Note: a handful of `env:local-verify` test events were emitted during
> verification. Filter them out (or scope the dashboard to `env:production`)
> once real traffic flows.

## Known gap: server-route downloads

The human-facing download buttons are tracked. Direct, programmatic GETs of the
server artifact routes (`/language/<id>/DESIGN.md`, `/shadcn.json`, …) — mostly
agents fetching specs — are **not** RUM-visible, since they aren't browser
interactions. If we want those counted too, add a log line in each `route.ts`
and a Vercel→Datadog log drain (or count them from Vercel/edge logs). Tracked as
a follow-up, not part of this change.

## Server-side telemetry: sign-ins, registered users, MCP usage (ARN-436)

RUM only sees the browser. The signals that live in server routes — sign-ins,
the registered-user count, and every MCP tool call at katagami.ai/mcp — are
emitted from the Vercel routes as **Datadog logs** with
`service:katagami-server`, via `ui/src/lib/server-telemetry.ts`.

**Transport.** Prefer a server-only `DD_API_KEY` on the official Logs
intake (`http-intake.logs.datadoghq.com`) as the `DD-API-KEY` header. When
that key is unset, fall back to the public RUM client token on
`browser-http-intake.logs` as a **query param** — never as `DD-API-KEY`
(that header is the secret API-key slot; putting the browser token there
is spoofable). Events ride `next/server`'s `after()`, so they never delay
a response and still complete before the function freezes. `env:` is
`production` on the production deploy, `preview` on previews,
`local-verify` elsewhere; every dashboard query scopes to `env:production`.
A preview that has neither `DD_API_KEY` nor `NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN`
in that environment reports `emitted: false` — enable one of those vars on
Preview if you want the probe to light up.

**Privacy.** Google subs travel only as a peppered HMAC truncated to 16 hex
(`@user_hash`); emails, names, and bearer tokens never reach Datadog —
identity-shaped attribute keys (exact names and common variants) are
stripped at emit time, enforced by `scripts/check-telemetry-contract.mjs`.

**Events** (all under `service:katagami-server`, filter with `@evt:<name>`):

| `@evt` | Fired by | Attributes |
| --- | --- | --- |
| `mcp_tool_call` | every tool call at `/mcp` (auto-instrumented via the patched `registerTool` in `ui/src/app/mcp/route.ts`) | `@tool`, `@tier` (sample/full), `@outcome` (success/error/exception), `@duration_ms`, `@user_hash` (full tier) |
| `auth_login` | every successful Google sign-in (`api/auth/google/callback`) | `@registration` (true = first sign-in of this account), `@user_hash`, `@members_total` |
| `auth_login_failed` | failed sign-in (state mismatch / Google exchange) | `@reason` |
| `members_snapshot` | daily Vercel cron → `/api/telemetry/members` (see `ui/vercel.json`) | `@members_total` |

**Registered users — source of truth.** The Temper `Members` entity set
(created by `upsertMember` at sign-in). "Registered" = `has_identity eq true`,
which excludes the placeholder rows Temper auto-creates when an action is
dispatched on a missing id. `countMembers()` in `ui/src/lib/oauth-as.ts` is the
one counting function; the cron keeps the dashboard tile fresh on days with no
sign-ins.

**Where to look.**

- Dashboard `2ki-8vx-p5u` — groups **"Accounts — registered users & sign-ins"**
  and **"MCP usage — katagami.ai/mcp"**, next to the existing RUM groups.
- Logs Explorer — `service:katagami-server env:production`.
- Long-term history: log-based metrics `katagami.mcp.tool_calls`
  (tags: env/tool/tier/outcome), `katagami.auth.logins` (env/registration),
  `katagami.members.total` (distribution, env). Logs age out with index
  retention (~15 days); these metrics keep 15 months, counting from
  2026-08-29 onward.

**`CRON_SECRET` is required before this route exists on master.** Vercel
cron sends `Authorization: Bearer <CRON_SECRET>` to
`/api/telemetry/members`. Unset secret, missing bearer, or a wrong bearer
→ 401 with no `members_total`. Howl/Rita set the secret in Vercel
(Production; Preview too if that URL is reachable). Do not invent a value
in the repo. A real `DD_API_KEY` is optional; without it the RUM-token
browser intake still emits, and adding an API key later unlocks the
official logs path (and, later, direct metric submission).
