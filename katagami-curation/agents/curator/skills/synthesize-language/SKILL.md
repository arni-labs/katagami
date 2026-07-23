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

The taste rulebook is inlined into this prompt (see "The taste rulebook"
section) — it is the authoritative set of design tests and every rule applies
to your output. Do NOT load TasteRules entities; they are superseded by the
rulebook file. The knowledge files provide orientation and hard artifact
context; do not recreate parallel anti-slop checklists from prose.

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
2. **No sketches, and NO FILLER.** Pages under 9 KB fail
   (`composition_underbuilt`). But bytes are not the target: the finalizer
   also measures repeated structure with digits folded, so stamped or
   counter-numbered filler sections ("note 27", "module 04", "depth 29")
   fail `composition_padded` no matter how large the file is. Every section
   must be designed, distinct content — the reference pages in the library
   are 10-16 KB+ of dense bespoke CSS with zero repeated modules.
3. **Landing hero is a real image and must RENDER.** `--hero-image` must
   reference a generated image via `https://katagami.ai/api/file/<file_id>`
   (`landing_hero_not_generated_image`) and the hero must actually be visible
   in your screenshots — a token reference buried in an unused rule is a
   failed hero.
4. **The render loop is NON-NEGOTIABLE.** For EACH page: write it complete,
   render desktop/tablet/mobile from a script file, `sandbox.read` the
   screenshots and LOOK at them, fix what you see, re-render. Minimum 2 full
   render→read→fix cycles per page. Also capture full-page plus 25/50/75/100%
   scroll-position shots — emptiness below the first viewport is a failure.
   A first draft you never looked at is not a finished page.

## Token & Turn Efficiency (mandatory)

Efficiency means large coherent steps — it NEVER means skipping the render loop
or shipping a first draft. A cheap failed run is the most expensive run
possible.

- Work in FEW LARGE steps: write complete files in one sandbox.write / temper.write; NEVER patch files line-by-line through repeated read-modify-write cycles.
- Never re-read a file you just wrote to "verify" its text — trust the write result; verification is visual (screenshots) and gate-based (finalizer).
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

This gate checks structural completeness before visual work. Apply the inlined
taste rulebook separately as the reusable taste and anti-slop test set.

Do NOT proceed to embodiment until every check passes:

- **Philosophy**: `summary` >= 50 chars, `values` >= 3, `anti_values` >= 2, `visual_character` >= 3 items each >= 30 chars describing concrete CSS choices
- **Tokens**: all 12 color keys with real hex values, real font names, complete google_fonts_url, surfaces/borders/motion fully specified
- **Rules**: `composition` >= 30 chars, `hierarchy` >= 30 chars, `density` >= 20 chars, `signature_patterns` >= 3 items each >= 30 chars
- **Layout**: `grid` >= 20 chars, `breakpoints` non-empty, `whitespace` >= 20 chars
- **Guidance**: `do` >= 3 items, `dont` >= 3 items

If any check fails, rewrite that section immediately.

## DESIGN.md PHASE

Generate the portable DESIGN.md artifact from the same native Katagami fields
you just wrote. The finalizer verifies the attached file and lint metadata; it
does not generate or repair DESIGN.md for you.

The DESIGN.md must start with YAML frontmatter containing `version:`, `name:`,
`description:`, `colors:`, `typography:`, `rounded:`, `spacing:`, and
`components:`; include the sections `## Overview`, `## Colors`,
`## Typography`, `## Layout`, `## Components`, `## Do's and Don'ts`, and
`## shadcn/ui Usage`; reference `/language/{language_id}/DESIGN.with-shadcn.md`,
`/shadcn.json`, `/shadcn-components.md`, `/shadcn-shots.json`, and
`@/components/ui/*`; contain at least eight concrete hex color tokens and the
production Google Fonts URL; and contain no TBD/TODO/placeholder text.

Write it to `/tmp/DESIGN.md` in the sandbox, then run the no-network Katagami
contract checker with `python3` from a script FILE (no npx, no installs). The
checker validates exactly the requirements above and prints one JSON object:

```python
sandbox.write('/tmp/DESIGN.md', design_md)
sandbox.write('/tmp/katagami_design_md_lint.py', lint_script)  # the checker
lint_output = sandbox.bash('python3 /tmp/katagami_design_md_lint.py')
lint_result = json.loads(lint_output[lint_output.find('{'):lint_output.rfind('}')+1])
```

