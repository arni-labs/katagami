use temper_wasm_sdk::prelude::*;

/// On CurationJob.Submit: maps job_type to a skill, builds a minimal
/// user_message, spawns a Session, and dispatches Configure.
///
/// All domain knowledge lives in SKILL.md files and workspace knowledge
/// files — this module is a thin bootloader only.
///
/// Maps job_type to skill:
///   source_search      -> research-direction
///   synthesize         -> synthesize-language
///   quality_review     -> review-quality
///   organize_taxonomy  -> organize-taxonomy
///   evolve_language    -> synthesize-language
#[unsafe(no_mangle)]
pub extern "C" fn run(_ctx_ptr: i32, _ctx_len: i32) -> i32 {
    let result = (|| -> Result<(), String> {
        let ctx = Context::from_host()?;
        ctx.log("info", "build_session_message: starting");

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
            .unwrap_or("curator")
            .to_string();

        // --- Config (needed early for secret lookups) ---
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

        let model = fields
            .get("model")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                ctx.config
                    .get("llm_model")
                    .filter(|s| !s.is_empty() && !s.contains("{secret:"))
                    .cloned()
            })
            .or_else(|| read_secret(&ctx, &api_url, &headers, "llm_model"))
            .ok_or("No model configured: set llm_model in vault or pass model on CurationJob")?;

        let provider = fields
            .get("provider")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                ctx.config
                    .get("llm_provider")
                    .filter(|s| !s.is_empty() && !s.contains("{secret:"))
                    .cloned()
            })
            .or_else(|| read_secret(&ctx, &api_url, &headers, "llm_provider"))
            .ok_or("No provider configured: set llm_provider in vault or pass provider on CurationJob")?;

        let tools_enabled = fields
            .get("tools_enabled")
            .and_then(|v| v.as_str())
            .unwrap_or("temper_get,temper_list,temper_create,temper_action,temper_write,temper_read,temper_web_search,temper_web_fetch")
            .to_string();

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

        // --- Map job_type to skill ---
        let skill = match job_type.as_str() {
            "source_search" => "research-direction",
            "synthesize" => "synthesize-language",
            "quality_review" => "review-quality",
            "organize_taxonomy" => "organize-taxonomy",
            "evolve_language" => "synthesize-language",
            "regenerate_embodiment" => "synthesize-language",
            other => {
                return Err(format!(
                    "build_session_message: unsupported job_type '{other}'"
                ));
            }
        };

        // Sandbox-capable skills need bash/read/write/edit tools
        let needs_sandbox_tools = skill == "synthesize-language" || skill == "review-quality";
        let tools_enabled = if needs_sandbox_tools {
            if tools_enabled.contains("bash") {
                tools_enabled
            } else {
                format!("{},bash,read,write,edit", tools_enabled)
            }
        } else {
            tools_enabled
        };

        // --- Ensure workspace ---
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

        // --- Build user_message ---
        let extra_instructions = match job_type.as_str() {
            "regenerate_embodiment" => r#"
## Regeneration Mode

You are regenerating the embodiment for an EXISTING design language as self-contained HTML.

1. Read the existing language entity specified in the input (`existing_language_id`).
2. Read ALL its spec sections (Philosophy, Tokens, Rules, Layout, Guidance).
3. If the language is in Published state, call `Revise` first with `curator_notes: "Regenerating embodiment HTML"`.
4. **MANDATORY: Run the Spec Validation Gate from your skill instructions.**
   Parse each JSON field and verify completeness:
   - `philosophy.visual_character` must have >= 3 items, each >= 30 chars with concrete CSS choices
   - `philosophy.summary` non-empty, `philosophy.values` >= 3 items
   - `tokens.colors` must have all 12 keys with real hex values (not empty or placeholder)
   - `tokens.typography` must have real font names and a google_fonts_url
   - `tokens.surfaces`, `tokens.borders`, `tokens.motion` must all be populated
   - `rules.signature_patterns` must have >= 3 items, each >= 30 chars with specific CSS techniques
   - `rules.composition`, `rules.hierarchy`, `rules.density` must be non-empty
   - `layout_principles.grid`, `layout_principles.breakpoints` must be non-empty
   - `guidance.do` >= 3 items, `guidance.dont` >= 3 items
5. **If ANY section fails validation — RESEARCH and rewrite it before generating the embodiment.**
   The spec is the primary artifact. It must come from research, not from reverse-engineering existing CSS.
   a. Search for existing research: `temper.list('DesignSources', "$filter=contains(name,'<language_name>')")`
   b. If no sources exist, research the design direction:
      `temper.web_search('<language_name> design system UI patterns typography')` and
      `temper.web_fetch(url)` on the best results.
   c. Study real-world references: what makes this design movement distinctive? What are the defining
      structural choices, typography conventions, color palettes, spatial relationships?
   d. Rewrite each failing section with concrete, research-backed content — specific CSS techniques
      and design decisions grounded in real references, not vague adjectives.
   e. Call the appropriate Set action (WritePhilosophy, SetTokens, SetRules, SetLayout, SetGuidance).
   f. Re-validate until all sections pass.
   **NEVER generate an embodiment from empty or skeleton specs — the spec defines the identity.**
6. Generate a self-contained HTML embodiment using the now-complete spec's visual_character, signature_patterns, and tokens.
7. Visually verify at 3 viewports (desktop 1440px, tablet 768px, mobile 375px) via Playwright screenshots in the sandbox.
8. Call `AttachEmbodiment` with `embodiment_format: 'html'`.
9. Call `SubmitForReview` then `Publish` to re-publish the language.
"#,
            "synthesize" | "evolve_language" => r#"
## CRITICAL: Self-Contained HTML + Visual Verification Required

**You MUST produce a single self-contained HTML file with embedded CSS.**

The embodiment MUST be:
1. A complete HTML file with all CSS in a `<style>` block — no external stylesheets except Google Fonts
2. Responsive with media queries for desktop, tablet, and mobile
3. Visually validated via Playwright screenshots at 3 viewports (desktop 1440px, tablet 768px, mobile 375px)
4. Published with `embodiment_format: 'html'` in the AttachEmbodiment call

**You MUST use `sandbox.write()`, `sandbox.bash()`, and `sandbox.read()` for screenshots.**
Write HTML to sandbox, screenshot at all 3 viewports, evaluate, iterate until polished.

After AttachEmbodiment, call SubmitForReview then Publish on the DesignLanguage.
"#,
            "quality_review" => r#"
## CRITICAL: Spec Validation Gate (MANDATORY — DO THIS FIRST)

**STOP. Before you touch the embodiment, you MUST validate and fix the spec.**

For each language in the job input:

1. `temper.get('DesignLanguages', lang_id)` — read ALL fields.
2. Parse every JSON spec section and check completeness:
   - `philosophy.visual_character` must have >= 3 items, each >= 30 chars with concrete CSS choices
   - `philosophy.summary` non-empty, `philosophy.values` >= 3 items
   - `tokens.colors` must have all 12 keys with real hex values (not empty or placeholder)
   - `tokens.typography` must have real font names and a google_fonts_url
   - `tokens.surfaces`, `tokens.borders`, `tokens.motion` must all be populated
   - `rules.signature_patterns` must have >= 3 items, each >= 30 chars with specific CSS techniques
   - `rules.composition`, `rules.hierarchy`, `rules.density` must be non-empty
   - `layout_principles.grid`, `layout_principles.breakpoints` must be non-empty
   - `guidance.do` >= 3 items, `guidance.dont` >= 3 items

3. **If ANY section is empty or skeleton — you MUST fix it before proceeding.**
   a. Search for existing research: `temper.list('DesignSources', "$filter=contains(name,'<language_name>')")`
   b. If no sources exist, research the design direction:
      `temper.web_search('<language_name> design system UI patterns typography')` and
      `temper.web_fetch(url)` on the best results.
   c. Write concrete, research-backed content for each failing section.
   d. Call the appropriate Set action (WritePhilosophy, SetTokens, SetRules, SetLayout, SetGuidance).
   e. Re-validate until ALL sections pass.
   **NEVER generate an embodiment from empty or skeleton specs.**

4. Only AFTER all specs pass validation: evaluate and regenerate the embodiment HTML.
5. Use sandbox for visual verification: `sandbox.write()`, `sandbox.bash()` (Playwright screenshots at 1440px, 768px, 375px).
6. Call `AttachEmbodiment` with the fixed HTML.
7. Call `UpdateQuality` then `Publish`.

**The spec is the primary artifact. An embodiment built on an empty spec is worthless.**
"#,
            _ => "",
        };

        let user_message = format!(
            r#"You are executing a CurationJob ({job_type}).
Job ID: {entity_id}
Skill: {skill}
Workspace ID: {workspace_id}

## Input

{input}
{extra_instructions}
## Instructions

Execute this job using your `{skill}` skill. Read your skill instructions
carefully and follow them step by step.

Read the knowledge files for design standards and quality thresholds:
- `temper.read("/system/knowledge/design-principles.md")` — embodiment standards
- `temper.read("/system/knowledge/quality-standards.md")` — quality thresholds
- `temper.read("/system/knowledge/feedback-log.md")` — human feedback to incorporate

When done, dispatch Complete on this CurationJob with structured output JSON.
If you cannot complete, dispatch Fail with error_message.

Entity set: CurationJobs
Job entity ID: {entity_id}

To complete:
```
output_json = json.dumps(result, ensure_ascii=False)
temper.action('CurationJobs', '{entity_id}', 'Complete', {{'output': output_json}})
temper.done("{job_type} complete")
```

To fail:
```
temper.action('CurationJobs', '{entity_id}', 'Fail', {{'error_message': reason}})
temper.done("{job_type} failed")
```
"#
        );

        ctx.log(
            "info",
            &format!(
                "build_session_message: skill='{}' prompt_len={}",
                skill,
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
        if !(200..300).contains(&create_resp.status) {
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
            &format!("build_session_message: created Session '{session_id}'"),
        );

        // --- Configure the Session ---
        // Sandbox-capable skills need a provisioned sandbox for compile + screenshot loop
        let needs_sandbox = skill == "synthesize-language" || skill == "review-quality";

        let mut config_body = json!({
            "soul_id": soul_id,
            "user_message": user_message,
            "model": model,
            "provider": provider,
            "tools_enabled": tools_enabled,
            "max_turns": max_turns,
            "workspace_id": workspace_id,
        });

        if needs_sandbox {
            // Read sandbox provider from server env (set via SANDBOX_PROVIDER)
            let sandbox_provider = ctx
                .config
                .get("sandbox_provider")
                .filter(|s| !s.is_empty() && !s.contains("{secret:"))
                .cloned()
                .unwrap_or_default();

            if !sandbox_provider.is_empty() {
                config_body
                    .as_object_mut()
                    .unwrap()
                    .insert("sandbox_provider".to_string(), json!(sandbox_provider));
                ctx.log(
                    "info",
                    &format!("build_session_message: enabling sandbox_provider='{sandbox_provider}' for {skill}"),
                );
            } else {
                ctx.log(
                    "warn",
                    "build_session_message: no sandbox_provider configured — agent will not have sandbox tools",
                );
            }
        }

        let configure_resp = ctx.http_call(
            "POST",
            &format!("{api_url}/tdata/Sessions('{session_id}')/OpenPaw.Configure"),
            &headers,
            &config_body.to_string(),
        )?;
        if !(200..300).contains(&configure_resp.status) {
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
        if !(200..300).contains(&spawned_resp.status) {
            return Err(format!(
                "Failed to dispatch SessionSpawned: HTTP {}: {}",
                spawned_resp.status,
                &spawned_resp.body[..spawned_resp.body.len().min(500)]
            ));
        }

        ctx.log("info", "build_session_message: completed successfully");

        set_success_result(
            "",
            &json!({
                "status": "ok",
                "session_id": session_id,
                "job_type": job_type,
                "skill": skill,
            }),
        );
        Ok(())
    })();

    if let Err(e) = result {
        set_error_result(&e);
    }
    0
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
    if !(200..300).contains(&create_resp.status) {
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

fn read_secret(ctx: &Context, api_url: &str, headers: &[(String, String)], key: &str) -> Option<String> {
    let resp = ctx
        .http_call("GET", &format!("{api_url}/paw/setup/secrets/{key}"), headers, "")
        .ok()?;
    if resp.status != 200 {
        return None;
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body).ok()?;
    parsed
        .get("value")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
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
