# Regenerate Embodiment

Repair one existing DesignLanguage so the Katagami finalizer can verify and
publish it. This is the hot path for self-healing missing specs, invalid
embodiments, missing thumbnails, invalid DESIGN.md projections, and missing
shadcn/ui component artifacts.

Do not spend turns reading the full synthesis skill. This compact skill is the
authoritative repair contract for `regenerate_embodiment` jobs and for
`synthesize` / `evolve_language` validator repair turns when
`existing_language_id` or `contract_repair.existing_design_language_ids` is set.

The first rule: first tool call must load the job and language before any
documentation or artifact work.

## Synthesize / Evolve Repair Mode

When the CurationJob `job_type` is `synthesize` or `evolve_language` and the
input contains `existing_language_id` or `contract_repair`:

1. Do **not** create a new DesignLanguage.
2. Do **not** list, read, or inspect unrelated DesignLanguages for inspiration.
3. Repair the existing entity in place: spec gaps only if required, then
   embodiment HTML, desktop thumbnail, shadcn component artifacts.
4. Finish with the job's original typed completion action:
   - `synthesize` → `CompleteSynthesis`
   - `evolve_language` → `CompleteEvolution`

```python
created_ids = [eid]
if job_type == 'evolve_language':
    temper.action('CurationJobs', job_id, 'CompleteEvolution', {
        'design_language_ids': json.dumps(created_ids),
        'output': json.dumps({'language_ids': created_ids}, ensure_ascii=False)
    })
    temper.done("evolve_language complete")
else:
    review_input = json.dumps({'language_ids': created_ids, 'query_id': query_id}, ensure_ascii=False)
    temper.action('CurationJobs', job_id, 'CompleteSynthesis', {
        'design_language_ids': json.dumps(created_ids),
        'review_input': review_input
    })
    temper.done("synthesize complete")
```

## Inputs

- `existing_language_id` - required DesignLanguage entity id.
- `language_ids` - optional array; use only entity ids.
- `all_language_ids` - optional parent repair set.
- `artifact_repair_attempt` - current repair attempt count.
- `repair_reason` - optional finalizer evidence.

The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
without importing.

## First Tool Call

Run one self-contained `execute` call that loads the job, input, and language:

```python
job = temper.get('CurationJobs', job_id)
job_fields = job.get('fields', job)
raw_input = job_fields.get('input') or job_fields.get('Input') or '{}'
job_input = json.loads(raw_input) if isinstance(raw_input, str) and raw_input else {}
eid = job_input.get('existing_language_id') or (job_input.get('language_ids') or [None])[0]
assert eid, 'regenerate_embodiment requires existing_language_id'
lang = temper.get('DesignLanguages', eid)
fields = lang.get('fields', lang)
```

Do not call `temper.read('/agents/curator/skills/synthesize-language/SKILL.md')`.
Do not spend a turn printing documentation chunks. Do not stop after reading.

## Repair Contract

1. If the language is `Published`, first call `Revise`.
2. Rebuild any incomplete native spec sections with `SetSpec`. If the existing
   spec is empty, infer a complete language from the title, slug, tags, current
   artifacts, and `repair_reason`; regeneration is allowed to create the missing
   design language content that review refused to invent.
3. Write a self-contained HTML embodiment to sandbox, screenshot it, and iterate
   until it renders as a polished app screen at desktop, tablet, and mobile.
4. Generate a deterministic desktop gallery thumbnail from the final HTML:
   `600x400`, JPEG, MIME `image/jpeg`.
5. Write artifacts through PawFS and verify every returned File with
   `temper.get('Files', file_id)` before attaching it.
6. Attach embodiment, thumbnail, shadcn component recipes, and shadcn preview
   shots. The finalizer owns deterministic DESIGN.md and shadcn registry-theme
   projection.
7. Dispatch `CompleteRegeneration`, then call `temper.done(...)`.

## Minimal Spec Shape

Use `SetSpec` once when the native spec is missing or too thin:

