---
name: katagami-contributor
description: "Become a Katagami contributor — given a SOURCE design language + a DIRECTION, author a complete design language (its own art style + palette + language) and submit the set for review. This is the exact process the Katagami agent used to refine/reimagine languages. Submissions land UnderReview; a human curator publishes — you never self-publish."
---

# Katagami Contributor — the one skill (any harness)

You author design languages for Katagami. Given a **SOURCE language id** and a **DIRECTION id**, you create a complete take — **its own art style + palette + design language** — and submit the set **for review**. This is the same process the Katagami agent used to do all the refine/reimagine work; follow it exactly. Every harness (Claude Code, Codex, Grok) loads *this same file*.

All look, taste, and judgement come from the **rulebook** — read it in full and obey it:
`katagami-curation/knowledge/rules/design-language.md`. This file is **procedure only**.

## 0. Identity

Every HTTP call goes to `$TEMPER_API_URL/tdata` with headers: `X-Tenant-Id: default`, `Authorization: Bearer $TEMPER_API_KEY`, `x-temper-principal-kind: agent`, `x-temper-principal-id: <your-contributor-id>`, `x-temper-agent-type: contributor`. File workspace: `katagami-contrib`. You render HTML and generate images with your own tools (bring-your-own). Cedar is open-permit; nothing blocks.

## 1. Read your inputs

- **Source:** `GET /tdata/DesignLanguages('<source_id>')` — the concept you reinterpret. Keep its essence, drop its slop; owe nothing to any sibling's execution.
- **Direction:** `GET /tdata/Directions('<direction_id>')` — the brief: the angle/concept to reimagine toward + constraints + what "good" looks like for this round. **Honor it literally** (if it names colours — e.g. "neon sky-blue, fresh green, a hot pop" — the neon must come through, used like a highlighter on a clean ground; "sophisticated" means restrained *placement*, not muted hue).
- **The rulebook** (above). Key rules you're checked on: one ownable signature mechanic; ≤3 accents like highlighters; body ≥17px; no borders / no boxed nav; radii from {0,16,24,9999}; full-viewport hero via `var(--hero-image)`; **landing ≠ embodiment**; the embodiment is a *substantial component library* (rule 40), the landing a hero + rich sections (rule 32); a Maker's-Mark name (plain ASCII Title Case, no diacritics — "Yunagi" not "Yūnagi").

## 2. Reconceive (refine vs reimagine)

Pick one ownable idea → a **signature mechanic** visibly present in the embodiment. Choose a deliberate mode + **ground** (light / dark / colour — never default to white). Choose a layout that fits, not a template.
- **Refine** = stay faithful to the source: same idea, palette family, signature — brought to standard.
- **Reimagine** = conceive **from the source concept**, an independent bold reconception (different mechanic, layout, structure, hero, type). If it reads as a recolor of anything, start over from the concept.

## 3. Build the full set (BYO render + image)

Compositions are **self-contained**: `embodiment.html`, `landing.html`, `dashboard.html` each carry their full `:root{…}` tokens INLINE — **never** link an external `tokens.css` (it won't resolve on the live single-file render → unstyled fallback). Hero via `background-image: var(--hero-image)`.

**(a) Art style** — a *transferable technique*, subject-agnostic (rules 46-49: it dresses a face, a city, a teapot equally; never the subject or apparatus). Author: Maker's-Mark name + short medium noun + `prompt_template` (must contain `{subject}` and `{palette}`) + negative_prompt + slot_recipes (hero/feature/avatar/empty-state/illustration) + guidance + **3-4 full-frame reference images** on varied subjects (BYO; end prompts with "NO text, NO letters, NO logos") + proof shots + a 600×400 thumbnail + credits (the artists/movements/traditions it's attributable to) + model_provenance.

**(b) Design language** — reconceive per the rulebook; reuse your art style (`imagery_direction.pairs_with = <art-style slug>`). Build `embodiment.html` (a real component library — buttons in all states, forms, cards, tables, nav, data, feedback; the signature mechanic recolouring through components), `landing.html` (a full hero + rich scrollable sections, clearly different from the embodiment), `dashboard.html`, `DESIGN.md` (clean lint), the three shadcn artifacts, a `hero.png` in the art-style technique, and the 1440×960→600×400 thumbnail.

**(c) Palette** — its own `PaletteSystem`: signature (1-4 key colours, [0]=primary) + neutrals (bg/surface/text/muted/border) + semantic + mood, ramps, proof_scenes, usage_guidance, a `tokens.css` export, a 600×400 swatch thumbnail.

## 4. Self-critique (the two-pass — do not skip)

