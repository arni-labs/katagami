---
name: verify-katagami
description: Drive and prove Katagami the way a visitor or contributor does - bring up the local Temper server plus the Next.js gallery, check health, exercise the gallery and export routes over HTTP, capture evidence. Use for "verify katagami", the verification step of any katagami change, or before calling katagami work done.
---

# Verify Katagami

Katagami's user-facing surface is the gallery at katagami.ai (a Next.js app in `ui/`) reading two Temper apps, `katagami-commons` and `katagami-curation`, over OData. Contributors reach the same data through the MCP server in `mcp/` and the `katagami` CLI. This skill proves behavior on a locally running stack. Production verification (Vercel, Railway, Genesis pinned refs, Datadog) is the Definition of Done's separate step.

## Launch

One command brings up the whole stack:

```bash
PORT=3499 UI_PORT=3500 TEMPER_REPO="$HOME/Development/temper" \
  bash scripts/run-local.sh
```

It stops anything on those two ports, starts a detached `temper serve` on `$PORT` against a fresh turso file at `/tmp/katagami-remix-local-$PORT.db`, registers the temper-fs File specs and then the commons specs through `POST /api/specs/load-dir`, waits out the verification cascade, seeds sample palettes / art styles / languages, writes `ui/.env.local`, and starts `next dev` on `$UI_PORT`. It ends with `==> ready` and the URLs.

Prerequisites: `temper` on PATH (build it from a temper checkout with `cargo build -p temper-cli` and symlink `target/debug/temper` into `~/.cargo/bin`), a temper checkout for the temper-fs specs (`TEMPER_REPO`, defaulting to a sibling directory named `temper`), and `npm install` already run in `ui/`.

**Always set `PORT` and `UI_PORT`.** The defaults are 3467 and 3000, which other sessions on this machine use, and `--stop` kills whatever owns the ports it is given. Pick a free pair in the 3499 and up range.

Both servers are detached into their own session, so they outlive the shell that started them. Logs are `/tmp/katagami-temper-$PORT.log` and `/tmp/katagami-ui-$UI_PORT.log`.

**Known break:** the seed step currently fails. See the "Known break" section in `features/local-stack.md` before you spend time on it: the stack itself comes up correctly, but no content reaches Published, so drives that need seeded content are blocked.

## Doctor

Two read-only checks before driving anything:

```bash
curl -s -H "X-Tenant-Id: default" -H "Authorization: Bearer test-local-key" \
  "http://localhost:$PORT/tdata" | head -c 400        # entity sets listed
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:$UI_PORT/"   # 200
```

`GET /tdata` with no trailing slash returns the entity-set listing, which is the cheapest way to tell whether the commons specs actually registered. If `DesignLanguages` is missing, the load-dir step did not finish: read `/tmp/katagami-temper-$PORT.log` before driving anything. A `423 VerificationRequired` on any create means the L0 to L3 cascade is still running, so wait rather than retry harder. Run Doctor again after any failed drive.

## Drive

- **Temper OData** on `$PORT`, with `Authorization: Bearer test-local-key` and `X-Tenant-Id: default` (the values `run-local.sh` sets). Reads are `GET /tdata/<EntitySet>`; actions are `POST /tdata/<Set>('<id>')/KatagamiCommons.<Action>` or `KatagamiCuration.<Action>`. After any action, **read the entity back and check the state moved** - a 200 on dispatch is not proof the machine transitioned.
- **Gallery** on `$UI_PORT`: plain HTTP GETs against the routes in `features/`. Server Components hold the bearer token, so the browser side needs no auth.
- **Exports**: `GET /language/<id>/DESIGN.md` and the sibling export routes.
- **CLI and MCP**: `cd cli && npm run build`, then `KATAGAMI_MCP_URL=http://localhost:$UI_PORT node dist/cli.js <command>`. Read tools work against the local stack; writes do not, see below.
- **Anything visual is verified in a browser, not by status code.** A 200 says the route rendered. Whether it honors the design contract in AGENTS.md and `ui/DESIGN.md` is a judgment made by looking at the page.

What cannot be driven locally, and the concrete prerequisite for each:

| Surface | Prerequisite |
|---|---|
| Signed-in writes, owner and curator actions, `/account`, `/oauth/authorize` | `KATAGAMI_AS_PRIVATE_KEY` (ES256 PKCS#8) plus its JWKS registered with the kernel as a TrustedIssuer, and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `KATAGAMI_AUTH_SECRET` |
| A real curation run past job creation | the temperpaw agent runtime, Modal sandboxes, and an LLM provider |
| Semantic search, taste vectors | `infra/style-embed-service` running and vectors backfilled |
| Published `*_asset_url` thumbnails and embodiments | assets.katagami.ai, so a deployed environment |
| Genesis publish and install | `GENESIS_TOKEN` and a target temperpaw server |

Mark these verified-unreachable with the prerequisite. Do not fake them, and do not substitute a mock for a boundary the production path does not mock.

## Evidence

- Save responses, rendered HTML, screenshots, and the relevant log excerpts under `/tmp/verify-katagami/<date>/`, and reference the files in the report or the `.proofs/` entry.
- Prove the real path: entity state read back over OData, not just HTTP 200s. Check side effects (entities created, files written, the export artifact stored) alongside what is visible.
- For any change a visitor can see, the evidence includes the rendered page, before and after.
- The contract suites are a cross-check, not the proof: `cd ui && npm test` and `cd katagami-curation && make test-integration` tell you the contracts still hold, and say nothing about whether the running app works.
- Evidence survives cleanup. Teardown stops servers; it never deletes `/tmp/verify-katagami/`.

## Cleanup

```bash
PORT=3499 UI_PORT=3500 bash scripts/run-local.sh --stop
```

That kills whatever owns the two ports you launched on, which is why the ports must be yours. Never kill by process name: other agents run `temper serve` and `next dev` on this machine. The scratch database at `/tmp/katagami-remix-local-$PORT.db` and `ui/.env.local` can be left; both are regenerated on the next run and `ui/.env.local` is gitignored.

## Feature map

`features/` has the surface enumeration, one file per mapped feature, and an explicit "Not yet mapped" list. Each file says how to reach the feature, how to drive it, what proves it, and what bites. A proof that drives one convenient entry point is incomplete when the map lists others.
