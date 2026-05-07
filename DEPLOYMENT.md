# Deployment

How Katagami is hosted and served. No secrets in this file — env values, API tokens, and project/team IDs live only in Vercel, Cloudflare, and Railway dashboards (or 1Password).

## Architecture

```
Browser ──HTTPS──▶ Vercel (Next.js)  ──HTTPS + Bearer──▶  Railway (OpenPaw / Temper)
                   Server Components                       /tdata/{EntitySet}     ← reads/writes
                   Server Actions                          /tdata/.../KatagamiCommons.X
                   /api/file/[id] proxy                    /tdata/Files('..')/$value
                                                           Turso ← entities · R2 ← file blobs
                   DNS via Cloudflare (DNS-only, no proxy)
```

The frontend is the only thing on Vercel. The backend (entity store, agent runtime, file blobs) is the OpenPaw server on Railway, shared with other Temper apps.

## Frontend (Vercel)

- **Production:** https://katagami.ai
- **Apex + www:** `katagami.ai`, `www.katagami.ai`
- **Vercel project:** `katagami` under team `rita-agafonovas-projects`
- **Framework:** Next.js (App Router, Turbopack)
- **Root directory:** `ui/`
- **Auto-deploy:** push to `master` → production · PR/branch → public preview
- **Connected repo:** `arni-labs/katagami` (via Vercel GitHub App)
- **Deployment Protection:** off — production and preview URLs are publicly viewable

### Environment variables

Set in Vercel project settings (Production + Preview):

| Name | Public? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_TEMPER_API_URL` | yes | Public Railway URL of the OpenPaw backend |
| `NEXT_PUBLIC_TEMPER_TENANT` | yes | Tenant identifier passed as `X-Tenant-Id` |
| `TEMPER_API_KEY` | **server-only** | Bearer token for Railway. Read only by Server Components, Server Actions, and the file-proxy route handler. No `NEXT_PUBLIC_` prefix → never shipped to the browser bundle |
| `KATAGAMI_OWNER_SECRET` | **server-only** | Passphrase for `/owner`. When unlocked, Vercel sets an HTTP-only owner cookie that reveals delete controls and gates destructive Server Actions |

The browser never sees the Bearer token. All Temper calls go through Vercel-side code:
- Server Components in `ui/src/app/**/page.tsx` (e.g. the gallery, language detail, taxonomy, lineage, compare).
- Server Actions in `ui/src/app/actions.ts` (delete, add curator notes).
- File proxy at `ui/src/app/api/file/[id]/route.ts` — same-origin from the browser, server-side fetch with `Authorization` to Railway.

### Rotating the Temper API key

```sh
vercel env rm TEMPER_API_KEY production
vercel env rm TEMPER_API_KEY preview
echo "<new-token>" | vercel env add TEMPER_API_KEY production
echo "<new-token>" | vercel env add TEMPER_API_KEY preview
vercel --prod --yes      # redeploy from repo root to pick up
```

### Manual deploy

From the repo root:

```sh
vercel --prod --yes      # production
vercel --yes             # preview
```

## DNS (Cloudflare)

Zone `katagami.ai` is on Cloudflare. The registrar's nameservers point at Cloudflare's `dave.ns.cloudflare.com` / `lady.ns.cloudflare.com`. DNS records (orange cloud must stay **off** — Vercel issues its own Let's Encrypt cert; proxying through Cloudflare causes cert / 525 loops):

| Type | Name | Value | TTL | Proxy |
|---|---|---|---|---|
| A | `@` | `216.150.1.1` | 60 | DNS only |
| A | `@` | `216.150.16.1` | 60 | DNS only |
| CNAME | `www` | `aa05af15fecbf657.vercel-dns-016.com` | 60 | DNS only |

The two apex IPs are Vercel's load-balancer pool. The CNAME target encodes the project's TLS material — don't reuse it for other projects. Both are public (Vercel surfaces them in its domain config endpoint).

## Backend (Railway)

The frontend talks to a separate Railway project (OpenPaw/Temper server, shared infra). From Vercel's perspective:

- **URL:** `https://openpaw-production.up.railway.app`
- **Tenant:** `default`
- **OData prefix:** `/tdata/`
- **Auth:** `Authorization: Bearer <TEMPER_API_KEY>` + `X-Tenant-Id: default` on every request

Path quirks worth knowing:
- `GET /tdata` (no trailing slash) returns the entity-set listing — useful for sanity checks.
- `GET /tdata/<EntitySet>` is Cedar-governed; the principal behind `TEMPER_API_KEY` must be authorized.
- Writes (`POST <EntitySet>` / dispatching actions like `KatagamiCommons.Publish`) require both server-side auth and Cedar approval.

Backing services on Railway (configured at the Railway service level, not surfaced to the frontend):
- Turso libSQL — entity event store.
- Cloudflare R2 — file blob store (embodiment HTML, thumbnails).
- Modal — agent sandboxes.
- OpenAI Codex — curator agent LLM.
- Datadog + OTLP collector sidecar — observability.

## Open Graph / link previews

Hero image at `ui/public/og-hero.png` (3000×1200). Metadata configured in `ui/src/app/layout.tsx` with `metadataBase`, `openGraph`, and `twitter.summary_large_image`. Pasting `https://katagami.ai` in X / Notion / Slack / Discord renders the hero as a large card.

To force-refresh stale unfurls:
- X / Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/
- Facebook / Meta: https://developers.facebook.com/tools/debug/

## Migration tooling

`ui/scripts/migrate-to-railway.mjs` — one-shot script for moving entities from a local OpenPaw to Railway. Dry-run by default; pass `--apply` to execute. Reads source URL, target URL, and Bearer token from env vars (`LOCAL_URL`, `RAILWAY_URL`, `RAILWAY_TOKEN`, `TENANT`). Header at the top of the file documents the exact invocation.

## Useful URLs

- Production: https://katagami.ai
- Repo: https://github.com/arni-labs/katagami
- Vercel project (team: `rita-agafonovas-projects`): https://vercel.com/dashboard
- Cloudflare zone: https://dash.cloudflare.com/
- Railway project (`openpaw-seshendranalla`): https://railway.com/dashboard

## Observability

- Vercel runtime logs: `vercel logs <deployment-url>` or the Vercel dashboard.
- Railway service logs: `railway service logs --service openpaw` (after `railway link --project openpaw-seshendranalla`).
- Datadog has the deeper traces from the OpenPaw side; access lives on the Railway service env (not duplicated here).
