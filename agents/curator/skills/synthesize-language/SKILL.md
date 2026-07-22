# Synthesize Language

Create a complete DesignLanguage entity with all spec sections, **three** embodiments — the element-showcase embodiment plus a bespoke **Landing** and **Dashboard** composition — a desktop thumbnail, and first-class shadcn/ui component artifacts, visually verified at three viewport sizes. The Landing + Dashboard compositions are required and finalizer-gated (see COMPOSITION EMBODIMENTS PHASE).

## When to Use

Job types: `synthesize`, `evolve_language`, `regenerate_embodiment`

## Regeneration Mode

When the job type is `regenerate_embodiment` and the input contains `existing_language_id`:

1. Read the existing DesignLanguage: `temper.get('DesignLanguages', existing_language_id)`
2. Read ALL spec sections from the entity fields
3. If Published, call `Revise` first:
   ```python
   temper.action('DesignLanguages', eid, 'Revise', {'curator_notes': 'Regenerating embodiment HTML'})
   ```
4. Run the **Spec Validation Gate**. If any section fails, research and rewrite it — the spec is the primary artifact.
5. Go to the **EMBODIMENT PHASE**
6. After `AttachDesignMd`, `AttachEmbodiment`, `AttachThumbnail`, `AttachShadcnExport`, `AttachShadcnComponentSpec`, and `AttachShadcnPreviewShots`, finish the job. The CurationJob finalizer verifies the attached files and marks verifier-owned booleans before review/publish; it does not author missing artifacts.

## Before Starting

Read the knowledge files:
- `/system/knowledge/design-principles.md` — design philosophy, taste, typography, color, structure
- `/system/knowledge/quality-standards.md` — measurable thresholds
- `/system/knowledge/feedback-log.md` — human feedback

Also check what already exists in the library:
```python
existing = temper.list('DesignLanguages', '')
```
Note existing typefaces, palettes, scene types, and structural approaches. Your language must be distinct from all of them.

Load accepted taste rules:
```python
accepted_taste_rules = temper.list('TasteRules', "Status eq 'Accepted'")
```
Use only Accepted rules. Positive rules describe patterns to preserve or amplify;
negative rules describe archive-derived anti-patterns to avoid. Ignore Proposed,
Rejected, and Superseded rules entirely.
Accepted TasteRules are the authoritative reusable design tests. The knowledge
files provide orientation and hard artifact context; do not recreate parallel
anti-slop checklists from prose.

## Landing = scroll-cinematic film (the Katagami standard)

The landing page is NOT a static hero + sections. Read `agents/curator/skills/immersive-landing/SKILL.md` IN FULL before the landing phase and build to every floor it defines: the seven derivation questions (answers into curator_notes), the cinematic floor (700–1100vh pinned scrubbed film, full-bleed full-screen hero image with display type composed over it, geometry-transforming transitions), the craft floor (pacing enter≤25%/hold≥50%/exit≤25%, filmstrip self-critique at four breakpoints, ≥50fps budget), the scroll-feel floor (continuous perceived motion, persistent progress), in-scene choreography, concept-expressive shaders, twin-plate overlay slots, desktop scale discipline, the image-swap contract (var(--plate-N, url(...)) + plate-manifest), pacing calibration, and PRAISE IS NOT A PATTERN. A landing that fails those floors fails quality review regardless of how good the embodiment is.

## Execution Discipline

- NEVER create, modify, or delete Taxonomy entities.
- Each session creates ONE language.
- EVERY tool call must create or populate a DesignLanguage. No exploration turns.
- You MUST create ALL languages listed in the scope before stopping.

## Quality floors (finalizer-enforced — a violation fails the job)

These are hard gates checked mechanically by the finalizer. A run that skips them
does not save time: the job fails and a repair session replays everything.

1. **Three pages, three DIFFERENT artifacts.** The embodiment is an element
   showcase; the landing is a scroll-cinematic statement; the dashboard is a
   working product screen. The finalizer rejects any two pages with identical
   `<title>` or near-identical markup (`composition_duplicate`). Never attach
   one file into two slots, never derive one page by lightly editing another.
2. **No sketches.** Each of the three pages must be at least 18 KB of real
   markup (`composition_underbuilt`); finished Katagami pages run 35-60 KB.
   If a page comes out near the floor, it is missing sections — build it out.
3. **Landing hero is a real image.** `--hero-image` must reference a generated
   image via `https://katagami.ai/api/file/<file_id>` — never a gradient or
   placeholder (`landing_hero_not_generated_image`).
4. **The render loop is NON-NEGOTIABLE.** For EACH page: write it complete,
   render desktop/tablet/mobile from a script file, `sandbox.read` the
   screenshots and LOOK at them, fix what you see, re-render. Minimum 2 full
   render→read→fix cycles per page. Also capture full-page plus 25/50/75/100%
   scroll-position shots — emptiness below the first viewport is a failure.
   A first draft you never looked at is not a finished page.

