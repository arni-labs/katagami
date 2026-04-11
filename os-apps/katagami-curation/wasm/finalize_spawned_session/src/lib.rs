use temper_wasm_sdk::prelude::*;

/// Finalize a CurationJob's spawned session. On Complete for source_search jobs,
/// spawns a follow-up synthesize job. Also finalizes the Session entity.
#[unsafe(no_mangle)]
pub extern "C" fn run(_ctx_ptr: i32, _ctx_len: i32) -> i32 {
    let result = (|| -> Result<(), String> {
        let ctx = Context::from_host()?;
        let fields = ctx.entity_state.get("fields").cloned().unwrap_or(json!({}));
        let job_type = fields
            .get("job_type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let workspace_id = fields
            .get("workspace_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let input_json = parse_json_field(fields.get("input"));
        let output_json = parse_json_field(fields.get("output"));
        let session_id = fields
            .get("session_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if session_id.is_empty() {
            set_success_result("", &json!({"status": "noop", "reason": "no session_id"}));
            return Ok(());
        }

        let api_url = ctx
            .config
            .get("temper_api_url")
            .filter(|s| !s.is_empty() && !s.contains("{secret:"))
            .cloned()
            .unwrap_or_else(|| "http://127.0.0.1:3000".to_string());
        let headers = vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("X-Tenant-Id".to_string(), ctx.tenant.clone()),
            ("x-temper-principal-kind".to_string(), "agent".to_string()),
            ("x-temper-principal-id".to_string(), "system".to_string()),
            ("x-temper-agent-type".to_string(), "system".to_string()),
        ];

        // Load Session to check its status
        let session_resp = ctx.http_call(
            "GET",
            &format!("{api_url}/tdata/Sessions('{session_id}')"),
            &headers,
            "",
        )?;
        if !(200..300).contains(&session_resp.status) {
            return Err(format!(
                "Failed to load Session '{session_id}': HTTP {}: {}",
                session_resp.status,
                &session_resp.body[..session_resp.body.len().min(300)]
            ));
        }

        let session: serde_json::Value = serde_json::from_str(&session_resp.body)
            .map_err(|e| format!("Failed to parse Session response: {e}"))?;
        let session_status = session.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if matches!(session_status, "Completed" | "Failed" | "Cancelled") {
            set_success_result(
                "",
                &json!({"status": "noop", "reason": "session already terminal", "session_status": session_status}),
            );
            return Ok(());
        }

        let job_status = ctx
            .entity_state
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let session_fields = session.get("fields").cloned().unwrap_or(json!({}));
        let session_counters = session.get("counters").cloned().unwrap_or(json!({}));

        match job_status {
            "Completed" => {
                // For source_search jobs, spawn a synthesize follow-up
                let synth_job_id = if job_type == "source_search" {
                    spawn_synth_followup(
                        &ctx,
                        &api_url,
                        &headers,
                        &workspace_id,
                        input_json.as_ref(),
                        output_json.as_ref(),
                    )?
                } else {
                    None
                };

                // Finalize the Session if it's in a finalizable state
                if !matches!(session_status, "Thinking" | "Executing") {
                    set_success_result(
                        "",
                        &json!({
                            "status": "noop",
                            "reason": "session not finalizable from current state",
                            "session_status": session_status,
                            "synth_job_id": synth_job_id
                        }),
                    );
                    return Ok(());
                }

                let result_text = fields
                    .get("output")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .unwrap_or("CurationJob completed");
                let body = json!({
                    "result": result_text,
                    "conversation": session_fields.get("conversation").and_then(|v| v.as_str()).unwrap_or(""),
                    "session_leaf_id": session_fields.get("session_leaf_id").and_then(|v| v.as_str()).unwrap_or(""),
                    "repl_file_id": session_fields.get("repl_file_id").and_then(|v| v.as_str()).unwrap_or(""),
                    "input_tokens": session_counters.get("input_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
                    "output_tokens": session_counters.get("output_tokens").and_then(|v| v.as_i64()).unwrap_or(0)
                });
                let resp = ctx.http_call(
                    "POST",
                    &format!("{api_url}/tdata/Sessions('{session_id}')/OpenPaw.RecordResult"),
                    &headers,
                    &body.to_string(),
                )?;
                if !(200..300).contains(&resp.status) {
                    return Err(format!(
                        "Failed to finalize Session '{session_id}': HTTP {}: {}",
                        resp.status,
                        &resp.body[..resp.body.len().min(300)]
                    ));
                }
                set_success_result(
                    "",
                    &json!({"status": "session finalized", "session_id": session_id, "synth_job_id": synth_job_id}),
                );
            }
            "Failed" => {
                let error_message = fields
                    .get("error_message")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .unwrap_or("CurationJob failed");
                let resp = ctx.http_call(
                    "POST",
                    &format!("{api_url}/tdata/Sessions('{session_id}')/OpenPaw.Fail"),
                    &headers,
                    &json!({"error_message": error_message}).to_string(),
                )?;
                if !(200..300).contains(&resp.status) {
                    return Err(format!(
                        "Failed to fail Session '{session_id}': HTTP {}: {}",
                        resp.status,
                        &resp.body[..resp.body.len().min(300)]
                    ));
                }
                set_success_result(
                    "",
                    &json!({"status": "session failed", "session_id": session_id}),
                );
            }
            other => {
                set_success_result(
                    "",
                    &json!({"status": "noop", "reason": "non-terminal job", "job_status": other}),
                );
            }
        }

        Ok(())
    })();

    if let Err(e) = result {
        set_error_result(&e);
    }
    0
}

fn parse_json_field(value: Option<&serde_json::Value>) -> Option<serde_json::Value> {
    let raw = value
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())?;
    serde_json::from_str::<serde_json::Value>(raw).ok()
}

fn string_array(value: Option<&serde_json::Value>) -> Vec<String> {
    value
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

/// Spawn a synthesize CurationJob after a successful source_search.
fn spawn_synth_followup(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    input_json: Option<&serde_json::Value>,
    output_json: Option<&serde_json::Value>,
) -> Result<Option<String>, String> {
    let source_ids = string_array(
        output_json
            .and_then(|v| v.get("source_ids"))
            .or_else(|| input_json.and_then(|v| v.get("source_ids"))),
    );
    if source_ids.is_empty() {
        return Ok(None);
    }

    let task = output_json
        .and_then(|v| v.get("task"))
        .and_then(|v| v.as_str())
        .or_else(|| input_json.and_then(|v| v.get("task")).and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();
    let scope = output_json
        .and_then(|v| v.get("scope"))
        .and_then(|v| v.as_str())
        .or_else(|| input_json.and_then(|v| v.get("scope")).and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();
    let topic_allowlist = string_array(
        output_json
            .and_then(|v| v.get("topic_allowlist"))
            .or_else(|| input_json.and_then(|v| v.get("topic_allowlist"))),
    );
    let discovered_movements = string_array(
        output_json.and_then(|v| v.get("discovered_movements")),
    );

    let synth_input = json!({
        "task": task,
        "scope": scope,
        "topic_allowlist": topic_allowlist,
        "source_ids": source_ids,
        "discovered_movements": discovered_movements,
        "priority": "high"
    });

    // Create new CurationJob
    let create_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs"),
        headers,
        r#"{"fields":{}}"#,
    )?;
    if !(200..300).contains(&create_resp.status) {
        return Err(format!(
            "Failed to create synth CurationJob: HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(300)]
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&create_resp.body)
        .map_err(|e| format!("Failed to parse synth CurationJob creation response: {e}"))?;
    let synth_job_id = created
        .get("entity_id")
        .and_then(|v| v.as_str())
        .ok_or("Created synth CurationJob has no entity_id")?
        .to_string();

    // Configure with synthesize job_type
    let configure_body = json!({
        "job_type": "synthesize",
        "workspace_id": workspace_id,
        "input": synth_input.to_string()
    });
    let configure_resp = ctx.http_call(
        "POST",
        &format!(
            "{api_url}/tdata/CurationJobs('{synth_job_id}')/Katagami.Curation.Configure"
        ),
        headers,
        &configure_body.to_string(),
    )?;
    if !(200..300).contains(&configure_resp.status) {
        return Err(format!(
            "Failed to configure synth CurationJob '{synth_job_id}': HTTP {}: {}",
            configure_resp.status,
            &configure_resp.body[..configure_resp.body.len().min(300)]
        ));
    }

    // Submit to trigger build_session_message
    let submit_resp = ctx.http_call(
        "POST",
        &format!(
            "{api_url}/tdata/CurationJobs('{synth_job_id}')/Katagami.Curation.Submit"
        ),
        headers,
        "{}",
    )?;
    if !(200..300).contains(&submit_resp.status) {
        return Err(format!(
            "Failed to submit synth CurationJob '{synth_job_id}': HTTP {}: {}",
            submit_resp.status,
            &submit_resp.body[..submit_resp.body.len().min(300)]
        ));
    }

    Ok(Some(synth_job_id))
}
