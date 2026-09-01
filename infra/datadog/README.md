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

**Transport.** Server events use the official Logs intake
(`http-intake.logs.datadoghq.com`) authenticated with a server-only
`DD_API_KEY` — and nothing else. There is **no public-RUM fallback and no
"reuse the RUM client token" path**: a browser token must not authenticate
`env:production service:katagami-server` (anyone who can read the bundle
could forge those events). Unset `DD_API_KEY` → fail closed (no emit;
the members cron reports `emitted:false`). **Status: `DD_API_KEY` is SET
in Vercel Production and Preview (minted 2026-08, transport verified live:
`/api/v1/validate` 200, intake POST 202, probe log indexed).** Hash + emit
run only inside a guarded `after()` so a telemetry throw cannot 500 an MCP
tool or skip the Google session cookie. `env:` is `production` on the
production deploy, `preview` on previews, `local-verify` elsewhere; every
dashboard query scopes to `env:production`.

**Privacy.** Google subs travel only as an HMAC truncated to 16 hex
(`@user_hash`) when `KATAGAMI_TELEMETRY_PEPPER` is set; unset pepper omits
`user_hash` rather than falling back to a repo string. Attributes ship on a
**per-event allow-list** (`EVENT_ATTRS` in
`ui/src/lib/server-telemetry-core.mjs`): a key a call site did not declare
never reaches Datadog, whatever it is named — the earlier deny-list passed
natural identity keys like `user_name` and `caller_sub`. Values are bounded
too (primitives only, strings capped), and Datadog routing keys (`status`,
`service`, `ddtags`, `message`, `hostname`, …) can never be overridden by an
attribute. Enforced by `scripts/check-telemetry-contract.mjs`, which runs in
`npm test` **and** `prebuild` (so a violation cannot build, locally or on
Vercel).

**Events** (all under `service:katagami-server`, filter with `@evt:<name>`):

| `@evt` | Fired by | Attributes |
| --- | --- | --- |
| `mcp_tool_call` | every **tool** call at `/mcp` — two layers: the patched `registerTool` tracks every registered handler, and a patched `tools/call` request handler additionally catches calls the SDK rejects *before* the handler runs (zod `inputSchema` failures → `@error_kind:invalid_arguments`, unknown tools) so a malformed client is an error spike, not silence | `@tool`, `@tier` (`full` only — `/mcp` requires a bearer), `@outcome` (success/error/exception), `@duration_ms`, `@user_hash`, `@error_kind` (`invalid_arguments`, `tool_budget_exceeded`, exception names) |
| `mcp_auth_challenge` | every 401 on `/mcp` (initialize included) | `@has_auth` (false = fresh client meeting the connect card — anonymous demand; true = rejected/expired token — possibly a broken OAuth flow), `@method` |
| `auth_login` | every successful Google sign-in (`api/auth/google/callback`) | `@registration` (true = first sign-in of this account), `@upsert_ok`, `@user_hash` |
| `auth_login_failed` | failed sign-in — only when a real handshake came back (bare scanner GETs with no `code`/`error` param emit nothing) | `@reason`: `state` (handshake broke), `google` (Google exchange failed), `session` (Google OK, we could not mint the session), `consent` (Google redirected with an explicit error) |
| `members_snapshot` | the daily Vercel cron → `/api/telemetry/members` (`@source:cron`) and best-effort after each sign-in (`@source:login`) | `@members_total`, `@source`. This is the ONLY carrier of `@members_total`; a missing `@odata.count` from Temper throws instead of shipping a fake 0, and the dashboard tile shows N/A (no `default_zero`) so absence looks like absence |

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
  `katagami.members.total` (distribution, env). `@tier` is always `full`
  on `/mcp` (required bearer); the old "auth tier" tile is now the
  auth-challenge (401) view, since anonymous demand shows up there, not
  in a tier split. Logs age out with index retention (~15 days); these
  metrics keep 15 months, counting from 2026-08-29 onward.

## Per-user activity (ARN-451): who browsed, who called, and for how long

Three layers join on one identifier — the peppered `user_hash`
(HMAC-SHA256 of the Google sub with `KATAGAMI_TELEMETRY_PEPPER`, truncated to
16 hex; computed only server-side, the raw sub never leaves the server):

1. **Browsing (RUM).** After sign-in, `/api/auth/me` hands the browser the
   hash (and only the hash) and `RumInit` calls `datadogRum.setUser({ id })`,
   so every RUM view/copy/download/search carries `@usr.id = user_hash` —
   joinable to the server events' `@user_hash`. Signed-out page loads call
   `clearUser()`, so the page load right after sign-out stops attributing.
   Caveat: `@usr.id` is client-attached and therefore client-spoofable, like
   all RUM data (the RUM client token is public). It is product analytics,
   not authorization; the server-attested record is the log events.
2. **Identity (Temper).** Every sign-in's `Members.Register` upsert now also
   stores `user_hash` on the Member row (backfilled for pre-existing
   members). Map a hash to a person:
   `GET /tdata/Members?$filter=user_hash eq '<hash>'` → sub, email,
   display_name.
3. **Durable history (Temper).** Log indexes age out in ~15 days, so per-user
   history is ALSO accrued at event time into `MemberActivityDays` — one row
   per (user_hash, UTC day) with `logins`, `mcp_calls`, `mcp_errors`
   counters (kernel-side increments, race-free). This layer is independent
   of `DD_API_KEY` on purpose: it must survive Datadog being down. It is the
   deliberate alternative to a `user_hash`-tagged Datadog metric, which
   would explode tag cardinality.
   `GET /tdata/MemberActivityDays?$filter=user_hash eq '<hash>'&$orderby=day desc`
   (paginate `@odata.nextLink`).

**Where to look, per question:**

- *"What did signed-in people browse / copy / download?"* → dashboard
  `2ki-8vx-p5u`, group **"Who did what — per-user activity"** (RUM tiles keyed
  on `@usr.id`), or RUM Explorer with `@usr.id:<hash>`.
- *"Which of my users is this hash?"* → Temper:
  `/tdata/Members?$filter=user_hash eq '<hash>'`.
- *"What has this user done over months?"* → Temper:
  `/tdata/MemberActivityDays?$filter=user_hash eq '<hash>'` (per-day logins /
  MCP calls / errors, no retention limit). The dashboard's per-user log tiles
  show the same signals for the recent window only.

**Vercel secrets** (do not invent values in the repo):

- `DD_API_KEY` — **set** in Production and Preview; server telemetry fails
  closed without it. The members cron reports actual delivery
  (`emitted:true` only when Datadog accepted the event), so a revoked key
  shows up as `emitted:false`, never green.
- `CRON_SECRET` — Vercel cron sends `Authorization: Bearer <CRON_SECRET>`
  to `/api/telemetry/members`. Unset → 401 forever, no `members_total`
  leak. **Set** in Production + Preview (minted 2026-09-01, ARN-451 — it was
  missing, so the daily cron had been 401ing since it shipped).
- `KATAGAMI_TELEMETRY_PEPPER` — optional for emit, required for
  `@user_hash` (and therefore for the whole per-user layer above). **Set**
  in Production + Preview (minted 2026-09-01, ARN-451 — it was missing, so
  no production event carried a `user_hash` before then). Rotating it
  re-keys every hash; Member rows self-heal on next sign-in, but old
  `MemberActivityDays` rows stay under the old hash.

A production Google `auth_login` has not been verified end-to-end on this
PR (cannot complete a real Google exchange from this agent). Components
are covered; the live sign-in event is a follow-up on a shipped deploy.