## Token & Turn Efficiency (mandatory)

Efficiency means large coherent steps — it NEVER means skipping the render loop,
the phase docs, or shipping a first draft. A cheap failed run is the most
expensive run possible.

- Work in FEW LARGE steps: write complete files in one sandbox.write / temper.write; NEVER patch files line-by-line through repeated read-modify-write cycles.
- Never re-read a file you just wrote to "verify" its text — trust the write result; verification is visual (screenshots) and gate-based (finalizer).
- Read each phase doc exactly once, when entering that phase — but ALWAYS read it. The phase docs carry the standards quality review judges against; skipping them produces pages that fail review.
- Prefer one action call that does more (AuthorComplete) over ladders of small calls.

## SPEC PHASE

Create the entity and write ALL spec sections via `SetSpec`. New synthesis must
use `SetSpec` once for the core spec instead of many small setter actions:

```python
created_ids = []
slug = 'my-language-slug'
name = 'My Language Name'
lang = temper.create('DesignLanguages', {})
eid = lang['entity_id']
created_ids.append(eid)
```

`eid` is the DesignLanguage ID. Never pass `Id`, `slug`, or any other
human-readable value when creating a DesignLanguage. Slugs can collide across
parallel direction/query attempts and must stay in the `slug` field only.
Every `created_ids`, `language_ids`, and `design_language_ids` value must use
the returned `entity_id`, not the slug.

**Philosophy** — the identity statement. `visual_character` must list 3-5 concrete structural CSS choices (not adjectives).

```python
philosophy = {
    "summary": "...",
    "values": [...],
    "anti_values": [...],
    "visual_character": ["concrete structural traits that become the CSS blueprint"]
}
```

**Tokens** — the complete design system. Check existing languages first to ensure typeface uniqueness.

```python
tokens = {
    "colors": {"primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "surface": "#hex", "text": "#hex", "muted": "#hex", "border": "#hex", "error": "#hex", "success": "#hex", "warning": "#hex", "info": "#hex"},
    "typography": {"heading_font": "...", "body_font": "...", "mono_font": "...", "base_size": "16px", "scale_ratio": 1.25, "line_height": 1.5, "letter_spacing": "-0.02em", "google_fonts_url": "..."},
    "spacing": {"base": "8px", "scale": [4, 8, 12, 16, 24, 32, 48, 64]},
    "radii": {"none": "0", "sm": "...", "md": "...", "lg": "...", "full": "9999px"},
    "shadows": {"sm": "...", "md": "...", "lg": "..."},
    "surfaces": {"treatment": "...", "card_style": "...", "bg_pattern": "..."},
    "borders": {"default_width": "...", "accent_width": "...", "style": "...", "character": "..."},
    "motion": {"duration": "...", "easing": "...", "philosophy": "..."}
}
```

**Rules** — structural rules and 3-5 `signature_patterns` (unique CSS techniques that define this language).

```python
rules = {
    "composition": "...",
    "hierarchy": "...",
    "density": "...",
    "signature_patterns": ["unique CSS techniques that become the language's fingerprint"]
}
```

**Layout and Guidance:**

```python
layout = {"grid": "...", "breakpoints": "...", "whitespace": "..."}
guidance = {"do": [...], "dont": [...]}
```

**Tags and SetSpec:**

```python
tags = ['descriptive', 'searchable', 'visual-property', 'tags']
temper.action('DesignLanguages', eid, 'SetSpec', {
    'name': name,
    'slug': slug,
    'philosophy': json.dumps(philosophy, ensure_ascii=False),
    'tokens': json.dumps(tokens, ensure_ascii=False),
    'rules': json.dumps(rules, ensure_ascii=False),
    'layout_principles': json.dumps(layout, ensure_ascii=False),
    'guidance': json.dumps(guidance, ensure_ascii=False),
    'tags': json.dumps(tags, ensure_ascii=False)
})
```

Tokens must be DESIGN.md-projectable: real hex values, concrete font names, valid CSS dimensions, component semantics that reference `{colors.*}`, `{typography.*}`, `{rounded.*}`, `{spacing.*}`.
The generated DESIGN.md projection must also include a `## shadcn/ui Usage`
section that points shadcn-targeted agents to
`/language/{language_id}/DESIGN.with-shadcn.md`, `/shadcn.json`,
`/shadcn-components.md`, and `/shadcn-shots.json`, and says to import local
primitives from `@/components/ui/*` instead of inventing a second component
system.

### Spec Validation Gate

This gate checks structural completeness before visual work. Apply Accepted
TasteRules separately as the reusable taste and anti-slop test set.

