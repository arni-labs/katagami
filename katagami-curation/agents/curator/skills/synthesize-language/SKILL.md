# Synthesize Language

Create a complete DesignLanguage entity with all spec sections and a self-contained HTML embodiment.

## When to Use

Job types: `synthesize`, `evolve_language`, `regenerate_embodiment`

## Regeneration Mode

When the job type is `regenerate_embodiment` and the input contains `existing_language_id`:

1. Read the existing DesignLanguage: `temper.get('DesignLanguages', existing_language_id)`
2. Read ALL spec sections from the entity fields (Philosophy, Tokens, Rules, Layout, Guidance)
3. If the language is in `Published` state, call `Revise` first:
   ```python
   temper.action('DesignLanguages', eid, 'Revise', {'curator_notes': 'Regenerating embodiment as TSX with Radix UI'})
   ```
4. **Skip the SPEC PHASE** — use the existing spec sections as-is
5. Go directly to the **EMBODIMENT PHASE** below
6. Use the entity's `visual_character`, `signature_patterns`, and all tokens to generate the TSX
7. After `AttachEmbodiment`, call `SubmitForReview` + `Publish` to re-publish

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

### Tool Call 2+ — EMBODIMENT PHASE (Sandbox Compile + Visual Feedback Loop)

Review the spec you just wrote (your variables are still in scope). Generate a **TSX component** using **Radix UI primitives** that manifests EVERY visual_character trait, EVERY signature_pattern, and uses the surfaces/borders/motion tokens.

The embodiment MUST be a self-contained TSX component that exports a default React component. Use `@radix-ui/themes` and other Radix primitives for structure (Card, Flex, Grid, Text, Heading, Button, Badge, etc.) with Tailwind CSS for custom styling on top.

**You MUST validate your output in the sandbox before publishing.** Follow this loop:

#### Step 1 — Generate TSX and write to sandbox

```python
tsx_code = '''
import React from "react";
import { Theme, Card, Flex, Text, Heading, Button, Badge, Grid } from "@radix-ui/themes";
// ... your full TSX component using Radix UI ...
export function MyDesignLanguage() {
  return <Theme><div>...</div></Theme>;
}
export default MyDesignLanguage;
'''
sandbox.write('/tmp/embodiment.tsx', tsx_code)
```

#### Step 2 — Install dependencies and compile

```python
sandbox.bash('cd /tmp && npm init -y && npm install react react-dom @radix-ui/themes typescript @types/react @types/react-dom 2>&1 | tail -3')
sandbox.bash('cd /tmp && npx tsc --jsx react-jsx --module esnext --moduleResolution node --esModuleInterop --noEmit --skipLibCheck embodiment.tsx 2>&1')
```

If compilation fails, read the errors, fix the TSX, write it again, and re-compile. **Do not proceed until tsc reports zero errors.**

#### Step 3 — Render with Playwright and take a screenshot

```python
# Create a minimal HTML wrapper that loads the component
wrapper_html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 24px; }</style>
</head><body><div id="root"></div>
<script type="module">
import React from "https://esm.sh/react@18";
import ReactDOM from "https://esm.sh/react-dom@18/client";
import { Theme } from "https://esm.sh/@radix-ui/themes@3";
// Inline your rendered HTML here as static markup for screenshot purposes
</script></body></html>'''

# For visual validation, generate a STATIC HTML version of your component
# that uses the same design tokens and visual patterns
static_html = '<your component rendered as static HTML with inline styles and Tailwind classes>'
sandbox.write('/tmp/preview.html', static_html)

sandbox.bash('pip install playwright 2>&1 | tail -1')
sandbox.bash('playwright install chromium 2>&1 | tail -1')
sandbox.bash("""python3 -c "
from playwright.sync_api import sync_playwright
p = sync_playwright().start()
b = p.chromium.launch()
pg = b.new_page(viewport={'width': 1280, 'height': 900})
pg.goto('file:///tmp/preview.html')
pg.wait_for_timeout(2000)
pg.screenshot(path='/tmp/shot.png', full_page=True)
b.close()
p.stop()
print('Screenshot saved')
" 2>&1""")
```

#### Step 4 — Read screenshot and visually evaluate

```python
screenshot = sandbox.read('/tmp/shot.png')
# The image flows to you automatically. Evaluate:
# - Does it express EVERY visual_character trait from the philosophy?
# - Are the signature_patterns visible?
# - Is the typography polished (proper sizes, weights, line-height)?
# - Do surfaces, borders, and motion tokens match the spec?
# - Is alignment and spacing consistent?
# - Does it look professional-grade, not like a generic template?
```

**If the visual quality is not satisfactory**, update the TSX, rewrite `/tmp/embodiment.tsx`, re-compile, re-render, re-screenshot, and re-evaluate. **Iterate until the embodiment looks polished and fully expresses the design language.**

#### Step 5 — Publish to TemperFS

Only when compilation succeeds AND visual evaluation passes:

```python
result = temper.write('/katagami/embodiments/' + slug + '.tsx', tsx_code)
temper.action('DesignLanguages', eid, 'AttachEmbodiment', {
    'embodiment_file_id': result['file_id'],
    'element_count': '15',
    'composition_count': '5',
    'embodiment_format': 'tsx'
})
temper.action('DesignLanguages', eid, 'SetLineage', {
    'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
})
# Auto-publish: guards verify all sections + embodiment exist
temper.action('DesignLanguages', eid, 'SubmitForReview', {})
temper.action('DesignLanguages', eid, 'Publish', {})
```

For `evolve_language` jobs: read the parent language first, inherit base tokens, apply the requested modifications, and set lineage_type to 'evolution' with the parent's ID.

### Final Tool Call

```python
output = json.dumps({'language_ids': created_ids}, ensure_ascii=False)
temper.action('CurationJobs', job_id, 'Complete', {'output': output})
temper.done("synthesize complete")
```

## Tooling Rules

- No `import` statements
- No `enumerate(..., start=...)` — use `for i in range(len(items)):` instead
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`, `sandbox.bash(cmd)`, `sandbox.write(path, content)`, `sandbox.read(path)`
- Always serialize JSON with `json.dumps(...)`
- String literals containing quotes MUST use proper escaping. Prefer single-quoted strings for JSON content.

## Output

Job output JSON must include:
- `language_ids` — array of created DesignLanguage entity IDs
