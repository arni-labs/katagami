# Local stack and health

## Sub-features
`temper serve` with the katagami-commons specs registered, the temper-fs File specs alongside them, seeded palettes / art styles / languages, and the Next.js gallery pointed at that server.

## How to get to it (user POV)
Nobody "uses" this, but every other feature runs on top of it. It is the first thing to check when a drive misbehaves.

## Driving it
`PORT=3499 UI_PORT=3500 TEMPER_REPO=<temper checkout> bash scripts/run-local.sh` from the repo root. Then:

```bash
curl -s -H "X-Tenant-Id: default" -H "Authorization: Bearer test-local-key" \
  http://localhost:3499/tdata | head -c 400
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3500/
```

## What proves it
`GET /tdata` lists the entity sets and the katagami ones are in it (`DesignLanguages`, `PaletteSystems`, `ArtStyles`, `Files`). The gallery root answers 200. The run log ends with `==> ready` and the seed step printed `=== Seed complete ===`, which means the L0 to L3 verification cascade finished; before it does, creates come back `423 VerificationRequired`.

## Known break (found 2026-08-26, still open)

`run-local.sh` gets as far as seeding and then fails. Every lane's `SubmitForReview` is refused from `Draft`:

```
409 ActionFailed: Action 'SubmitForReview' not valid from state 'Draft'
```

for `DesignLanguage`, `PaletteSystem`, and `ArtStyle` alike, with every declared boolean guard reading true on the entity and every referenced File in `Ready`. The one thing all three guards share is a `cross_entity_state` guard on `entity_type = "File"`. `DesignLanguage` additionally logs

```
cross-entity lookup budget exhausted (4)
```

and its `SubmitForReview` declares nine `cross_entity_state` lookups against a kernel budget of four, so that transition is unreachable on this temper build no matter what the entity holds.

Consequence: the stack comes up, the entity sets register, and the gallery renders, but there is no Published content locally. Anything that needs seeded content is blocked until this is fixed on the Temper side. Do not "fix" it by weakening the guards; they are the governance.

## Gotchas
Spec loading is `POST /api/specs/load-dir`, not the `--specs-dir` / `--app` flags: those verify specs but do not expose their OData entity sets. The second load passes `"merge": true` because load-dir replaces the tenant registry by default. The cascade takes minutes on a debug `temper` build, and the seed step retries around it for up to 30 minutes. `PORT` and `UI_PORT` are overridable and `--stop` only touches the two ports it is given, so pick free ones rather than the 3467/3000 defaults when anything else is running.
