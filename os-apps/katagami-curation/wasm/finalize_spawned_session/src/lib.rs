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

        let query_id = fields
            .get("query_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        match job_status {
            "Completed" => {
                // Cascade logic: spawn follow-up jobs based on job_type
                let followup_job_id = match job_type.as_str() {
                    // source_search -> synthesize
                    "source_search" => {
                        let synth_id = spawn_synth_followup(
                            &ctx,
                            &api_url,
                            &headers,
                            &workspace_id,
                            &query_id,
                            input_json.as_ref(),
                            output_json.as_ref(),
                        )?;
                        // Advance CurationQuery: Researching -> Synthesizing
                        if !query_id.is_empty() {
                            let job_id = ctx.entity_state.get("entity_id")
                                .and_then(|v| v.as_str()).unwrap_or("").to_string();
                            advance_query(&ctx, &api_url, &headers, &query_id,
                                "ResearchComplete", &json!({
                                    "source_search_job_id": job_id,
                                    "synthesize_job_id": synth_id.as_deref().unwrap_or("")
                                }));
                        }
                        synth_id
                    }
                    // synthesize -> organize_taxonomy
                    "synthesize" => {
                        let organize_id = spawn_organize_followup(
                            &ctx,
                            &api_url,
                            &headers,
                            &workspace_id,
                            &query_id,
                            output_json.as_ref(),
                        )?;
                        // Advance CurationQuery: Synthesizing -> Organizing
                        if !query_id.is_empty() {
                            let language_ids = output_json.as_ref()
                                .and_then(|v| v.get("language_ids"))
                                .map(|v| v.to_string())
                                .unwrap_or_else(|| "[]".to_string());
                            advance_query(&ctx, &api_url, &headers, &query_id,
                                "SynthesisComplete", &json!({
                                    "design_language_ids": language_ids,
                                    "organize_job_id": organize_id.as_deref().unwrap_or("")
                                }));
                        }
                        organize_id
                    }
                    // organize_taxonomy -> pipeline complete
                    "organize_taxonomy" => {
                        // Advance CurationQuery: Organizing -> Completed
                        if !query_id.is_empty() {
                            advance_query(&ctx, &api_url, &headers, &query_id,
                                "OrganizationComplete", &json!({}));
                        }
                        None
                    }
                    // regenerate_embodiment -> submit next queued regen job
                    "regenerate_embodiment" => {
                        submit_next_queued_regeneration(&ctx, &api_url, &headers)?
                    }
                    _ => None,
                };
                let synth_job_id = followup_job_id;

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
    query_id: &str,
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
        "priority": "high",
        "query_id": query_id
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
        "input": synth_input.to_string(),
        "query_id": query_id
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

/// Spawn an organize_taxonomy CurationJob after a successful synthesize.
fn spawn_organize_followup(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    query_id: &str,
    output_json: Option<&serde_json::Value>,
) -> Result<Option<String>, String> {
    let language_ids = string_array(
        output_json.and_then(|v| v.get("language_ids")),
    );
    if language_ids.is_empty() {
        ctx.log("info", "spawn_organize_followup: no language_ids in output, skipping");
        return Ok(None);
    }

    let organize_input = json!({
        "language_ids": language_ids,
        "query_id": query_id
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
            "Failed to create organize CurationJob: HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(300)]
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&create_resp.body)
        .map_err(|e| format!("Failed to parse organize CurationJob creation response: {e}"))?;
    let organize_job_id = created
        .get("entity_id")
        .and_then(|v| v.as_str())
        .ok_or("Created organize CurationJob has no entity_id")?
        .to_string();

    // Configure
    let configure_body = json!({
        "job_type": "organize_taxonomy",
        "workspace_id": workspace_id,
        "input": organize_input.to_string(),
        "query_id": query_id
    });
    let configure_resp = ctx.http_call(
        "POST",
        &format!(
            "{api_url}/tdata/CurationJobs('{organize_job_id}')/Katagami.Curation.Configure"
        ),
        headers,
        &configure_body.to_string(),
    )?;
    if !(200..300).contains(&configure_resp.status) {
        return Err(format!(
            "Failed to configure organize CurationJob '{organize_job_id}': HTTP {}: {}",
            configure_resp.status,
            &configure_resp.body[..configure_resp.body.len().min(300)]
        ));
    }

    // Submit
    let submit_resp = ctx.http_call(
        "POST",
        &format!(
            "{api_url}/tdata/CurationJobs('{organize_job_id}')/Katagami.Curation.Submit"
        ),
        headers,
        "{}",
    )?;
    if !(200..300).contains(&submit_resp.status) {
        return Err(format!(
            "Failed to submit organize CurationJob '{organize_job_id}': HTTP {}: {}",
            submit_resp.status,
            &submit_resp.body[..submit_resp.body.len().min(300)]
        ));
    }

    ctx.log(
        "info",
        &format!("spawn_organize_followup: submitted organize_taxonomy job '{organize_job_id}'"),
    );

    Ok(Some(organize_job_id))
}

/// For staggered bulk regeneration: find the next Queued regeneration job and Submit it.
fn submit_next_queued_regeneration(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
) -> Result<Option<String>, String> {
    // Find Queued CurationJobs with job_type = regenerate_embodiment
    let filter = "State%20eq%20'Queued'";
    let list_resp = ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/CurationJobs?$filter={filter}&$top=5"),
        headers,
        "",
    )?;
    if !(200..300).contains(&list_resp.status) {
        ctx.log("warn", &format!(
            "submit_next_queued_regeneration: failed to list jobs: HTTP {}",
            list_resp.status
        ));
        return Ok(None);
    }

    let list: serde_json::Value = serde_json::from_str(&list_resp.body)
        .map_err(|e| format!("Failed to parse job list: {e}"))?;

    let jobs = list.get("value").and_then(|v| v.as_array());
    if let Some(jobs) = jobs {
        for job in jobs {
            let job_type = job
                .get("fields")
                .and_then(|f| f.get("job_type"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if job_type == "regenerate_embodiment" {
                let job_id = job
                    .get("entity_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if !job_id.is_empty() {
                    let submit_resp = ctx.http_call(
                        "POST",
                        &format!(
                            "{api_url}/tdata/CurationJobs('{job_id}')/Katagami.Curation.Submit"
                        ),
                        headers,
                        "{}",
                    )?;
                    if (200..300).contains(&submit_resp.status) {
                        ctx.log(
                            "info",
                            &format!("submit_next_queued_regeneration: submitted '{job_id}'"),
                        );
                        return Ok(Some(job_id.to_string()));
                    }
                }
            }
        }
    }

    ctx.log("info", "submit_next_queued_regeneration: no more queued regeneration jobs");
    Ok(None)
}

/// Advance the CurationQuery state machine. Best-effort — failures are logged but don't block.
fn advance_query(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    query_id: &str,
    action: &str,
    params: &serde_json::Value,
) {
    let url = format!(
        "{api_url}/tdata/CurationQueries('{query_id}')/Katagami.Curation.{action}"
    );
    match ctx.http_call("POST", &url, headers, &params.to_string()) {
        Ok(resp) if (200..300).contains(&resp.status) => {
            ctx.log("info", &format!(
                "advance_query: {action} succeeded for query '{query_id}'"
            ));
        }
        Ok(resp) => {
            ctx.log("warn", &format!(
                "advance_query: {action} failed for query '{query_id}': HTTP {} — {}",
                resp.status, &resp.body[..resp.body.len().min(200)]
            ));
        }
        Err(e) => {
            ctx.log("warn", &format!(
                "advance_query: {action} error for query '{query_id}': {e}"
            ));
        }
    }
}
