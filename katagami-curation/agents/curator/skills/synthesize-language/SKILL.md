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

## Execution Discipline

- NEVER create, modify, or delete Taxonomy entities.
- Each session creates ONE language.
- EVERY tool call must create or populate a DesignLanguage. No exploration turns.
- You MUST create ALL languages listed in the scope before stopping.

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

Generate the portable DESIGN.md artifact from the same native Katagami fields
you just wrote. The finalizer verifies the attached file and lint metadata; it
does not generate or repair DESIGN.md for you.

The DESIGN.md must include valid frontmatter, token references, component
semantics, and the `## shadcn/ui Usage` section described above. Write it to
`/tmp/DESIGN.md` in the sandbox, then run the no-network Katagami contract
checker with `python3`. Do not use `npx`, package installs, or networked lint
tools in production sessions:

```python
lint_script = r'''
json_module = __import__('json')
pathlib = __import__('pathlib')
re = __import__('re')

path = pathlib.Path('/tmp/DESIGN.md')
text = path.read_text(encoding='utf-8') if path.exists() else ''
errors = []
warnings = []

def error(code, message):
    errors.append({'code': code, 'message': message})

if not text.strip():
    error('empty_design_md', 'DESIGN.md is empty')
elif not text.startswith('---\n'):
    error('missing_frontmatter', 'DESIGN.md must start with YAML frontmatter')
else:
    close = text.find('\n---', 4)
    if close == -1:
        error('missing_frontmatter_close', 'YAML frontmatter must be closed')
        frontmatter = ''
    else:
        frontmatter = text[4:close]
    for key in ['version:', 'name:', 'description:', 'colors:', 'typography:', 'rounded:', 'spacing:', 'components:']:
        if key not in frontmatter:
            error('missing_frontmatter_key', f'frontmatter missing {key}')

for heading in ['## Overview', '## Colors', '## Typography', '## Layout', '## Components', "## Do's and Don'ts", '## shadcn/ui Usage']:
    if heading not in text:
        error('missing_section', f'missing {heading}')

for ref in ['/language/{language_id}/DESIGN.with-shadcn.md', '/shadcn.json', '/shadcn-components.md', '/shadcn-shots.json', '@/components/ui/*']:
    if ref not in text:
        error('missing_shadcn_reference', f'missing {ref}')

if len(re.findall(r'#[0-9a-fA-F]{6}\b', text)) < 8:
    error('insufficient_color_tokens', 'include at least eight concrete hex color tokens')
if 'fonts.googleapis.com' not in text:
    error('missing_google_fonts_url', 'include the production Google Fonts URL')
if re.search(r'\b(TBD|TODO|lorem ipsum|placeholder)\b', text, re.IGNORECASE):
    error('placeholder_text', 'remove placeholder text before attaching DESIGN.md')

print(json_module.dumps({
    'tool': 'katagami-design-md-contract',
    'format': 'json',
    'summary': {'errors': len(errors), 'warnings': len(warnings)},
    'errors': errors,
    'warnings': warnings,
}, ensure_ascii=False))
'''.replace('\n     ', '\n').lstrip()
sandbox.write('/tmp/katagami_design_md_lint.py', lint_script)
lint_output = sandbox.bash('python3 /tmp/katagami_design_md_lint.py')
start = lint_output.find('{')
end = lint_output.rfind('}') + 1
lint_result = json.loads(lint_output[start:end])
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
    'design_md_format_version': 'alpha'
})
```

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
browser_setup_log = sandbox.bash("""set -eu
python3 -m pip install --quiet playwright pillow
python3 -m playwright install chromium >/dev/null
python3 - <<'PY'
from playwright.sync_api import sync_playwright
p = sync_playwright().start()
b = p.chromium.launch()
b.close()
p.stop()
print('playwright ready')
PY
""")
assert '[exit code: 0]' in browser_setup_log and 'playwright ready' in browser_setup_log, browser_setup_log

