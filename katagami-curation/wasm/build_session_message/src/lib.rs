use temper_wasm_sdk::prelude::*;

const DEFAULT_TOOLS_ENABLED: &str = "temper_get,temper_list,temper_create,temper_action,temper_write,temper_read,temper_web_search,temper_web_fetch";
const DOC_WORKSPACE_ID: &str = "os-app-docs";

#[derive(Clone, Debug, PartialEq, Eq)]
struct JobTemplate {
    skill_id: String,
    instruction_path: String,
    tools_profile: String,
    requires_sandbox: bool,
    max_turns_default: String,
    completion_action: String,
    completion_contract: String,
    template_version: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct LoadedDoc {
    path: String,
    workspace_id: String,
    /// The file the path resolved to. Kept so a lower-priority copy of the
    /// same skill can be compared against the one that won.
    file_id: String,
    content: Option<String>,
}

/// On CurationJob.Submit/ConfigureAndSubmit: loads the active
/// CurationJobTemplate, builds the user_message, spawns a Session, and
/// dispatches Configure.
///
/// Domain knowledge lives in SKILL.md and knowledge files. This module loads
/// those TemperFS files at runtime so prompt policy is app data, not Rust
/// source.
///
/// Job routing, completion actions, and tool profiles live in
/// CurationJobTemplate entities so WASM stays a runtime bridge rather than a
/// prompt-policy module.
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
        let stable_soul_id = normalize_bootstrapped_soul_id(&soul_id);

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
            .ok_or(
                "No provider configured: set llm_provider in vault or pass provider on CurationJob",
            )?;

        let entity_id = ctx
            .entity_state
            .get("entity_id")
            .and_then(|v| v.as_str())
            .unwrap_or(&ctx.entity_id)
            .to_string();
        let parent_session_id = field_str(&fields, &["parent_session_id", "ParentSessionId"])
            .filter(|value| value.starts_with("ss-"))
            .unwrap_or_default();

        // Engine-stamped identity fields. direction_id / query_id are stamped onto
        // the synthesize CurationJob by the spawn/queue triggers (curation_direction
        // .ioa.toml: direction_queue_synthesis_creates_job stamps direction_id="Id",
        // query_id="query_id"); they are NOT in synth_input. Surface them as a labeled
        // line so the synthesize agent reads its direction_id/query_id from its own
        // job context, not from the Input block.
        let job_identity_block = render_job_identity_block(&fields);

        let template = lookup_active_template(&ctx, &api_url, &headers, &job_type)?;
        let skill = template.skill_id.as_str();
        let inline_job_docs = inline_job_docs_enabled(&ctx, &fields);
        let instruction_doc = load_instruction_doc(
            &ctx,
            &api_url,
            &headers,
            &template.instruction_path,
            &stable_soul_id,
            inline_job_docs,
        )?;
        let effective_instruction_path = instruction_doc.path.as_str();
        let knowledge_specs = knowledge_read_specs_for_skill(skill);
        let knowledge_docs = knowledge_specs
            .iter()
            .map(|(path, _)| load_doc_file(&ctx, &api_url, &headers, path, inline_job_docs))
            .collect::<Result<Vec<_>, _>>()?;
        let instruction_read_command =
            temper_read_command(effective_instruction_path, Some(&instruction_doc));
        let knowledge_read_commands = render_read_commands(knowledge_specs, &knowledge_docs);
        let loaded_reference_block =
            render_loaded_reference_block(&instruction_doc, &knowledge_docs, inline_job_docs);
        let reference_instruction_block = render_reference_instruction_block(
            skill,
            inline_job_docs,
            &instruction_read_command,
            &knowledge_read_commands,
        );

        let job_tools = fields
            .get("tools_enabled")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let mut tools_enabled = if job_tools.is_empty() || job_tools == DEFAULT_TOOLS_ENABLED {
            template.tools_profile.clone()
        } else {
            job_tools.to_string()
        };

        if template.requires_sandbox {
            for tool in ["bash", "read", "write", "edit"] {
                if !tools_enabled
                    .split(',')
                    .any(|candidate| candidate.trim() == tool)
                {
                    tools_enabled = format!("{tools_enabled},{tool}");
                }
            }
        }

        let job_max_turns = fields
            .get("max_turns")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let max_turns = if job_max_turns.is_empty() || job_max_turns == "250" {
            template.max_turns_default.clone()
        } else {
            job_max_turns.to_string()
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
        let completion_params_block =
            completion_params_block(&template.completion_action, &job_type, &entity_id);
        // Accepted taste rules are the authoritative design tests. The skill
        // used to say "load accepted taste rules" — LLMobs showed zero
        // sessions ever did, so the rules are now fetched here and inlined.
        let taste_rules_block = render_taste_rules_block(&ctx, &api_url, &headers, skill);
        // Prompt INVERSION (2026-07-24): the brief and the taste corpus lead;
        // the harness card trails, one screen. A session that opens with
        // contract language produces a compliance clerk; one that opens with
        // the design brief produces a designer. Errors teach the plumbing.
        let user_message = format!(
            r#"You are a Katagami design agent. Your job: the design brief below, executed to the standard of the best work in the library.

{job_identity_block}## The brief

{input}
{taste_rules_block}

{loaded_reference_block}

## Instructions

{reference_instruction_block}

## Harness card (everything operational you need)

- Job: CurationJob `{entity_id}` ({job_type}) — skill `{skill}`, workspace `{workspace_id}`.
- Instruction path: {effective_instruction_path}
- Finish by dispatching `{completion_action}` on this CurationJob with the params the skill specifies (contract {completion_contract}); then `temper.done(...)`. Never legacy `Complete`.
{completion_params_block}
- If truly stuck after retrying: `temper.action('CurationJobs', '{entity_id}', 'Fail', {{'error_message': reason}})` then `temper.done("failed")`.
- Tool errors (NameError, HTTP failure, unknown action) come back with corrective detail — read the error, fix the call, continue.
"#,
            effective_instruction_path = effective_instruction_path,
            completion_action = template.completion_action.as_str(),
            completion_contract = template.completion_contract.as_str(),
            reference_instruction_block = reference_instruction_block,
            completion_params_block = completion_params_block,
        );

        ctx.log(
            "info",
            &format!(
                "build_session_message: skill='{}' prompt_len={} docs_resolved={} inline_docs={}",
                skill,
                user_message.len(),
                1 + knowledge_docs.len(),
                inline_job_docs
            ),
        );

        // --- Create Session entity ---
        let session_create_body = if parent_session_id.is_empty() {
            json!({"fields": {}})
        } else {
            json!({"fields": {"ParentSessionId": parent_session_id.clone()}})
        };
        let create_resp = ctx.http_call(
            "POST",
            &format!("{api_url}/tdata/Sessions"),
            &headers,
            &session_create_body.to_string(),
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
        let needs_sandbox = template.requires_sandbox;

        let mut config_body = json!({
            "soul_id": stable_soul_id,
            "agent_id": stable_soul_id,
            "user_message": user_message,
            "model": model,
            "provider": provider,
            "tools_enabled": tools_enabled,
            "max_turns": max_turns,
            "workspace_id": workspace_id,
            // ARN-269: curation sessions terminate ONLY via their typed completion
            // action, so the provider must never return a tool-less turn (which
            // silently completes the session and orphans the job). max_turns bounds
            // the loop.
            "tool_choice": "required",
        });

        if !parent_session_id.is_empty() {
            config_body.as_object_mut().unwrap().insert(
                "parent_session_id".to_string(),
                json!(parent_session_id.clone()),
            );
        }

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
                // Pin the render image as a LITERAL on the Session entity.
                // Resolving {secret:sandbox_image} inside paw-agent's trigger
                // config proved non-deterministic across sessions — some
                // sandboxes booted the provider's bare default image (no
                // Playwright/Chromium after Tensorlake's 2026-07-22 migration)
                // and agents designed blind.
                let sandbox_image = ctx
                    .config
                    .get("sandbox_image")
                    .filter(|s| !s.is_empty() && !s.contains("{secret:"))
                    .cloned()
                    .unwrap_or_default();
                if !sandbox_image.is_empty() {
                    config_body
                        .as_object_mut()
                        .unwrap()
                        .insert("sandbox_image".to_string(), json!(sandbox_image));
                    ctx.log(
                        "info",
                        &format!("build_session_message: pinning sandbox_image='{sandbox_image}' for {skill}"),
                    );
                } else {
                    ctx.log(
                        "warn",
                        "build_session_message: no sandbox_image configured — sandbox may boot the provider default image without the render stack",
                    );
                }
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

        if let Err(link_error) =
            create_session_link(&ctx, &api_url, &headers, &entity_id, &session_id)
        {
            let message =
                format!("SessionLink setup failed for child Session '{session_id}': {link_error}");
            dispatch_curation_job_failure(&ctx, &api_url, &headers, &entity_id, &message)?;
            return Err(message);
        }

        ctx.log("info", "build_session_message: completed successfully");

        set_success_result(
            "",
            &json!({
                "status": "ok",
                "session_id": session_id,
                "job_type": job_type,
                "skill": skill,
                "template_version": template.template_version,
                "parent_session_id": parent_session_id,
            }),
        );
        Ok(())
    })();

