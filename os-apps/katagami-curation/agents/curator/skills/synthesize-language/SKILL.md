# Synthesize Language

Create a complete DesignLanguage entity with all spec sections and a self-contained HTML embodiment.

## When to Use

Job types: `synthesize`, `evolve_language`

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

### Tool Call 2 — EMBODIMENT PHASE

Review the spec you just wrote (your variables are still in scope). Generate HTML that manifests EVERY visual_character trait, EVERY signature_pattern, and uses the surfaces/borders/motion tokens.

```python
html = '<full embodiment HTML>'
result = temper.write('/katagami/embodiments/' + slug + '.html', html)
temper.action('DesignLanguages', eid, 'AttachEmbodiment', {
    'embodiment_file_id': result['file_id'],
    'element_count': '15',
    'composition_count': '5'
})
temper.action('DesignLanguages', eid, 'SetLineage', {
    'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
})
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
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- Always serialize JSON with `json.dumps(...)`
- String literals containing quotes MUST use proper escaping. Prefer single-quoted strings for JSON content.

## Output

Job output JSON must include:
- `language_ids` — array of created DesignLanguage entity IDs