Do NOT proceed to embodiment until every check passes:

- **Philosophy**: `summary` >= 50 chars, `values` >= 3, `anti_values` >= 2, `visual_character` >= 3 items each >= 30 chars describing concrete CSS choices
- **Tokens**: all 12 color keys with real hex values, real font names, complete google_fonts_url, surfaces/borders/motion fully specified
- **Rules**: `composition` >= 30 chars, `hierarchy` >= 30 chars, `density` >= 20 chars, `signature_patterns` >= 3 items each >= 30 chars
- **Layout**: `grid` >= 20 chars, `breakpoints` non-empty, `whitespace` >= 20 chars
- **Guidance**: `do` >= 3 items, `dont` >= 3 items

If any check fails, rewrite that section immediately.

## DESIGN.md PHASE

MANDATORY before starting this phase: `temper.read('/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/phases/design-md.md')` and follow it exactly.
Gate summary (finalizer-enforced): DESIGN.md has front matter with `version:` and components; run the no-network lint checker from a script FILE; `design_md_lint_result` must be the checker's JSON with zero errors AND zero warnings; attach via AttachDesignMd with design_md_file_id + design_md_lint_result + design_md_format_version.

## EMBODIMENT PHASE

MANDATORY before starting this phase: `temper.read('/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/phases/embodiment.md')` and follow it exactly.
Gate summary: self-contained HTML manifesting every visual_character trait and signature_pattern, 15+ explicitly styled elements, zero browser defaults; render desktop/tablet/mobile from a script FILE, sandbox.read the screenshots and LOOK, >=2 full render->read->fix cycles; page under ~25 KB is almost certainly underbuilt (reference 35-60 KB); scroll-state verification: full_page + 25/50/75/100% scroll shots, emptiness below the first viewport = fail; then generate and verify the JPEG thumbnail from the final embodiment.

### Publish artifacts (including shadcn)

MANDATORY before publishing: `temper.read('/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/phases/artifacts.md')` and follow it exactly.
For a NEW language, publish everything in ONE AuthorComplete call (the phase doc has the exact params); use per-slot Attach* actions only for repairs. Gate summary: every slot its OWN Ready file; shadcn export contains "registry:theme", "cssVars", "componentManifest"; landing --hero-image references a REAL generated image via https://katagami.ai/api/file/<file_id>.

## COMPOSITION EMBODIMENTS PHASE (Landing + Dashboard) — required & gated

MANDATORY before starting this phase: `temper.read('/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/phases/compositions.md')` and follow it exactly.
Gate summary (finalizer-enforced): both compositions are self-contained HTML using var(--...) tokens throughout; the landing has ONE full-bleed hero with --hero-image referencing a REAL generated image URL and large display type composed over it; same >=2 render->read->fix rigor and scroll-state verification as the embodiment; attach via AttachCompositions (params: landing_file_id, dashboard_file_id).

## DRIVE-TO-REVIEW PHASE (self-heal loop)

You own `SubmitForReview`. Before completing a `synthesize` job you MUST drive
every language you created to `UnderReview` yourself. The CurationJob's
`CompleteSynthesis` guard rejects the completion while any language is still
`Draft`, so completing without submitting just bounces back to you. Skipping this
is not an option — there is no finalizer fallback that submits for you.

`direction_id` and `query_id` are provided in the **Your job identity** block at the
top of this prompt — engine-stamped onto this synthesize job, NOT in `synth_input`.
Read them from that block (do not parse them out of the Input/`synth_input` payload),
and set them before the loop so the Quarantine call can target THIS direction and
`CompleteSynthesis` carries the correct `query_id`.

For each `eid` in `created_ids`, run this loop:

