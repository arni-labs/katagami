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

## Operating Model

- This session has the shared workspace attached. Use `temper.read()` and `temper.write()`.
- The Monty REPL is persistent. Variables and helpers survive across `execute` calls.
- Persist durable artifacts to workspace files and Temper entities.
- Do not use `bash` or `sandbox.*`. Stay inside Temper tools only.

## Orient First

1. Load the active ElementManifest: `temper.list('ElementManifests', "$filter=State eq 'Active'")`
2. Read indexed DesignSources referenced by this job.
3. List existing DesignLanguages to avoid duplicates.

## Required Scope

{scope_block}

## Mission

Create complete DesignLanguage entities from the indexed sources. Each language must have all 5 structured spec sections (Philosophy, Tokens, Rules, Layout, Guidance) and a self-contained HTML embodiment rendering all canonical UI elements.

## Tooling Rules

- No `import` statements
- No `enumerate(..., start=...)`
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- Always serialize JSON with `json.dumps(...)`.
- Runtime constants:
  - `job_id = "{job_id}"`
  - `workspace_id = "{workspace_id}"`

## Exact Entity Shapes

- Create and populate a DesignLanguage:
  ```
  lang = temper.create('DesignLanguages', {{'Id': slug}})
  eid = lang['entity_id']
  temper.action('DesignLanguages', eid, 'SetName', {{'name': name, 'slug': slug}})
  temper.action('DesignLanguages', eid, 'WritePhilosophy', {{'philosophy': json.dumps(philosophy_obj)}})
  temper.action('DesignLanguages', eid, 'SetTokens', {{'tokens': json.dumps(tokens_obj)}})
  temper.action('DesignLanguages', eid, 'SetRules', {{'rules': json.dumps(rules_obj)}})
  temper.action('DesignLanguages', eid, 'SetLayout', {{'layout_principles': json.dumps(layout_obj)}})
  temper.action('DesignLanguages', eid, 'SetGuidance', {{'guidance': json.dumps(guidance_obj)}})
  ```
- Generate and attach embodiment:
  ```
  html = generate_embodiment(tokens, rules, elements)
  result = temper.write(f'/katagami/embodiments/{{slug}}.html', html)
  temper.action('DesignLanguages', eid, 'AttachEmbodiment', {{
      'embodiment_file_id': result['file_id'],
      'element_count': str(element_count),
      'composition_count': str(composition_count)
  }})
  ```
- Set lineage and sources:
  ```
  temper.action('DesignLanguages', eid, 'SetLineage', {{
      'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'
  }})
  temper.action('DesignLanguages', eid, 'SetSources', {{
      'source_ids': json.dumps(source_ids)
  }})
  ```
- Complete:
  ```
  output = json.dumps({{'language_ids': created_ids}}, ensure_ascii=False)
  temper.action('CurationJobs', job_id, 'Complete', {{'output': output}})
  temper.done("synthesize complete")
  ```

## Required Flow

1. Load ElementManifest and indexed sources.
2. Plan which design languages to create from the discovered movements.
3. For each language:
   a. Create entity and populate all 5 spec sections with substantive, movement-specific content.
   b. Generate self-contained HTML embodiment with inline CSS, no external deps.
   c. The embodiment must render EVERY element from the ElementManifest in the language's style.
   d. Store embodiment in workspace and attach to entity.
   e. Set lineage (original, generation 0) and link sources.
4. Update workspace index and log.
5. Dispatch `Complete` with all created language IDs.
6. Call `temper.done("synthesize complete")` immediately after.

## Token Structure

Each design language's tokens must include:
- **colors**: primary, secondary, accent, background, surface, text, muted, border, error, success, warning, info
- **typography**: heading_font, body_font, mono_font, base_size, scale_ratio, line_height, letter_spacing
- **spacing**: base unit (typically 4 or 8px), scale array
- **radii**: none, sm, md, lg, full
- **shadows**: sm, md, lg (with color, offset, blur)
- **elevation**: levels 0-4
- **motion**: duration_fast, duration_normal, duration_slow, easing
- **opacity**: disabled, hover, backdrop

## Embodiment HTML Standards

- Single self-contained HTML file with all CSS inline (in a `<style>` block)
- No external dependencies (no CDN links, no Google Fonts URLs)
- Must render every canonical element from the ElementManifest
- Organized by category with clear section headers
- Must visually demonstrate the design language's aesthetic
- Include both light states and interactive states (hover, focus, disabled) where applicable
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
