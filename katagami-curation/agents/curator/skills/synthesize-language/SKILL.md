# Synthesize Language

Create a complete DesignLanguage entity with all spec sections and a self-contained HTML embodiment, visually verified at three viewport sizes. The native Katagami spec is the source of truth, but it must be complete enough for quality_review to generate and validate DESIGN.md.

## When to Use

Job types: `synthesize`, `evolve_language`, `regenerate_embodiment`

## Regeneration Mode

When the job type is `regenerate_embodiment` and the input contains `existing_language_id`:

1. Read the existing DesignLanguage: `temper.get('DesignLanguages', existing_language_id)`
2. Read ALL spec sections from the entity fields (Philosophy, Tokens, Rules, Layout, Guidance)
3. If the language is in `Published` state, call `Revise` first:
   ```python
   temper.action('DesignLanguages', eid, 'Revise', {'curator_notes': 'Regenerating embodiment HTML'})
   ```
4. **Run the Spec Validation Gate** (see below). Parse each JSON field and check completeness.
5. **If any section fails validation — RESEARCH and rewrite it.** The spec is the primary artifact. It must be grounded in real design knowledge, not reverse-engineered from existing CSS.
   - Search for DesignSources related to this language: `temper.list('DesignSources', "$filter=contains(name,'" + language_name + "')")`
   - If no sources exist, research the design direction: `temper.web_search(language_name + ' design system UI patterns')` and `temper.web_fetch(url)` on the best results
   - Study the real-world references: what makes this design movement distinctive? What are the defining structural choices, typography conventions, color palettes, spatial relationships?
   - Rewrite each failing section with concrete, research-backed content — not vague adjectives, but specific CSS techniques and design decisions grounded in real references
   - Call the appropriate Set action (WritePhilosophy, SetTokens, SetRules, SetLayout, SetGuidance)
   - Re-validate until all sections pass
6. Go to the **EMBODIMENT PHASE** — generate HTML from the now-complete spec
7. Use the entity's `visual_character`, `signature_patterns`, and all tokens to generate the HTML
8. After `AttachEmbodiment`, call `SubmitForReview` (pipeline will auto-review and publish)

**NEVER skip to embodiment generation with empty or skeleton specs. The spec IS the identity.**

## Before Starting

Read the knowledge files in your workspace:
- `/system/knowledge/design-principles.md` — embodiment standards, scene-first design, typography, responsive rules
- `/system/knowledge/quality-standards.md` — minimum thresholds for each spec section
- `/system/knowledge/feedback-log.md` — human feedback to incorporate

## Execution Discipline

- NEVER create, modify, or delete Taxonomy entities. Taxonomy is handled by organize_taxonomy jobs.
- Do NOT call SetTaxonomy on DesignLanguages.
- Each session should create ONE language. Template fatigue degrades quality when generating many languages sequentially.
- EVERY tool call must create or populate a DesignLanguage. No exploration turns.
- You MUST create ALL languages listed in the scope before stopping.

## Process

### Tool Call 1 — SPEC PHASE

Create the DesignLanguage entity and write ALL spec sections. This is where you make the structural decisions.

```python
slug = 'my-language-slug'
name = 'My Language Name'
lang = temper.create('DesignLanguages', {'Id': slug})
eid = lang['entity_id']
temper.action('DesignLanguages', eid, 'SetName', {'name': name, 'slug': slug})
```

**Philosophy** — must include `visual_character`: 3-5 CONCRETE visual traits unique to this language. Not design platitudes like "clean and minimal" but structural choices like "thick 4px solid black borders on every container", "uppercase monospace section labels", "asymmetric grid with oversized left gutter", "diagonal clip-path corners on cards".

```python
philosophy = {
    "summary": "...",
    "values": [...],
    "anti_values": [...],
    "visual_character": ["3-5 CONCRETE visual traits — these become the structural blueprint for the embodiment"]
}
temper.action('DesignLanguages', eid, 'WritePhilosophy', {'philosophy': json.dumps(philosophy)})
```

**Tokens** — must include surfaces, borders, and motion:

