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
  - `search` — search terms (truncated to 100 chars) + result counts.
  - `compare`, `nav_click` — compare-tray selections and primary-nav clicks.
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
   dashboard JSON** → paste `katagami-rum-dashboard.json`.

## Facet calibration (custom-action widgets only)

The dashboard's session/view widgets (unique visits, page views, top languages,
top pages) are facet-independent and work immediately. The copy/download/search
widgets read custom-action facets `@action.target.name` and `@context.<key>`
(e.g. `@context.artifact`, `@context.file`, `@context.source`). If your org
surfaces `addAction` context under a different prefix, adjust those few widgets
once real data lands — confirm in RUM Explorer by inspecting one custom action
event.

## Known gap: server-route downloads

The human-facing download buttons are tracked. Direct, programmatic GETs of the
server artifact routes (`/language/<id>/DESIGN.md`, `/shadcn.json`, …) — mostly
agents fetching specs — are **not** RUM-visible, since they aren't browser
interactions. If we want those counted too, add a log line in each `route.ts`
and a Vercel→Datadog log drain (or count them from Vercel/edge logs). Tracked as
a follow-up, not part of this change.