```python
def language_status(eid):
    lang = temper.get('DesignLanguages', eid)
    return lang.get('status') or (lang.get('fields') or {}).get('Status') or 'Draft'

# Map a SubmitForReview guard field to the repair you re-run for it. The kernel
# rejection names the failing guard/field; read it and re-run only that phase,
# re-Attach asserting require_ready_file, then retry SubmitForReview.
#   has_embodiment / embodiment_file_id          -> EMBODIMENT PHASE, re-AttachEmbodiment
#   has_compositions / landing_file_id /
#     dashboard_file_id                           -> COMPOSITION EMBODIMENTS PHASE, re-AttachCompositions
#   has_thumbnail / thumbnail_file_id             -> thumbnail step (Step 5), re-AttachThumbnail
#   has_design_md / has_valid_design_md /
#     design_md_file_id                           -> DESIGN.md PHASE, re-AttachDesignMd (clean lint)
#   has_shadcn_export / shadcn_export_file_id     -> registry-theme step, re-AttachShadcnExport
#   has_shadcn_component_spec /
#     shadcn_component_spec_file_id               -> components.md step, re-AttachShadcnComponentSpec
#   has_shadcn_preview_shots /
#     shadcn_preview_shots_file_id                -> preview-shots step, re-AttachShadcnPreviewShots
# Any "cross_entity_state File ... <field>" rejection means that file is not
# Ready/Locked: re-write it and re-Attach (require_ready_file must pass first).

survivors = []
for eid in list(created_ids):
    while True:
        result = temper.action('DesignLanguages', eid, 'SubmitForReview', {})
        if language_status(eid) in ('UnderReview', 'Published'):
            survivors.append(eid)
            break
        # Rejected. The result/error names the unsatisfied guard or file field.
        # Re-run the mapped phase, re-Attach the artifact, then retry. Do NOT
        # count turns or reserve a budget — there is no turn-introspection API;
        # keep repairing until the guard is satisfied.
        missing = describe_rejection(result)   # parse the named guard/field
        repaired = repair_for_guard(eid, missing)   # re-run the mapped phase + re-Attach
        if not repaired:
            # DELIBERATE give-up: you have concluded this language cannot be made
            # review-ready (e.g. an artifact step keeps failing for a real reason).
            # Quarantine it visibly so the half-built language is archived with the
            # reason instead of stranded in Draft, and the fan-out barrier narrows.
            temper.action('CurationDirections', direction_id, 'Quarantine', {
                'error_message': 'synthesize could not drive language to UnderReview: ' + str(missing),
                'design_language_id': eid,
                'design_language_ids': json.dumps([eid])
            })
            break   # eid is dropped from survivors
```

`describe_rejection`/`repair_for_guard` are not library calls — they are the
agentic loop: read what the kernel said failed, re-run that phase, re-Attach, retry.
There is NO `temper.turns_remaining()` and no turn budget to read; the only bound
on a runaway loop is the engine's `Synthesizing` `state_timeout`, which fires
`Quarantine` automatically if the session dies before converging. Quarantine is a
deliberate decision you make, not a turn-count trigger.

After the loop, `survivors` holds the languages that reached `UnderReview`.

### Final Tool Call

```python
if job_type == 'regenerate_embodiment':
    temper.action('CurationJobs', job_id, 'CompleteRegeneration', {
        'design_language_ids': json.dumps(created_ids),
        'output': json.dumps({'language_ids': created_ids}, ensure_ascii=False)
    })
    temper.done("regenerate_embodiment complete")
elif job_type == 'evolve_language':
    temper.action('CurationJobs', job_id, 'CompleteEvolution', {
        'design_language_ids': json.dumps(created_ids),
        'output': json.dumps({'language_ids': created_ids}, ensure_ascii=False)
    })
    temper.done("evolve_language complete")
else:
    # Only languages the DRIVE-TO-REVIEW loop drove to UnderReview may complete.
    # The CompleteSynthesis guard re-asserts UnderReview per id, so passing a Draft
    # survivor would bounce; pass `survivors`, never the raw `created_ids`.
    if not survivors:
        # Every language was quarantined as unfixable. Fail the synthesize job; the
        # per-direction routing (job_failure_fails_direction) drains this direction's
        # barrier slot, and the query completes with its other directions (or
        # fast-fails via all_directions_drained_empty_fails_query if none survived).
        temper.action('CurationJobs', job_id, 'Fail', {
            'error_message': 'synthesize produced no language that reached UnderReview; all were quarantined.'
        })
        temper.done("synthesize failed: no survivors")
    else:
        review_input = json.dumps({
            'language_ids': survivors,
            'query_id': query_id
        }, ensure_ascii=False)
        temper.action('CurationJobs', job_id, 'CompleteSynthesis', {
            'design_language_ids': json.dumps(survivors),
            'design_language_id': survivors[0],
            'review_input': review_input
        })
        temper.done("synthesize complete")
```

A `synthesize` direction produces exactly one language, so `survivors[0]` is that
language's id; it is carried as the scalar `design_language_id` so the
CurationDirection can record it for the Quarantine -> Archive cascade resolver.

## Tooling Rules

- The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
  without importing it. Other imports are not available.
- No `enumerate(..., start=...)` — use `for i in range(len(items)):` instead
- **ALL array/object params MUST use `json.dumps(...)`.** Never `str()` or Python repr.
- String literals containing quotes must use proper escaping.

## Output

- `language_ids` — array of created DesignLanguage entity IDs, never slugs
- `synthesize` → drive each language to `UnderReview` yourself (DRIVE-TO-REVIEW
  PHASE), then `CompleteSynthesis` with the `survivors` as `design_language_ids`,
  the single survivor as the scalar `design_language_id`, and `review_input`. If no
  language survived, `Fail` the job instead.
- `regenerate_embodiment` → `CompleteRegeneration`
- `evolve_language` → `CompleteEvolution`