Warnings are blocking. Parse only the JSON object emitted by the checker; never
store the shell transcript or any string containing `exit code`, `STDERR`, or
`command not found` in `design_md_lint_result`. If `summary.errors > 0` or
`summary.warnings > 0`, rewrite the DESIGN.md and rerun the checker before
attaching. Attach only the exact markdown that passed lint:

```python
design_md_result = temper.write('/katagami/design-md/' + slug + '/DESIGN.md', design_md)
temper.action('DesignLanguages', eid, 'AttachDesignMd', {
    'design_md_file_id': design_md_result['file_id'],
    'design_md_lint_result': json.dumps(lint_result, ensure_ascii=False),
    'design_md_format_version': 'design-md-v1'
})
```

## EMBODIMENT PHASE

Generate a self-contained HTML file that manifests every `visual_character`
trait, every `signature_pattern`, and uses the surfaces/borders/motion tokens.
15+ explicitly styled elements, zero browser defaults (reset appearance on
select/input/textarea/button), all layout in classes, responsive via media
queries. Scene-first: a real application screen, not a component inventory.

### Step 1 — Write HTML to sandbox

```python
sandbox.write('/tmp/embodiment.html', html_code)
```

### Step 2 — Screenshot at three viewports

Chromium, Playwright, and Pillow are PREINSTALLED in the sandbox image — never
run pip or apt. Write render scripts to files with sandbox.write, then execute
the file (fast and reliable for scripts of any size):

```python
shot_script = """
from playwright.sync_api import sync_playwright
viewports = [
    {'name': 'desktop', 'width': 1440, 'height': 960},
    {'name': 'tablet',  'width': 768,  'height': 1024},
    {'name': 'mobile',  'width': 375,  'height': 812},
]
p = sync_playwright().start()
b = p.chromium.launch(args=['--disable-dev-shm-usage'])
for vp in viewports:
    pg = b.new_page(viewport={'width': vp['width'], 'height': vp['height']})
    pg.goto('file:///tmp/embodiment.html')
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f"/tmp/shot_{vp['name']}.png", full_page=True)
    pg.close()
b.close()
p.stop()
print('shots ok')
"""
sandbox.write('/tmp/shots.py', shot_script)
shot_log = sandbox.bash('python3 /tmp/shots.py')
assert '[exit code: 0]' in shot_log and 'shots ok' in shot_log, shot_log
```

### Step 3 — Evaluate

```python
desktop_shot = sandbox.read('/tmp/shot_desktop.png')
tablet_shot = sandbox.read('/tmp/shot_tablet.png')
mobile_shot = sandbox.read('/tmp/shot_mobile.png')
```

Check each viewport: layout integrity, all 15+ elements styled,
visual_character and signature_patterns visible, typography hierarchy clear,
tokens applied, responsive reflow correct, no browser defaults, professional
quality.

### Step 4 — Iterate until polished

Fix issues, rewrite, re-screenshot, re-evaluate. Repeat until all three
viewports look polished.

Scroll-state verification is mandatory for every page: capture full_page
screenshots AND viewport screenshots at 25/50/75/100% scroll positions
(page.evaluate scrollTo, then screenshot). A page that is empty below the
first viewport in the full_page shot FAILS — this catches pinned-scroll
films whose scenes never render without JS scrubbing. If you build a
scrolltelling landing, every scene must be verifiably visible in these
scrolled screenshots; otherwise build a statement page: full-bleed hero
plus 4-6 complete, content-rich sections that read without any JS.

This step is NOT optional and has a floor: complete AT LEAST TWO full
render -> read -> fix cycles per page before attaching anything — a first
draft is never attachment-quality. You are judged on what the page LOOKS
like, not on whether it passes gates. Density comes from real designed
content — complete sections, working navigation, full data in dashboards,
imagery — NEVER from repeated or numbered filler (that fails
composition_padded mechanically). Never skip rendering: if a render command
fails, fix the command (write it to a file and run the file) — do not fall
back to designing blind.

### Step 5 — Generate and verify the gallery thumbnail

After the final embodiment HTML passes all visual checks, generate a static
desktop thumbnail from the same `/tmp/embodiment.html`. Mandatory for
`synthesize`, `regenerate_embodiment`, and `evolve_language`. Capture a
1440x960 viewport (NOT full-page), disable animations/transitions with an
injected style tag first, resize to exactly 600x400 JPEG quality ~74 with
Pillow, save `/tmp/thumbnail_desktop.jpg`, verify size and format with an
assert, then:

