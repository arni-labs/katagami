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
- Do NOT create or modify Taxonomy entities. Taxonomies already exist.
- Do NOT call temper.read() for workspace files — there is nothing useful to read.
- EVERY tool call must create or populate a DesignLanguage. No exploration turns.
- You MUST create ALL languages before stopping. Do NOT return a text response until done.
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
  philosophy = {{"summary": "...", "values": [...], "anti_values": [...]}}
  temper.action('DesignLanguages', eid, 'WritePhilosophy', {{'philosophy': json.dumps(philosophy)}})
  tokens = {{"colors": {{...}}, "typography": {{...}}, "spacing": {{...}}, "radii": {{...}}, "shadows": {{...}}}}
  temper.action('DesignLanguages', eid, 'SetTokens', {{'tokens': json.dumps(tokens)}})
  rules = {{"composition": "...", "hierarchy": "...", "density": "..."}}
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

1. First tool call: Create language #1 (entity + all specs + HTML embodiment + attach).
2. Second tool call: Create language #2.
3. Continue until ALL languages in scope are created.
4. Final tool call: Complete the job and call temper.done().

Do NOT skip any language. Do NOT stop early. Do NOT return text between languages. Every tool call = one complete language.

## Token Structure

Each design language's tokens must include:
- **colors**: primary, secondary, accent, background, surface, text, muted, border, error, success, warning, info
- **typography**: heading_font, body_font, mono_font, base_size, scale_ratio, line_height, letter_spacing
- **spacing**: base unit (typically 4 or 8px), scale array
- **radii**: none, sm, md, lg, full
- **shadows**: sm, md, lg (with color, offset, blur)

## Embodiment HTML Standards — STRUCTURAL UNIQUENESS IS MANDATORY

Each embodiment MUST have a DIFFERENT HTML structure, not just different CSS variables. If two embodiments share the same template with only colors changed, that is a failure.

Structural differentiation requirements:
- **Neo-Brutalist**: 0px border-radius, thick 3-4px borders, offset box-shadows (4px 4px 0px), asymmetric grid, uppercase headings, monospace accents, raw/punk aesthetic
- **Cyberpunk/Neon**: Dark backgrounds (#0a0a0f), neon glow box-shadows (0 0 20px), monospace fonts, scan-line CSS effects, terminal-style inputs, glitch decorations
- **Swiss/International**: 12-column grid, Helvetica/Arial, zero decoration, pure typographic hierarchy, red accent, extreme letter-spacing on labels
- **Glassmorphism**: backdrop-filter blur, semi-transparent surfaces (rgba backgrounds), large border-radius (16-24px), subtle borders (1px rgba), frosted-glass cards
- **Neumorphism**: Large border-radius (20px+), double box-shadows (light + dark offset for 3D pillow effect), NO visible borders, soft muted palette
- **Art Deco**: Geometric ornamental borders, gold/brass accents (#C9A84C), wide letter-spacing, decorative section dividers, serif headings, fan/chevron patterns
- **Material Design 3**: Rounded rectangles (12-16px radius), tonal color system, elevation via shadows, 8px grid, Roboto font, FAB and chip components
- **Flat/Metro**: Zero shadows, zero gradients, zero border-radius, bold solid colors, thin borders only, segmented grid, clean sans-serif
- **Organic/Nature**: Irregular border-radius (blob shapes), earth tones, hand-drawn border styles, warm shadows, variable spacing, nature-inspired decorations
- **Retro-Futurism**: CRT phosphor colors, scanline overlays, curved/rounded shapes, monospace type, terminal green (#33ff33), bevel effects
- **Minimalist Japanese**: Extreme whitespace, subtle borders, muted palette, small precise typography, zen-like simplicity, asymmetric balance
- **Maximalist Pop**: Bold clashing colors, thick outlines, large type, sticker/collage aesthetic, rotated elements, playful shadows
- **Dark Luxury**: Pure black backgrounds, thin gold borders, serif headings, extreme contrast, subtle gradients, premium spacing
- **Retro Computing**: Pixel-perfect borders, system fonts (Courier), 1px borders, DOS-era colors, dithering patterns, 8-bit aesthetic

Each embodiment is a single self-contained HTML file:
- All CSS in a `<style>` block — NO external dependencies
- No CDN links, no Google Fonts URLs — use system font stacks
- Must render: buttons (primary, secondary, disabled), text inputs, select, checkbox, radio, toggle, cards, modal, alert, toast, table, tabs, badges, avatar, pagination, accordion, progress bar, and a mini dashboard composition
- Organized by category with clear section headers
- Include interactive states (hover, focus, disabled) via CSS pseudo-classes
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
