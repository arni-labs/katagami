# Review Quality

Review and FIX design languages before publish. Do not write reports — read the spec, validate the DESIGN.md projection, author/verify first-class shadcn/ui component recipes and preview shots, fix any blocking spec/export issues, evaluate the embodiment, then regenerate the HTML fixing every issue.

## When to Use

Job type: `quality_review`

## Before Starting

Read the knowledge files in your workspace:
- `/system/knowledge/design-principles.md` — embodiment standards
- `/system/knowledge/quality-standards.md` — quality thresholds
- `/system/knowledge/feedback-log.md` — human feedback (may contain specific notes about target languages)

Load accepted taste rules before judging any language:
```python
accepted_taste_rules = temper.list('TasteRules', "Status eq 'Accepted'")
```
Use only Accepted rules. Positive rules describe patterns to preserve or
amplify; negative rules describe archive-derived anti-patterns to avoid.
Proposed, Rejected, and Superseded rules must have no effect on quality review.
Accepted TasteRules are the authoritative reusable design tests. The knowledge
files provide orientation and hard artifact context; do not recreate parallel
anti-slop checklists from prose.

## Process

For each language specified in the job input (or ALL languages if none specified):

1. **Load the DesignLanguage**: `temper.get('DesignLanguages', lang_id)`
2. **Normalize its entity shape before making any quality decision.** `temper.get(...)` returns a nested entity: `{entity_id, status, fields, booleans, counters}`. Do not read language data from top-level keys like `lang['embodiment_file_id']`; they will be missing even when the language is valid. Use the normalized `fields` bag for spec/file fields and the `booleans` bag only as a fallback for boolean state:

   ```python
   def entity_fields(entity):
       return entity.get('fields') or {}

   def entity_booleans(entity):
       return entity.get('booleans') or {}

   def field(entity, name, default=''):
       fields = entity_fields(entity)
       value = fields.get(name)
       if value is None:
           value = fields.get(''.join(part.capitalize() for part in name.split('_')))
       return default if value is None else value

   def bool_state(entity, name):
       fields = entity_fields(entity)
       booleans = entity_booleans(entity)
       value = fields.get(name)
       if value is None:
           value = fields.get(''.join(part.capitalize() for part in name.split('_')))
       if value is None:
           value = booleans.get(name)
       if value is None:
           value = booleans.get(''.join(part.capitalize() for part in name.split('_')))
       if isinstance(value, bool):
           return value
       return str(value).lower() == 'true'

   def json_field(entity, name, fallback):
       value = field(entity, name, '')
       if isinstance(value, dict) or isinstance(value, list):
           return value
       if not value:
           return fallback
       return json.loads(value)
   ```
3. **Read normalized fields**: Philosophy (especially `visual_character`), Tokens (especially surfaces/borders/motion), Rules (especially `signature_patterns`), Guidance, curator_notes, slug, embodiment_file_id, thumbnail_file_id.
4. **Fast path for already-reviewed languages**: If `bool_state(lang, 'quality_review_passed')` is true and both `field(lang, 'embodiment_file_id')` and `field(lang, 'thumbnail_file_id')` are present, first validate that the native spec fields are structurally coherent as described in the next step using `json_field(...)`. If the spec is coherent, do not regenerate the embodiment or thumbnail just to refresh derived artifacts. Do not call `temper.read` for the embodiment path, do not resolve TemperFS paths, do not run Playwright, and do not regenerate DESIGN.md on this path. Add the language to `fixed_ids` and continue to the next language. The CurationJob finalizer will verify the existing files by file ID, generate/verify deterministic DESIGN.md and shadcn registry theme when needed, generate/verify missing shadcn component artifacts, attach public assets, and publish through guarded internal actions.

   If the spec is not coherent, do **not** take the fast path and do **not** fail merely because a nested token subsection is incomplete. Continue into normal repair. Partial drift such as missing `tokens.typography.heading_font`, `body_font`, `mono_font`, `google_fonts_url`, or sparse `tokens.surfaces`/`borders`/`motion` is repairable in this job when the language still has enough identity in `name`, `description`, `philosophy`, `rules`, `layout_principles`, `guidance`, or its existing embodiment. If the language is currently `Published`, first call `temper.action('DesignLanguages', lang_id, 'Revise', {'curator_notes': 'Repairing incomplete native spec before quality finalization'})`, then repair with `SetTokens` or `SetSpec`; the finalizer will publish after validation.