```python
thumbnail_bytes = sandbox.read('/tmp/thumbnail_desktop.jpg', binary=True)
assert isinstance(thumbnail_bytes, dict) and thumbnail_bytes.get('__temperpaw_image') is True
assert thumbnail_bytes.get('media_type') == 'image/jpeg', thumbnail_bytes
```

If thumbnail generation, resizing, or verification fails, fix the embodiment or
the screenshot command and retry. Do not attach a missing, blank, wrong-size,
or non-JPEG thumbnail. Do not call `VerifyThumbnail` directly; the finalizer
reads the attached `thumbnail_file_id` and rejects base64 text payloads.

### Publish artifacts (including shadcn)

**PREFERRED for a NEW language: one-call publish via AuthorComplete** once you
have BUILT AND VERIFIED every artifact (all files uploaded via temper.write and
confirmed Ready). Use the per-slot Attach* ladder only when repairing
individual artifacts on an existing language.

```python
temper.action('DesignLanguages', eid, 'AuthorComplete', {
    'name': name, 'slug': slug,
    'philosophy': json.dumps(philosophy), 'tokens': json.dumps(tokens),
    'rules': json.dumps(rules), 'layout_principles': json.dumps(layout),
    'guidance': json.dumps(guidance), 'tags': json.dumps(tags),
    'imagery_direction': json.dumps(imagery_direction),
    'embodiment_file_id': embodiment_id, 'embodiment_format': 'html',
    'element_count': '18', 'composition_count': '5',
    'landing_file_id': landing_id, 'dashboard_file_id': dashboard_id,
    'design_md_file_id': design_md_id,
    'design_md_lint_result': json.dumps(lint_result),
    'design_md_format_version': 'design-md-v1',
    'shadcn_export_file_id': shadcn_export_id,
    'shadcn_export_format_version': 'registry-item-v1',
    'shadcn_export_manifest': json.dumps(shadcn_export_manifest),
    'shadcn_component_spec_file_id': component_spec_id,
    'shadcn_component_spec_format_version': 'katagami:shadcn-component-recipes/v1',
    'shadcn_component_spec_manifest': json.dumps(component_spec_manifest),
    'shadcn_preview_shots_file_id': preview_shots_id,
    'shadcn_preview_shots_format_version': 'katagami:shadcn-preview-shots/renderable-v1',
    'shadcn_preview_shots_manifest': json.dumps(preview_shots_manifest),
    'thumbnail_file_id': thumbnail_id,
    'model_provenance': model_provenance_json,
    'direction_id': direction_id,
    'curator_notes': curator_notes,
})
```

It sets every SubmitForReview guard, so the very next call is SubmitForReview.

**Ready-file discipline** (applies to both paths): before attaching any file id,
`temper.get('Files', file_id)` and assert status == 'Ready' with usable Path,
Name, MimeType, SizeBytes metadata. If a write returns anything else, retry the
write or fail the job with the file response as evidence.

**Per-slot ladder (repairs)**: AttachEmbodiment (embodiment_file_id,
element_count, composition_count, embodiment_format) → AttachThumbnail →
SetLineage (parent_ids '[]', lineage_type 'original', generation_number '0';
for evolve_language read the parent, inherit base tokens, lineage_type
'evolution'). `AttachEmbodiment` invalidates DESIGN.md verification booleans —
after it, rerun the DESIGN.md checker and `AttachDesignMd` again with the
latest markdown and lint JSON; that post-embodiment attach is mandatory.

**shadcn artifacts** (all three required, agent-authored, designed not
token-mapped):

1. `/katagami/shadcn/{slug}/registry-theme.json` — a shadcn `registry:theme`
   payload derived from the native tokens. MUST contain the literal
   `"type": "registry:theme"`, plus `cssVars` and `componentManifest` keys.
   Attach via AttachShadcnExport with format version `registry-theme-v1` and a
   manifest `{'artifact': 'katagami:shadcn-registry-theme', 'version': ...,
   'author': 'katagami-agent', 'type': 'registry:theme',
   'requiresComponentManifest': True}`.
