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
            .unwrap_or("app-agent-curator")
            .to_string();

        let model = fields
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("gpt-5.4")
            .to_string();

        let provider = fields
            .get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or("openai_codex")
            .to_string();

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
        let tools_enabled = if skill == "synthesize-language" {
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

You are regenerating the embodiment for an EXISTING design language as TSX with Radix UI.

1. Read the existing language entity specified in the input (`existing_language_id`).
2. Read ALL its spec sections (Philosophy, Tokens, Rules, Layout, Guidance).
3. If the language is in Published state, call `Revise` first with `curator_notes: "Regenerating embodiment as TSX with Radix UI"`.
4. Skip the SPEC PHASE — specs already exist. Go directly to EMBODIMENT PHASE.
5. Generate a TSX embodiment using the existing spec's visual_character, signature_patterns, and tokens.
6. Follow the full sandbox compile + visual feedback loop from your skill instructions.
7. Call `AttachEmbodiment` with `embodiment_format: 'tsx'`.
8. Call `SubmitForReview` then `Publish` to re-publish the language.
"#,
            "synthesize" | "evolve_language" => r#"
## CRITICAL: TSX + Sandbox Required

**You MUST produce a TSX component, NOT raw HTML.** HTML embodiments are rejected.

The embodiment MUST be:
1. A TSX file using React + `@radix-ui/themes` (Radix UI primitives)
2. Compiled via `sandbox.bash('cd /tmp && npx tsc --jsx react-jsx ...')` in the sandbox
3. Visually validated via Playwright screenshot in the sandbox (`sandbox.bash`, `sandbox.write`, `sandbox.read`)
4. Published with `embodiment_format: 'tsx'` in the AttachEmbodiment call

**You MUST use `sandbox.write()` and `sandbox.bash()` for compilation and screenshots.**
Do NOT write HTML directly to TemperFS. The sandbox tools are available — use them.

After AttachEmbodiment, call SubmitForReview then Publish on the DesignLanguage.
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
        let needs_sandbox = skill == "synthesize-language";

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

fn urlenc(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace('&', "%26")
        .replace('=', "%3D")
        .replace('?', "%3F")
        .replace('#', "%23")
        .replace('\'', "%27")
}