shot_log = sandbox.bash("""python3 - <<'PY'
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
    pg.screenshot(path=f'/tmp/shot_{vp["name"]}.png', full_page=True)
    pg.close()
b.close()
p.stop()
print('shots ok')
PY
""")
assert '[exit code: 0]' in shot_log and 'shots ok' in shot_log, shot_log
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
thumb_log = sandbox.bash("""python3 - <<'PY'
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
PY
""")
assert '[exit code: 0]' in thumb_log and 'thumbnail ok: 600x400 JPEG' in thumb_log, thumb_log
thumbnail_bytes = sandbox.read('/tmp/thumbnail_desktop.jpg', binary=True)
assert isinstance(thumbnail_bytes, dict) and thumbnail_bytes.get('__temperpaw_image') is True, 'thumbnail read must return a sandbox image result'
assert thumbnail_bytes.get('media_type') == 'image/jpeg', thumbnail_bytes
```

If thumbnail generation, resizing, or verification fails, fix the embodiment or
the screenshot command and retry. Do not attach a missing, blank, wrong-size, or
non-JPEG thumbnail. Do not call `VerifyThumbnail` directly; the CurationJob
finalizer reads the attached `thumbnail_file_id`, rejects base64 text payloads,
and marks `VerifyThumbnail`. You DO own `SubmitForReview` — see the
**DRIVE-TO-REVIEW PHASE** below: after every artifact is attached you drive each
language to `UnderReview` yourself, repairing whatever its guard names as
missing, before completing the job.

### Step 6 — Publish artifacts

```python
def require_ready_file(write_result, artifact_kind):
    file_id = write_result['file_id']
    file = temper.get('Files', file_id)
    fields = file.get('fields', file)
    status = file.get('status') or file.get('Status') or fields.get('Status')
    path = fields.get('Path') or fields.get('path')
    name = fields.get('Name') or fields.get('name')
    mime_type = fields.get('MimeType') or fields.get('mime_type')
    size_bytes = fields.get('SizeBytes') or fields.get('size_bytes')
    assert status == 'Ready', f'{artifact_kind} file {file_id} is {status}, expected Ready'
    assert path and name and mime_type and size_bytes, file
    return file_id

result = temper.write({
    'path': '/katagami/embodiments/' + slug + '.html',
    'content': html_code,
    'mime_type': 'text/html'
})
embodiment_file_id = require_ready_file(result, 'embodiment')
temper.action('DesignLanguages', eid, 'AttachEmbodiment', {
    'embodiment_file_id': embodiment_file_id,
    'element_count': '15',
    'composition_count': '5',
    'embodiment_format': 'html'
})
thumbnail_result = temper.write({
    'path': '/katagami/thumbnails/' + slug + '/desktop.jpg',
    'content': thumbnail_bytes,
    'mime_type': 'image/jpeg'
})
thumbnail_file_id = require_ready_file(thumbnail_result, 'thumbnail')
temper.action('DesignLanguages', eid, 'AttachThumbnail', {
    'thumbnail_file_id': thumbnail_file_id
})
temper.action('DesignLanguages', eid, 'SetLineage', {
    'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
})
```

Do not attach a file ID until `require_ready_file(...)` passes. If a write
returns anything other than a Ready File with usable metadata, retry the write or
fail the job with the file response as evidence.

`AttachEmbodiment` invalidates DESIGN.md verification booleans because the
portable projection must represent the final language state. After
`AttachEmbodiment`, `AttachThumbnail`, and `SetLineage` have succeeded, rerun the
DESIGN.md checker and call `AttachDesignMd` again with the latest markdown and
lint JSON. This post-embodiment DESIGN.md attachment is mandatory; do not rely on
the earlier sandbox validation attachment.

For `evolve_language`: read the parent first, inherit base tokens, apply modifications, set lineage_type to 'evolution'.

### Step 7 — Publish shadcn/ui component artifacts

The shadcn registry theme, component recipes, and preview shots are
first-class, agent-authored language artifacts. They should make the shadcn
preview feel designed, not merely token-mapped. The finalizer only reads and
verifies the attached files.

Create `/katagami/shadcn/{slug}/registry-theme.json` with a shadcn
`registry:theme` payload derived from the native Katagami tokens. The JSON must
include `type: "registry:theme"`, `cssVars`, and `componentManifest`, and it
must preserve enough manifest metadata for the UI preview to explain the
projection.

Create `/katagami/shadcn/{slug}/components.md` with:

- `# {Language Name} shadcn/ui Components`
- `## Intent`
- `## Required primitives`
- `## Token cues`
- `## Visual character to preserve`
- `## ShadSync visual profile`
- `## Signature component recipes`
- `## Preview shots`
- `## Implementation contract`
- `## Copy-paste component example`

The recipes must cover `button`, `card`, `input`, `textarea`, `select`,
`dialog`, `sheet`, `tabs`, `badge`, `separator`, `checkbox`, `switch`,
`slider`, `tooltip`, `dropdown-menu`, and `table`. It must include a
`ShadSync visual profile` section. The recipes must translate the language's
actual `visual_character`, `signature_patterns`, surfaces, borders, density,
focus, and motion into shadcn component usage.