```python
tokens = {
    "colors": {"primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "surface": "#hex", "text": "#hex", "muted": "#hex", "border": "#hex", "error": "#hex", "success": "#hex", "warning": "#hex", "info": "#hex"},
    "typography": {"heading_font": "...", "body_font": "...", "mono_font": "...", "base_size": "16px", "scale_ratio": 1.25, "line_height": 1.5, "letter_spacing": "normal", "google_fonts_url": "full <link> href for loading chosen fonts"},
    "spacing": {"base": "8px", "scale": [4, 8, 12, 16, 24, 32, 48, 64]},
    "radii": {"none": "0", "sm": "...", "md": "...", "lg": "...", "full": "9999px"},
    "shadows": {"sm": "...", "md": "...", "lg": "..."},
    "surfaces": {"treatment": "flat|glass|gradient|noise|paper", "card_style": "...", "bg_pattern": "none|dots|lines|grid|noise"},
    "borders": {"default_width": "...", "accent_width": "...", "style": "solid|dashed|double|groove|none", "character": "describe the border personality"},
    "motion": {"duration": "...", "easing": "...", "philosophy": "snappy|elastic|deliberate|none"}
}
temper.action('DesignLanguages', eid, 'SetTokens', {'tokens': json.dumps(tokens)})
```

Tokens must also be DESIGN.md-projectable:
- color tokens must use real hex values
- typography tokens must include concrete font names, font sizes, line heights, and letter spacing
- spacing and radii must be valid CSS dimensions
- rules/guidance must contain enough component semantics for quality_review to generate a `components` map with `{colors.*}`, `{typography.*}`, `{rounded.*}`, and `{spacing.*}` references

**Rules** — must include `signature_patterns`: 3-5 unique CSS techniques that define this language structurally. Every signature_pattern MUST appear in the embodiment HTML.

```python
rules = {
    "composition": "...",
    "hierarchy": "...",
    "density": "...",
    "signature_patterns": ["3-5 unique CSS techniques, e.g. 'every card has a 4px left-border color accent', 'section headers use decorative double-underline', 'all containers use clip-path for angled corners'"]
}
temper.action('DesignLanguages', eid, 'SetRules', {'rules': json.dumps(rules)})
```

**Layout and Guidance:**

```python
layout = {"grid": "...", "breakpoints": "...", "whitespace": "..."}
temper.action('DesignLanguages', eid, 'SetLayout', {'layout_principles': json.dumps(layout)})

guidance = {"do": [...], "dont": [...]}
temper.action('DesignLanguages', eid, 'SetGuidance', {'guidance': json.dumps(guidance)})
```

Guidance should be phrased so it can become DESIGN.md Do's and Don'ts without losing meaning.

**Tags** — set 5-10 specific, searchable tags describing the language's visual/structural properties. These help with gallery search and filtering. Use concrete descriptors, not abstract art history terms.

```python
temper.action('DesignLanguages', eid, 'SetTags', {
    'tags': json.dumps(['serif-editorial', 'high-contrast', 'dark-mode', 'column-grid', 'long-form-reading'])
})
```

### Spec Validation Gate — MANDATORY before embodiment

**Do NOT proceed to embodiment until every check passes.** Parse the JSON you wrote and verify:

**Philosophy:**
- `summary` is non-empty, >= 50 chars
- `values` has >= 3 items
- `anti_values` has >= 2 items
- `visual_character` has >= 3 items, EACH >= 30 chars, EACH describes a concrete structural CSS choice (not vague adjectives)

**Tokens:**
- `colors` has ALL 12 keys (`primary`, `secondary`, `accent`, `background`, `surface`, `text`, `muted`, `border`, `error`, `success`, `warning`, `info`), each a real hex value (not placeholder `#hex`)
- `typography.heading_font` and `typography.body_font` are real font names (not `...` or empty)
- `typography.google_fonts_url` is a complete URL
- `surfaces.treatment` is one of: flat, glass, gradient, noise, paper
- `surfaces.card_style` is non-empty, >= 20 chars
- `borders.default_width` is a CSS value (e.g. `1px`, `2px`, `4px`)
- `borders.character` is non-empty, >= 20 chars describing the border personality
- `motion.duration` is a CSS value (e.g. `200ms`, `0.3s`)
- `motion.easing` is a CSS value (e.g. `ease-out`, `cubic-bezier(...)`)