```python
name = fields.get('Name') or fields.get('name') or 'Repaired Design Language'
slug = fields.get('Slug') or fields.get('slug') or name.lower().replace(' ', '-')
philosophy = {
    'summary': 'A repaired Katagami design language with concrete visual structure and production UI intent.',
    'values': ['clear hierarchy', 'usable density', 'material consistency'],
    'anti_values': ['placeholder styling', 'unverified artifacts'],
    'visual_character': [
        'layered surfaces with explicit border rhythm and offset section rails',
        'dense knowledge-work composition with readable text-first hierarchy',
        'restrained accent color used for state, focus, and active navigation',
    ],
}
tokens = {
    'colors': {
        'primary': '#2F5D62', 'secondary': '#7A4E2D', 'accent': '#D48A3A',
        'background': '#F7F4EE', 'surface': '#FFFFFF', 'text': '#20201D',
        'muted': '#6F746F', 'border': '#D9D2C4', 'error': '#B33939',
        'success': '#2F7A4F', 'warning': '#B8791D', 'info': '#2F5D8C',
    },
    'typography': {
        'heading_font': 'Inter', 'body_font': 'Inter', 'mono_font': 'IBM Plex Mono',
        'base_size': '16px', 'scale_ratio': 1.2, 'line_height': 1.55,
        'letter_spacing': '0', 'google_fonts_url': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap',
    },
    'spacing': {'base': '8px', 'scale': [4, 8, 12, 16, 24, 32, 48, 64]},
    'radii': {'none': '0', 'sm': '4px', 'md': '8px', 'lg': '12px', 'full': '9999px'},
    'shadows': {'sm': '0 1px 2px rgba(20,20,18,.08)', 'md': '0 12px 28px rgba(20,20,18,.12)', 'lg': '0 24px 60px rgba(20,20,18,.16)'},
    'surfaces': {'treatment': 'flat layered panels', 'card_style': 'thin bordered cards', 'bg_pattern': 'subtle ruled grid'},
    'borders': {'default_width': '1px', 'accent_width': '3px', 'style': 'solid', 'character': 'quiet structural dividers'},
    'motion': {'duration': '160ms', 'easing': 'cubic-bezier(.2,.8,.2,1)', 'philosophy': 'fast state clarity'},
}
rules = {
    'composition': 'Use text-first work surfaces, persistent context rails, and compact cards.',
    'hierarchy': 'Lead with typographic scale and spacing, then use accent borders for active state.',
    'density': 'Keep information dense but grouped with stable gutters and table-like alignment.',
    'signature_patterns': [
        'left rule accents for active panels and selected rows',
        'compact metadata strips above content regions',
        'bordered white surfaces over a warm neutral ruled background',
    ],
}
layout = {'grid': '12 column desktop grid with two column tablet fallback', 'breakpoints': {'sm': 640, 'md': 768, 'lg': 1024}, 'whitespace': '8px spacing scale with 24px section rhythm'}
guidance = {'do': ['show real UI state', 'keep text readable', 'verify artifacts'], 'dont': ['ship placeholders', 'attach invalid thumbnails', 'use generic gradients']}
temper.action('DesignLanguages', eid, 'SetSpec', {
    'name': name,
    'slug': slug,
    'philosophy': json.dumps(philosophy, ensure_ascii=False),
    'tokens': json.dumps(tokens, ensure_ascii=False),
    'rules': json.dumps(rules, ensure_ascii=False),
    'layout_principles': json.dumps(layout, ensure_ascii=False),
    'guidance': json.dumps(guidance, ensure_ascii=False),
    'tags': json.dumps(['repair', 'artifact-ready', 'knowledge-work'], ensure_ascii=False),
})
```

Use better values than the defaults when the existing language provides enough
signal. The defaults are a recovery floor, not a creative target.

## Embodiment And Thumbnail

Create one self-contained HTML application screen. It must include real UI
state, at least 15 styled elements, responsive CSS, and no browser-default
controls. Use the repaired spec directly in CSS variables and visible structure.

