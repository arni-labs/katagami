# Deployment

How Katagami is hosted and served. No secrets in this file — env values, API tokens, and project/team IDs live only in Vercel, Cloudflare, and Railway dashboards (or 1Password).

## Architecture

```
Browser ──HTTPS──▶ Vercel (Next.js)  ──HTTPS + Bearer──▶  Railway (temperpaw / Temper)
                   Server Components                       /tdata/{EntitySet}     ← reads/writes
                   Server Actions                          /tdata/.../KatagamiCommons.X
                   /api/file/[id] proxy                    /tdata/Files('..')/$value
                                                           Turso ← entities · R2 ← file blobs
Browser ──HTTPS──▶ assets.katagami.ai (Cloudflare Worker) ─▶ R2 published prefixes
                   DNS via Cloudflare (DNS-only, no proxy)
```

The frontend is the only thing on Vercel. The backend (entity store, agent runtime, file blobs) is the temperpaw server on Railway, shared with other Temper apps.

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
| `NEXT_PUBLIC_TEMPER_API_URL` | yes | Public Railway URL of the temperpaw backend |
| `NEXT_PUBLIC_TEMPER_TENANT` | yes | Tenant identifier passed as `X-Tenant-Id` |
| `TEMPER_API_KEY` | **server-only** | Bearer token for Railway. Read only by Server Components, Server Actions, and the file-proxy route handler. No `NEXT_PUBLIC_` prefix → never shipped to the browser bundle |
| `KATAGAMI_OWNER_SUBS` | **server-only** | Comma-separated allowlist of Google subject ids whose signed-in accounts get owner access (`/owner`, delete controls, destructive Server Actions). Replaced the `KATAGAMI_OWNER_SECRET` passphrase — owner mode now follows identity. Find a sub on any attributed Remix (`creator_sub`) |
| `GOOGLE_CLIENT_ID` | **server-only** | OAuth 2.0 client id for human "Sign in with Google" (`/signin`). Authorized redirect URIs: `https://katagami.ai/api/auth/google/callback` and `http://localhost:3000/api/auth/google/callback` |
| `GOOGLE_CLIENT_SECRET` | **server-only** | OAuth 2.0 client secret paired with `GOOGLE_CLIENT_ID` |
| `KATAGAMI_AUTH_SECRET` | **server-only** | HS256 secret signing the human session cookie (`katagami_user`). Generate with `openssl rand -base64 32`. Unset ⇒ sign-in is off and `/signin` says so; there is no fallback secret |

The browser never sees the Bearer token. All Temper calls go through Vercel-side code:
- Server Components in `ui/src/app/**/page.tsx` (e.g. the gallery, language detail, taxonomy, lineage, compare).
- Server Actions in `ui/src/app/actions.ts` (delete, add curator notes).
- File proxy at `ui/src/app/api/file/[id]/route.ts` — same-origin from the browser, server-side fetch with `Authorization` to Railway.

Published thumbnails, embodiments, and `DESIGN.md` exports should prefer immutable `*_asset_url` fields when present. Those URLs are produced by Temper's generic `POST /api/files/publish-artifact` flow and served from `https://assets.katagami.ai/<content-addressed-key>` through the Cloudflare Worker in `infra/cloudflare/katagami-assets-worker`. The Worker only exposes allow-listed published prefixes from R2; raw PowerFS file paths remain private and governed.

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
| Worker route | `assets` | `katagami-assets` → R2 published prefixes | Cloudflare | Proxied |

The two apex IPs are Vercel's load-balancer pool. The CNAME target encodes the project's TLS material — don't reuse it for other projects. Both are public (Vercel surfaces them in its domain config endpoint).

## Backend (Railway)

The frontend talks to a separate Railway project (temperpaw/Temper server, shared infra). From Vercel's perspective:

- **URL:** `https://temperpaw-production.up.railway.app`
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

`ui/scripts/migrate-to-railway.mjs` — one-shot script for moving entities from a local temperpaw/Temper server to Railway. Dry-run by default; pass `--apply` to execute. Reads source URL, target URL, and Bearer token from env vars (`LOCAL_URL`, `RAILWAY_URL`, `RAILWAY_TOKEN`, `TENANT`). Header at the top of the file documents the exact invocation.

## Useful URLs

- Production: https://katagami.ai
- Repo: https://github.com/arni-labs/katagami
- Vercel project (team: `rita-agafonovas-projects`): https://vercel.com/dashboard
- Cloudflare zone: https://dash.cloudflare.com/
- Railway project (`temperpaw-seshendranalla`): https://railway.com/dashboard

## Observability

- Vercel runtime logs: `vercel logs <deployment-url>` or the Vercel dashboard.
- Railway service logs: `railway service logs --service temperpaw` (after `railway link --project temperpaw-seshendranalla`).
- Datadog has the deeper traces from the temperpaw side; access lives on the Railway service env (not duplicated here).