5. **Published artifact review path**: If `lang['status'] == 'Published'`, treat the job as a review of existing artifacts unless you have found a concrete source-spec or embodiment defect that requires repair. A published language must not call `AttachDesignMd`, `AttachEmbodiment`, `AttachThumbnail`, `AttachShadcnComponentSpec`, or `AttachShadcnPreviewShots` directly. Those actions invalidate publish-required verification booleans and are not valid from `Published`. If the language has coherent native spec fields plus `embodiment_file_id`, `thumbnail_file_id`, `design_md_file_id`, and a clean `design_md_lint_result`, add the language to `fixed_ids` and continue; the finalizer will verify by file ID, mark quality, attach missing shadcn artifacts through the governed revise flow if needed, attach public assets, and leave it published. Only when an actual repair is required should you first call `Revise`, then use the normal Draft/UnderReview repair flow.
6. **Artifact handoff path for partially completed retries**: If `quality_review_passed` is false but the language is already `Draft` or `UnderReview` and has all three artifact fields (`embodiment_file_id`, `thumbnail_file_id`, `design_md_file_id`) plus a `design_md_lint_result` whose summary has `errors == 0` and `warnings == 0`, validate that the native spec is structurally coherent and that the existing embodiment file is a valid browser artifact before taking the handoff. Resolve `embodiment_file_id` through `temper.get('Files', embodiment_file_id)`, read its `Path` from its `WorkspaceId`, and reject the handoff if `embodiment_format == 'html'` and the file body lacks `<html` or `<!doctype`. SVG recovery placeholders, JSON errors, tiny stubs, or any non-HTML body are not valid embodiments for HTML languages. If the file is invalid, continue into normal repair and regenerate the embodiment and thumbnail. If both the spec and file body are coherent, do not regenerate the embodiment, thumbnail, or DESIGN.md just to repeat work from an earlier failed retry. Add the language to `fixed_ids` and continue. The finalizer will read the referenced files, verify thumbnails/embodiment/DESIGN.md by file ID, mark quality, attach public assets, and publish through guarded internal actions.
7. **Read the current embodiment when it exists**: If `embodiment_file_id` is present, resolve the `Files` entity and read its actual `Path` with its `WorkspaceId`; only fall back to `temper.read('/katagami/embodiments/' + slug + '.html')` when file metadata is unavailable. If it is missing, unreadable, or invalid for its `embodiment_format`, do not fail solely for that reason. Treat the embodiment as absent, validate the spec, and regenerate a fresh self-contained HTML embodiment from the Katagami fields.
8. **MANDATORY: Validate the native Katagami spec before evaluating the embodiment.** Parse each JSON field:
   - `philosophy.visual_character` must have >= 3 items, each >= 30 chars with concrete CSS choices
   - `tokens.colors` must have all 12 keys with real hex values
   - `tokens.typography` must have real font names and a google_fonts_url
   - `tokens.surfaces`, `tokens.borders`, `tokens.motion` must be populated
   - `rules.signature_patterns` must have >= 3 items, each >= 30 chars with specific CSS techniques
   - `guidance.do` >= 3 items, `guidance.dont` >= 3 items

   **Repair partial native spec drift in place**: When only nested fields are missing or too thin, preserve the existing language identity and fill the missing pieces with concrete tokens that match the already-authored spec and embodiment. Use `SetTokens` for token-only repairs; use `SetSpec` when multiple sections need coordinated updates. Do not invent a new language, rename it, or change its slug. After any spec repair, continue through DESIGN.md generation, embodiment/thumbnail verification, and typed completion normally.
   **If the spec is deeply empty or incoherent**: STOP. Do NOT invent a full language from nothing. Fail the job with a concrete error_message naming the invalid sections and instruct the caller to run `regenerate_embodiment` or `synthesize` first.
   **If only `embodiment_file_id` is missing but the spec is valid**: continue. This quality-review job is allowed to repair missing embodiment artifacts by creating and attaching a new embodiment and thumbnail before completion.