    if let Err(e) = result {
        set_error_result(&e);
    }
    0
}

fn create_session_link(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    parent_job_id: &str,
    child_session_id: &str,
) -> Result<(), String> {
    let create_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/SessionLinks"),
        headers,
        "{}",
    )?;
    if create_resp.status < 200 || create_resp.status >= 300 {
        return Err(format!(
            "Failed to create SessionLink: HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(500)]
        ));
    }
    let created: Value = serde_json::from_str(&create_resp.body)
        .map_err(|err| format!("Failed to parse SessionLink creation response: {err}"))?;
    let link_id = created
        .get("entity_id")
        .or_else(|| created.get("Id"))
        .and_then(|value| value.as_str())
        .ok_or("Created SessionLink has no entity_id")?;

    let configure_body = json!({
        "ParentEntitySet": "CurationJobs",
        "ParentEntityId": parent_job_id,
        "ParentActionNamespace": "Katagami.Curation",
        "ChildSessionId": child_session_id,
        "OnCompletedAction": "",
        "OnFailureAction": "Fail",
        "MaxChecks": "80",
    });
    let configure_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/SessionLinks('{link_id}')/TemperPaw.Configure"),
        headers,
        &configure_body.to_string(),
    )?;
    if configure_resp.status < 200 || configure_resp.status >= 300 {
        return Err(format!(
            "Failed to configure SessionLink: HTTP {}: {}",
            configure_resp.status,
            &configure_resp.body[..configure_resp.body.len().min(500)]
        ));
    }

    ctx.log(
        "info",
        &format!(
            "build_session_message: linked CurationJob '{parent_job_id}' to Session '{child_session_id}'"
        ),
    );
    Ok(())
}

fn dispatch_curation_job_failure(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    curation_job_id: &str,
    message: &str,
) -> Result<(), String> {
    let fail_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs('{curation_job_id}')/Katagami.Curation.Fail"),
        headers,
        &json!({ "error_message": message }).to_string(),
    )?;
    if fail_resp.status < 200 || fail_resp.status >= 300 {
        return Err(format!(
            "Failed to dispatch CurationJob.Fail after SessionLink setup failure: HTTP {}: {}",
            fail_resp.status,
            &fail_resp.body[..fail_resp.body.len().min(500)]
        ));
    }
    Ok(())
}

fn lookup_active_template(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_type: &str,
) -> Result<JobTemplate, String> {
    if job_type.trim().is_empty() {
        return Err("build_session_message: job_type is empty".to_string());
    }

    let resp = ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/CurationJobTemplates?$top=100"),
        headers,
        "",
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to list CurationJobTemplates: HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(500)]
        ));
    }

    let parsed: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse CurationJobTemplates response: {e}"))?;
    let values = parsed
        .get("value")
        .and_then(|v| v.as_array())
        .ok_or("CurationJobTemplates response has no value array")?;

    for item in values {
        if entity_status(item) != "Active" {
            continue;
        }
        let fields = item.get("fields").unwrap_or(item);
        if field_str(fields, &["job_type", "JobType"]).as_deref() != Some(job_type) {
            continue;
        }
        let template = parse_template(fields)?;
        if template.completion_action.is_empty() {
            return Err(format!(
                "CurationJobTemplate for '{job_type}' has empty completion_action"
            ));
        }
        return Ok(template);
    }

    Err(format!(
        "No active CurationJobTemplate found for job_type '{job_type}'"
    ))
}

fn parse_template(fields: &serde_json::Value) -> Result<JobTemplate, String> {
    let skill_id = require_field(fields, &["skill_id", "SkillId"], "skill_id")?;
    Ok(JobTemplate {
        skill_id,
        instruction_path: require_field(
            fields,
            &["instruction_path", "InstructionPath"],
            "instruction_path",
        )?,
        tools_profile: field_str(fields, &["tools_profile", "ToolsProfile"])
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| DEFAULT_TOOLS_ENABLED.to_string()),
        requires_sandbox: field_bool(fields, &["requires_sandbox", "RequiresSandbox"]),
        max_turns_default: field_str(fields, &["max_turns_default", "MaxTurnsDefault"])
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "250".to_string()),
        completion_action: require_field(
            fields,
            &["completion_action", "CompletionAction"],
            "completion_action",
        )?,
        completion_contract: field_str(fields, &["completion_contract", "CompletionContract"])
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "typed-v1".to_string()),
        template_version: field_str(fields, &["template_version", "TemplateVersion"])
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "1".to_string()),
    })
}

/// Surface a job's engine-stamped identity (direction_id, query_id) as a labeled
/// prompt block. These are stamped onto the synthesize/review job by the spawn/queue
/// triggers (curation_direction.ioa.toml direction_queue_synthesis_creates_job:
/// direction_id="Id", query_id="query_id") and are NOT in synth_input — the agent must
/// read them here, never parse ids out of the Input block. Empty for jobs that carry
/// neither (e.g. source_search, whose identity is engine-owned via SpawnDirection).
fn render_job_identity_block(fields: &serde_json::Value) -> String {
    let direction_id = field_str(fields, &["direction_id", "DirectionId"]).unwrap_or_default();
    let query_id = field_str(fields, &["query_id", "QueryId"]).unwrap_or_default();
    let mut lines = Vec::new();
    if !direction_id.is_empty() {
        lines.push(format!("direction_id = \"{direction_id}\""));
    }
    if !query_id.is_empty() {
        lines.push(format!("query_id = \"{query_id}\""));
    }
    if lines.is_empty() {
        return String::new();
    }
    format!(
        "## Your job identity (engine-stamped — use these directly; do NOT parse ids out of the Input block)\n{}\n\n",
        lines.join("\n")
    )
}