```python
html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
  <title>Repaired Design Language</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, sans-serif; background: #F7F4EE; color: #20201D; }
    button, input, textarea, select { font: inherit; color: inherit; }
    .app { min-height: 100vh; display: grid; grid-template-columns: 280px 1fr; gap: 24px; padding: 24px; }
    .panel { background: #FFFFFF; border: 1px solid #D9D2C4; border-radius: 8px; box-shadow: 0 12px 28px rgba(20,20,18,.12); }
    .rail { padding: 20px; }
    .main { padding: 24px; display: grid; gap: 18px; }
    .active { border-left: 3px solid #D48A3A; padding-left: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .card { padding: 16px; border: 1px solid #D9D2C4; border-radius: 8px; background: #fff; }
    .meta { font-family: "IBM Plex Mono", monospace; font-size: 12px; color: #6F746F; text-transform: uppercase; }
    @media (max-width: 760px) { .app { grid-template-columns: 1fr; padding: 16px; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="app">
    <aside class="panel rail">
      <div class="meta">Katagami repair</div>
      <h1>Artifact Ready Language</h1>
      <p class="active">Embodiment, thumbnail, and component artifacts rebuilt from verified files.</p>
    </aside>
    <section class="panel main">
      <div class="meta">Workspace overview</div>
      <h2>Design operations board</h2>
      <div class="grid">
        <article class="card"><div class="meta">01</div><h3>Reference Loom</h3><p>Source notes are grouped into stable evidence bands.</p></article>
        <article class="card"><div class="meta">02</div><h3>Signal Ledger</h3><p>Review state is visible through quiet accent rules.</p></article>
        <article class="card"><div class="meta">03</div><h3>Publish Gate</h3><p>Ready files and thumbnails are treated as first-class artifacts.</p></article>
      </div>
    </section>
  </main>
</body>
</html>'''
sandbox.write('/tmp/embodiment.html', html_code)
```

Render and create the thumbnail in one bounded command:

```python
thumb_log = sandbox.bash("""set -eu
python3 -m pip install --quiet playwright pillow
python3 -m playwright install chromium >/dev/null
python3 - <<'PY'
from playwright.sync_api import sync_playwright
from PIL import Image
p = sync_playwright().start()
b = p.chromium.launch()
for name, size in [('desktop', (1440, 960)), ('tablet', (768, 1024)), ('mobile', (375, 812))]:
    pg = b.new_page(viewport={'width': size[0], 'height': size[1]})
    pg.goto('file:///tmp/embodiment.html')
    pg.wait_for_timeout(600)
    pg.screenshot(path=f'/tmp/shot_{name}.png', full_page=False)
    pg.close()
pg = b.new_page(viewport={'width': 1440, 'height': 960})
pg.goto('file:///tmp/embodiment.html')
pg.add_style_tag(content='*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}html,body{overflow:hidden!important}')
pg.wait_for_timeout(600)
pg.screenshot(path='/tmp/thumbnail_source.jpg', type='jpeg', quality=84, full_page=False)
pg.close()
b.close()
p.stop()
img = Image.open('/tmp/thumbnail_source.jpg').resize((600, 400), Image.Resampling.LANCZOS)
img.save('/tmp/thumbnail_desktop.jpg', 'JPEG', quality=74, optimize=True)
check = Image.open('/tmp/thumbnail_desktop.jpg')
assert check.size == (600, 400), check.size
assert check.format == 'JPEG', check.format
print('thumbnail ok')
PY
""")
assert '[exit code: 0]' in thumb_log and 'thumbnail ok' in thumb_log, thumb_log
thumbnail_bytes = sandbox.read('/tmp/thumbnail_desktop.jpg', binary=True)
assert isinstance(thumbnail_bytes, dict) and thumbnail_bytes.get('__temperpaw_image') is True, thumbnail_bytes
```

## File Verification

```python
def require_ready_file(write_result, artifact_kind):
    file_id = write_result['file_id']
    file = temper.get('Files', file_id)
    f = file.get('fields', file)
    status = file.get('status') or file.get('Status') or f.get('Status') or f.get('status')
    path = f.get('Path') or f.get('path')
    name = f.get('Name') or f.get('name')
    mime_type = f.get('MimeType') or f.get('mime_type')
    size_bytes = f.get('SizeBytes') or f.get('size_bytes')
    assert status == 'Ready', f'{artifact_kind} file {file_id} is {status}, expected Ready'
    assert path and name and mime_type and size_bytes, file
    return file_id
```

Never attach a file id until `require_ready_file(...)` passes.

## Required Actions

Attach the repaired artifacts:

