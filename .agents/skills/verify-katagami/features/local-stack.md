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
`GET /tdata` lists the entity sets and the katagami ones are in it (`DesignLanguages`, `PaletteSystems`, `ArtStyles`, `Files`). The gallery root answers 200. The run log ends with `==> ready` only after that gallery GET succeeded, `ui/.env.$PORT.local` exists (and `ui/.env.local` does after a single stack), and Next is listening on `$UI_PORT`. `==> ready` means launch finished and the UI accepted a connection, not that seed published. If seed reached Published it also printed `=== Seed complete ===`. If it hit the recorded `SubmitForReview` Draft 409 it printed `=== Seed incomplete: SubmitForReview refused from Draft (known break) ===` and Launch continued. Before the L0 to L3 cascade finishes, creates come back `423 VerificationRequired` and Launch retries.

## Known break (found 2026-08-26, still open)

Every lane's `SubmitForReview` is refused from `Draft`:

```
409 ActionFailed: Action 'SubmitForReview' not valid from state 'Draft'
```

for `DesignLanguage`, `PaletteSystem`, and `ArtStyle` alike, with every declared boolean guard reading true on the entity and every referenced File in `Ready`. The one thing all three guards share is a `cross_entity_state` guard on `entity_type = "File"`. ArtStyle and PaletteSystem each declare one File lookup, so leftover launch failures that die on the first ArtStyle `SubmitForReview` are this refusal, not the lookup budget. `DesignLanguage` additionally logs

```
cross-entity lookup budget exhausted (4)
```

and its `SubmitForReview` declares nine `cross_entity_state` lookups against a kernel budget of four, so that transition is unreachable on this temper build no matter what the entity holds.

Consequence: Launch still reaches `==> ready`, writes the stack env, and starts Next. Seed leaves entities in Draft; nothing is Published locally. Anything that needs seeded Published content is blocked until this is fixed on the Temper side. Do not "fix" it by weakening the guards; they are the governance. `run-local.sh` must not exit 1 on this 409 — that was the launch leftover, and it hid the rest of the stack. A later `SubmitForReview` 409 that is not the Draft refusal (a missing guard, a policy denial) is still a seed failure even when the Draft 409 also appeared in the same run; Launch must not classify that mixed pair as the known break and must not print `==> ready`.

## Gotchas
Spec loading is `POST /api/specs/load-dir`, not the `--specs-dir` / `--app` flags: those verify specs but do not expose their OData entity sets. The second load passes `"merge": true` because load-dir replaces the tenant registry by default. The cascade takes minutes on a debug `temper` build, and the seed step retries around it for up to 30 minutes. `PORT` and `UI_PORT` are overridable and `--stop` only touches the two ports it is given (launcher pidfiles plus LISTEN-ers, never `pkill` by name), so pick free ones rather than the 3467/3000 defaults when anything else is running. Each stack writes `ui/.env.$PORT.local` and binds Next to that URL in the process environment so a second PORT cannot retarget the first UI.
