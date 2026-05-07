# Synthesize Language

Create a complete DesignLanguage entity with all spec sections and a self-contained HTML embodiment, visually verified at three viewport sizes.

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
6. After `AttachEmbodiment` and `AttachThumbnail`, call `SubmitForReview`

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

## Execution Discipline

- NEVER create, modify, or delete Taxonomy entities.
- Each session creates ONE language.
- EVERY tool call must create or populate a DesignLanguage. No exploration turns.
- You MUST create ALL languages listed in the scope before stopping.

## SPEC PHASE

Create the entity and write ALL spec sections via `SetSpec`. New synthesis must
use `SetSpec` once for the core spec instead of many small setter actions:

```python
slug = 'my-language-slug'
name = 'My Language Name'
lang = temper.create('DesignLanguages', {'Id': slug})
eid = lang['entity_id']
```

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

### Spec Validation Gate

Do NOT proceed to embodiment until every check passes:

- **Philosophy**: `summary` >= 50 chars, `values` >= 3, `anti_values` >= 2, `visual_character` >= 3 items each >= 30 chars describing concrete CSS choices
- **Tokens**: all 12 color keys with real hex values, real font names, complete google_fonts_url, surfaces/borders/motion fully specified
- **Rules**: `composition` >= 30 chars, `hierarchy` >= 30 chars, `density` >= 20 chars, `signature_patterns` >= 3 items each >= 30 chars
- **Layout**: `grid` >= 20 chars, `breakpoints` non-empty, `whitespace` >= 20 chars
- **Guidance**: `do` >= 3 items, `dont` >= 3 items

If any check fails, rewrite that section immediately.

## EMBODIMENT PHASE

Generate a self-contained HTML file that manifests every `visual_character` trait, every `signature_pattern`, and uses the surfaces/borders/motion tokens.

### Step 1 — Write HTML to sandbox

```python
html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="..." rel="stylesheet">
  <title>Language Name</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    select, input, textarea, button { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }
    /* Design language CSS — all layout in classes, responsive via media queries */
  </style>
</head>
<body>
  <!-- Scene-first: a real application screen -->
</body>
</html>'''
sandbox.write('/tmp/embodiment.html', html_code)
```

### Step 2 — Screenshot at three viewports

```python
sandbox.bash('pip install playwright 2>&1 | tail -1')
sandbox.bash('playwright install chromium 2>&1 | tail -1')
sandbox.bash("""python3 -c "
from playwright.sync_api import sync_playwright
viewports = [
    {'name': 'desktop', 'width': 1440, 'height': 960},
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
b.close()
p.stop()
" 2>&1""")
```

### Step 3 — Evaluate

```python
desktop_shot = sandbox.read('/tmp/shot_desktop.png')
tablet_shot = sandbox.read('/tmp/shot_tablet.png')
mobile_shot = sandbox.read('/tmp/shot_mobile.png')
```

Check each viewport: layout integrity, all 15+ elements styled, visual_character and signature_patterns visible, typography hierarchy clear, tokens applied, responsive reflow correct, no browser defaults, professional quality.

### Step 4 — Iterate until polished

Fix issues, rewrite, re-screenshot, re-evaluate. Repeat until all three viewports look polished.

### Step 5 — Generate and verify the gallery thumbnail

After the final embodiment HTML passes all visual checks, generate a static
desktop thumbnail from the same `/tmp/embodiment.html`. This is mandatory for
`synthesize`, `regenerate_embodiment`, and `evolve_language`.

The thumbnail must be a stable desktop viewport crop, not a full-page strip:

- Capture viewport: `1440x960`
- Output file: `/tmp/thumbnail_desktop.jpg`
- Output dimensions: `600x400`
- Output format: JPEG, quality around `74`
- Stored PawFS file MIME metadata: `image/jpeg`
- Safety: disable animations/transitions before capture so the gallery image is
  deterministic.

```python
sandbox.bash('pip install pillow 2>&1 | tail -1')
sandbox.bash("""python3 -c "
from playwright.sync_api import sync_playwright
from PIL import Image

safety_css = '''
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
html, body {
  max-height: 1800px !important;
  overflow: hidden !important;
}
'''

p = sync_playwright().start()
b = p.chromium.launch()
pg = b.new_page(viewport={'width': 1440, 'height': 960})
pg.goto('file:///tmp/embodiment.html')
pg.add_style_tag(content=safety_css)
pg.wait_for_timeout(1000)
pg.screenshot(path='/tmp/thumbnail_source.jpg', type='jpeg', quality=84, full_page=False)
pg.close()
b.close()
p.stop()

img = Image.open('/tmp/thumbnail_source.jpg')
img = img.resize((600, 400), Image.Resampling.LANCZOS)
img.save('/tmp/thumbnail_desktop.jpg', 'JPEG', quality=74, optimize=True)

check = Image.open('/tmp/thumbnail_desktop.jpg')
assert check.size == (600, 400), check.size
assert check.format == 'JPEG', check.format
print('thumbnail ok: 600x400 JPEG')
" 2>&1""")
thumbnail_bytes = sandbox.read('/tmp/thumbnail_desktop.jpg')
```

If thumbnail generation, resizing, or verification fails, fix the embodiment or
the screenshot command and retry. Do not attach a missing, blank, wrong-size, or
non-JPEG thumbnail.

### Step 6 — Publish artifacts

```python
result = temper.write('/katagami/embodiments/' + slug + '.html', html_code)
temper.action('DesignLanguages', eid, 'AttachEmbodiment', {
    'embodiment_file_id': result['file_id'],
    'element_count': '15',
    'composition_count': '5',
    'embodiment_format': 'html'
})
thumbnail_result = temper.write('/katagami/thumbnails/' + slug + '/desktop.jpg', thumbnail_bytes)
temper.action('DesignLanguages', eid, 'AttachThumbnail', {
    'thumbnail_file_id': thumbnail_result['file_id']
})
temper.action('DesignLanguages', eid, 'SetLineage', {
    'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
})
temper.action('DesignLanguages', eid, 'SubmitForReview', {})
```

For `evolve_language`: read the parent first, inherit base tokens, apply modifications, set lineage_type to 'evolution'.

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

- The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
  without importing it. Other imports are not available.
- No `enumerate(..., start=...)` — use `for i in range(len(items)):` instead
- **ALL array/object params MUST use `json.dumps(...)`.** Never `str()` or Python repr.
- String literals containing quotes must use proper escaping.

## Output

- `language_ids` — array of created DesignLanguage entity IDs
- `synthesize` → `CompleteSynthesis` with `design_language_ids` and `review_input`
- `regenerate_embodiment` → `CompleteRegeneration`
- `evolve_language` → `CompleteEvolution`