Create `/katagami/shadcn/{slug}/preview-shots.json` with artifact
`katagami:shadcn-preview-shots`, version `preview-shots-v1`, schema
`katagami:shadcn-preview-shots/renderable-v1`, `renderable: true`, at least
three shots (`application-shell`, `detail-editor`, `data-operations`), a
top-level `visualProfile` object, and a `componentRecipes` array covering every
required primitive. Each shot must name the shadcn primitives used, composition,
must-show states, avoid rules, and a renderable `scene` object with `eyebrow`,
`headline`, `description`, action labels, and concrete `stats`, `fields`, or
`rows` data. The language page renders these scene objects and the
`visualProfile` directly on local shadcn-style primitives, so do not leave
preview shots as generic prose-only notes.

`visualProfile` is required art direction data, not documentation. Use values
derived from the actual language: `family`, `material`, `contour`, `border`,
`underlay`, `grain`, `stickerBadges`, `motion`, `density`, and `accents`.
Example for a collage language: `family: "paper-collage"`,
`material: "paper"`, `contour: "blob"`, `border: "dashed"`,
`underlay: true`, `grain: true`, `stickerBadges: true`,
`motion: "lift-rotate"`, `density: "balanced"`.
Keep the rendered shots clean. `contour` is decorative art direction, not a
license to make every card, sheet, and table a novelty shape. Define one
coherent shape scale in the recipes: container/card radius, control/field
radius, and pill/badge radius. The three preview shots must look like polished
product screenshots, not shadcn component inventory walls: use realistic
content, stable spacing, hierarchy, and one or two distinctive signature
patterns from the language.

```python
registry_theme_result = temper.write('/katagami/shadcn/' + slug + '/registry-theme.json', json.dumps(registry_theme, ensure_ascii=False, indent=2))
temper.action('DesignLanguages', eid, 'AttachShadcnExport', {
    'shadcn_export_file_id': registry_theme_result['file_id'],
    'shadcn_export_format_version': 'registry-theme-v1',
    'shadcn_export_manifest': json.dumps({
        'artifact': 'katagami:shadcn-registry-theme',
        'version': 'registry-theme-v1',
        'author': 'katagami-agent',
        'generatedBy': 'katagami-agent',
        'type': 'registry:theme',
        'requiresComponentManifest': True
    }, ensure_ascii=False)
})

component_result = temper.write({
    'path': '/katagami/shadcn/' + slug + '/components.md',
    'content': shadcn_components_md,
    'mime_type': 'text/markdown',
})
component_spec_file_id = require_ready_file(component_result, 'shadcn_component_spec')
temper.action('DesignLanguages', eid, 'AttachShadcnComponentSpec', {
    'shadcn_component_spec_file_id': component_spec_file_id,
    'shadcn_component_spec_format_version': 'component-recipes-v1',
    'shadcn_component_spec_manifest': json.dumps({
        'artifact': 'katagami:shadcn-component-recipes',
        'version': 'component-recipes-v1',
        'author': 'katagami-agent',
        'generatedBy': 'katagami-agent',
        'requiresVisualProfile': True,
        'components': ['button', 'card', 'input', 'textarea', 'select', 'dialog', 'sheet', 'tabs', 'badge', 'separator', 'checkbox', 'switch', 'slider', 'tooltip', 'dropdown-menu', 'table'],
        'shots': ['application-shell', 'detail-editor', 'data-operations']
    }, ensure_ascii=False)
})

shots_result = temper.write({
    'path': '/katagami/shadcn/' + slug + '/preview-shots.json',
    'content': json.dumps(preview_shots, ensure_ascii=False, indent=2),
    'mime_type': 'application/json',
})
preview_shots_file_id = require_ready_file(shots_result, 'shadcn_preview_shots')
temper.action('DesignLanguages', eid, 'AttachShadcnPreviewShots', {
    'shadcn_preview_shots_file_id': preview_shots_file_id,
    'shadcn_preview_shots_format_version': 'preview-shots-v1',
    'shadcn_preview_shots_manifest': json.dumps({
        'artifact': 'katagami:shadcn-preview-shots',
        'version': 'preview-shots-v1',
        'author': 'katagami-agent',
        'generatedBy': 'katagami-agent',
        'schema': 'katagami:shadcn-preview-shots/renderable-v1',
        'renderable': True,
        'requiresVisualProfile': True,
        'shotIds': ['application-shell', 'detail-editor', 'data-operations'],
        'components': ['button', 'card', 'input', 'textarea', 'select', 'dialog', 'sheet', 'tabs', 'badge', 'separator', 'checkbox', 'switch', 'slider', 'tooltip', 'dropdown-menu', 'table']
    }, ensure_ascii=False)
})
```

