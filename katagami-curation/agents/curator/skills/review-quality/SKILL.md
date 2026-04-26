# Review Quality

Review and FIX design languages before publish. Do not write reports — read the spec, validate the DESIGN.md projection, fix any blocking spec/export issues, evaluate the embodiment, then regenerate the HTML fixing every issue.

## When to Use

Job type: `quality_review`

## Before Starting

Read the knowledge files in your workspace:
- `/system/knowledge/design-principles.md` — embodiment standards
- `/system/knowledge/quality-standards.md` — quality thresholds
- `/system/knowledge/feedback-log.md` — human feedback (may contain specific notes about target languages)

## Process

For each language specified in the job input (or ALL languages if none specified):

1. **Load the DesignLanguage**: `temper.get('DesignLanguages', lang_id)`
2. **Read its fields**: Philosophy (especially `visual_character`), Tokens (especially surfaces/borders/motion), Rules (especially `signature_patterns`), Guidance, curator_notes, slug, embodiment_file_id.
3. **Read the current embodiment**: `temper.read('/katagami/embodiments/' + slug + '.html')`
4. **MANDATORY: Validate the native Katagami spec before evaluating the embodiment.** Parse each JSON field:
   - `philosophy.visual_character` must have >= 3 items, each >= 30 chars with concrete CSS choices
   - `tokens.colors` must have all 12 keys with real hex values
   - `tokens.typography` must have real font names and a google_fonts_url
   - `tokens.surfaces`, `tokens.borders`, `tokens.motion` must be populated
   - `rules.signature_patterns` must have >= 3 items, each >= 30 chars with specific CSS techniques
   - `guidance.do` >= 3 items, `guidance.dont` >= 3 items

   **If the spec is deeply empty or incoherent**: STOP. Do NOT invent a full language from nothing. Fail the job with a concrete error_message naming the invalid sections and instruct the caller to run `regenerate_embodiment` or `synthesize` first.
5. **MANDATORY: Generate and validate DESIGN.md.** Katagami remains the source of truth; DESIGN.md is the required portable projection.
   - Generate a DESIGN.md markdown string from the current Katagami fields.
   - YAML front matter must include `version: "alpha"`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, and `components`.
   - Markdown sections must include Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, and Do's and Don'ts when source data exists.
   - Preserve Katagami-only richness as extra markdown sections: Visual Character, Signature Patterns, Imagery Direction, Generative Canvas.
   - Write it to `/tmp/DESIGN.md` in the sandbox and run:
     ```python
     lint_json = sandbox.bash('npx @google/design.md lint --format=json /tmp/DESIGN.md')
     ```
   - Parse the linter JSON. If `summary.errors > 0`, repair the Katagami source fields causing the invalid projection, then regenerate and relint.
   - Fix warnings when the correction is straightforward. Remaining warnings may be kept, but must be recorded in `design_md_lint_result`.
   - Repeat until there are ZERO lint errors.
   - Store the validated artifact:
     ```python
     design_md_result = temper.write('/katagami/design-md/' + slug + '/DESIGN.md', design_md)
     temper.action('DesignLanguages', lang_id, 'AttachDesignMd', {
         'design_md_file_id': design_md_result['file_id'],
         'design_md_lint_result': json.dumps(lint_result, ensure_ascii=False),
         'design_md_format_version': 'alpha'
     })
     ```
6. **Evaluate against the spec.** Common failures to fix:
   - **Catalog layout**: Organized as a component inventory with sections labeled "Controls", "Feedback", "Data" instead of a plausible application scene. This is the #1 failure — redesign the scene entirely.
   - **Missing structural identity**: The spec's `visual_character` traits and `signature_patterns` must ALL manifest in CSS. Check each one — if it's not visible, the structure is wrong.
   - **Generic typography**: Using system fonts or LLM defaults (Inter, Poppins, Roboto, DM Sans, Montserrat) instead of distinctive Google Fonts. Switch to researched, unique typefaces.
   - **Not responsive**: No media queries, or inline `style` attributes for grid/flex layout (which break media queries). Must have 3 breakpoints. Must pass visual verification at desktop (1440px), tablet (768px), and mobile (375px).
   - **Missing surface/border/motion tokens**: If the spec says "glass treatment," there must be `backdrop-filter` in the CSS. Heavy borders must be a dominant visual element.
   - **Browser default form elements**: Unstyled selects, checkboxes, radios. Every form element must be explicitly styled.
   - **Inconsistent styling**: Buttons, inputs, cards not matching each other.
   - **Alignment**: Elements off-grid, uneven spacing, misaligned columns.
   - **curator_notes**: If present, these are specific fix instructions from the human curator. Follow them first.
7. **Regenerate the embodiment as self-contained HTML.** Follow the sandbox visual feedback loop from the `synthesize-language` skill:
   - Write HTML to sandbox
   - Screenshot with Playwright at 3 viewports (desktop 1440px, tablet 768px, mobile 375px)
   - Visually evaluate each viewport
   - Iterate until quality passes at all three sizes
8. **Write and re-attach:**
   ```python
   result = temper.write('/katagami/embodiments/' + slug + '.html', new_html)
   temper.action('DesignLanguages', lang_id, 'AttachEmbodiment', {
       'embodiment_file_id': result['file_id'],
       'element_count': '15',
       'composition_count': '5',
       'embodiment_format': 'html'
   })
   ```
9. **Regenerate DESIGN.md again if the embodiment or any spec field changed during review.** Re-run the DESIGN.md lint gate and call `AttachDesignMd` with the latest file before publish.
10. **Mark reviewed and publish each language:**
   ```python
   temper.action('DesignLanguages', lang_id, 'UpdateQuality', {'review_status': 'reviewed'})
   temper.action('DesignLanguages', lang_id, 'Publish', {})
   ```
11. **After ALL languages are reviewed and published:**
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

- No `import` statements
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`, `sandbox.bash(cmd)`, `sandbox.write(path, content)`, `sandbox.read(path)`
- **ALL array and object parameters MUST use `json.dumps(...)`.** NEVER use `str()` or Python repr — these produce single-quoted strings that break JSON parsing in the UI. Example: `json.dumps(['a', 'b'])` → `'["a", "b"]'` (correct), NOT `str(['a', 'b'])` → `"['a', 'b']"` (broken).

## Output

Job output JSON must include:
- `fixed` — array of DesignLanguage entity IDs that were reviewed and fixed
- `language_ids` — same IDs, passed as `design_language_ids` to `CompleteQualityReview`