**Rules:**
- `composition` is non-empty, >= 30 chars
- `hierarchy` is non-empty, >= 30 chars
- `density` is non-empty, >= 20 chars
- `signature_patterns` has >= 3 items, EACH >= 30 chars, EACH describes a specific CSS technique

**Layout:**
- `grid` is non-empty, >= 20 chars
- `breakpoints` is non-empty
- `whitespace` is non-empty, >= 20 chars

**Guidance:**
- `do` has >= 3 items
- `dont` has >= 3 items

**DESIGN.md projection readiness:**
- colors, typography, spacing, radii, and components can be expressed in YAML front matter
- component guidance can reference existing tokens without broken `{group.key}` references
- markdown sections map cleanly to Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, and Do's and Don'ts

**If ANY check fails**: rewrite that section immediately. Do NOT proceed with incomplete specs — they produce generic, indistinguishable embodiments. The spec is the identity of the language; a weak spec means a weak embodiment.

### Tool Call 2+ — EMBODIMENT PHASE (Sandbox Visual Feedback Loop)

Review the spec you just wrote (your variables are still in scope). Generate a **self-contained HTML file** that manifests EVERY visual_character trait, EVERY signature_pattern, and uses the surfaces/borders/motion tokens.

The embodiment MUST be a single, self-contained HTML file:
- All CSS embedded in a `<style>` block (no external stylesheets except Google Fonts and optionally Tailwind CDN)
- Google Fonts loaded via `<link>` tags in the `<head>`
- Responsive media queries for desktop, tablet, and mobile
- CSS class-prefixed to avoid collisions (e.g., `.nk-*`, `.kp-*`)
- Interactive states via CSS pseudo-classes (`:hover`, `:focus`, `:disabled`, `:checked`)
- No JavaScript frameworks. Vanilla JS only, and only for interactive behaviors (tabs, modals, accordions, toggles)

**You MUST validate your output in the sandbox at three viewport sizes before publishing.** Follow this loop:

#### Step 1 — Generate HTML and write to sandbox

```python
html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>My Design Language</title>
  <style>
    /* CSS reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    select, input, textarea, button { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }

    /* Your design language CSS here — ALL layout in classes, responsive via media queries */
  </style>
</head>
<body>
  <!-- Scene-first design: a real application screen, not a component catalog -->
</body>
</html>'''
sandbox.write('/tmp/embodiment.html', html_code)
```

#### Step 2 — Install Playwright and screenshot at three viewports

```python
sandbox.bash('pip install playwright 2>&1 | tail -1')
sandbox.bash('playwright install chromium 2>&1 | tail -1')
```

Take screenshots at all three viewport sizes:

```python
sandbox.bash("""python3 -c "
from playwright.sync_api import sync_playwright

viewports = [
    {'name': 'desktop', 'width': 1440, 'height': 900},
    {'name': 'tablet',  'width': 768,  'height': 1024},
    {'name': 'mobile',  'width': 375,  'height': 812},
]

p = sync_playwright().start()
b = p.chromium.launch()

for vp in viewports:
    pg = b.new_page(viewport={'width': vp['width'], 'height': vp['height']})
    pg.goto('file:///tmp/embodiment.html')
    pg.wait_for_timeout(2000)
    pg.screenshot(path=f'/tmp/shot_{vp[\"name\"]}.png', full_page=True)
    pg.close()
    print(f'{vp[\"name\"]} screenshot saved ({vp[\"width\"]}x{vp[\"height\"]})')

b.close()
p.stop()
" 2>&1""")
```

#### Step 3 — Read all three screenshots and evaluate

```python
desktop_shot = sandbox.read('/tmp/shot_desktop.png')
tablet_shot = sandbox.read('/tmp/shot_tablet.png')
mobile_shot = sandbox.read('/tmp/shot_mobile.png')
```

The images flow to you automatically. Evaluate EACH viewport against these criteria:

**Desktop (1440px):**
- Full layout renders with intended column structure
- All 15 required UI elements visible and styled
- Every visual_character trait from philosophy is present
- Every signature_pattern from rules is visible
- Typography hierarchy is clear (heading vs body vs data fonts)
- Surfaces, borders, shadows match token definitions
- The design looks professional — not a template or unstyled default

**Tablet (768px):**
- Layout reflows appropriately (multi-column → fewer columns)
- No horizontal overflow or content cut-off
- Touch targets are adequate size (44px minimum)
- Typography remains readable without zooming
- Cards/panels stack or reflow sensibly

**Mobile (375px):**
- Single-column layout with full-width content
- No horizontal scroll (unless intentional for tables)
- Buttons stack full-width
- Typography scales down but remains readable
- Modal/dialog fits within viewport
- Navigation is accessible

#### Step 4 — Iterate until polished

**If ANY viewport fails evaluation**, fix the HTML, rewrite `/tmp/embodiment.html`, re-screenshot all three viewports, and re-evaluate. Common issues to fix:

- **Broken responsive**: Layout not reflowing → check media queries, ensure no inline `style` for layout
- **Unstyled form elements**: Browser defaults visible → apply explicit styles to all form controls
- **Generic look**: Swap the palette and it still looks the same → strengthen signature_patterns, add more structural CSS
- **Typography issues**: Font not loading → check Google Fonts URL; sizes wrong → check `clamp()` and scale_ratio
- **Alignment problems**: Inconsistent spacing → audit padding/margin against spacing tokens
- **Overflow on mobile**: Horizontal scroll → check for fixed-width elements, add `overflow-x: auto` wrappers

**Iterate until ALL THREE viewports look polished and fully express the design language.**

#### Step 5 — Publish to TemperFS

Only when all three viewports pass evaluation:

```python
result = temper.write('/katagami/embodiments/' + slug + '.html', html_code)
temper.action('DesignLanguages', eid, 'AttachEmbodiment', {
    'embodiment_file_id': result['file_id'],
    'element_count': '15',
    'composition_count': '5',
    'embodiment_format': 'html'
})
temper.action('DesignLanguages', eid, 'SetLineage', {
    'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
})
# Submit for quality review (pipeline will auto-review and publish)
temper.action('DesignLanguages', eid, 'SubmitForReview', {})
```

Do not call `AttachDesignMd` in synthesize jobs. The quality_review job owns DESIGN.md linting, storage, and the publish gate.

For `evolve_language` jobs: read the parent language first, inherit base tokens, apply the requested modifications, and set lineage_type to 'evolution' with the parent's ID.

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
    review_input = json.dumps({
        'language_ids': created_ids,
        'query_id': query_id
    }, ensure_ascii=False)
    temper.action('CurationJobs', job_id, 'CompleteSynthesis', {
        'design_language_ids': json.dumps(created_ids),
        'review_input': review_input
    })
    temper.done("synthesize complete")
```

## Tooling Rules

- No `import` statements. A safe `json` helper is preloaded in the Monty REPL;
  use `json.dumps(...)` and `json.loads(...)` without importing.
- No `enumerate(..., start=...)` — use `for i in range(len(items)):` instead
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`, `sandbox.bash(cmd)`, `sandbox.write(path, content)`, `sandbox.read(path)`
- **ALL array and object parameters MUST use the preloaded `json.dumps(...)`.** NEVER use `str()` or Python repr — these produce single-quoted strings that break JSON parsing in the UI. Example: `json.dumps(['a', 'b'])` -> `'["a", "b"]'` (correct), NOT `str(['a', 'b'])` -> `"['a', 'b']"` (broken).
- String literals containing quotes MUST use proper escaping. Prefer single-quoted strings for JSON content.

## Output

Job output JSON must include:
- `language_ids` — array of created DesignLanguage entity IDs

Typed completion params:
- `synthesize` uses `CompleteSynthesis` with `design_language_ids` and `review_input`
- `regenerate_embodiment` uses `CompleteRegeneration`
- `evolve_language` uses `CompleteEvolution`
