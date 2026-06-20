use temper_wasm_sdk::prelude::*;

const DEFAULT_TOOLS_ENABLED: &str = "temper_get,temper_list,temper_create,temper_action,temper_write,temper_read,temper_web_search,temper_web_fetch";
const DOC_WORKSPACE_ID: &str = "os-app-docs";
const EMBEDDED_RESEARCH_DIRECTION_SKILL: &str =
    include_str!("../../../agents/curator/skills/research-direction/SKILL.md");
const EMBEDDED_SYNTHESIZE_LANGUAGE_SKILL: &str =
    include_str!("../../../agents/curator/skills/synthesize-language/SKILL.md");
const EMBEDDED_REVIEW_QUALITY_SKILL: &str =
    include_str!("../../../agents/curator/skills/review-quality/SKILL.md");
const EMBEDDED_ORGANIZE_TAXONOMY_SKILL: &str =
    include_str!("../../../agents/curator/skills/organize-taxonomy/SKILL.md");
const EMBEDDED_SYNTHESIZE_PALETTE_SKILL: &str =
    include_str!("../../../agents/curator/skills/synthesize-palette/SKILL.md");
const EMBEDDED_SYNTHESIZE_ART_STYLE_SKILL: &str =
    include_str!("../../../agents/curator/skills/synthesize-art-style/SKILL.md");
const EMBEDDED_TASTE_DISTILLATION_SKILL: &str =
    include_str!("../../../agents/curator/skills/taste-distillation/SKILL.md");
const EMBEDDED_DESIGN_PRINCIPLES: &str =
    include_str!("../../../system/knowledge/design-principles.md");
const EMBEDDED_QUALITY_STANDARDS: &str =
    include_str!("../../../system/knowledge/quality-standards.md");
