# Artifact publishing phase

## PREFERRED: one-call publish via AuthorComplete (synthesize flow)

When you have BUILT AND VERIFIED every artifact (all files uploaded via
temper.write and confirmed Ready), publish the entire language in ONE call
instead of the per-slot attach ladder:

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
Files must already be Ready — the cross-entity guards and the finalizer still
verify everything. Use the per-slot Attach* ladder below ONLY when repairing or
regenerating individual artifacts on an existing language.

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