9. **MANDATORY: Generate and validate DESIGN.md when the language is Draft or UnderReview.** Katagami remains the source of truth; DESIGN.md is the required portable projection.
   - If the language is `Published`, do not execute this step unless you have already called `Revise` for a concrete repair. Reviewing a published language with existing clean artifacts means using the published artifact review path above, not re-attaching DESIGN.md.
   - Generate a DESIGN.md markdown string from the current Katagami fields.
   - YAML front matter must include `version: "alpha"`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, and `components`.
   - Markdown sections must include Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, and Do's and Don'ts when source data exists.
   - Preserve Katagami-only richness as extra markdown sections: Visual Character, Signature Patterns, Imagery Direction, Generative Canvas.
   - Write it to `/tmp/DESIGN.md` in the sandbox and run:
     ```python
     lint_json = sandbox.bash('npx @google/design.md lint --format=json /tmp/DESIGN.md')
     ```
   - Parse the linter JSON. If `summary.errors > 0` or `summary.warnings > 0`, repair the Katagami source fields causing the invalid projection, then regenerate and relint.
   - Warnings are blocking. Do not keep, record-and-continue, attach, or publish a DESIGN.md artifact with any lint warnings.
   - Repeat until there are ZERO lint errors and ZERO lint warnings.
   - Store the validated artifact:
     ```python
     design_md_result = temper.write('/katagami/design-md/' + slug + '/DESIGN.md', design_md)
     temper.action('DesignLanguages', lang_id, 'AttachDesignMd', {
         'design_md_file_id': design_md_result['file_id'],
         'design_md_lint_result': json.dumps(lint_result, ensure_ascii=False),
         'design_md_format_version': 'alpha'
     })
     ```
10. **Evaluate against the spec and Accepted TasteRules.** Fix every concrete
    violation before completion. Use the language's `curator_notes` first when
    present, then apply the Accepted TasteRules as the reusable visual quality
    bar. Hard artifact defects still require direct repair: missing spec
    sections, invalid DESIGN.md, unreadable embodiment files, stale shadcn
    component artifacts, missing responsive CSS, unstyled browser defaults, and
    broken alignment.
11. **Regenerate the embodiment as self-contained HTML.** Follow the sandbox visual feedback loop from the `synthesize-language` skill:
   - Write HTML to sandbox
   - Prepare and prove the browser runtime before any screenshot.
   - Do not run monolithic review tool calls. Split the work into short calls: one call to inspect/repair spec, one call to write DESIGN.md, one call for each browser setup/screenshot/thumbnail step, one call to write artifacts, and one call to complete the CurationJob. A single tool call must not generate DESIGN.md, generate HTML, install browsers, screenshot, write files, and complete the job all at once.
   - Do not run silent long commands. Any install, browser setup, screenshot, or lint command that might take more than 30 seconds must be split into smaller commands. Printing `echo` lines inside a long command is not enough if the tool only returns output after the command exits; each tool call must finish before the platform watchdog sees it as stalled with `tool execution made no progress`.

