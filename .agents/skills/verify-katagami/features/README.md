# Feature map

## Surface enumeration

Enumerated from the code's registration points, not from the docs. Each row cites where it came from.

**Temper entity sets** - `katagami-commons/app.toml` plus `katagami-commons/specs/*.ioa.toml` (14 specs): design_language, palette_system, art_style, writing_style, design_source, design_element, element_manifest, taxonomy, remix, direction, member, agent_grant, oauth_client, feedback_response. `katagami-curation/app.toml` plus `katagami-curation/specs/*.ioa.toml` (9 specs): curation_query, curation_direction, curation_job, curation_job_template, curator_agent, review_agent, human_curator, taste_rule, trajectory_verdict.

**WASM modules** - declared in `katagami-curation/app.toml` under `[[wasm_modules]]`, both `app-required`: `build_session_message`, `finalize_spawned_session`.

**Pipeline job types** - `katagami-curation/seed-data/job_templates.toml` (`job_type = ...`): source_search, synthesize, synthesize_palette, synthesize_art_style, quality_review, organize_taxonomy, evolve_language, regenerate_embodiment, taste_distillation.

**Gallery pages** - `ui/src/app/**/page.tsx` (24 routes): `/`, `/language/[id]`, `/palettes`, `/palettes/[id]`, `/art-styles`, `/art-styles/[id]`, `/voice`, `/voice/[id]`, `/voice/intake`, `/taxonomy`, `/lineage`, `/compare`, `/under-review`, `/studio`, `/lab`, `/lab/[slug]`, `/ab`, `/feedback`, `/model-bake-off`, `/model-bake-off/model/[slug]`, `/account`, `/account/agents`, `/owner`, `/owner/visitor-shelf`, `/signin`, `/oauth/authorize`, `/radix-test`, `/radix-test/preview/[slug]`.

**Export and API routes** - `ui/src/app/**/route.ts` (23 routes). Per-language exports: `DESIGN.md`, `DESIGN.with-shadcn.md`, `KATAGAMI.MD`, `SHADCN-DESIGN.md`, `shadcn.json`, `shadcn-components.md`, `shadcn-shots.json`. Site: `/api/file/[id]`, `/api/search`, `/api/revalidate`, `/api/taste/embed`, `/api/taste/vectors`, `/api/auth/google/start`, `/api/auth/google/callback`, `/api/auth/me`, `/api/auth/signout`, `/api/oauth/register`, `/api/oauth/token`, `/mcp`, `/llms.txt`, `/openapi.json`, `/studio/BRIEF.md`, and five `.well-known/` documents.

**MCP tools** - `mcp/src/tools.ts`, each a `server.registerTool` call (10 tools): whoami, search_styles, katagami_search, get_style, remix, import_art_style_proof_image, submit_art_style, submit_palette_system, submit_design_language, submission_status.

**CLI commands** - `cli/src/cli.ts`, the `switch (cmd)` in `main()` (8 commands): login, logout, whoami, search, pull, remix, submit, status. Every one is a thin call into an MCP tool, so the CLI and the MCP server share one validation path.

**Curator skills** - `katagami-curation/agents/curator/skills/` (9): research-direction, synthesize-language, synthesize-palette, synthesize-art-style, synthesize-writing-style, review-quality, organize-taxonomy, taste-distillation, immersive-landing.

**Scripts and hooks** - `scripts/run-local.sh` (whole local stack), `scripts/sync-genesis-katagami.sh` (Genesis pull/push), `scripts/seed-local-remix.mjs`, `scripts/gen-art-svgs.mjs`, `scripts/backfill-shadcn-exports.mjs`, `scripts/normalize-shadcn-theme-seed.mjs`, `scripts/trajectory/` (trajectory capture and conformance), `hooks/trajectory-capture/` (a Claude Code hook, wired by `settings.snippet.json`).

**Infra** - `infra/style-embed-service/` (FastAPI embedding service, its own Dockerfile), `infra/cloudflare/katagami-assets-worker/` (serves allow-listed R2 published prefixes at assets.katagami.ai), `infra/datadog/`.

**Contract suites** - `ui/package.json` scripts (`test:gallery`, `test:shadcn-export`, `test:auth`, `test:tokens`, `test:contracts` covering 18 checks in `ui/scripts/`) and `katagami-curation/Makefile` `test-integration` (28 files in `katagami-curation/tests/`).

## Mapped

| Feature | File | Drive when you changed |
|---|---|---|
| Local stack and health | local-stack.md | specs, seed data, run-local.sh, spec loading |
| Gallery and detail pages | gallery-pages.md | `ui/src/app/(site)/`, gallery projection, thumbnails, styling |
| Language exports | language-exports.md | DESIGN.md projection, shadcn export, KATAGAMI.MD, the design-md contract |
| Curation pipeline | curation-pipeline.md | curation specs, WASM modules, job templates, curator skills |
| Contribution front door | contribution-front-door.md | `mcp/`, `cli/`, OAuth routes, Member roles |
| Genesis publish and install | genesis-publish.md | `katagami-commons/`, `katagami-curation/`, app.toml pins |

## Not yet mapped

- **Auth and account surface** (`/signin`, `/account`, `/account/agents`, `/oauth/authorize`, `/owner`, `/owner/visitor-shelf`) - needs a real Google OAuth client plus `KATAGAMI_AS_PRIVATE_KEY` and a registered TrustedIssuer, none of which `run-local.sh` provisions. `contribution-front-door.md` covers the token-holder path only; the browser sign-in path is unmapped.
- **Voice and writing styles** (`/voice`, `/voice/[id]`, `/voice/intake`, writing_style spec, synthesize-writing-style) - the local seed does not create writing styles, so there is nothing to drive without running the pipeline.
- **Taste vectors and semantic search** (`/api/taste/embed`, `/api/taste/vectors`, `/api/search`, the `katagami_search` MCP tool, `infra/style-embed-service`) - needs the embedding service running and backfilled vectors.
- **Compare, lineage, taxonomy, under-review, ab, feedback, lab, model-bake-off, radix-test** - read-only views over the same entities `gallery-pages.md` drives; map one when a change lands on it.
- **Trajectory capture** (`hooks/trajectory-capture/`, `scripts/trajectory/`) - a Claude Code hook rather than a product surface; `katagami-curation/tests/test_trajectory_capture_contract.py` is the check that exists today.
- **Cloudflare assets worker and Datadog config** (`infra/cloudflare/`, `infra/datadog/`) - deployed infrastructure, verified where it runs rather than locally.