Do not call `VerifyShadcnExport`, `VerifyShadcnComponentSpec`, or
`VerifyShadcnPreviewShots` directly. The finalizer marks those verifier-owned
states after it reads the attached files.

## COMPOSITION EMBODIMENTS PHASE (Landing + Dashboard) — required & gated

This is a **first-class, required phase**, gated identically to the element
embodiment. A `synthesize` / `evolve_language` job that does not attach a valid
Landing **and** Dashboard cannot pass review or publish — see the gate below.

Every design language ships **three** embodiments: the element embodiment (the
canonical-elements showcase, above) plus TWO bespoke full-screen composition
embodiments **unique to this language**, following the same `visual_character`,
`signature_patterns`, taste rules, type, layout, density, and tokens. They give
each language a real landing and a real dashboard a human can click through, and
they are what the Remix Studio recolors + fills.

- **Landing** (`/katagami/compositions/{slug}/landing.html`) — a real marketing
  landing screen. Lead with a **full-bleed hero image** at the top (today's
  trend): a section whose `background-image: var(--hero-image)` covers the
  viewport top, with the headline/CTA overlaid on a scrim. This is the priority
  placement for the single large image.
- **Dashboard** (`/katagami/compositions/{slug}/dashboard.html`) — a real app
  dashboard (sidebar nav, stat cards, a chart, a table or empty-state). UI-led;
  no hero image required.

These are **remixable**, so they MUST be tokenized — bake the language's
identity (type, layout, density, treatment) into the HTML, but read every COLOR
from CSS custom properties so the studio can recolor with any palette and inject
any art image:

```
:root{ --bg --surface --text --muted --border --accent --on-accent
       --success --warning --error --info --hero-image }
```

Define sensible defaults in `:root` (the language's own colors), use only those
vars (`var(--…)`) for color, and use `var(--hero-image)` for the landing's
full-bleed hero. Self-contained HTML, same safety rules as the element
embodiment.

### Visual verification (same rigor as the element embodiment)

Before attaching, write each composition to the sandbox, screenshot it at desktop
width, and **evaluate** it the same way you evaluated the element embodiment:
the landing's hero must read full-bleed; type, spacing, and treatment must match
this language's `visual_character`; the dashboard must look like a real product
screen, not a wireframe. Iterate until both are polished. A Swiss-grid landing
and a warm-editorial landing must look like **different products**, not one
template recolored.

```python
landing = temper.write('/katagami/compositions/' + slug + '/landing.html', landing_html)
dashboard = temper.write('/katagami/compositions/' + slug + '/dashboard.html', dashboard_html)
temper.action('DesignLanguages', eid, 'AttachCompositions', {
    'landing_file_id': landing['file_id'],
    'dashboard_file_id': dashboard['file_id'],
})
```

### Gate (finalizer-enforced — do not skip)

`AttachCompositions` is an `input` you fire; **`VerifyCompositions` is
finalizer-owned — do NOT call it.** On job completion the CurationJob finalizer:

1. Reads **both** the `landing_file_id` and `dashboard_file_id` files.
2. Rejects either that is not self-contained HTML, or that is **not tokenized**
   (no `var(--…)` color usage), or a Landing **missing the `--hero-image`** slot.
3. Dispatches `VerifyCompositions`, flipping `compositions_verified` true.

`SubmitForReview` and `Publish` both now guard on `has_compositions` +
`compositions_verified`, and the `Published` state asserts both invariants
(`PublishedRequiresCompositions`, `PublishedRequiresVerifiedCompositions`). So a
language with a missing, untokenized, or hero-less composition is held back for
remediation exactly like a bad element embodiment — it will not publish.

## DRIVE-TO-REVIEW PHASE (self-heal loop)

You own `SubmitForReview`. Before completing a `synthesize` job you MUST drive
every language you created to `UnderReview` yourself. The CurationJob's
`CompleteSynthesis` guard rejects the completion while any language is still
`Draft`, so completing without submitting just bounces back to you. Skipping this
is not an option — there is no finalizer fallback that submits for you.

`direction_id` and `query_id` come from this synthesize job's input (the
`synth_input` the source_search agent built); parse them from the job input before
the loop so the Quarantine call can target THIS direction.

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