2. `/katagami/shadcn/{slug}/components.md` — headings: `# {Name} shadcn/ui
   Components`, `## Intent`, `## Required primitives`, `## Token cues`,
   `## Visual character to preserve`, `## ShadSync visual profile`,
   `## Signature component recipes`, `## Preview shots`, `## Implementation
   contract`, `## Copy-paste component example`. Recipes must cover button,
   card, input, textarea, select, dialog, sheet, tabs, badge, separator,
   checkbox, switch, slider, tooltip, dropdown-menu, table — translating the
   language's actual visual_character/signature_patterns into shadcn usage.
   Attach via AttachShadcnComponentSpec; manifest artifact
   `katagami:shadcn-component-recipes` with the full `components` list.
3. `/katagami/shadcn/{slug}/preview-shots.json` — artifact
   `katagami:shadcn-preview-shots`, `renderable: true`, ≥3 shots
   (`application-shell`, `detail-editor`, `data-operations`), each with a
   renderable `scene` object (`eyebrow`, `headline`, `description`, action
   labels, concrete `stats`/`fields`/`rows` data), plus a top-level
   `visualProfile` (family, material, contour, border, underlay, grain,
   stickerBadges, motion, density, accents — derived from the language) and a
   `componentRecipes` array covering every required primitive. The language
   page renders these directly — polished product screenshots, not prose
   notes or component inventory walls; one coherent shape scale.
   Attach via AttachShadcnPreviewShots; manifest schema
   `katagami:shadcn-preview-shots/renderable-v1`, `renderable: True`, the
   shot ids and full components list.

Do not call `VerifyShadcnExport`, `VerifyShadcnComponentSpec`, or
`VerifyShadcnPreviewShots` directly — the finalizer marks those after reading
the attached files.

## COMPOSITION EMBODIMENTS PHASE (Landing + Dashboard) — required & gated

Every design language ships **three** embodiments: the element embodiment
(above) plus TWO bespoke full-screen composition embodiments **unique to this
language**, following the same visual_character, signature_patterns, taste
rules, type, layout, density, and tokens. They give each language a real
landing and a real dashboard a human can click through, and they are what the
Remix Studio recolors and fills.

- **Landing** (`/katagami/compositions/{slug}/landing.html`) — a real marketing
  landing screen. Lead with a **full-bleed hero image** at the top: a section
  whose `background-image: var(--hero-image)` covers the viewport top, the
  `--hero-image` default pointing at the REAL generated image
  (`url(https://katagami.ai/api/file/<file_id>)`), with the headline/CTA
  composed over a scrim. The hero must be VISIBLE in your screenshots. Then
  distinct designed scenes that tell the product story in the brief's world.
- **Dashboard** (`/katagami/compositions/{slug}/dashboard.html`) — a real app
  dashboard (sidebar nav, stat cards, a chart, a table or empty-state).
  UI-led; no hero image required.

These are **remixable**, so they MUST be tokenized — bake the language's
identity (type, layout, density, treatment) into the HTML, but read every
COLOR from CSS custom properties so the studio can recolor with any palette:

```
:root{ --bg --surface --text --muted --border --accent --on-accent
       --success --warning --error --info --hero-image }
```

Define sensible defaults in `:root` (the language's own colors), use only
those vars for color. Self-contained HTML, same safety rules as the element
embodiment.

### Visual verification (same rigor as the element embodiment)

Write each composition to the sandbox, screenshot at all three viewports plus
scroll states, and evaluate the same way — ≥2 render→read→fix cycles. The
landing's hero must read full-bleed; the dashboard must look like a real
product screen, not a wireframe. A Swiss-grid landing and a warm-editorial
landing must look like **different products**, not one template recolored —
and the three pages of THIS language must be three different artifacts.

```python
landing = temper.write('/katagami/compositions/' + slug + '/landing.html', landing_html)
dashboard = temper.write('/katagami/compositions/' + slug + '/dashboard.html', dashboard_html)
temper.action('DesignLanguages', eid, 'AttachCompositions', {
    'landing_file_id': landing['file_id'],
    'dashboard_file_id': dashboard['file_id'],
})
```

`VerifyCompositions` is finalizer-owned — do NOT call it. The finalizer reads
both files and rejects non-HTML, untokenized, hero-less, underbuilt, padded,
or duplicate pages; `SubmitForReview` and `Publish` guard on
has_compositions + compositions_verified.

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
