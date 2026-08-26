# Katagami - Project Guide

> Project-specific rules only. Global rules come from the stack (`arni-labs/stack` AGENTS.md), which every harness loads separately, so nothing global is repeated here. `CLAUDE.md` is a symlink to this file.

Katagami is the design commons: an agent-curated library of complete design languages, palette systems, art styles, and writing styles, each with philosophy, tokens, rules, layout, guidance, and a rendered embodiment. It is published at katagami.ai. The system is two Temper apps (`katagami-commons`, `katagami-curation`) plus a Next.js gallery in `ui/`, an MCP contribution server in `mcp/`, and a thin CLI in `cli/`.

## Commands

- `bash scripts/run-local.sh` - the whole local stack: a detached `temper serve`, the commons specs loaded, seed walked as far as Draft/`Published`, and the Next.js dev server. `PORT` (default 3467) and `UI_PORT` (default 3000) are overridable; each stack writes `ui/.env.$PORT.local` and binds Next to that URL. Seed's `SubmitForReview` 409 is a recorded platform break and does not fail launch. Needs `temper` on PATH and `TEMPER_REPO` pointing at a temper checkout for the temper-fs specs. Stop it with `PORT=... UI_PORT=... bash scripts/run-local.sh --stop` (listeners on those ports only; never `pkill` by name).
- `cd ui && npm run dev` - gallery alone against whatever `ui/.env.local` points at (a convenience copy written when it would not retarget a live stack). Prefer `bash scripts/run-local.sh` when two PORT pairs are up. `npm test` runs the gallery, shadcn-export, auth, token, and contract checks; `npm run build` runs the gallery and contract checks first.
- `cd katagami-curation && make test-integration` - the curation contract suite in a virtualenv, because `cedarpy` evaluates the real Cedar policies and the suite fails rather than skips without it.
- `bash scripts/sync-genesis-katagami.sh pull|push` - move the two apps between this repo and Genesis.
- Verification: `.agents/skills/verify-katagami/` - the verification skill and feature map.
- Review passes for this repo: `REVIEW.md`.

## Sources of truth and git topology

- **Genesis is the source of truth for the apps.** `katagami/katagami-commons` and `katagami/katagami-curation` live on the Genesis git server; GitHub (`arni-labs/katagami`) is a mirror and the default branch there is `master`, not `main`. After merging on GitHub, push to Genesis too and verify both sides agree. On divergence Genesis wins: preserve the Genesis-side change.
- Remotes are named after the project (`katagami-commons`, `katagami-curation`), never after infrastructure. `origin` is GitHub; the other two are Genesis. Say which host you mean when you report git state.
- **Canonical taste rules live in the deployed Katagami app**, as `TasteRule` entities. Read the accepted rules from there before generating anything; the copies under `katagami-curation/knowledge/rules/` can lag.
- `ui/DESIGN.md` is the design language of katagami.ai itself, and it is separate from the languages the commons curates.

## Katagami is Temper-native

Katagami is built on Temper the same way TemperPaw is: all functionality is Temper apps - entity specs, WASM integrations, Cedar policies. There is no separate orchestration layer. If Temper does not support what you need, extend Temper rather than work around it.

- **Entity-first.** If state changes, it is an entity. If logic runs on a state change, it is a WASM integration. Define the state machine (`.ioa.toml`), wire WASM on the actions that need logic, use Cedar for authorization. Never write orchestration in imperative code (Rust, Python, background tasks). If Rust creates entities or dispatches actions in a loop, it belongs in a WASM integration instead.
- **The trigger boundary.** External events enter through a trigger that creates ONE entity, dispatches ONE action, and returns. Everything after that first action is WASM reacting to state transitions. A new external event source is a config entity, not new imperative code.
- **WASM integration rules.** A module fired by a transition never dispatches transitions itself - sequencing belongs to the state machine, so step B after step A is two declared transitions, not a dispatch inside A's module. One integration, one concern: a module doing several things in sequence gets broken into transitions with one module each.
- **A module not declared in `app.toml` is not uploaded at install**, and every trigger for it fails with "WASM module not found".

## The two apps

`katagami-commons` is the data layer. Its specs (`katagami-commons/specs/*.ioa.toml`) carry the lifecycle state machines: `design_language` (Draft, UnderReview, Published, Archived), plus `palette_system`, `art_style`, `writing_style`, `design_source`, `design_element`, `element_manifest`, `taxonomy`, `remix`, `direction`, `member`, `agent_grant`, `oauth_client`, `feedback_response`. Cedar policies sit beside them in `policies/`.

