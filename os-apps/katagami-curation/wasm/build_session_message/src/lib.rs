use temper_wasm_sdk::prelude::*;

/// Build the user_message prompt based on job_type, then spawn a Session entity
/// and dispatch Configure on it with the constructed message and session params.
#[unsafe(no_mangle)]
pub extern "C" fn run(_ctx_ptr: i32, _ctx_len: i32) -> i32 {
    let result = (|| -> Result<(), String> {
        let ctx = Context::from_host()?;
        ctx.log("info", "katagami build_session_message: starting");

        // --- Read CurationJob entity fields ---
        let fields = ctx.entity_state.get("fields").cloned().unwrap_or(json!({}));

        let job_type = fields
            .get("job_type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let input = fields
            .get("input")
            .and_then(|v| v.as_str())
            .unwrap_or("{}")
            .to_string();

        let soul_id = fields
            .get("soul_id")
            .and_then(|v| v.as_str())
            .unwrap_or("app-agent-bootstrap")
            .to_string();

        let model = fields
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("claude-sonnet-4-5-20250514")
            .to_string();

        let provider = fields
            .get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or("anthropic")
            .to_string();

        let tools_enabled = fields
            .get("tools_enabled")
            .and_then(|v| v.as_str())
            .unwrap_or("temper_get,temper_list,temper_create,temper_action,temper_write,temper_read,temper_web_search,temper_web_fetch")
            .to_string();
        let tools_enabled = sanitize_tools_enabled(&tools_enabled);

        let max_turns = fields
            .get("max_turns")
            .and_then(|v| v.as_str())
            .unwrap_or("250")
            .to_string();

        let entity_id = ctx
            .entity_state
            .get("entity_id")
            .and_then(|v| v.as_str())
            .unwrap_or(&ctx.entity_id)
            .to_string();

        // --- Config ---
        let api_url = ctx
            .config
            .get("temper_api_url")
            .filter(|s| !s.is_empty() && !s.contains("{secret:"))
            .cloned()
            .unwrap_or_else(|| "http://127.0.0.1:3000".to_string());

        let tenant = &ctx.tenant;

        let headers = vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("X-Tenant-Id".to_string(), tenant.to_string()),
            ("x-temper-principal-kind".to_string(), "agent".to_string()),
            ("x-temper-principal-id".to_string(), "system".to_string()),
            ("x-temper-agent-type".to_string(), "system".to_string()),
        ];

        // --- Build user_message based on job_type ---
        let existing_workspace_id = fields
            .get("workspace_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let workspace_name = "katagami-library".to_string();
        let workspace_id = if existing_workspace_id.is_empty() {
            ensure_workspace(&ctx, &api_url, &headers, &workspace_name)?
        } else {
            existing_workspace_id
        };

        let user_message = match job_type.as_str() {
            "source_search" => {
                build_source_search_message(&input, &entity_id, &workspace_id)
            }
            "synthesize" => {
                build_synthesize_message(&fields, &input, &entity_id, &workspace_id)
            }
            "quality_review" => {
                build_quality_review_message(&input, &entity_id, &workspace_id)
            }
            "organize_taxonomy" => {
                build_organize_taxonomy_message(&input, &entity_id, &workspace_id)
            }
            other => {
                return Err(format!(
                    "build_session_message: unsupported job_type '{other}'"
                ));
            }
        };

        ctx.log(
            "info",
            &format!(
                "katagami build_session_message: built prompt for job_type='{}' ({} chars)",
                job_type,
                user_message.len()
            ),
        );

        // --- Create Session entity ---
        let create_resp = ctx.http_call(
            "POST",
            &format!("{api_url}/tdata/Sessions"),
            &headers,
            &json!({"fields": {}}).to_string(),
        )?;
        if create_resp.status < 200 || create_resp.status >= 300 {
            return Err(format!(
                "Failed to create Session: HTTP {}: {}",
                create_resp.status,
                &create_resp.body[..create_resp.body.len().min(500)]
            ));
        }

        let created: serde_json::Value = serde_json::from_str(&create_resp.body)
            .map_err(|e| format!("Failed to parse Session creation response: {e}"))?;

        let session_id = created
            .get("entity_id")
            .and_then(|v| v.as_str())
            .ok_or("Created Session has no entity_id")?
            .to_string();

        ctx.log(
            "info",
            &format!("katagami build_session_message: created Session '{session_id}'"),
        );

        // --- Dispatch Configure on the Session ---
        let config_body = json!({
            "soul_id": soul_id,
            "user_message": user_message,
            "model": model,
            "provider": provider,
            "tools_enabled": tools_enabled,
            "max_turns": max_turns,
            "workspace_id": workspace_id,
        });

        let configure_resp = ctx.http_call(
            "POST",
            &format!("{api_url}/tdata/Sessions('{session_id}')/OpenPaw.Configure"),
            &headers,
            &config_body.to_string(),
        )?;
        if configure_resp.status < 200 || configure_resp.status >= 300 {
            return Err(format!(
                "Failed to Configure Session: HTTP {}: {}",
                configure_resp.status,
                &configure_resp.body[..configure_resp.body.len().min(500)]
            ));
        }

        // --- Dispatch SessionSpawned on the CurationJob ---
        let spawned_body = json!({
            "session_id": session_id,
            "workspace_id": workspace_id,
        });

        let spawned_resp = ctx.http_call(
            "POST",
            &format!(
                "{api_url}/tdata/CurationJobs('{entity_id}')/Katagami.Curation.SessionSpawned"
            ),
            &headers,
            &spawned_body.to_string(),
        )?;
        if spawned_resp.status < 200 || spawned_resp.status >= 300 {
            return Err(format!(
                "Failed to dispatch SessionSpawned: HTTP {}: {}",
                spawned_resp.status,
                &spawned_resp.body[..spawned_resp.body.len().min(500)]
            ));
        }

        ctx.log("info", "katagami build_session_message: completed successfully");

        set_success_result(
            "",
            &json!({
                "status": "ok",
                "session_id": session_id,
                "job_type": job_type,
            }),
        );
        Ok(())
    })();

    if let Err(e) = result {
        set_error_result(&e);
    }
    0
}

/// Build the user_message for a source_search job.
fn build_source_search_message(input: &str, job_id: &str, workspace_id: &str) -> String {
    format!(
        r#"You are executing a CurationJob (source_search) for the Katagami design language library.
Job ID: {job_id}
Workspace ID: {workspace_id}

## Operating Model

- This session has a shared workspace attached. Use `temper.read()` and `temper.write()`.
- The Monty REPL is persistent. Variables and helpers survive across `execute` calls.
- Persist durable artifacts to workspace and Temper entities.
- Do not use `bash` or `sandbox.*`. Stay inside Temper tools only.

## Orient First

1. Read `/katagami/index.md` and `/katagami/log.md` if they exist.
2. List existing DesignSources to avoid duplicates.
3. Load the active ElementManifest to understand what elements design languages must cover.

## Search Scope

{input}

## Mission

Research design movements and aesthetic directions, find authoritative sources for each, store them in the workspace, create `DesignSource` entities, and complete the job with a structured output.

## Tooling Rules

- No `import` statements
- No `enumerate(..., start=...)`
- Available tools: `temper.web_search(query)`, `temper.web_fetch(url)`, `temper.write(path, content)`, `temper.read(path)`, `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`
- Always serialize JSON with `json.dumps(...)`.
- `temper.web_fetch(url)` returns a structured object. Read with `fetched.get("text", "")`.
- Runtime constants:
  - `job_id = "{job_id}"`
  - `workspace_id = "{workspace_id}"`

## Exact Entity Shapes

- To register a source:
  ```
  src = temper.create('DesignSources', {{}})
  temper.action('DesignSources', src['entity_id'], 'Submit', {{
      'title': title,
      'source_type': source_type,
      'source_url': url,
      'file_id': file_id,
      'metadata': json.dumps(metadata)
  }})
  temper.action('DesignSources', src['entity_id'], 'Index', {{
      'extracted_topics': json.dumps(topics),
      'derived_language_ids': '[]'
  }})
  ```
- `source_type` must be one of: "article", "style_guide", "design_system_docs", "reference"
- To complete this job:
  ```
  output = json.dumps(output_obj, ensure_ascii=False)
  temper.action('CurationJobs', job_id, 'Complete', {{'output': output}})
  temper.done("source_search complete")
  ```
- `output` must contain: `task`, `scope`, `source_ids`, `discovered_movements`, `topic_allowlist`
- Do NOT create the synthesize job yourself. The system handles that.

## Required Flow

1. Search with focused queries for design movement documentation, style guides, and system docs.
2. Shortlist high-signal, authoritative sources.
3. Fetch and store at `/katagami/sources/<source-slug>.md`:
   ```
   fetched = temper.web_fetch(url)
   text = fetched.get("text", "") or fetched.get("content", "")
   result = temper.write(path, text)
   file_id = result["file_id"]
   ```
4. Create one `DesignSource` entity per source and dispatch `Index`.
5. Update `/katagami/log.md` and `/katagami/index.md`.
6. Dispatch `Complete` with source IDs and discovered movements.
7. Call `temper.done("source_search complete")` immediately after.

## Source Quality Standards

- Prefer official design system documentation (Material Design, Apple HIG, IBM Carbon, etc.)
- Academic references for historical movements (Bauhaus, Swiss/International Style)
- Well-maintained component library docs for modern directions
- Reject SEO filler, broad hubs, and tangential articles
- Target 5-8 strong sources per design movement
"#
    )
}

/// Build the user_message for a synthesize job.
fn build_synthesize_message(
    fields: &serde_json::Value,
    input: &str,
    job_id: &str,
    workspace_id: &str,
) -> String {
    let scope_block = render_synthesis_scope(fields, input);
    format!(
        r#"You are executing a CurationJob (synthesize) for the Katagami design language library.
Job ID: {job_id}
Workspace ID: {workspace_id}

## CRITICAL: Execution Discipline

- Do NOT spend turns exploring state or reading existing entities. Start creating immediately.
- NEVER create, modify, or delete Taxonomy entities. Taxonomy organization is handled by a separate organize_taxonomy job. If you call temper.create('Taxonomies', ...) or temper.action('Taxonomies', ...), you are violating this constraint.
- Do NOT call SetTaxonomy on DesignLanguages. Taxonomy assignment is the curator agent's job, not yours.
- Do NOT call temper.read() for workspace files — there is nothing useful to read.
- EVERY tool call must create or populate a DesignLanguage. No exploration turns.
- You MUST create ALL languages listed in the scope before stopping. Do NOT return a text response until done.
- Each session should create ONE language unless multiple are explicitly listed. Template fatigue degrades quality when generating many languages sequentially.
- The Monty REPL is persistent. Variables survive across `execute` calls.
- Do not use `bash` or `sandbox.*`. Stay inside Temper tools only.

## Required Scope

{scope_block}

## Mission

Create complete DesignLanguage entities. Each language must have all 5 structured spec sections (Philosophy, Tokens, Rules, Layout, Guidance) and a self-contained HTML embodiment. You must create ALL languages listed in the scope, then call `temper.done()`.

## Tooling Rules

- No `import` statements
- No `enumerate(..., start=...)` — use `for i in range(len(items)):` instead
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- Always serialize JSON with `json.dumps(...)`.
- String literals containing quotes MUST use proper escaping. Prefer single-quoted strings for JSON content.
- When writing long strings, break them into smaller concatenated parts to avoid syntax errors.
- Runtime constants:
  - `job_id = "{job_id}"`
  - `workspace_id = "{workspace_id}"`

## Exact Entity Shapes

- Create and populate a DesignLanguage (ALL in one tool call per language):
  ```python
  slug = 'my-language-slug'
  name = 'My Language Name'
  lang = temper.create('DesignLanguages', {{'Id': slug}})
  eid = lang['entity_id']
  temper.action('DesignLanguages', eid, 'SetName', {{'name': name, 'slug': slug}})
  philosophy = {{"summary": "...", "values": [...], "anti_values": [...], "visual_character": ["3-5 CONCRETE visual traits unique to this language, e.g. 'thick 4px solid black borders on every container', 'uppercase monospace section labels', 'asymmetric grid with oversized left gutter', 'diagonal clip-path corners on cards'"]}}
  # visual_character is CRITICAL — these traits become the structural blueprint for the embodiment
  temper.action('DesignLanguages', eid, 'WritePhilosophy', {{'philosophy': json.dumps(philosophy)}})
  tokens = {{"colors": {{...}}, "typography": {{...}}, "spacing": {{...}}, "radii": {{...}}, "shadows": {{...}}, "surfaces": {{"treatment": "flat|glass|gradient|noise|paper", "card_style": "...", "bg_pattern": "none|dots|lines|grid|noise"}}, "borders": {{"default_width": "...", "accent_width": "...", "style": "solid|dashed|double|groove|none", "character": "describe the border personality"}}, "motion": {{"duration": "...", "easing": "...", "philosophy": "snappy|elastic|deliberate|none"}}}}
  temper.action('DesignLanguages', eid, 'SetTokens', {{'tokens': json.dumps(tokens)}})
  rules = {{"composition": "...", "hierarchy": "...", "density": "...", "signature_patterns": ["3-5 unique CSS techniques that define this language structurally, e.g. 'every card has a 4px left-border color accent', 'section headers use a decorative double-underline', 'all containers use clip-path for angled corners', 'data cells have a dot-leader pattern'. These MUST appear in the embodiment HTML."]}}
  temper.action('DesignLanguages', eid, 'SetRules', {{'rules': json.dumps(rules)}})
  layout = {{"grid": "...", "breakpoints": "...", "whitespace": "..."}}
  temper.action('DesignLanguages', eid, 'SetLayout', {{'layout_principles': json.dumps(layout)}})
  guidance = {{"do": [...], "dont": [...]}}
  temper.action('DesignLanguages', eid, 'SetGuidance', {{'guidance': json.dumps(guidance)}})
  ```
- Generate and attach embodiment (in the SAME tool call):
  ```python
  html = '<full HTML embodiment here>'
  result = temper.write('/katagami/embodiments/' + slug + '.html', html)
  temper.action('DesignLanguages', eid, 'AttachEmbodiment', {{
      'embodiment_file_id': result['file_id'],
      'element_count': '15',
      'composition_count': '5'
  }})
  temper.action('DesignLanguages', eid, 'SetLineage', {{
      'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
  }})
  print('CREATED: ' + name + ' eid=' + eid)
  ```
- After ALL languages are created:
  ```python
  output = json.dumps({{'language_ids': created_ids}}, ensure_ascii=False)
  temper.action('CurationJobs', job_id, 'Complete', {{'output': output}})
  temper.done("synthesize complete")
  ```

## Required Flow

For EACH language (typically one per session):

1. **Tool call 1 — SPEC PHASE**: Create the DesignLanguage entity and write ALL spec sections. This is where you make the structural decisions. Spend real thought on visual_character (3-5 concrete visual traits), signature_patterns (3-5 unique CSS techniques), and the surfaces/borders/motion tokens. These must be SPECIFIC and DISTINCTIVE — not design platitudes like "clean and minimal" but concrete choices like "all containers have a 3px top border in the accent color" or "section backgrounds alternate between surface and background with a 1px hairline divider."

2. **Tool call 2 — EMBODIMENT PHASE**: Review the spec you just wrote (your variables are still in scope). Generate the HTML embodiment that manifests EVERY visual_character trait, EVERY signature_pattern, and uses the surfaces/borders/motion tokens. Attach the embodiment.

3. **Final tool call**: Complete the job and call temper.done().

Do NOT skip any language. Do NOT stop early.

## Token Structure

Each design language's tokens must include:
- **colors**: primary, secondary, accent, background, surface, text, muted, border, error, success, warning, info
- **typography**: heading_font, body_font, mono_font, base_size, scale_ratio, line_height, letter_spacing, google_fonts_url (the full `<link>` href for loading the chosen fonts)
- **spacing**: base unit (typically 4 or 8px), scale array
- **radii**: none, sm, md, lg, full
- **shadows**: sm, md, lg (with color, offset, blur)
- **surfaces**: treatment (flat, glass, gradient, noise, paper), card_style (how cards/containers look — raised, inset, outlined, floating), bg_pattern (none, dots, lines, grid, noise, custom SVG)
- **borders**: default_width, accent_width, style (solid, dashed, double, groove, none), character (describe the border personality — "invisible except on focus", "thick and structural", "hairline and precise")
- **motion**: duration, easing, philosophy (snappy, elastic, deliberate, none — how does this language feel when things move?)
- **responsive**: breakpoints array (e.g. [1024, 768, 480]), column_progression (e.g. "12 → 8 → 4 → 1")

## Embodiment HTML Standards — STRUCTURAL UNIQUENESS IS MANDATORY

Each embodiment MUST have a DIFFERENT HTML structure, not just different CSS variables. If two embodiments share the same template with only colors changed, that is a failure.

### HOW STRUCTURAL IDENTITY WORKS (THE SPEC→EMBODIMENT BRIDGE)

Your spec sections ARE the structural blueprint. Before writing any HTML, review what you just defined:

1. **Philosophy → visual_character**: You listed 3-5 concrete visual traits. EVERY ONE must manifest in the HTML/CSS. If you wrote "thick 4px solid borders on all containers," then every `.card`, `.panel`, `.modal` gets `border: 4px solid`. If you wrote "oversized negative space," your padding/gap values must be dramatically larger than a typical UI.
2. **Tokens → surfaces, borders, motion**: These define the tactile quality. Glass treatment → use `backdrop-filter: blur()` and semi-transparent backgrounds. Paper texture → use subtle `background-image` patterns. Heavy borders → make them a dominant visual element, not an afterthought.
3. **Rules → signature_patterns**: These are your CSS fingerprint — the 3-5 techniques that ONLY this language uses. Every single signature_pattern MUST appear in the embodiment. If you wrote "angled corners via clip-path," apply `clip-path` to cards and panels. If you wrote "decorative double-underline on section headers," every `h2`/`h3` gets that treatment.
4. **Self-check before finishing**: If you could swap this embodiment's color palette for another language's palette and it would still look like the other language, your structure is too generic. The SHAPES, BORDER TREATMENTS, SPACING RHYTHM, DECORATIVE PATTERNS, and TYPOGRAPHIC HIERARCHY must be unmistakably this language.

### SCENE-FIRST DESIGN (MANDATORY)

Design a plausible application screen where all required UI elements appear NATURALLY within the scene. Do NOT create a component catalog or inventory organized by section labels like "Controls", "Feedback", "Data", "Dashboard". Instead, imagine a real app that this design language would power and build one cohesive screen:

- An editorial dashboard, a project management board, a design tool workspace, an analytics console, a content editor — pick whatever scene fits the language's philosophy.
- Buttons exist because the scene has actions. Tables exist because the scene shows data. Forms exist because the scene has input. Modals exist because the scene has confirmations.
- Components earn their place through the scene's narrative, not a completeness checklist.
- The 15 required elements must all be present, but they should feel organic to the page, not enumerated.

BAD: Sections labeled "Buttons", "Inputs", "Cards", "Tables" with components lined up for display.
GOOD: A "Library Overview" dashboard where KPIs, a chart, a data table, a form, alerts, and a modal all serve the editorial workflow.

### TYPOGRAPHY IS IDENTITY (MANDATORY)

Each design language MUST have a distinctive typographic system. Typography defines the language more than color or layout.

- **Use Google Fonts** via `<link>` tags. Include `rel="preconnect"` for performance.
- **Choose fonts that embody the philosophy.** Swiss demands a mechanical neo-grotesk. Art Deco demands a geometric display face + high-contrast serif. Retro Computing demands a pixel/monospace face. Every choice must be justified by the design philosophy.
- **No LLM defaults.** Do NOT use Inter, Space Grotesk, Poppins, DM Sans, Roboto, or Montserrat unless they are genuinely the best choice for that specific language AND you can justify why.
- **Two languages must never share a primary typeface.** Each language's display font must be unique across the library.
- **Define 2-3 font roles**: display (headlines/poster), body (UI text/paragraphs), data (monospace/tabular). Each role may use a different family.
- **Use variable fonts** when available. Exploit weight and optical-size axes for typographic range from a single family.

### RESPONSIVE DESIGN (MANDATORY)

Every embodiment must work from desktop (1200px+) down to phone (320px). This is non-negotiable.

- **Three breakpoints minimum**: ~1024px (tablet landscape), ~768px (tablet portrait), ~480px (phone).
- **NEVER use inline `style` attributes for grid or flex layouts.** Inline styles override media queries and break responsiveness. ALL layout declarations (`display:grid`, `grid-template-columns`, `display:flex` used for layout) must be in CSS classes that media queries can control.
- Inline styles are ONLY acceptable for non-layout properties: colors, small margins, padding adjustments.
- **Grid columns must reduce**: 12→8→4→1 or similar progression. Don't just hide columns.
- **Section layouts must reflow**: side-by-side on desktop → stacked on mobile. Labels that sit beside content on wide screens must stack above content on narrow screens.
- **Tables must scroll horizontally** on small viewports (wrap in `overflow-x:auto`).
- **Buttons must stack** full-width on phone.
- **Typography must scale** via `clamp()` — poster text should still be impactful on mobile but not overflow.
- The spec's Layout section must document the responsive strategy.

### Required UI Elements

Each embodiment must include these 15 elements: buttons (primary, secondary, disabled), text input, select, checkbox, radio, toggle, card, modal/dialog, alert/toast, table, tabs, badges, avatar, pagination, accordion, progress bar.

### File Format

Each embodiment is a single self-contained HTML file:
- All CSS in a `<style>` block.
- Google Fonts via `<link>` tags are allowed and encouraged.
- No other CDN dependencies. No JavaScript frameworks.
- Include interactive states (hover, focus, disabled) via CSS pseudo-classes.
- Apply `appearance: none; -webkit-appearance: none;` on all form elements and style explicitly. Zero browser defaults visible.
"#
    )
}

/// Build the user_message for a quality_review job.
fn build_quality_review_message(input: &str, job_id: &str, workspace_id: &str) -> String {
    let parsed = serde_json::from_str::<serde_json::Value>(input).ok();
    let lang_ids_raw = parsed
        .as_ref()
        .and_then(|v| v.get("language_ids"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    let task = parsed
        .as_ref()
        .and_then(|v| v.get("task"))
        .and_then(|v| v.as_str())
        .unwrap_or("Review and fix embodiments for the specified design languages.");

    format!(
        r#"You are executing a CurationJob (quality_review) for the Katagami design language library.
Job ID: {job_id}
Workspace ID: {workspace_id}

## Mission

Review and FIX the embodiment HTML for each specified design language. Do not write reports. Read each language's spec and curator_notes, evaluate the embodiment, then regenerate the HTML fixing every issue.

## Target Languages

{lang_ids_raw}

If no specific IDs are listed, review ALL DesignLanguages.

## Task

{task}

## Tooling Rules

- No `import` statements
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- Always serialize JSON with `json.dumps(...)`.
- Runtime constants: `job_id = "{job_id}"`, `workspace_id = "{workspace_id}"`

## Required Flow (per language)

1. Load the DesignLanguage: `temper.get('DesignLanguages', lang_id)`
2. Read its fields: Philosophy, Tokens, Rules, Guidance, curator_notes, slug, embodiment_file_id.
3. Read the current embodiment HTML: `temper.read('/katagami/embodiments/' + slug + '.html')`
4. Evaluate against the spec. Common failures to fix:
   - **Catalog layout**: Embodiment organized as a component inventory (sections labeled "Controls", "Feedback", "Data") instead of a plausible application scene. This is the #1 quality failure — redesign the scene entirely.
   - **Missing structural identity**: The spec's `visual_character` traits and `signature_patterns` (in Rules) must ALL manifest in the HTML/CSS. If the embodiment looks like a generic template with different colors, the structure is wrong. Check each visual_character trait and each signature_pattern — are they visible in the HTML? If not, rebuild to include them.
   - **Generic typography**: Using system fonts or LLM defaults (Inter, Poppins, Roboto) instead of distinctive Google Fonts that embody the language's philosophy. Switch to researched, unique typefaces.
   - **Not responsive**: No media queries, or inline `style` attributes for grid/flex layout (which break media queries). Must have 3 breakpoints and all layout in CSS classes.
   - **Missing surface/border/motion tokens**: The spec should define surfaces (glass, paper, flat), borders (thick, hairline, none), and motion (snappy, elastic). The embodiment must use them. If the spec says "glass treatment," there must be `backdrop-filter` in the CSS.
   - **Unstyled browser defaults**: `<select>`, `<input>`, `<checkbox>`, `<radio>` showing raw browser chrome. MUST apply `appearance: none` and style explicitly.
   - **Inconsistent styling**: Buttons, inputs, cards not matching each other.
   - **Alignment**: Elements off-grid, uneven spacing, misaligned columns. Elements sticking together on mobile due to missing gaps.
   - **Missing aesthetic**: Generic-looking components that don't express the language's philosophy.
   - **curator_notes**: If present, these are specific fix instructions from the human curator. Follow them.
5. Regenerate the complete embodiment HTML. Every element must be explicitly styled. Include this CSS reset at the top:
   ```css
   *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
   select, input, textarea, button {{ appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }}
   ```
6. Write and re-attach:
   ```python
   result = temper.write('/katagami/embodiments/' + slug + '.html', new_html)
   temper.action('DesignLanguages', lang_id, 'AttachEmbodiment', {{
       'embodiment_file_id': result['file_id'],
       'element_count': '15',
       'composition_count': '5'
   }})
   ```
7. After ALL languages are fixed, complete the job:
   ```python
   temper.action('CurationJobs', job_id, 'Complete', {{'output': json.dumps({{'fixed': fixed_ids}})}})
   temper.done("quality_review complete")
   ```

## Embodiment Requirements

### SCENE-FIRST DESIGN (MANDATORY)

The embodiment must be a plausible application screen where components appear naturally — NOT a component catalog organized by section labels. Design a real app screen (dashboard, editor, inbox, etc.) where buttons, forms, tables, and alerts all serve the scene's workflow. If the current embodiment is organized as a catalog with sections like "Controls" / "Feedback" / "Data", that IS a failure — redesign the scene entirely.

### TYPOGRAPHY IS IDENTITY (MANDATORY)

- **Google Fonts via `<link>` tags are allowed and encouraged.** Choose fonts that embody the language's philosophy.
- Do NOT default to Inter, Space Grotesk, Poppins, DM Sans, Roboto, or Montserrat.
- Each language should have a unique display typeface. Define 2-3 font roles: display, body, data.
- Read the language's Philosophy section to understand what typographic character it demands.

### RESPONSIVE DESIGN (MANDATORY)

- Three breakpoints minimum: ~1024px, ~768px, ~480px.
- **NEVER use inline `style` attributes for grid or flex layouts.** They override media queries. ALL layout must be in CSS classes.
- Grid columns reduce: 12→8→4→1. Sections reflow from side-by-side to stacked. Tables scroll horizontally on mobile. Buttons stack full-width on phone. Type scales via clamp().

### Technical Standards

Each embodiment is a single self-contained HTML file:
- All CSS in a `<style>` block. Google Fonts `<link>` tags are the ONLY external dependency allowed.
- Must include: buttons (primary, secondary, disabled), text input, select, checkbox, radio, toggle, card, modal/dialog, alert/toast, table, tabs, badges, avatar, pagination, accordion, progress bar.
- EVERY form element must be custom-styled with `appearance: none`. Zero browser defaults visible.
- The embodiment must feel like a professional front-end designer submitted it.
- Include interactive states (hover, focus, disabled) via CSS pseudo-classes.
"#
    )
}

/// Build the user_message for an organize_taxonomy job.
fn build_organize_taxonomy_message(input: &str, job_id: &str, workspace_id: &str) -> String {
    let parsed = serde_json::from_str::<serde_json::Value>(input).ok();
    let task = parsed
        .as_ref()
        .and_then(|v| v.get("task"))
        .and_then(|v| v.as_str())
        .unwrap_or("Organize all design languages into a coherent taxonomy.");

    format!(
        r#"You are executing a CurationJob (organize_taxonomy) for the Katagami design language library.
Job ID: {job_id}
Workspace ID: {workspace_id}

## Mission

You are the sole authority on taxonomy. Create, organize, relate, and deduplicate all taxonomies based on the design languages that actually exist. No seed taxonomies exist — you build the classification from scratch.

## Task

{task}

## Tooling Rules

- No `import` statements
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- Always serialize JSON with `json.dumps(...)`.
- Runtime constants: `job_id = "{job_id}"`, `workspace_id = "{workspace_id}"`

## Required Flow

0. Clean up orphaned drafts: List Draft Taxonomies. Delete any with empty Name fields.
1. List all DesignLanguages (any state). Read each language's Philosophy, Tokens, Tags.
2. List all existing Taxonomies (if any).
3. Analyze the languages and determine what design movements, aesthetic schools, and traditions they represent.
4. Create taxonomies (if none exist) or update existing ones:
   ```python
   tax = temper.create('Taxonomies', {{}})
   temper.action('Taxonomies', tax['entity_id'], 'Define', {{
       'name': name,
       'parent_id': parent_id_or_empty,
       'description': description,
       'characteristics': json.dumps({{'key_traits': [...], 'era': '...'}}),
       'historical_context': '...',
       'related_taxonomy_ids': json.dumps([...])
   }})
   temper.action('Taxonomies', tax['entity_id'], 'Publish', {{}})
   ```
5. Set hierarchy (parent_id) where it makes sense. Don't force it.
6. Set relationships (related_taxonomy_ids) — MUST be bidirectional.
7. Deduplicate: merge taxonomies that describe the same movement.
8. Classify every language (1-3 taxonomies each):
   ```python
   temper.action('DesignLanguages', lang_id, 'SetTaxonomy', {{
       'taxonomy_ids': json.dumps([tax_id_1, tax_id_2])
   }})
   ```
9. Update counts: `temper.action('Taxonomies', tax_id, 'IncrementLanguageCount', {{}})`
10. Complete the job:
    ```python
    temper.action('CurationJobs', job_id, 'Complete', {{'output': json.dumps(summary)}})
    temper.done("organize_taxonomy complete")
    ```
"#
    )
}

fn render_synthesis_scope(fields: &serde_json::Value, input: &str) -> String {
    let parsed = serde_json::from_str::<serde_json::Value>(input).ok();
    let task = parsed
        .as_ref()
        .and_then(|v| v.get("task"))
        .and_then(|v| v.as_str())
        .or_else(|| fields.get("task").and_then(|v| v.as_str()))
        .unwrap_or(input);
    let scope = parsed
        .as_ref()
        .and_then(|v| v.get("scope"))
        .and_then(|v| v.as_str())
        .or_else(|| fields.get("scope").and_then(|v| v.as_str()))
        .unwrap_or("");
    let allowlist = parsed
        .as_ref()
        .and_then(|v| v.get("topic_allowlist"))
        .and_then(|v| v.as_array())
        .map(|topics| {
            topics
                .iter()
                .filter_map(|t| t.as_str())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let source_ids = parsed
        .as_ref()
        .and_then(|v| v.get("source_ids"))
        .and_then(|v| v.as_array())
        .map(|ids| ids.iter().filter_map(|id| id.as_str()).collect::<Vec<_>>())
        .unwrap_or_default();

    let mut lines = vec![format!("- Task: {task}")];
    if !scope.is_empty() {
        lines.push(format!("- Scope: {scope}"));
    }
    if !allowlist.is_empty() {
        lines.push(format!("- Topic allowlist: {}", allowlist.join(", ")));
    } else {
        lines.push(
            "- Topic allowlist: derive from task and indexed sources".to_string(),
        );
    }
    if !source_ids.is_empty() {
        lines.push(format!("- Source IDs: {}", source_ids.join(", ")));
    }
    lines.join("\n")
}

fn sanitize_tools_enabled(raw: &str) -> String {
    let allowed = [
        "temper_get",
        "temper_list",
        "temper_create",
        "temper_action",
        "temper_write",
        "temper_read",
        "temper_web_search",
        "temper_web_fetch",
    ];

    let mut selected: Vec<&str> = Vec::new();
    for tool in raw.split(',').map(str::trim).filter(|t| !t.is_empty()) {
        if allowed.contains(&tool) && !selected.contains(&tool) {
            selected.push(tool);
        }
    }

    if selected.is_empty() {
        allowed.join(",")
    } else {
        selected.join(",")
    }
}

fn ensure_workspace(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    name: &str,
) -> Result<String, String> {
    let find_resp = ctx.http_call(
        "GET",
        &format!(
            "{api_url}/tdata/Workspaces?$filter=Name%20eq%20'{}'",
            urlenc(name)
        ),
        headers,
        "",
    )?;
    if find_resp.status >= 200 && find_resp.status < 300 {
        let existing: serde_json::Value = serde_json::from_str(&find_resp.body)
            .map_err(|e| format!("Failed to parse workspace lookup response: {e}"))?;
        if let Some(id) = existing
            .get("value")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.get("entity_id").or_else(|| v.get("Id")))
            .and_then(|v| v.as_str())
        {
            return Ok(id.to_string());
        }
    }

    let create_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/Workspaces"),
        headers,
        &json!({ "Name": name }).to_string(),
    )?;
    if create_resp.status < 200 || create_resp.status >= 300 {
        return Err(format!(
            "Failed to create workspace '{name}': HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(500)]
        ));
    }

    let created: serde_json::Value = serde_json::from_str(&create_resp.body)
        .map_err(|e| format!("Failed to parse workspace creation response: {e}"))?;
    created
        .get("entity_id")
        .or_else(|| created.get("Id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Created workspace has no entity_id".to_string())
}

fn urlenc(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace('&', "%26")
        .replace('=', "%3D")
        .replace('?', "%3F")
        .replace('#', "%23")
        .replace('\'', "%27")
}