Render the landing AND the embodiment AND the art-style references, **read the screenshots**, and fix until all hold: landing ≠ embodiment; embodiment is a real component library; landing has hero + rich sections; bright/clean (not muddy/pastel); ≤3 accents; body ≥17px; responsive at 390px; ground + fonts actually apply (no white fallback); no-JS settled state renders; the brief's colour/feel comes through. Anti-cliché: derive the hero from the signature mechanic — no generic eyebrow-tag + button-pair + stat-row + serif/italic-flip SaaS hero.

## 5. Upload every file

For each artifact: `POST /tdata/Files {"workspace_id":"katagami-contrib","path":"/contrib/<slug>/<file>","mime_type":"<mime>"}` → `entity_id`; `PUT /tdata/Files('<id>')/$value` raw bytes; poll `GET /tdata/Files('<id>')` until `status == "Ready"`. (Do NOT use `CreateFile` — broken.) Patch the landing's `--hero-image` to `https://katagami.ai/api/file/<hero_id>` before uploading the landing.

**Set `mime_type` correctly per artifact — NEVER `application/octet-stream`** (browsers DOWNLOAD octet-stream instead of rendering it, so the bake-off page can't show the composition):

| Artifact | `mime_type` |
|---|---|
| `embodiment.html` / `landing.html` / `dashboard.html` | `text/html` |
| `hero.png` / reference / proof / thumbnail PNGs | `image/png` |
| JPG images | `image/jpeg` |
| SVG | `image/svg+xml` |
| `tokens.css` | `text/css` |
| `DESIGN.md` + shadcn `.md` | `text/markdown` |
| shadcn `.json` | `application/json` |

## 6. Submit the set for review (one author call each, then the transition)

All three carry `direction_id = <your direction id>` (the round link) and `model_provenance`. The language carries `parent_ids = ["<source_id>"]`, `lineage_type = "evolution"`, `generation_number = 2`.

```
# Art style
POST /tdata/ArtStyles → {id_a}
POST /tdata/ArtStyles('{id_a}')/KatagamiCommons.SubmitArtStyle
  {name, slug, medium, prompt_template, negative_prompt, engine_hints, slot_recipes, guidance,
   reference_image_file_ids, reference_manifest, proof_shots_file_ids, proof_shots_manifest,
   thumbnail_file_id, credits, model_provenance, tags, direction_id, curator_notes}
POST /tdata/ArtStyles('{id_a}')/KatagamiCommons.SubmitForReview        → UnderReview

# Palette
POST /tdata/PaletteSystems → {id_p}
POST /tdata/PaletteSystems('{id_p}')/KatagamiCommons.SubmitPaletteSystem
  {name, slug, signature, neutrals, semantic, mood, ramps, proof_scenes, usage_guidance,
   tokens_export_file_id, tokens_export_format_version, tokens_export_manifest,
   thumbnail_file_id, credits, model_provenance, tags, direction_id, curator_notes}
POST /tdata/PaletteSystems('{id_p}')/KatagamiCommons.SubmitForReview   → UnderReview

# Design language (reuse the art style slug; reference the palette)
POST /tdata/DesignLanguages → {id_l}
POST /tdata/DesignLanguages('{id_l}')/KatagamiCommons.SubmitDesignLanguage
  {name, slug, philosophy, tokens, rules, layout_principles, guidance, tags, imagery_direction,
   embodiment_file_id, element_count, composition_count, embodiment_format,
   landing_file_id, dashboard_file_id, design_md_file_id, design_md_lint_result, design_md_format_version,
   shadcn_export_file_id/format_version/manifest, shadcn_component_spec_file_id/format_version/manifest,
   shadcn_preview_shots_file_id/format_version/manifest, thumbnail_file_id,
   parent_ids:["<source_id>"], lineage_type:"evolution", generation_number:2,
   model_provenance, direction_id, curator_notes}
POST /tdata/DesignLanguages('{id_l}')/KatagamiCommons.SubmitForReview  → UnderReview
```

Each `Submit*` composite sets every `SubmitForReview` guard var and leaves the entity in **Draft**; `SubmitForReview` transitions it to **UnderReview**. **Stop there — never call Publish.** If `SubmitForReview` returns a guard error, it names exactly what's missing (e.g. `has_compositions`) — fix that artifact, re-upload, re-call the composite, retry. JSON-stringify object params.

## 7. Hand back

Return the three entity ids (art style + palette + language), their `UnderReview` status, the lineage (`parent_ids`/`lineage_type`/`generation_number`), the `direction_id`, and a one-line self-assessment of how your take diverges from the source. A human curator reviews the round (`GET /tdata/DesignLanguages?$filter=direction_id eq '<id>'`, status `UnderReview`) and publishes the keepers.