`katagami-curation` is the agent work layer: `curation_query` (the end-to-end pipeline tracker), `curation_direction` (one research direction), `curation_job` (Queued, Ready, Running, Finalizing, Completed), `curation_job_template` (job type to skill, template, and completion contract), plus the actor specs `curator_agent`, `review_agent`, `human_curator`, `taste_rule`, `trajectory_verdict`. Two WASM modules are declared in `app.toml` and both are app-required: `build_session_message` and `finalize_spawned_session`. A module that is not declared there is not uploaded at install, and every trigger for it fails with "WASM module not found".

Job routing lives in `CurationJobTemplate` seed data, not in Rust. `build_session_message` reads the active template plus the skill and knowledge files from TemperFS at runtime, so prompt policy is a Katagami file rather than compiled source (ADR-0001). Follow-up jobs come from Temper reactions; source-search fan-out is modeled as `CurationDirection` records rather than a spawning loop.

Curator skills live in `katagami-curation/agents/curator/skills/`: research-direction, synthesize-language, synthesize-palette, synthesize-art-style, synthesize-writing-style, review-quality, organize-taxonomy, taste-distillation, immersive-landing. Shared knowledge is in `katagami-curation/knowledge/`.

Batch pipeline jobs run at most 10 concurrent.

## The design contract the pipeline enforces

These are the rules the **curation agents** apply to everything they generate - embodiments, landing pages, dashboards, previews, seed content. They are not styling rules for developing this repo; they are the product's output contract. The canonical, evolving form lives in the deployed app as `TasteRule` entities (and the curator skills read them at generation time); the summary below is a quick reference and can lag. When you touch the pipeline, preserve this contract; when you generate content, read the canonical rules first.

- No borders wherever borders can be avoided, and never grey or heavy ones. No decorative sidelines.
- No emoji on buttons. Clean, minimal, intentional.
- Bright and clean, never muddy. No pastel background washes, no gradients; use blobs for organic color. Core neutrals are pure `#FFF` and `#000`.
- At most three accent colors, used like highlighters. Palettes are signature-led. Semantic colors stay a small part of the palette and never read as primary.
- Typography: high contrast, body 17px or larger, table rows 14.5px or larger, `-0.02em` letter-spacing on display text.
- Border-radius for curated languages comes only from {0, 16, 24, 9999}. katagami.ai itself follows `ui/DESIGN.md`, where rectangular surfaces (cards, chips, buttons, inputs) are radius `0`; never put `16`, `24`, or `rounded-full` on a rectangle on the site.
- Generous spacing, with padding above titles so a title is never stuck to a container top.
- Landing pages get one large full-bleed hero image at the top.
- Previews are embodiment-grade, never component galleries. Each language gets a bespoke embodiment, landing page, and dashboard under the same rules.
- Diagrams are real architecture diagrams (C4-style levels, progressive disclosure) as inline SVG, placed inside their section with an explainer underneath.
- Respect `prefers-reduced-motion`. Light mode is the default. Everything is responsive on desktop and mobile without compromising the diagrams.
- Evolve the existing style rather than replacing it, and preserve the previous version in a separate file before restyling.

## Pipeline quality

- Seed and demo content is produced by the same pipeline, contracts, and quality gates as real content. Hand-built stand-ins are not acceptable.
- Design languages are referenced by URL (`https://katagami.ai/language/<id>/DESIGN.md`). When asked to apply one, honor its tokens exactly.
- Published languages must generate a `DESIGN.md` projection that passes `katagami-design-md-contract` with zero errors and zero warnings. The native Katagami spec stays the source of truth; `DESIGN.md` is the portable export.
- Embodiments are professional-grade. The failures worth checking before handoff are unstyled defaults, misalignment, and inconsistent typography.

## Verification specifics (extends the global Definition of Done)

- Real browser, real seeded content: pages render, links open, images show. A link that does not open is a failed task.
- Check the state machine moved, not just that a dispatch returned 200. Read the entity back over OData.
- After merge: Vercel deploys `ui/` from `master`, and the apps go to Genesis. Verify the installed pinned ref (`owner/app@hash`) rather than assuming it moved.

## Reference

`README.md` (what the system is and how the pipeline runs) - `DEPLOYMENT.md` (Vercel, Cloudflare, Railway, env vars, roles) - `AGENT_INTEGRATION.md` (the OData read surface for outside agents) - `docs/adrs/` and `docs/rfcs/`.