```python
browser_setup_log = sandbox.bash("""set -eux
echo '[katagami] installing browser dependencies'
python3 -m pip install playwright pillow
echo '[katagami] installing chromium'
python3 -m playwright install chromium
echo '[katagami] proving chromium launch'
python3 - <<'PY'
from playwright.sync_api import sync_playwright
p = sync_playwright().start()
b = p.chromium.launch()
b.close()
p.stop()
print('playwright ready')
PY
echo '[katagami] browser setup complete'
""")
assert '[exit code: 0]' in browser_setup_log and 'playwright ready' in browser_setup_log, browser_setup_log
```

   - Screenshot with Playwright at 3 viewports (desktop 1440x960, tablet 768px, mobile 375px)
   - Visually evaluate each viewport
   - Iterate until quality passes at all three sizes
12. **Generate and verify the gallery thumbnail.** After the final HTML passes
   review, create a static desktop thumbnail from the same `/tmp/embodiment.html`.
   This is mandatory for every quality review that writes or re-attaches an
   embodiment.

   The thumbnail must be a stable desktop viewport crop, not a full-page strip:
   - Capture viewport: `1440x960`
   - Output file: `/tmp/thumbnail_desktop.jpg`
   - Output dimensions: `600x400`
   - Output format: JPEG, quality around `74`
   - Stored PawFS file MIME metadata: `image/jpeg`
   - Safety: disable animations/transitions before capture so the gallery image is deterministic

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

   If thumbnail generation, resizing, or verification fails, fix the embodiment
   or screenshot command and retry. Do not attach a missing, blank, wrong-size,
   or non-JPEG thumbnail.
13. **Write and re-attach artifacts:**
   ```python
   result = temper.write('/katagami/embodiments/' + slug + '.html', new_html)
   temper.action('DesignLanguages', lang_id, 'AttachEmbodiment', {
       'embodiment_file_id': result['file_id'],
       'element_count': '15',
       'composition_count': '5',
       'embodiment_format': 'html'
   })
   thumbnail_result = temper.write('/katagami/thumbnails/' + slug + '/desktop.jpg', thumbnail_bytes, {
       'mime_type': 'image/jpeg'
   })
   temper.action('DesignLanguages', lang_id, 'AttachThumbnail', {
       'thumbnail_file_id': thumbnail_result['file_id']
   })
   ```
14. **Regenerate DESIGN.md again if the embodiment or any spec field changed during review.** Re-run the DESIGN.md lint gate and call `AttachDesignMd` with the latest file before publish. This only applies after a language is in `Draft` or `UnderReview`; if the target is still `Published`, go back to the published artifact review path and do not re-attach DESIGN.md.
15. **Generate first-class shadcn/ui component artifacts.** The registry theme
    is deterministic and finalizer-owned, but `components.md` and
    `preview-shots.json` are agent-authored quality artifacts. If the language is
    `Draft` or `UnderReview`, write:
    - `/katagami/shadcn/{slug}/components.md`
    - `/katagami/shadcn/{slug}/preview-shots.json`

    `components.md` must include `shadcn/ui Components`, `Signature component
    recipes`, `Preview shots`, and concrete recipes for `button`, `card`,
    `input`, `textarea`, `select`, `dialog`, `sheet`, `tabs`, `badge`,
    `separator`, `checkbox`, `switch`, `slider`, `tooltip`, `dropdown-menu`,
    and `table`. It must translate the language's actual visual character,
    signature patterns, surfaces, borders, density, focus, and motion into
    shadcn primitive usage.

    `preview-shots.json` must use artifact
    `katagami:shadcn-preview-shots`, version `preview-shots-v1`, include at
    least three shots (`application-shell`, `detail-editor`,
    `data-operations`), and include `componentRecipes`.

    ```python
    component_result = temper.write('/katagami/shadcn/' + slug + '/components.md', shadcn_components_md)
    temper.action('DesignLanguages', lang_id, 'AttachShadcnComponentSpec', {
        'shadcn_component_spec_file_id': component_result['file_id'],
        'shadcn_component_spec_format_version': 'component-recipes-v1',
        'shadcn_component_spec_manifest': json.dumps({
            'artifact': 'katagami:shadcn-component-recipes',
            'version': 'component-recipes-v1',
            'components': ['button', 'card', 'input', 'textarea', 'select', 'dialog', 'sheet', 'tabs', 'badge', 'separator', 'checkbox', 'switch', 'slider', 'tooltip', 'dropdown-menu', 'table'],
            'shots': ['application-shell', 'detail-editor', 'data-operations']
        }, ensure_ascii=False)
    })

    shots_result = temper.write('/katagami/shadcn/' + slug + '/preview-shots.json', json.dumps(preview_shots, ensure_ascii=False, indent=2))
    temper.action('DesignLanguages', lang_id, 'AttachShadcnPreviewShots', {
        'shadcn_preview_shots_file_id': shots_result['file_id'],
        'shadcn_preview_shots_format_version': 'preview-shots-v1',
        'shadcn_preview_shots_manifest': json.dumps({
            'artifact': 'katagami:shadcn-preview-shots',
            'version': 'preview-shots-v1',
            'shotIds': ['application-shell', 'detail-editor', 'data-operations']
        }, ensure_ascii=False)
    })
    ```

    Do not hand-write or attach `AttachShadcnExport`. The CurationJob finalizer
    deterministically derives `/katagami/shadcn/{slug}/registry-theme.json`
    from the verified Katagami tokens, attaches it with `AttachShadcnExport`,
    and marks `VerifyShadcnExport`. Your job is to keep native tokens concrete
    enough to project into shadcn semantic variables and make the component
    recipes good enough for real app UI.