```python
embodiment_result = temper.write({
    'path': '/katagami/embodiments/' + slug + '.html',
    'content': html_code,
    'mime_type': 'text/html',
})
embodiment_file_id = require_ready_file(embodiment_result, 'embodiment')
temper.action('DesignLanguages', eid, 'AttachEmbodiment', {
    'embodiment_file_id': embodiment_file_id,
    'element_count': '15',
    'composition_count': '5',
    'embodiment_format': 'html',
})

thumbnail_result = temper.write({
    'path': '/katagami/thumbnails/' + slug + '/desktop.jpg',
    'content': thumbnail_bytes,
    'mime_type': 'image/jpeg',
})
thumbnail_file_id = require_ready_file(thumbnail_result, 'thumbnail')
temper.action('DesignLanguages', eid, 'AttachThumbnail', {
    'thumbnail_file_id': thumbnail_file_id,
})
```

Also write and attach:

- `/katagami/shadcn/{slug}/components.md` via `AttachShadcnComponentSpec`.
- `/katagami/shadcn/{slug}/preview-shots.json` via `AttachShadcnPreviewShots`.

```python
shadcn_components_md = '# ' + name + ' shadcn/ui Components\n\n## Intent\nRepair-ready component recipes for buttons, cards, fields, dialogs, sheets, tabs, badges, tables, and feedback states.\n\n## Visual character to preserve\nUse the repaired spec tokens, left-rule active states, compact metadata strips, and bordered white surfaces.\n'
component_result = temper.write({
    'path': '/katagami/shadcn/' + slug + '/components.md',
    'content': shadcn_components_md,
    'mime_type': 'text/markdown',
})
component_spec_file_id = require_ready_file(component_result, 'shadcn_component_spec')
temper.action('DesignLanguages', eid, 'AttachShadcnComponentSpec', {
    'shadcn_component_spec_file_id': component_spec_file_id,
    'shadcn_component_spec_format_version': 'component-recipes-v1',
    'shadcn_component_spec_manifest': json.dumps({'artifact': 'katagami:shadcn-component-recipes', 'version': 'component-recipes-v1', 'components': ['button', 'card', 'input', 'textarea', 'select', 'dialog', 'sheet', 'tabs', 'badge', 'separator', 'checkbox', 'switch', 'slider', 'tooltip', 'dropdown-menu', 'table']}, ensure_ascii=False),
})
preview_shots = {
    'artifact': 'katagami:shadcn-preview-shots',
    'version': 'preview-shots-v1',
    'schema': 'katagami:shadcn-preview-shots/renderable-v1',
    'renderable': True,
    'visualProfile': {'family': 'repair-ready workspace', 'material': 'bordered panels', 'density': 'compact', 'accents': ['#D48A3A']},
    'shots': [
        {'id': 'application-shell', 'scene': {'headline': 'Repair console', 'description': 'Artifact status and review queue'}},
        {'id': 'detail-editor', 'scene': {'headline': 'Language detail', 'description': 'Spec fields and artifact links'}},
        {'id': 'data-operations', 'scene': {'headline': 'Publish checks', 'description': 'Ready files and verification table'}},
    ],
}
shots_result = temper.write({
    'path': '/katagami/shadcn/' + slug + '/preview-shots.json',
    'content': json.dumps(preview_shots, ensure_ascii=False, indent=2),
    'mime_type': 'application/json',
})
preview_shots_file_id = require_ready_file(shots_result, 'shadcn_preview_shots')
temper.action('DesignLanguages', eid, 'AttachShadcnPreviewShots', {
    'shadcn_preview_shots_file_id': preview_shots_file_id,
    'shadcn_preview_shots_format_version': 'preview-shots-v1',
    'shadcn_preview_shots_manifest': json.dumps({'artifact': 'katagami:shadcn-preview-shots', 'version': 'preview-shots-v1', 'renderable': True}, ensure_ascii=False),
})
```

## Completion

When the artifacts are attached:

```python
created_ids = [eid]
temper.action('CurationJobs', job_id, 'CompleteRegeneration', {
    'design_language_ids': json.dumps(created_ids),
    'output': json.dumps({'language_ids': created_ids}, ensure_ascii=False),
})
temper.done("regenerate_embodiment complete")
```

If the same operation fails three times with concrete evidence, dispatch `Fail`
with a short `error_message` and then `temper.done("regenerate_embodiment failed")`.
