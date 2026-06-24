# Katagami Contributor Contract — reimagine submit-path

You are a **Katagami contributor**. Your job: take an existing design language + a **direction**, **reimagine** it, and submit your reimagination back to Katagami as a lineage descendant **for review**. You do not publish — a human curator reviews the queue and publishes.

This contract is harness-agnostic: Claude Code, Codex, Grok, or any agent that can run a shell + make HTTP calls can follow it. The taste comes entirely from the **rulebook**; this file is procedure only.

---

## 0. Identity + setup

All calls go to the Temper backend over HTTP. Set these on every request:

- Base URL: `$TEMPER_API_URL` (e.g. `https://openpaw-production.up.railway.app`)
- Headers: `X-Tenant-Id: default`, `Authorization: Bearer $TEMPER_API_KEY`, `x-temper-principal-kind: agent`, `x-temper-principal-id: <your-contributor-id>`, `x-temper-agent-type: contributor`
- File workspace: `katagami-contrib`

You are given two inputs: a **SOURCE language id** and a **DIRECTION** (a short brief — the angle/concept to reimagine toward). Build images with your own image tool; render HTML with your own headless browser (bring-your-own).

## 1. Read the source + the rules

- Source spec: `GET {BASE}/tdata/DesignLanguages('<source_id>')` → its philosophy, tokens, rules, name. This is the *concept* you reimagine — keep its essence, owe nothing to any sibling's execution.
- The rulebook (all taste lives here — **read it in full and obey it**): `katagami-curation/knowledge/rules/design-language.md`. Key rules you will be checked on: one ownable signature mechanic; ≤3 neon-highlighter accents; body ≥17px; no borders/boxed nav; radii from {0,16,24,9999}; full-viewport hero via `var(--hero-image)`; **landing ≠ embodiment**; the embodiment is a substantial component showcase (rule 40); the landing has a hero + rich sections (rule 32).

## 2. Reimagine (from the direction, not from a sibling)

Conceive an **independent, bold reconception** of the source per the direction: a different signature mechanic, layout, structure, hero, type, and ground. If your result reads as a recolor of anything, start over from the concept. Pick a deliberate mode + ground (light/dark/colour — do not default to white). Reuse the source's paired **art style** (`imagery_direction.pairs_with = <slug>`); keep the technique, reconceive everything else.

## 3. Build the artifacts (BYO)

Compositions MUST be **self-contained**: `embodiment.html`, `landing.html`, `dashboard.html` each carry their full `:root{…}` tokens inline — **never** `<link rel="stylesheet" href="tokens.css">` (it won't resolve on the live single-file render → unstyled fallback). Drive the hero with `background-image: var(--hero-image)`.

Produce: `embodiment.html` (substantial component library — the identity showcase + thumbnail source), `landing.html` (full hero + rich sections, a real scrollable page — clearly different from the embodiment), `dashboard.html`, `DESIGN.md`, the three shadcn artifacts (`shadcn-theme.json`, `shadcn-components.md`, `shadcn-preview-shots.json`), `hero.png` (in the art-style technique; end the image prompt with "NO text, NO letters, NO logos"), and a `thumbnail` (embodiment screenshot at 1440×960 → 600×400 JPEG, no crop).

## 4. Self-critique (do this before submitting)

Render the landing AND the embodiment, **read the screenshots**, and fix until all hold:
- landing is a clearly different composition from the embodiment (not the same hero twice);
- the embodiment is a real component library, not a poster;
- the landing has a hero THEN rich sections;
- bright/clean (not muddy/pastel), ≤3 accents, body ≥17px, responsive at 390px, ground + fonts actually apply (no white fallback), no-JS settled state renders.

## 5. Upload the files

For each artifact: `POST {BASE}/tdata/Files {"workspace_id":"katagami-contrib","path":"/contrib/<slug>/<file>","mime_type":"<mime>"}` → `entity_id`; then `PUT {BASE}/tdata/Files('<id>')/$value` with the raw bytes; poll `GET {BASE}/tdata/Files('<id>')` until `status == "Ready"`. (Do **not** use `CreateFile` — it is broken.) Patch the landing's `--hero-image` to the uploaded hero's public URL `https://katagami.ai/api/file/<hero_id>` before uploading the landing.

## 6. Submit for review (ONE author call, then the transition)

Create the entity, then call the composite — it authors everything in one shot:

```
POST {BASE}/tdata/DesignLanguages            → {entity_id}
POST {BASE}/tdata/DesignLanguages('<id>')/KatagamiCommons.SubmitDesignLanguage
  {
    name, slug, philosophy, tokens, rules, layout_principles, guidance, tags,   // JSON-stringify object fields
    imagery_direction,                                                          // includes pairs_with = <art-style slug>
    embodiment_file_id, element_count, composition_count, embodiment_format,    // "html"
    landing_file_id, dashboard_file_id,
    design_md_file_id, design_md_lint_result, design_md_format_version,         // lint_result must be clean: {"errors":0,"warnings":0,"valid":true}
    shadcn_export_file_id, shadcn_export_format_version, shadcn_export_manifest,
    shadcn_component_spec_file_id, shadcn_component_spec_format_version, shadcn_component_spec_manifest,
    shadcn_preview_shots_file_id, shadcn_preview_shots_format_version, shadcn_preview_shots_manifest,
    thumbnail_file_id,
    parent_ids,            // ["<source_id>"]  — your reimagination is a descendant
    lineage_type,          // "evolution"
    generation_number,     // 2
    model_provenance,      // {"style":{"model":"<you>"},"source":{"model":"<you>"},"images":{"model":"<img model>","provider":"<>","tool":"<>"}}
    curator_notes          // "Reimagined from direction: <direction id/url>"  — provenance
  }
POST {BASE}/tdata/DesignLanguages('<id>')/KatagamiCommons.SubmitForReview   → entity moves to UnderReview
```

`SubmitDesignLanguage` sets every `SubmitForReview` guard var and leaves the entity in **Draft**. `SubmitForReview` then transitions it to **`UnderReview`**. **You stop here** — you do not call `Publish`. If `SubmitForReview` returns a guard error (it names what's missing, e.g. `has_compositions`), fix that artifact, re-upload, re-call `SubmitDesignLanguage`, and retry — Temper's guards are real; they tell you exactly what's wrong.

## 7. Hand back

Return: the new entity id, its `UnderReview` status, the lineage (`parent_ids` + `lineage_type` + `generation_number`), the direction you followed, and a one-line self-assessment of how your reimagination diverges from the source. A human curator reviews the `UnderReview` queue (`$filter=status eq 'UnderReview'`) and publishes.

---

*Procedure only. All look/taste/judgement come from the rulebook `katagami-curation/knowledge/rules/design-language.md`. Naming: plain-ASCII Title Case, no diacritics. Honor any colour brief literally (neon means neon, used like a highlighter on a clean ground).*
