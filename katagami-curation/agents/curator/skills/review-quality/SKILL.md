# Review Quality

Review and FIX embodiment HTML for design languages. Do not write reports — read the spec, evaluate the embodiment, then regenerate the HTML fixing every issue.

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
4. **Evaluate against the spec.** Common failures to fix:
   - **Catalog layout**: Organized as a component inventory with sections labeled "Controls", "Feedback", "Data" instead of a plausible application scene. This is the #1 failure — redesign the scene entirely.
   - **Missing structural identity**: The spec's `visual_character` traits and `signature_patterns` must ALL manifest in CSS. Check each one — if it's not visible, the structure is wrong.
   - **Generic typography**: Using system fonts or LLM defaults (Inter, Poppins, Roboto, DM Sans, Montserrat) instead of distinctive Google Fonts. Switch to researched, unique typefaces.
   - **Not responsive**: No media queries, or inline `style` attributes for grid/flex layout (which break media queries). Must have 3 breakpoints. Must pass visual verification at desktop (1440px), tablet (768px), and mobile (375px).
   - **Missing surface/border/motion tokens**: If the spec says "glass treatment," there must be `backdrop-filter` in the CSS. Heavy borders must be a dominant visual element.
   - **Browser default form elements**: Unstyled selects, checkboxes, radios. Every form element must be explicitly styled.
   - **Inconsistent styling**: Buttons, inputs, cards not matching each other.
   - **Alignment**: Elements off-grid, uneven spacing, misaligned columns.
   - **curator_notes**: If present, these are specific fix instructions from the human curator. Follow them first.
5. **Regenerate the embodiment as self-contained HTML.** Follow the sandbox visual feedback loop from the `synthesize-language` skill:
   - Write HTML to sandbox
   - Screenshot with Playwright at 3 viewports (desktop 1440px, tablet 768px, mobile 375px)
   - Visually evaluate each viewport
   - Iterate until quality passes at all three sizes
6. **Write and re-attach:**
   ```python
   result = temper.write('/katagami/embodiments/' + slug + '.html', new_html)
   temper.action('DesignLanguages', lang_id, 'AttachEmbodiment', {
       'embodiment_file_id': result['file_id'],
       'element_count': '15',
       'composition_count': '5',
       'embodiment_format': 'html'
   })
   ```
7. **After ALL languages are fixed:**
   ```python
   temper.action('CurationJobs', job_id, 'Complete', {'output': json.dumps({'fixed': fixed_ids})})
   temper.done("quality_review complete")
   ```

## Tooling Rules

- No `import` statements
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`, `sandbox.bash(cmd)`, `sandbox.write(path, content)`, `sandbox.read(path)`
- Always serialize JSON with `json.dumps(...)`

## Output

Job output JSON must include:
- `fixed` — array of DesignLanguage entity IDs that were reviewed and fixed