const EMBEDDED_FEEDBACK_LOG: &str = include_str!("../../../system/knowledge/feedback-log.md");

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
        );
        let effective_instruction_path = instruction_doc
            .as_ref()
            .map(|doc| doc.path.as_str())
            .unwrap_or(template.instruction_path.as_str());
        let knowledge_specs = knowledge_read_specs_for_skill(skill);
        let knowledge_docs = knowledge_specs
            .iter()
            .filter_map(|(path, _)| load_doc_file(&ctx, &api_url, &headers, path, inline_job_docs))
            .collect::<Vec<_>>();
        let instruction_read_command =
            temper_read_command(effective_instruction_path, instruction_doc.as_ref());
        let knowledge_read_commands = render_read_commands(knowledge_specs, &knowledge_docs);
        let loaded_reference_block = render_loaded_reference_block(
            instruction_doc.as_ref(),
            &knowledge_docs,
            inline_job_docs,
        );
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
        let user_message = format!(
            r#"You are executing a CurationJob ({job_type}).
Job ID: {entity_id}
Skill: {skill}
Instruction path: {effective_instruction_path}
Completion action: {completion_action}
Completion contract: {completion_contract}
Workspace ID: {workspace_id}

## Input

{input}
## Instructions

{reference_instruction_block}

{loaded_reference_block}

When done, dispatch `{completion_action}` on this CurationJob with the params
specified by the skill. Do not use legacy `Complete` for typed-v1 jobs.
Do not call `{completion_action}` with empty params to inspect the action
schema; missing required params are a terminal contract failure.

{completion_params_block}

IMPORTANT: If a tool call returns an error (NameError, TypeError, HTTP failure),
fix the code and retry. Add `import json` if you get a json NameError. Only fail
the job after 3 failed attempts at the same operation.

Entity set: CurationJobs
Job entity ID: {entity_id}

To complete:
```
params = {{...}}  # use the params required by {completion_action}
temper.action('CurationJobs', '{entity_id}', '{completion_action}', params)
temper.done("{job_type} complete")
```

To fail (only after retries exhausted):
```
temper.action('CurationJobs', '{entity_id}', 'Fail', {{'error_message': reason}})
temper.done("{job_type} failed")
```
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
                usize::from(instruction_doc.is_some()) + knowledge_docs.len(),
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

fn completion_params_block(completion_action: &str, job_type: &str, entity_id: &str) -> String {
    let snippet = match completion_action {
        "CompleteResearch" => format!(
            r#"```python
direction_ids = [...]  # CurationDirection entity IDs queued via QueueSynthesis
temper.action('CurationJobs', '{entity_id}', 'CompleteResearch', {{
    'direction_ids': json.dumps(direction_ids)
}})
```"#
        ),
        "CompleteSynthesis" => format!(
            r#"```python
review_input = json.dumps({{
    'language_ids': created_ids,
    'query_id': query_id
}}, ensure_ascii=False)
temper.action('CurationJobs', '{entity_id}', 'CompleteSynthesis', {{
    'design_language_ids': json.dumps(created_ids),
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
) -> Option<LoadedDoc> {
    for path in instruction_path_candidates(configured_path, stable_soul_id) {
        if let Some(doc) = load_doc_file(ctx, api_url, headers, &path, inline_content) {
            return Some(doc);
        }
    }
    None
}

fn instruction_path_candidates(configured_path: &str, stable_soul_id: &str) -> Vec<String> {
    let mut candidates = vec![configured_path.to_string()];
    if let Some(rest) = configured_path.strip_prefix("/agents/curator/") {
        candidates.push(format!("/agents/{stable_soul_id}/{rest}"));
    }
    candidates.sort();
    candidates.dedup();
    candidates
}

fn load_doc_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    path: &str,
    inline_content: bool,
) -> Option<LoadedDoc> {
    if let Some(file_id) = resolve_doc_file_id(ctx, api_url, headers, path) {
        let content = if inline_content {
            Some(
                load_file_content(ctx, api_url, headers, &file_id)
                    .and_then(|content| content)
                    .or_else(|| embedded_doc_content(path).map(str::to_string))?,
            )
        } else {
            None
        };
        return Some(LoadedDoc {
            path: path.to_string(),
            workspace_id: DOC_WORKSPACE_ID.to_string(),
            content,
        });
    }

    let filter = format!("path eq '{}'", odata_string_literal(path));
    let resp = match ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/Files?$filter={}&$top=5", urlenc(&filter)),
        headers,
        "",
    ) {
        Ok(resp) => resp,
        Err(err) => {
            ctx.log(
                "warn",
                &format!("build_session_message: doc lookup for '{path}' failed: {err}"),
            );
            return embedded_loaded_doc(path, inline_content);
        }
    };
    if resp.status != 200 {
        ctx.log(
            "warn",
            &format!(
                "build_session_message: doc lookup for '{path}' returned HTTP {}",
                resp.status
            ),
        );
        return embedded_loaded_doc(path, inline_content);
    }

    let parsed: serde_json::Value = match serde_json::from_str(&resp.body) {
        Ok(value) => value,
        Err(err) => {
            ctx.log(
                "warn",
                &format!(
                    "build_session_message: doc lookup for '{path}' returned invalid JSON: {err}"
                ),
            );
            return embedded_loaded_doc(path, inline_content);
        }
    };
    let Some(item) = parsed
        .get("value")
        .and_then(|v| v.as_array())
        .and_then(|items| {
            items
                .iter()
                .find(|item| json_field_str(item, &["Path", "path"]).as_deref() == Some(path))
        })
    else {
        return embedded_loaded_doc(path, inline_content);
    };
    let Some(file_id) = json_field_str(item, &["Id", "entity_id"]) else {
        return embedded_loaded_doc(path, inline_content);
    };
    let workspace_id = json_field_str(item, &["WorkspaceId", "workspace_id"]).unwrap_or_default();
    let content = if inline_content {
        Some(
            load_file_content(ctx, api_url, headers, &file_id)
                .and_then(|content| content)
                .or_else(|| embedded_doc_content(path).map(str::to_string))?,
        )
    } else {
        None
    };

    Some(LoadedDoc {
        path: path.to_string(),
        workspace_id,
        content,
    })
}

fn embedded_loaded_doc(path: &str, inline_content: bool) -> Option<LoadedDoc> {
    if !inline_content {
        return None;
    }
    embedded_doc_content(path).map(|content| LoadedDoc {
        path: path.to_string(),
        workspace_id: DOC_WORKSPACE_ID.to_string(),
        content: Some(content.to_string()),
    })
}

fn embedded_doc_content(path: &str) -> Option<&'static str> {
    let normalized = path.replace(
        "/agents/sl-bootstrap-agent-soul-curator/",
        "/agents/curator/",
    );
    match normalized.as_str() {
        "/agents/curator/skills/research-direction/SKILL.md" => {
            Some(EMBEDDED_RESEARCH_DIRECTION_SKILL)
        }
        "/agents/curator/skills/synthesize-language/SKILL.md" => {
            Some(EMBEDDED_SYNTHESIZE_LANGUAGE_SKILL)
        }
        "/agents/curator/skills/review-quality/SKILL.md" => Some(EMBEDDED_REVIEW_QUALITY_SKILL),
        "/agents/curator/skills/organize-taxonomy/SKILL.md" => {
            Some(EMBEDDED_ORGANIZE_TAXONOMY_SKILL)
        }
        "/agents/curator/skills/synthesize-palette/SKILL.md" => {
            Some(EMBEDDED_SYNTHESIZE_PALETTE_SKILL)
        }
        "/agents/curator/skills/synthesize-art-style/SKILL.md" => {
            Some(EMBEDDED_SYNTHESIZE_ART_STYLE_SKILL)
        }
        "/agents/curator/skills/taste-distillation/SKILL.md" => {
            Some(EMBEDDED_TASTE_DISTILLATION_SKILL)
        }
        "/system/knowledge/design-principles.md" => Some(EMBEDDED_DESIGN_PRINCIPLES),
        "/system/knowledge/quality-standards.md" => Some(EMBEDDED_QUALITY_STANDARDS),
        "/system/knowledge/feedback-log.md" => Some(EMBEDDED_FEEDBACK_LOG),
        _ => None,
    }
}

fn resolve_doc_file_id(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    path: &str,
) -> Option<String> {
    let resp = ctx
        .http_call(
            "POST",
            &format!(
                "{api_url}/tdata/Workspaces('{DOC_WORKSPACE_ID}')/Temper.ResolvePath?await_integration=true"
            ),
            headers,
            &json!({"path": path}).to_string(),
        )
        .ok()?;
    if resp.status != 200 {
        return None;
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body).ok()?;
    file_id_from_workspace_response(&parsed, path)
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
) -> Option<Option<String>> {
    let content_resp = ctx
        .http_call(
            "GET",
            &format!("{api_url}/tdata/Files('{file_id}')/$value"),
            headers,
            "",
        )
        .ok()?;
    if content_resp.status != 200 || content_resp.body.trim().is_empty() {
        return None;
    }
    Some(Some(content_resp.body))
}

fn json_field_str(item: &serde_json::Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        item.get(*key)
            .or_else(|| item.get("fields").and_then(|fields| fields.get(*key)))
            .and_then(|value| value.as_str())
            .map(|value| value.to_string())
    })
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

fn knowledge_read_specs_for_skill(skill: &str) -> &'static [(&'static str, &'static str)] {
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

    match skill {
        // Source search needs the research-direction skill contract and web
        // search/fetch tools. Embodiment and quality docs are for synthesis and
        // review; loading them here adds turns and context without helping.
        "research-direction" => &[],
        _ => FULL_CURATION_KNOWLEDGE,
    }
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
    instruction_doc: Option<&LoadedDoc>,
    knowledge_docs: &[LoadedDoc],
    inline_content: bool,
) -> String {
    if !inline_content {
        return String::new();
    }

    let mut out = String::new();
    out.push_str("## Loaded Reference Files\n\n");
    match instruction_doc.and_then(|doc| doc.content.as_ref().map(|content| (doc, content))) {
        Some((doc, content)) => out.push_str(&format!(
            "### `{}`\n\n````markdown\n{}\n````\n",
            doc.path, content
        )),
        None => out.push_str(
            "The configured skill instruction file was not available in TemperFS when this session was created.\n",
        ),
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
        let fallback_reads = if knowledge_read_commands.trim().is_empty() {
            String::new()
        } else {
            format!("\n{knowledge_read_commands}")
        };
        return format!(
            "Execute this job using your `{skill}` skill.\n\nThe required skill and reference files are inlined below in `Loaded Reference Files`. Use the inlined contract directly. Do not spend turns rereading those files unless an inline section says a file was unavailable or you need an additional reference not included here.\n\nFallback read commands, only for missing or stale inline references:\n- `{instruction_read_command}` - exact job procedure and output contract{fallback_reads}"
        );
    }

    format!(
        "Execute this job using your `{skill}` skill. The current skill and knowledge files are available in TemperFS. Read the exact files you need before using them, starting with the skill instruction file for this job.\n\nUse these read commands:\n- `{instruction_read_command}` - exact job procedure and output contract\n{knowledge_read_commands}"
    )
}

fn odata_string_literal(value: &str) -> String {
    value.replace('\'', "''")
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
        completion_params_block, config_bool, embedded_doc_content, field_bool,
        file_id_from_workspace_response, instruction_path_candidates,
        knowledge_read_specs_for_skill, normalize_bootstrapped_soul_id, parse_template,
        render_loaded_reference_block, render_reference_instruction_block, temper_read_command,
        LoadedDoc,
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
        assert!(block.contains("'design_language_ids': json.dumps(created_ids)"));
        assert!(block.contains("'review_input': review_input"));
        assert!(block.contains("temper.action('CurationJobs', 'job-123', 'CompleteSynthesis'"));
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
            content: None,
        };

        assert_eq!(
            temper_read_command(&doc.path, Some(&doc)),
            "temper.read(\"/agents/curator/skills/synthesize-language/SKILL.md\", {\"workspace_id\": \"os-app-docs\"})"
        );
    }

    #[test]
    fn instruction_path_candidates_include_stable_bootstrap_agent_path() {
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
    fn source_search_uses_only_skill_doc_by_default() {
        assert!(knowledge_read_specs_for_skill("research-direction").is_empty());
        assert!(knowledge_read_specs_for_skill("synthesize-language")
            .iter()
            .any(|(path, _)| *path == "/system/knowledge/design-principles.md"));
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
    fn embedded_doc_content_accepts_stable_bootstrap_skill_path() {
        let content = embedded_doc_content(
            "/agents/sl-bootstrap-agent-soul-curator/skills/research-direction/SKILL.md",
        )
        .expect("embedded research-direction skill should be available");

        assert!(content.contains("Job type: `source_search`"));
        assert!(content.contains("temper.web_search(query)"));
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
        assert!(block.contains("Fallback read commands"));
    }

    #[test]
    fn loaded_reference_block_is_empty_when_inline_docs_disabled() {
        let doc = LoadedDoc {
            path: "/agents/curator/skills/synthesize-language/SKILL.md".to_string(),
            workspace_id: "os-app-docs".to_string(),
            content: None,
        };

        assert_eq!(render_loaded_reference_block(Some(&doc), &[], false), "");
    }

    #[test]
    fn loaded_reference_block_renders_content_when_inline_docs_enabled() {
        let doc = LoadedDoc {
            path: "/agents/curator/skills/synthesize-language/SKILL.md".to_string(),
            workspace_id: "os-app-docs".to_string(),
            content: Some("# Synthesize".to_string()),
        };

        assert!(render_loaded_reference_block(Some(&doc), &[], true).contains("# Synthesize"));
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