fn completion_params_block(completion_action: &str, job_type: &str, entity_id: &str) -> String {
    let snippet = match completion_action {
        "CompleteResearch" => format!(
            r#"```python
direction_ids = [...]  # the movement names you spawned via SpawnDirection — a non-empty
# fan-out signal only, NOT CurationDirection entity IDs (the engine mints and owns those).
# output_type is the concrete lane you inferred (design_language/palette/art_style),
# never 'auto' — it is recorded on the parent query for barrier-scope routing.
temper.action('CurationJobs', '{entity_id}', 'CompleteResearch', {{
    'direction_ids': json.dumps(direction_ids),
    'output_type': output_type
}})
```"#
        ),
        "CompleteSynthesis" => format!(
            r#"```python
# First run the DRIVE-TO-REVIEW loop in the synthesize-language skill: drive each
# created language to UnderReview via SubmitForReview, repairing whatever its guard
# names; Quarantine an unfixable one. `survivors` are the languages that reached
# UnderReview. CompleteSynthesis is GUARDED to reject any language still in Draft.
if not survivors:
    temper.action('CurationJobs', '{entity_id}', 'Fail', {{
        'error_message': 'synthesize produced no language that reached UnderReview.'
    }})
else:
    review_input = json.dumps({{
        'language_ids': survivors,
        'query_id': query_id
    }}, ensure_ascii=False)
    temper.action('CurationJobs', '{entity_id}', 'CompleteSynthesis', {{
        'design_language_ids': json.dumps(survivors),
        'design_language_id': survivors[0],
        'review_input': review_input
    }})
```"#
        ),
        "CompleteQualityReview" => format!(
            r#"```python
organize_input = json.dumps({{
    'language_ids': design_language_ids,
    'query_id': query_id
}}, ensure_ascii=False)
temper.action('CurationJobs', '{entity_id}', 'CompleteQualityReview', {{
    'design_language_ids': json.dumps(design_language_ids),
    'organize_input': organize_input
}})
```"#
        ),
        "CompleteOrganization" => format!(
            r#"```python
temper.action('CurationJobs', '{entity_id}', 'CompleteOrganization', {{
    'output': json.dumps(output, ensure_ascii=False)
}})
```"#
        ),
        "CompleteRegeneration" => format!(
            r#"```python
temper.action('CurationJobs', '{entity_id}', 'CompleteRegeneration', {{
    'design_language_ids': json.dumps(created_ids),
    'output': json.dumps({{'language_ids': created_ids}}, ensure_ascii=False)
}})
```"#
        ),
        "CompleteEvolution" => format!(
            r#"```python
temper.action('CurationJobs', '{entity_id}', 'CompleteEvolution', {{
    'design_language_ids': json.dumps(created_ids),
    'output': json.dumps({{'language_ids': created_ids}}, ensure_ascii=False)
}})
```"#
        ),
        "CompleteTasteDistillation" => format!(
            r#"```python
temper.action('CurationJobs', '{entity_id}', 'CompleteTasteDistillation', {{
    'taste_rule_ids': json.dumps(taste_rule_ids),
    'report_file_id': report_file_id,
    'output': json.dumps(output, ensure_ascii=False)
}})
```"#
        ),
        "CompletePaletteSynthesis" => format!(
            r#"```python
temper.action('CurationJobs', '{entity_id}', 'CompletePaletteSynthesis', {{
    'palette_system_ids': json.dumps(palette_system_ids),
    'output': json.dumps({{'palette_system_ids': palette_system_ids}}, ensure_ascii=False)
}})
```"#
        ),
        "CompleteArtStyleSynthesis" => format!(
            r#"```python
temper.action('CurationJobs', '{entity_id}', 'CompleteArtStyleSynthesis', {{
    'art_style_ids': json.dumps(art_style_ids),
    'output': json.dumps({{'art_style_ids': art_style_ids}}, ensure_ascii=False)
}})
```"#
        ),
        _ => format!(
            r#"```python
params = {{...}}  # required params for {completion_action}; never use {{}}
temper.action('CurationJobs', '{entity_id}', '{completion_action}', params)
```"#
        ),
    };

    format!("Required completion params for `{completion_action}` on `{job_type}`:\n{snippet}")
}

fn require_field(fields: &serde_json::Value, keys: &[&str], label: &str) -> Result<String, String> {
    field_str(fields, keys)
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| format!("CurationJobTemplate missing required {label}"))
}

fn field_str(fields: &serde_json::Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        fields
            .get(*key)
            .and_then(|value| value.as_str())
            .map(|value| value.to_string())
    })
}

fn field_bool(fields: &serde_json::Value, keys: &[&str]) -> bool {
    field_bool_option(fields, keys).unwrap_or(false)
}

fn field_bool_option(fields: &serde_json::Value, keys: &[&str]) -> Option<bool> {
    keys.iter()
        .find_map(|key| fields.get(*key))
        .and_then(|value| {
            value.as_bool().or_else(|| {
                value
                    .as_str()
                    .and_then(|s| parse_bool_config_value(s.trim()))
            })
        })
}

fn inline_job_docs_enabled(ctx: &Context, fields: &serde_json::Value) -> bool {
    field_bool_option(fields, &["inline_job_docs", "InlineJobDocs"])
        .or_else(|| {
            ctx.config
                .get("katagami_inline_job_docs")
                .and_then(|value| parse_bool_config_value(value))
        })
        .unwrap_or(true)
}

#[cfg(test)]
fn config_bool(value: &str) -> bool {
    parse_bool_config_value(value).unwrap_or(false)
}

fn parse_bool_config_value(value: &str) -> Option<bool> {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "true" | "1" | "yes" | "on"
    )
    .then_some(true)
    .or_else(|| {
        matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "false" | "0" | "no" | "off"
        )
        .then_some(false)
    })
}

fn entity_status(item: &serde_json::Value) -> &str {
    item.get("status")
        .or_else(|| item.get("State"))
        .or_else(|| item.get("state"))
        .or_else(|| item.get("fields").and_then(|f| f.get("state")))
        .or_else(|| item.get("fields").and_then(|f| f.get("State")))
        .and_then(|value| value.as_str())
        .unwrap_or("")
}

fn load_instruction_doc(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    configured_path: &str,
    stable_soul_id: &str,
    inline_content: bool,
) -> Result<LoadedDoc, String> {
    let candidates = instruction_path_candidates(configured_path, stable_soul_id);
    let mut errors = Vec::new();
    for (index, path) in candidates.iter().enumerate() {
        match load_doc_file(ctx, api_url, headers, path, inline_content) {
            Ok(doc) => {
                warn_on_shadowed_instruction_copies(
                    ctx,
                    api_url,
                    headers,
                    &candidates[index + 1..],
                    path,
                    &doc.file_id,
                );
                return Ok(doc);
            }
            Err(error) => errors.push(format!("{path}: {error}")),
        }
    }
    Err(format!(
        "failed to load required instruction doc for '{configured_path}' from TemperFS workspace '{DOC_WORKSPACE_ID}'; candidates=[{}]; errors=[{}]",
        candidates.join(", "),
        errors.join(" | ")
    ))
}

/// Name every copy of the skill that lost, so an install cannot be ignored in
/// silence.
///
/// The ordering below prefers the app-shipped copy, which is right for staleness
/// and wrong for one case: `paw-skills`' agent-scoped install writes to
/// `/agents/<agent-id>/skills/<slug>/SKILL.md` — a soul path. An operator who
/// installs a corrected skill there gets a successful action, and every job
/// afterwards keeps reading the app copy. That is precisely the shape of the
/// workspace_fs shadowing bug, where an archived file masked a live one for
/// months because nothing ever said which file had been chosen.
///
/// So whenever a candidate wins, the remaining candidates are resolved too, and
/// a DIFFERENT file at a lower-priority path is reported at warn level with both
/// paths and both file ids. The app copy still wins — that is the documented
/// semantics, and it is what keeps a stale bootstrap snapshot from pinning a
/// session — but choosing it is now an event somebody can see and act on.
///
/// Cost: one `ResolvePath` per lower-priority candidate — one in the ordinary
/// case — plus one `Files('<id>')` row read each. The winning copy adds nothing,
/// because `load_doc_file` already resolved it and its id is passed straight in.
/// `ResolvePath` measured 581–1126ms in `.proofs/perf-036`, against a job that
/// then runs an LLM session for minutes. Detecting a shadowed install cannot be
/// done without looking for it, and a silent wrong skill is more expensive than
/// a second of latency.
///
/// Every hash compared here comes from an id produced by that same resolver,
/// scoped to `DOC_WORKSPACE_ID` — never from a path query. `Path` is not unique
/// and a path listing spans workspaces, so comparing by path compares files no
/// session would ever load. See `doc_content_hash`.
///
/// Which lower-priority copies are actually shadowing something.
///
/// Pure, so the decision can be tested without a server — and so that the
/// decision is a thing somebody can look at. The first version compared FILE
/// IDS, which are per-entity: two paths are two File entities, so the ids
/// always differ and the warning fired on every job, for every template,
/// forever. A signal that is always on is not a signal; the runbook's own query
/// would have returned a hit whether or not anyone had installed anything,
/// training the reader to ignore the one line that matters. That is how the
/// original shadowing bug survived as long as it did.
///
/// `content_hash` answers the actual question — is a DIFFERENT skill being
/// ignored? — and it is a first-class state field on the File entity
/// (`paw-fs/specs/file.ioa.toml`, alongside `size_bytes` and `version_count`),
/// readable from the row without fetching any body.
///
/// `None` means "could not be determined": either no file at that path, or the
/// metadata read failed. Neither is evidence of a different skill sitting
/// there, so neither warns.
fn shadowed_paths<'a>(
    winner_hash: Option<&str>,
    lower_priority: &'a [(String, Option<String>)],
) -> Vec<&'a str> {
    let Some(winner_hash) = winner_hash else {
        // Nothing to compare against; "shadowed" here would be a guess.
        return Vec::new();
    };
    lower_priority
        .iter()
        .filter_map(|(path, hash)| match hash.as_deref() {
            Some(hash) if hash != winner_hash => Some(path.as_str()),
            _ => None,
        })
        .collect()
}

/// `content_hash` as a `File` row spells it: nested under `fields`, snake_case.
///
/// Probed against openpaw-production, tenant `default`, on 2026-08-12, on both
/// shapes this module can see — the `$filter` listing in `doc_content_hash`
/// below, and a single-entity `GET /tdata/Files('<id>')`. Both nest it as
/// `fields.content_hash`. Neither carries a top-level `ContentHash` or a
/// top-level `content_hash`, so the top-level fallback this function used to
/// keep was dead on every response the server actually returns; it is gone
/// rather than left to read as a verified alternative shape.
///
/// `fields` mixes cases and the mix is not arbitrary: `Id`/`Name`/`Path`/
/// `Status` come back PascalCase, while the entity's own state vars —
/// `content_hash`, `size_bytes`, `version_count` — are snake_case. Read the
/// snake_case spelling for anything declared in `paw-fs/specs/file.ioa.toml`.
fn content_hash_from_file_row(row: &serde_json::Value) -> Option<String> {
    row.get("fields")
        .and_then(|fields| fields.get("content_hash"))
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
}

/// The content hash of one specific `File`, read by id.
///
/// By id, never by path. A path is not a key here: `Path` is not unique, and a
/// `$filter=Path eq '…'` listing spans workspaces, so it can hand back a file
/// the session never opened. Everything this check compares is therefore keyed
/// on an id that came out of the same resolver the loader used.
///
/// **Do not add `$select`.** Without it the server returns the entity envelope —
/// `{"fields": {...}, "counters": {...}, ...}` — which is what
/// `content_hash_from_file_row` reads, and what `lookup_active_template` already
/// relies on for `CurationJobTemplates`. `$select` projects properties instead
/// and yields a flattened row (`{"Path": …, "WorkspaceId": …, "Id": …}`) with no
/// `fields` object. Nothing would error on that: the hash would read as `None`
/// everywhere, `shadowed_paths` would compare nothing, and shadow detection
/// would switch off in silence. (The envelope shape is measured — 2026-08-12,
/// see `content_hash_from_file_row`; the flattened `$select` shape is carried
/// over from the ARN-305 probe notes and is not re-measured here.)
///
/// `Ok(None)` is a genuine miss — no such file. `Err` is a failure to find out,
/// which must not be reported as either a miss or a match.
fn file_content_hash(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    file_id: &str,
) -> Result<Option<String>, String> {
    let quoted = file_id.replace('\'', "''");
    let resp = ctx
        .http_call(
            "GET",
            &format!("{api_url}/tdata/Files('{quoted}')"),
            headers,
            "",
        )
        .map_err(|err| format!("Files read failed for id '{file_id}': {err}"))?;
    if resp.status == 404 {
        return Ok(None);
    }
    if resp.status != 200 {
        return Err(format!(
            "Files read returned HTTP {} for id '{file_id}'",
            resp.status
        ));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|err| format!("Files read returned invalid JSON for id '{file_id}': {err}"))?;
    Ok(content_hash_from_file_row(&parsed))
}

/// The content hash of whatever `path` resolves to **inside the doc workspace**.
///
/// This asks the question the loader asks, and that is the entire point: it
/// resolves through `ResolvePath` scoped to `DOC_WORKSPACE_ID`, exactly as
/// `load_doc_file` does, then reads the hash of that id. So the file compared is
/// by construction the file a session would have loaded from this path.
///
/// The earlier version filtered `Files` on `Path` alone. That was unscoped and
/// `Path` is not unique, so it compared across workspaces: measured on
/// openpaw-production 2026-08-12, `/agents/curator/skills/review-quality/SKILL.md`
/// returns two `File` entities (one in `os-app-docs`, one in `ws-019de271-…`)
/// and the matching soul path returns three, two of them inside `os-app-docs`.
/// Taking the first row of an unordered list read the winner's hash out of a
/// workspace the session never touched, so it never matched and the warning
/// fired on every job — the always-on signal that comparing hashes instead of
/// ids was meant to end. Scoping the filter to the workspace would not have been
/// enough either, because the soul path has two entities within `os-app-docs`;
/// only the resolver disambiguates them.
///
/// `Ok(None)` means nothing resolves at that path in the doc workspace, which is
/// a miss and never a warning.
fn doc_content_hash(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    path: &str,
) -> Result<Option<String>, String> {
    match resolve_doc_file_id_opt(ctx, api_url, headers, path)? {
        Some(file_id) => file_content_hash(ctx, api_url, headers, &file_id),
        None => Ok(None),
    }
}

fn warn_on_shadowed_instruction_copies(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    lower_priority: &[String],
    winning_path: &str,
    winning_file_id: &str,
) {
    if lower_priority.is_empty() {
        return;
    }

    // The winner is read by the id the loader already resolved, so it costs no
    // extra ResolvePath and is by construction the file this session opened —
    // there is no second lookup that could disagree with the load.
    let winner_hash = match file_content_hash(ctx, api_url, headers, winning_file_id) {
        Ok(hash) => hash,
        Err(error) => {
            // A failure to look is not a clean bill of health. Going quiet here
            // is how a shadowed install during FS flakiness disappears without
            // leaving a trace of the fact that nobody checked.
            ctx.log(
                "debug",
                &format!(
                    "build_session_message: shadow check skipped — could not read the content \
                     hash of the winning copy. path='{winning_path}' \
                     file_id='{winning_file_id}' error='{error}'"
                ),
            );
            return;
        }
    };

    let mut probed: Vec<(String, Option<String>)> = Vec::new();
    for path in lower_priority {
        match doc_content_hash(ctx, api_url, headers, path) {
            Ok(hash) => probed.push((path.clone(), hash)),
            Err(error) => {
                ctx.log(
                    "debug",
                    &format!(
                        "build_session_message: shadow check incomplete — could not read the \
                         content hash of a lower-priority copy, so a shadowed install there \
                         would go unreported. path='{path}' error='{error}'"
                    ),
                );
                probed.push((path.clone(), None));
            }
        }
    }

    for path in shadowed_paths(winner_hash.as_deref(), &probed) {
        ctx.log(
            "warn",
            &format!(
                "build_session_message: instruction doc SHADOWED. A file with DIFFERENT content \
                 exists at a lower-priority path and is NOT being used. \
                 used_path='{winning_path}' used_hash='{}' shadowed_path='{path}' \
                 workspace='{DOC_WORKSPACE_ID}'. The app-shipped copy wins by design, so that a \
                 one-time bootstrap snapshot cannot pin a session to a stale skill. If you \
                 installed a skill at the shadowed path and meant it to take effect, install it \
                 to the app path instead, or reconfigure the template's instruction_path.",
                winner_hash.as_deref().unwrap_or("")
            ),
        );
    }
}

/// The directory the app installs its own copy of the curator skills into.
/// Refreshed on every app install, which is what makes it the one to prefer.
///
/// Verified against the live tenant on 2026-08-12 (openpaw-production, tenant
/// `default`, workspace `os-app-docs`): the app path carries materially more
/// versions than the soul snapshot of the same skill — review-quality 17 vs 10,
/// synthesize-language 9 vs 2 — with identical bytes at the time of the probe.
/// So the two copies do drift apart in refresh rate, and preferring the app copy
/// is not a no-op. See `docs/runbooks/arn-305-template-skill-paths.md` for how
/// to re-run that check.
const APP_SHIPPED_AGENT: &str = "curator";

/// `/agents/<whatever>/skills/x/SKILL.md` -> `skills/x/SKILL.md`.
///
/// The agent directory is the part that varies between the app-shipped copy
/// and a per-soul bootstrap snapshot; the tail is what actually names the
/// skill, so it is the part worth keeping.
fn agent_relative_tail(path: &str) -> Option<&str> {
    let rest = path.strip_prefix("/agents/")?;
    let (_agent_dir, tail) = rest.split_once('/')?;
    if tail.is_empty() {
        return None;
    }
    Some(tail)
}

fn instruction_path_candidates(configured_path: &str, stable_soul_id: &str) -> Vec<String> {
    // The app-shipped skill comes FIRST: it is refreshed on every app install,
    // so sessions always read the deployed version. The per-soul bootstrap
    // copy is a one-time snapshot that installs never update — preferring it
    // had every session reading a stale skill long after the app moved on.
    // It remains only as a fallback for skills the app does not ship.
    //
    // The preference is derived from the SKILL, not from the spelling of the
    // configured path. The previous version only added the fallback when the
    // path already began `/agents/curator/`, so a template configured with a
    // bootstrap-snapshot path produced exactly one candidate — the snapshot —
    // and the app-shipped copy was never even tried. Every seeded template in
    // `seed-data/job_templates.toml` was configured that way, so the
    // preference this function documents had never once applied in practice.
    //
    // Now any `/agents/<dir>/<tail>` path yields the same ordered pair: the
    // app copy of `<tail>`, then the soul snapshot of `<tail>`. A path that
    // names no agent directory is used as given.
    let mut candidates: Vec<String> = Vec::new();
    let push = |candidates: &mut Vec<String>, candidate: String| {
        if !candidates.contains(&candidate) {
            candidates.push(candidate);
        }
    };

    if let Some(tail) = agent_relative_tail(configured_path) {
        push(&mut candidates, format!("/agents/{APP_SHIPPED_AGENT}/{tail}"));
        push(&mut candidates, format!("/agents/{stable_soul_id}/{tail}"));
        push(&mut candidates, configured_path.to_string());
        // A soul-INDEPENDENT last resort.
        //
        // The old seed hardcoded the bootstrap soul in every template, so a job
        // running under any soul_id still resolved that one fixed path.
        // Deriving the fallback from the job's own soul_id narrows that: a job
        // with an unusual soul_id, on a tenant where the app copy is missing,
        // would be left with nothing to try — a hard failure where the old
        // spelling succeeded. Naming the bootstrap soul explicitly at the end
        // keeps that door open. It costs nothing when it duplicates one of the
        // candidates above, which it does for the default soul.
        let bootstrap_soul = normalize_bootstrapped_soul_id(APP_SHIPPED_AGENT);
        push(&mut candidates, format!("/agents/{bootstrap_soul}/{tail}"));
    } else {
        push(&mut candidates, configured_path.to_string());
    }
    candidates
}

fn load_doc_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    path: &str,
    inline_content: bool,
) -> Result<LoadedDoc, String> {
    let file_id = resolve_doc_file_id(ctx, api_url, headers, path)?;
    let content = if inline_content {
        Some(load_file_content(ctx, api_url, headers, &file_id)?)
    } else {
        None
    };

    Ok(LoadedDoc {
        path: path.to_string(),
        workspace_id: DOC_WORKSPACE_ID.to_string(),
        file_id,
        content,
    })
}

/// Resolve `path` within `DOC_WORKSPACE_ID`, distinguishing "nothing there"
/// from "could not find out".
///
/// A 200 that names no matching file is a real answer: the doc workspace has
/// nothing at that exact path. A transport or status failure is not an answer at
/// all. The shadow check needs to tell those apart — a path that simply has no
/// lower-priority copy is the ordinary case and must stay quiet, while a failed
/// lookup means nobody checked and has to say so.
fn resolve_doc_file_id_opt(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    path: &str,
) -> Result<Option<String>, String> {
    let resp = ctx
        .http_call(
            "POST",
            &format!(
                "{api_url}/tdata/Workspaces('{DOC_WORKSPACE_ID}')/Temper.ResolvePath?await_integration=true"
            ),
            headers,
            &json!({"path": path}).to_string(),
        )
        .map_err(|err| format!("ResolvePath HTTP call failed for '{path}': {err}"))?;
    if resp.status != 200 {
        return Err(format!(
            "ResolvePath returned HTTP {} for '{path}': {}",
            resp.status,
            &resp.body[..resp.body.len().min(500)]
        ));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|err| format!("ResolvePath returned invalid JSON for '{path}': {err}"))?;
    Ok(file_id_from_workspace_response(&parsed, path))
}

fn resolve_doc_file_id(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    path: &str,
) -> Result<String, String> {
    resolve_doc_file_id_opt(ctx, api_url, headers, path)?.ok_or_else(|| {
        format!("ResolvePath did not return a file id for exact path '{path}' in workspace '{DOC_WORKSPACE_ID}'")
    })
}

fn file_id_from_workspace_response(value: &serde_json::Value, path: &str) -> Option<String> {
    let resolved_path = value
        .get("fields")
        .and_then(|fields| fields.get("last_file_path"))
        .or_else(|| value.get("last_file_path"))
        .and_then(|value| value.as_str())?;
    if resolved_path != path {
        return None;
    }

    value
        .get("fields")
        .and_then(|fields| fields.get("last_file_id"))
        .or_else(|| value.get("last_file_id"))
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
}

fn load_file_content(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    file_id: &str,
) -> Result<String, String> {
    let content_resp = ctx
        .http_call(
            "GET",
            &format!("{api_url}/tdata/Files('{file_id}')/$value"),
            headers,
            "",
        )
        .map_err(|err| format!("File $value read failed for File('{file_id}'): {err}"))?;
    if content_resp.status != 200 {
        return Err(format!(
            "File('{file_id}') $value returned HTTP {}: {}",
            content_resp.status,
            &content_resp.body[..content_resp.body.len().min(500)]
        ));
    }
    if content_resp.body.trim().is_empty() {
        return Err(format!("File('{file_id}') $value returned empty content"));
    }
    Ok(content_resp.body)
}

fn temper_read_command(path: &str, loaded: Option<&LoadedDoc>) -> String {
    match loaded.and_then(|doc| {
        if doc.workspace_id.is_empty() {
            None
        } else {
            Some(doc.workspace_id.as_str())
        }
    }) {
        Some(workspace_id) => format!(
            "temper.read(\"{}\", {{\"workspace_id\": \"{}\"}})",
            escape_prompt_string(path),
            escape_prompt_string(workspace_id)
        ),
        None => format!("temper.read(\"{}\")", escape_prompt_string(path)),
    }
}

/// The curation corpus a skill reads unless it has a reason not to.
///
/// One definition. It was declared separately inside two functions, byte for
/// byte, so the two could have drifted apart without any test noticing — the
/// only test comparing them compared their lengths.
const FULL_CURATION_KNOWLEDGE: &[(&str, &str)] = &[
    (
        "/system/knowledge/design-principles.md",
        "embodiment standards",
    ),
    (
        "/system/knowledge/quality-standards.md",
        "quality thresholds",
    ),
    (
        "/system/knowledge/feedback-log.md",
        "human feedback to incorporate",
    ),
];

fn knowledge_read_specs_for_skill(skill: &str) -> &'static [(&'static str, &'static str)] {
    knowledge_read_specs_for_known_skill(skill).unwrap_or(FULL_CURATION_KNOWLEDGE)
}

/// The knowledge a NAMED skill reads, or `None` when the app ships no such
/// skill.
///
/// Split out from [`knowledge_read_specs_for_skill`] so that a skill name
/// nobody ships is distinguishable from one that deliberately reads the whole
/// corpus. It used to be a `_ =>` arm, which meant a misspelled skill silently
/// got the corpus — and the parity test below asserted against
/// `"review-language"`, a skill that does not exist, so it was really only
/// asserting that the wildcard existed. It passed for two months while
/// checking nothing.
///
/// Callers still fall back to the full corpus, so an unrecognised skill loses
/// no context at runtime; the difference is that a typo is now findable.
fn knowledge_read_specs_for_known_skill(
    skill: &str,
) -> Option<&'static [(&'static str, &'static str)]> {
    match skill {
        // Source search needs the research-direction skill contract and web
        // search/fetch tools. Embodiment and quality docs are for synthesis and
        // review; loading them here adds turns and context without helping.
        "research-direction" => Some(&[]),
        // Instruction PARITY with the native bake-off harnesses (owner
        // decision, 2026-07-24): synthesis gets exactly what a bake-off model
        // gets — the brief, the taste rulebook, and the skill. No auxiliary
        // corpus compensating for harness limits; harness flaws are fixed in
        // the harness.
        "synthesize-language" => Some(&[]),
        // Everything else the app ships reads the full curation corpus. Listed
        // by name rather than caught by a wildcard, so that adding a skill is
        // a decision about what it should read.
        "review-quality"
        | "organize-taxonomy"
        | "taste-distillation"
        | "synthesize-palette"
        | "synthesize-art-style"
        | "synthesize-writing-style"
        | "immersive-landing" => Some(FULL_CURATION_KNOWLEDGE),
        _ => None,
    }
}

/// The master taste rulebook, compiled into the module from the app repo so
/// the prompt can NEVER lack it. The runtime copy in the docs workspace is
/// preferred (it may carry newer edits); this is the same-app-version
/// fallback. The per-rule TasteRules ENTITIES are outdated and must not be
/// loaded — the rulebook file is the single authority (owner decision,
/// 2026-07-23).
const TASTE_RULEBOOK_FALLBACK: &str = include_str!("../../../knowledge/rules/design-language.md");

/// Inline the master taste rulebook into the prompt. Tries the docs-workspace
/// copy first, falls back to the compiled-in copy — the normal path ALWAYS
/// inlines, because instruction-to-go-fetch proved to be
/// instruction-to-never-see.
fn render_taste_rules_block(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    skill: &str,
) -> String {
    if skill != "synthesize-language" {
        return String::new();
    }
    const CANDIDATE_PATHS: [&str; 2] = [
        "/knowledge/rules/design-language.md",
        "/system/knowledge/rules/design-language.md",
    ];
    let mut content: Option<String> = None;
    for path in CANDIDATE_PATHS {
        match load_doc_file(ctx, api_url, headers, path, true) {
            Ok(doc) => {
                if let Some(body) = doc.content {
                    ctx.log(
                        "info",
                        &format!("build_session_message: inlined taste rulebook from '{path}'"),
                    );
                    content = Some(body);
                    break;
                }
            }
            Err(_) => continue,
        }
    }
    let body = content.unwrap_or_else(|| {
        ctx.log(
            "info",
            "build_session_message: taste rulebook not resolvable in docs workspace; inlining compiled-in copy",
        );
        TASTE_RULEBOOK_FALLBACK.to_string()
    });
    format!(
        "## The taste rulebook (authoritative — your output is judged against every rule)\n\n````markdown\n{body}\n````\n"
    )
}

fn render_read_commands(paths: &[(&str, &str)], loaded_docs: &[LoadedDoc]) -> String {
    paths
        .iter()
        .map(|(path, label)| {
            let loaded = loaded_docs.iter().find(|doc| doc.path == *path);
            format!("- `{}` - {label}", temper_read_command(path, loaded))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn render_loaded_reference_block(
    instruction_doc: &LoadedDoc,
    knowledge_docs: &[LoadedDoc],
    inline_content: bool,
) -> String {
    if !inline_content {
        return String::new();
    }

    let mut out = String::new();
    out.push_str("## Loaded Reference Files\n\n");
    if let Some(content) = instruction_doc.content.as_ref() {
        out.push_str(&format!(
            "### `{}`\n\n````markdown\n{}\n````\n",
            instruction_doc.path, content
        ));
    }

    for doc in knowledge_docs {
        if let Some(content) = &doc.content {
            out.push_str(&format!(
                "\n### `{}`\n\n````markdown\n{}\n````\n",
                doc.path, content
            ));
        }
    }
    out
}

fn render_reference_instruction_block(
    skill: &str,
    inline_content: bool,
    instruction_read_command: &str,
    knowledge_read_commands: &str,
) -> String {
    if inline_content {
        return format!(
            "Execute this job using your `{skill}` skill.\n\nThe required skill and reference files are inlined below in `Loaded Reference Files`. Use the inlined contract directly. Do not spend turns rereading those files unless you need an additional reference not included here."
        );
    }

    format!(
        "Execute this job using your `{skill}` skill. The current skill and knowledge files are available in TemperFS. Read the exact files you need before using them, starting with the skill instruction file for this job.\n\nUse these read commands:\n- `{instruction_read_command}` - exact job procedure and output contract\n{knowledge_read_commands}"
    )
}

fn escape_prompt_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
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

fn read_secret(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    key: &str,
) -> Option<String> {
    let resp = ctx
        .http_call(
            "GET",
            &format!("{api_url}/paw/setup/secrets/{key}"),
            headers,
            "",
        )
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

fn normalize_bootstrapped_soul_id(soul_ref: &str) -> String {
    if soul_ref.starts_with("sl-bootstrap-agent-soul-") {
        return soul_ref.to_string();
    }
    format!(
        "sl-bootstrap-agent-soul-{}",
        soul_ref.trim().to_lowercase().replace(' ', "-")
    )
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

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        completion_params_block, config_bool, field_bool, file_id_from_workspace_response,
        content_hash_from_file_row, instruction_path_candidates,
        knowledge_read_specs_for_known_skill,
        knowledge_read_specs_for_skill,
        normalize_bootstrapped_soul_id, parse_template, render_loaded_reference_block,
        render_reference_instruction_block, shadowed_paths, temper_read_command, LoadedDoc,
    };

    #[test]
    fn normalize_bootstrapped_soul_id_maps_agent_name_to_stable_id() {
        assert_eq!(
            normalize_bootstrapped_soul_id("curator"),
            "sl-bootstrap-agent-soul-curator"
        );
    }

    #[test]
    fn normalize_bootstrapped_soul_id_preserves_existing_stable_id() {
        assert_eq!(
            normalize_bootstrapped_soul_id("sl-bootstrap-agent-soul-curator"),
            "sl-bootstrap-agent-soul-curator"
        );
    }

    #[test]
    fn parse_template_accepts_snake_case_fields() {
        let template = parse_template(&json!({
            "job_type": "synthesize",
            "skill_id": "synthesize-language",
            "instruction_path": "/agents/curator/skills/synthesize-language/SKILL.md",
            "tools_profile": "temper_get,bash",
            "requires_sandbox": true,
            "max_turns_default": "42",
            "completion_action": "CompleteSynthesis",
            "completion_contract": "typed-v1",
            "template_version": "7"
        }))
        .expect("template should parse");

        assert_eq!(template.skill_id, "synthesize-language");
        assert!(template.requires_sandbox);
        assert_eq!(template.max_turns_default, "42");
        assert_eq!(template.completion_action, "CompleteSynthesis");
        assert_eq!(template.template_version, "7");
    }

    #[test]
    fn complete_synthesis_prompt_inlines_required_params() {
        let block = completion_params_block("CompleteSynthesis", "synthesize", "job-123");

        assert!(block.contains("Required completion params for `CompleteSynthesis`"));
        // C1: the agent drives its own SubmitForReview first; CompleteSynthesis is
        // passed only the `survivors` that reached UnderReview, plus the scalar
        // design_language_id, and Fails the job when no language survived.
        assert!(block.contains("'design_language_ids': json.dumps(survivors)"));
        assert!(block.contains("'design_language_id': survivors[0]"));
        assert!(block.contains("'review_input': review_input"));
        assert!(block.contains("if not survivors:"));
        assert!(block.contains("temper.action('CurationJobs', 'job-123', 'CompleteSynthesis'"));
    }

    #[test]
    fn complete_research_prompt_carries_output_type() {
        // C5: launch_research is gone; the source_search agent records the concrete
        // lane on the query via CompleteResearch's output_type param.
        let block = completion_params_block("CompleteResearch", "source_search", "job-9");
        assert!(block.contains("'output_type': output_type"));
        assert!(block.contains("temper.action('CurationJobs', 'job-9', 'CompleteResearch'"));
    }

    #[test]
    fn parse_template_accepts_pascal_case_boolean_strings() {
        let fields = json!({"RequiresSandbox": "true"});
        assert!(field_bool(
            &fields,
            &["requires_sandbox", "RequiresSandbox"]
        ));
    }

    #[test]
    fn read_command_includes_doc_workspace_when_available() {
        let doc = LoadedDoc {
            path: "/agents/curator/skills/synthesize-language/SKILL.md".to_string(),
            workspace_id: "os-app-docs".to_string(),
            file_id: "file-fixture".to_string(),
            content: None,
        };

        assert_eq!(
            temper_read_command(&doc.path, Some(&doc)),
            "temper.read(\"/agents/curator/skills/synthesize-language/SKILL.md\", {\"workspace_id\": \"os-app-docs\"})"
        );
    }

    #[test]
    fn instruction_path_candidates_prefer_app_shipped_skill_over_soul_snapshot() {
        // The app copy is refreshed on install; the soul-bootstrap copy is a
        // stale one-time snapshot and must only be a fallback.
        assert_eq!(
            instruction_path_candidates(
                "/agents/curator/skills/research-direction/SKILL.md",
                "sl-bootstrap-agent-soul-curator"
            ),
            vec![
                "/agents/curator/skills/research-direction/SKILL.md".to_string(),
                "/agents/sl-bootstrap-agent-soul-curator/skills/research-direction/SKILL.md"
                    .to_string(),
            ]
        );
    }

    #[test]
    fn synthesis_prompt_has_instruction_parity_with_bakeoff_harnesses() {
        // Owner decision 2026-07-24: synthesis gets brief + rulebook + skill,
        // nothing else — the same instruction surface the native bake-off
        // harnesses give. Review keeps the curation corpus.
        //
        // The third assertion used to name "review-language", which is not a
        // skill this app ships. It fell through the old `_ =>` wildcard to the
        // full corpus and passed while checking nothing. The real skill is
        // "review-quality".
        assert!(knowledge_read_specs_for_skill("research-direction").is_empty());
        assert!(knowledge_read_specs_for_skill("synthesize-language").is_empty());
        assert!(knowledge_read_specs_for_skill("review-quality")
            .iter()
            .any(|(path, _)| *path == "/system/knowledge/design-principles.md"));
    }

    #[test]
    fn a_skill_the_app_does_not_ship_is_not_silently_treated_as_one() {
        // The property that makes the test above mean something.
        assert!(knowledge_read_specs_for_known_skill("review-language").is_none());
        assert!(knowledge_read_specs_for_known_skill("").is_none());
        assert!(knowledge_read_specs_for_known_skill("review-quality").is_some());

        // Runtime behaviour is unchanged for an unknown skill: it still gets
        // the full corpus rather than nothing.
        assert_eq!(
            knowledge_read_specs_for_skill("review-language").len(),
            knowledge_read_specs_for_skill("review-quality").len()
        );
    }

    /// The templates as actually seeded. Compiled in, so the test cannot drift
    /// away from the file the deploy reads.
    const SEEDED_JOB_TEMPLATES: &str =
        include_str!("../../../seed-data/job_templates.toml");

    /// `skill_id = "x"` values, in file order — the field the runtime actually
    /// uses to choose knowledge, which is why it is read rather than inferred.
    fn seeded_skill_ids() -> Vec<String> {
        SEEDED_JOB_TEMPLATES
            .lines()
            .filter_map(|line| {
                let line = line.trim();
                let value = line.strip_prefix("skill_id")?.trim_start();
                let value = value.strip_prefix('=')?.trim();
                Some(value.trim_matches('"').to_string())
            })
            .collect()
    }

    fn seeded_instruction_paths() -> Vec<String> {
        SEEDED_JOB_TEMPLATES
            .lines()
            .filter_map(|line| {
                let line = line.trim();
                let value = line.strip_prefix("instruction_path")?.trim_start();
                let value = value.strip_prefix('=')?.trim();
                Some(value.trim_matches('"').to_string())
            })
            .collect()
    }

    #[test]
    fn every_seeded_template_resolves_the_app_shipped_skill_first() {
        // The bug this file exists to prevent: a template configured with a
        // bootstrap-snapshot path produced that path as its ONLY candidate, so
        // every session read a skill frozen at install time while the app
        // shipped newer ones. Walking the real seeded paths is the only way to
        // notice — the unit test above passed throughout, because it fed in a
        // path shape the seeds never used.
        let paths = seeded_instruction_paths();
        assert!(
            !paths.is_empty(),
            "no instruction_path entries parsed out of job_templates.toml"
        );

        for path in &paths {
            // Both halves, independently. Asserting only on the seeded spelling
            // guards the seed and not the resolver: with the seed pointing at
            // /agents/curator/ the OLD resolver also returns it first, because
            // it returned the configured path verbatim. Feeding each skill in
            // BOTH spellings is what makes reverting the resolver fail here.
            let tail = path
                .strip_prefix("/agents/curator/")
                .unwrap_or_else(|| panic!("seeded template is not an app path: {path}"));
            let snapshot_spelling =
                format!("/agents/sl-bootstrap-agent-soul-curator/{tail}");

            for spelling in [path.as_str(), snapshot_spelling.as_str()] {
                let candidates =
                    instruction_path_candidates(spelling, "sl-bootstrap-agent-soul-curator");

                assert!(
                    candidates[0].starts_with("/agents/curator/"),
                    "'{spelling}' resolves '{}' first; the app-shipped copy must win",
                    candidates[0]
                );
                assert_eq!(
                    candidates[0],
                    format!("/agents/curator/{tail}"),
                    "'{spelling}' resolved a different skill than it names"
                );
                assert!(
                    candidates
                        .iter()
                        .any(|c| c.starts_with("/agents/sl-bootstrap-agent-soul-curator/")),
                    "'{spelling}' keeps no bootstrap fallback: {candidates:?}"
                );
            }
        }
    }

    #[test]
    fn a_job_under_an_unusual_soul_keeps_a_soul_independent_fallback() {
        // The old seed hardcoded the bootstrap soul, so any job resolved that
        // one fixed path. Deriving the fallback from the job's soul_id alone
        // would leave a job with an unusual soul nothing to try if the app copy
        // were missing — a hard failure where the old spelling succeeded.
        let candidates = instruction_path_candidates(
            "/agents/curator/skills/review-quality/SKILL.md",
            "sl-bootstrap-agent-soul-other",
        );

        assert_eq!(candidates[0], "/agents/curator/skills/review-quality/SKILL.md");
        assert!(
            candidates
                .iter()
                .any(|c| c == "/agents/sl-bootstrap-agent-soul-other/skills/review-quality/SKILL.md"),
            "the job's own soul must still be tried: {candidates:?}"
        );
        assert!(
            candidates.iter().any(
                |c| c == "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md"
            ),
            "the soul-independent bootstrap copy must remain reachable: {candidates:?}"
        );
    }

    #[test]
    fn no_seeded_template_points_at_a_bootstrap_snapshot() {
        for path in seeded_instruction_paths() {
            assert!(
                !path.contains("/agents/sl-bootstrap-agent-soul-"),
                "seeded template still points at a bootstrap snapshot: {path}"
            );
        }
    }

    #[test]
    fn every_seeded_skill_id_is_one_the_app_actually_ships() {
        // Reads `skill_id`, NOT the skill name embedded in instruction_path.
        // `skill_id` is the field the runtime passes to
        // knowledge_read_specs_for_skill, so a typo there is exactly the
        // failure removing the wildcard was meant to expose — and deriving the
        // name from the path would have missed it, because the path can be
        // right while the id is wrong.
        let skills = seeded_skill_ids();
        assert!(!skills.is_empty(), "no skill_id entries parsed out of job_templates.toml");
        for skill in skills {
            assert!(
                knowledge_read_specs_for_known_skill(&skill).is_some(),
                "seeded template declares skill_id '{skill}', which the app does not ship"
            );
        }
    }

    #[test]
    fn every_seeded_skill_id_matches_the_skill_in_its_instruction_path() {
        // The two are written independently in the toml, so they can disagree.
        // A job would then load one skill's SKILL.md and another skill's
        // knowledge.
        let skills = seeded_skill_ids();
        let paths = seeded_instruction_paths();
        // zip() truncates to the shorter side, so without this a template
        // missing its skill_id would simply drop out of the comparison — and at
        // runtime an empty skill_id falls through to the full corpus, which is
        // exactly the failure removing the wildcard was meant to expose.
        assert_eq!(
            skills.len(),
            paths.len(),
            "every template must declare both a skill_id and an instruction_path"
        );

        for (skill, path) in skills.iter().zip(paths) {
            let from_path = path
                .rsplit('/')
                .nth(1)
                .unwrap_or_else(|| panic!("unexpected instruction_path shape: {path}"));
            assert_eq!(
                skill, from_path,
                "skill_id '{skill}' disagrees with its instruction_path '{path}'"
            );
        }
    }

    #[test]
    fn a_snapshot_configured_template_still_prefers_the_app_copy() {
        // The exact shape every seeded template used before this fix. Kept as a
        // regression: reconfigured entities in a deployed tenant can still
        // carry it, and it must resolve forward rather than pinning.
        let candidates = instruction_path_candidates(
            "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md",
            "sl-bootstrap-agent-soul-curator",
        );
        assert_eq!(
            candidates,
            vec![
                "/agents/curator/skills/review-quality/SKILL.md".to_string(),
                "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md"
                    .to_string(),
            ]
        );
    }

    fn candidate(path: &str, hash: Option<&str>) -> (String, Option<String>) {
        (path.to_string(), hash.map(|value| value.to_string()))
    }

    #[test]
    fn identical_copies_do_not_warn() {
        // THE regression. The first version compared file ids, which are
        // per-entity: two paths are two File entities, so the ids always differ
        // and the warning fired on every job, for every template. The live
        // probe of 2026-08-12 is exactly this shape — review-quality at 17 and
        // at 10 versions, same 29,657 bytes, same hash — and it must be silent.
        let probed = [candidate(
            "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md",
            Some("sha256:03601d2a5620"),
        )];
        assert_eq!(
            shadowed_paths(Some("sha256:03601d2a5620"), &probed),
            Vec::<&str>::new()
        );
    }

    #[test]
    fn a_copy_with_different_content_warns() {
        let probed = [candidate("/agents/soul/skills/x/SKILL.md", Some("sha256:bbbb"))];
        assert_eq!(
            shadowed_paths(Some("sha256:aaaa"), &probed),
            vec!["/agents/soul/skills/x/SKILL.md"]
        );
    }

    // Real values, read off openpaw-production (tenant `default`) on 2026-08-12
    // by resolving each path through ResolvePath inside `os-app-docs` — the same
    // resolver `load_doc_file` uses — and reading `fields.content_hash` of the id
    // it returned. These are the files a session actually loads, which is why the
    // hashes below are the ones the check must compare.
    const APP_REVIEW_QUALITY: &str =
        "sha256:03601d2a5620b3cce1c16d80540e7434c314f63e910f29b017eb9a6db8bdc4d1";
    const SOUL_REVIEW_QUALITY: &str =
        "sha256:b803f8d76cd034e97e372f6c28f3fba23715e4fa00bab133eb0e8ab1aad60b2b";
    const APP_SYNTHESIZE_LANGUAGE: &str =
        "sha256:f3b59011e7c77226b313c1d2aa85c95e619ad334bf9f694129fa48275a2e6d14";
    const SOUL_SYNTHESIZE_LANGUAGE: &str =
        "sha256:6dc155d15cdf8bd7320627d1c7c2b7152c78fffbee3ea2a883cbf5485fabb57a";

    #[test]
    fn the_deployed_curator_skills_really_are_shadowed() {
        // Not a hypothetical. Resolved inside `os-app-docs`, the soul paths land
        // on `os-agent-skill-file-*` entities whose bytes differ from the app
        // copies the sessions read — review-quality 33,178 vs 29,657 and
        // synthesize-language 12,037 vs 20,070 — so the warning is TRUE on this
        // tenant today and must fire. Anyone who expects silence here should read
        // the runbook: the soul copies are not in sync with the app copies.
        let probed = [candidate(
            "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md",
            Some(SOUL_REVIEW_QUALITY),
        )];
        assert_eq!(
            shadowed_paths(Some(APP_REVIEW_QUALITY), &probed),
            vec!["/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md"]
        );

        let probed = [candidate(
            "/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md",
            Some(SOUL_SYNTHESIZE_LANGUAGE),
        )];
        assert_eq!(
            shadowed_paths(Some(APP_SYNTHESIZE_LANGUAGE), &probed),
            vec!["/agents/sl-bootstrap-agent-soul-curator/skills/synthesize-language/SKILL.md"]
        );
    }

    #[test]
    fn copies_that_genuinely_match_stay_silent() {
        // The other half of the contract, with a real hash: once a soul copy is
        // brought back in line with the app copy, the line disappears. Without
        // this the check could "work" by warning unconditionally.
        let probed = [candidate(
            "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md",
            Some(APP_REVIEW_QUALITY),
        )];
        assert_eq!(
            shadowed_paths(Some(APP_REVIEW_QUALITY), &probed),
            Vec::<&str>::new()
        );
    }

    #[test]
    fn a_hash_from_another_workspace_is_never_what_gets_compared() {
        // Regression guard for the defect this replaced. `Path` is not unique:
        // `/agents/curator/skills/review-quality/SKILL.md` returns two File rows
        // (os-app-docs `03601d2a…` and ws-019de271 `eb365ca4…`), and the soul
        // path returns three, two of them inside os-app-docs. A path query taking
        // the first row fed `eb365ca4…` in as the winner, which never equals the
        // candidate, so every job warned. Resolving ids gives `03601d2a…`, and
        // against the matching copy that is silence.
        const OTHER_WORKSPACE_REVIEW_QUALITY: &str =
            "sha256:eb365ca4b0c83aac8b720bf46799083db81b541d2fdd5ec15b7c27aa273df60b";
        let probed = [candidate(
            "/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md",
            Some(APP_REVIEW_QUALITY),
        )];
        assert_eq!(
            shadowed_paths(Some(OTHER_WORKSPACE_REVIEW_QUALITY), &probed),
            vec!["/agents/sl-bootstrap-agent-soul-curator/skills/review-quality/SKILL.md"],
            "the cross-workspace hash is what produced the always-on warning"
        );
        assert_eq!(
            shadowed_paths(Some(APP_REVIEW_QUALITY), &probed),
            Vec::<&str>::new(),
            "resolving inside the doc workspace is what makes the signal mean something"
        );
    }

    #[test]
    fn an_absent_copy_does_not_warn() {
        // A genuine miss is the ordinary case: nothing is being ignored.
        let probed = [candidate("/agents/soul/skills/x/SKILL.md", None)];
        assert_eq!(shadowed_paths(Some("sha256:aaaa"), &probed), Vec::<&str>::new());
    }

    #[test]
    fn an_unreadable_winner_does_not_warn() {
        // Failing to look is not evidence of shadowing. The caller logs that
        // failure at debug, so "nobody checked" still leaves a trace.
        let probed = [candidate("/agents/soul/skills/x/SKILL.md", Some("sha256:bbbb"))];
        assert_eq!(shadowed_paths(None, &probed), Vec::<&str>::new());
    }

    #[test]
    fn several_lower_priority_copies_are_judged_independently() {
        let probed = [
            candidate("/a/same", Some("sha256:aaaa")),
            candidate("/b/different", Some("sha256:bbbb")),
            candidate("/c/absent", None),
            candidate("/d/also-different", Some("sha256:cccc")),
        ];
        assert_eq!(
            shadowed_paths(Some("sha256:aaaa"), &probed),
            vec!["/b/different", "/d/also-different"]
        );
    }

    #[test]
    fn no_lower_priority_copies_means_nothing_to_report() {
        assert_eq!(shadowed_paths(Some("sha256:aaaa"), &[]), Vec::<&str>::new());
    }

    #[test]
    fn content_hash_is_read_from_the_shape_the_server_returns() {
        assert_eq!(
            content_hash_from_file_row(&json!({"fields": {"content_hash": "sha256:aaaa"}})),
            Some("sha256:aaaa".to_string())
        );
        // A flattened row is what `$select` would produce, and it carries no
        // hash. `None` here is the honest answer — the alternative, a top-level
        // fallback, was dead against the live server (probe 2026-08-12) and
        // would have made a `$select` regression look like a working check.
        assert_eq!(
            content_hash_from_file_row(&json!({"ContentHash": "sha256:bbbb"})),
            None
        );
        assert_eq!(
            content_hash_from_file_row(&json!({"Path": "/p", "content_hash": "sha256:cccc"})),
            None
        );
        assert_eq!(content_hash_from_file_row(&json!({"fields": {}})), None);
        // An empty hash is not a hash. Treating it as one would make every
        // other empty-hash row look identical to it.
        assert_eq!(
            content_hash_from_file_row(&json!({"fields": {"content_hash": ""}})),
            None
        );
    }

    #[test]
    fn a_path_outside_the_agents_tree_is_used_as_given() {
        assert_eq!(
            instruction_path_candidates("/system/knowledge/design-principles.md", "soul-x"),
            vec!["/system/knowledge/design-principles.md".to_string()]
        );
    }

    #[test]
    fn config_bool_accepts_common_truthy_values() {
        assert!(config_bool("true"));
        assert!(config_bool("1"));
        assert!(config_bool("YES"));
        assert!(config_bool("on"));
        assert!(!config_bool("false"));
        assert!(!config_bool("0"));
        assert!(!config_bool("off"));
    }

    #[test]
    fn inline_reference_instructions_do_not_start_with_reread() {
        let block = render_reference_instruction_block(
            "research-direction",
            true,
            "temper.read(\"/agents/curator/skills/research-direction/SKILL.md\", {\"workspace_id\": \"os-app-docs\"})",
            "",
        );

        assert!(block.contains("required skill and reference files are inlined"));
        assert!(block.contains("Do not spend turns rereading"));
        assert!(!block.contains("Fallback read commands"));
        assert!(!block.contains("unavailable"));
    }

    #[test]
    fn loaded_reference_block_is_empty_when_inline_docs_disabled() {
        let doc = LoadedDoc {
            path: "/agents/curator/skills/synthesize-language/SKILL.md".to_string(),
            workspace_id: "os-app-docs".to_string(),
            file_id: "file-fixture".to_string(),
            content: None,
        };

        assert_eq!(render_loaded_reference_block(&doc, &[], false), "");
    }

    #[test]
    fn loaded_reference_block_renders_content_when_inline_docs_enabled() {
        let doc = LoadedDoc {
            path: "/agents/curator/skills/synthesize-language/SKILL.md".to_string(),
            workspace_id: "os-app-docs".to_string(),
            file_id: "file-fixture".to_string(),
            content: Some("# Synthesize".to_string()),
        };

        assert!(render_loaded_reference_block(&doc, &[], true).contains("# Synthesize"));
    }

    #[test]
    fn workspace_response_file_id_prefers_current_resolved_file() {
        assert_eq!(
            file_id_from_workspace_response(
                &json!({
                    "fields": {
                        "last_file_id": "fl-current",
                        "last_file_path": "/docs/SKILL.md"
                    }
                }),
                "/docs/SKILL.md"
            ),
            Some("fl-current".to_string())
        );
        assert_eq!(
            file_id_from_workspace_response(
                &json!({"last_file_id": "fl-root", "last_file_path": "/docs/SKILL.md"}),
                "/docs/SKILL.md"
            ),
            Some("fl-root".to_string())
        );
    }

    #[test]
    fn workspace_response_file_id_ignores_stale_workspace_state() {
        assert_eq!(
            file_id_from_workspace_response(
                &json!({
                    "fields": {
                        "last_file_id": "fl-stale",
                        "last_file_path": "/agents/curator/skills/review-quality/SKILL.md",
                        "error_message": "file not found: /system/knowledge/design-principles.md"
                    }
                }),
                "/system/knowledge/design-principles.md"
            ),
            None
        );
    }
}