16. **Mark reviewed after all artifacts are attached. Do not publish directly and do not archive.**
    The CurationJob finalizer reads the referenced embodiment and DESIGN.md
    files, derives and verifies the shadcn/ui registry theme, verifies
    agent-authored shadcn component recipes and preview-shot manifests, rejects
    base64 text thumbnail payloads, marks verified fields through internal
    actions, marks quality as passed, and publishes only if the entity/file
    world is actually valid.
    Never call `Archive` on a `DesignLanguage` during `quality_review` or public
    asset backfill. If a language cannot pass, fail the job with a concrete
    `error_message` so the pipeline can repair it through the normal governed
    actions instead of hiding it in `Archived`.
   ```python
   temper.action('DesignLanguages', lang_id, 'UpdateQuality', {'review_status': 'reviewed'})
   ```
17. **After ALL languages are reviewed and ready for finalizer publish:**
   ```python
   organize_input = json.dumps({
       'language_ids': fixed_ids,
       'query_id': query_id
   }, ensure_ascii=False)
   temper.action('CurationJobs', job_id, 'CompleteQualityReview', {
       'design_language_ids': json.dumps(fixed_ids),
       'organize_input': organize_input
   })
   temper.done("quality_review complete")
   ```

## Tooling Rules

- The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
  without importing it. Other imports are not available in the Monty REPL.
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`, `sandbox.bash(cmd)`, `sandbox.write(path, content)`, `sandbox.read(path)` / `sandbox.read(path, binary=True)`
- **ALL array and object parameters MUST use `json.dumps(...)`.** NEVER use `str()` or Python repr — these produce single-quoted strings that break JSON parsing in the UI. Example: `json.dumps(['a', 'b'])` -> `'["a", "b"]'` (correct), NOT `str(['a', 'b'])` -> `"['a', 'b']"` (broken).

## Output

Job output JSON must include:
- `fixed` — array of DesignLanguage entity IDs that were reviewed and fixed
- `language_ids` — same IDs, passed as `design_language_ids` to `CompleteQualityReview`

Keep the provider-facing final response tiny. Do not include regenerated HTML,
DESIGN.md content, screenshots, full validation reports, or large JSON dumps in
the assistant message. Artifacts belong in TemperFS and structured IDs belong in
the `CompleteQualityReview` action params; after dispatching the action, call
`temper.done("quality_review complete")`.
