use temper_wasm_sdk::prelude::*;

/// Finalize a CurationJob's spawned session.
///
/// Typed-v1 jobs use entity triggers for follow-up orchestration, so this
/// module only records the OpenPaw session result and moves the job to
/// Completed. Legacy Complete(output) jobs keep the old cascade path for one
/// compatibility window so already-running sessions can finish.
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
        let job_status = ctx
            .entity_state
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let completion_contract = fields
            .get("completion_contract")
            .and_then(|v| v.as_str())
            .unwrap_or("legacy-json-v1");
        let query_id = fields
            .get("query_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let job_id = ctx
            .entity_state
            .get("entity_id")
            .and_then(|v| v.as_str())
            .unwrap_or(&ctx.entity_id)
            .to_string();

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

        if session_id.is_empty() {
            if job_status == "Finalizing" && completion_contract == "typed-v1" {
                let fallback = run_typed_completion_fallback(
                    &ctx,
                    &api_url,
                    &headers,
                    &job_id,
                    &job_type,
                    &fields,
                    &workspace_id,
                    &query_id,
                )?;
                publish_job_progression(
                    &ctx,
                    &api_url,
                    &headers,
                    &job_id,
                    "FinalizeCompletion",
                    &json!({
                        "followup_job_id": "",
                        "design_language_ids": fields
                            .get("design_language_ids")
                            .and_then(|v| v.as_str())
                            .unwrap_or("[]"),
                    }),
                )?;
                set_success_result(
                    "",
                    &json!({
                        "status": "typed job finalized without session_id",
                        "completion_contract": completion_contract,
                        "fallback": fallback,
                    }),
                );
            } else {
                set_success_result("", &json!({"status": "noop", "reason": "no session_id"}));
            }
            return Ok(());
        }

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
        let session_already_terminal =
            matches!(session_status, "Completed" | "Failed" | "Cancelled");
        let session_fields = session.get("fields").cloned().unwrap_or(json!({}));
        let session_counters = session.get("counters").cloned().unwrap_or(json!({}));

        match job_status {
            "Finalizing" => {
                if completion_contract == "typed-v1" {
                    let result_text = fields
                        .get("output")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.is_empty())
                        .unwrap_or("CurationJob completed");
                    let record_status = record_session_success(
                        &ctx,
                        &api_url,
                        &headers,
                        &session_id,
                        session_status,
                        &session_fields,
                        &session_counters,
                        result_text,
                    )?;
                    let fallback = run_typed_completion_fallback(
                        &ctx,
                        &api_url,
                        &headers,
                        &job_id,
                        &job_type,
                        &fields,
                        &workspace_id,
                        &query_id,
                    )?;
                    publish_job_progression(
                        &ctx,
                        &api_url,
                        &headers,
                        &job_id,
                        "FinalizeCompletion",
                        &json!({
                            "followup_job_id": "",
                            "design_language_ids": fields
                                .get("design_language_ids")
                                .and_then(|v| v.as_str())
                                .unwrap_or("[]"),
                        }),
                    )?;
                    set_success_result(
                        "",
                        &json!({
                            "status": record_status,
                            "session_id": session_id,
                            "completion_contract": completion_contract,
                            "fallback": fallback,
                        }),
                    );
                    return Ok(());
                }

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
                        if !query_id.is_empty() {
                            let synth_job_id = synth_id
                                .as_deref()
                                .ok_or("source_search completed without a synth follow-up job")?;
                            publish_job_progression(
                                &ctx,
                                &api_url,
                                &headers,
                                &job_id,
                                "PublishResearchCompletion",
                                &json!({
                                    "followup_job_id": synth_job_id,
                                }),
                            )?;
                        } else {
                            publish_job_progression(
                                &ctx,
                                &api_url,
                                &headers,
                                &job_id,
                                "FinalizeCompletion",
                                &json!({
                                    "followup_job_id": synth_id.as_deref().unwrap_or(""),
                                    "design_language_ids": "[]",
                                }),
                            )?;
                        }
                        synth_id
                    }
                    // synthesize -> quality_review
                    "synthesize" => {
                        let review_id = spawn_quality_review_followup(
                            &ctx,
                            &api_url,
                            &headers,
                            &workspace_id,
                            &query_id,
                            output_json.as_ref(),
                        )?;
                        if !query_id.is_empty() {
                            let language_ids = output_json
                                .as_ref()
                                .and_then(|v| v.get("language_ids"))
                                .map(|v| v.to_string())
                                .unwrap_or_else(|| "[]".to_string());
                            let organize_stage_job_id = review_id.as_deref().ok_or(
                                "synthesize completed without an organizing-stage follow-up job",
                            )?;
                            publish_job_progression(
                                &ctx,
                                &api_url,
                                &headers,
                                &job_id,
                                "PublishSynthesisCompletion",
                                &json!({
                                    "design_language_ids": language_ids,
                                    "followup_job_id": organize_stage_job_id,
                                }),
                            )?;
                        } else {
                            let language_ids = output_json
                                .as_ref()
                                .and_then(|v| v.get("language_ids"))
                                .map(|v| v.to_string())
                                .unwrap_or_else(|| "[]".to_string());
                            publish_job_progression(
                                &ctx,
                                &api_url,
                                &headers,
                                &job_id,
                                "FinalizeCompletion",
                                &json!({
                                    "design_language_ids": language_ids,
                                    "followup_job_id": review_id.as_deref().unwrap_or(""),
                                }),
                            )?;
                        }
                        review_id
                    }
                    // quality_review -> organize_taxonomy
                    "quality_review" => {
                        // Quality review output has "fixed" array — map to language_ids for organize
                        let review_output = output_json.as_ref().map(|v| {
                            let fixed = v.get("fixed").cloned().unwrap_or(json!([]));
                            json!({"language_ids": fixed})
                        });
                        let organize_id = spawn_organize_followup(
                            &ctx,
                            &api_url,
                            &headers,
                            &workspace_id,
                            &query_id,
                            review_output.as_ref(),
                        )?;
                        publish_job_progression(
                            &ctx,
                            &api_url,
                            &headers,
                            &job_id,
                            "FinalizeCompletion",
                            &json!({
                                "followup_job_id": organize_id.as_deref().unwrap_or(""),
                                "design_language_ids": "[]",
                            }),
                        )?;
                        organize_id
                    }
                    // organize_taxonomy -> pipeline complete
                    "organize_taxonomy" => {
                        if !query_id.is_empty() {
                            publish_job_progression(
                                &ctx,
                                &api_url,
                                &headers,
                                &job_id,
                                "PublishOrganizationCompletion",
                                &json!({}),
                            )?;
                        } else {
                            publish_job_progression(
                                &ctx,
                                &api_url,
                                &headers,
                                &job_id,
                                "FinalizeCompletion",
                                &json!({
                                    "followup_job_id": "",
                                    "design_language_ids": "[]",
                                }),
                            )?;
                        }
                        None
                    }
                    // regenerate_embodiment -> submit next queued regen job
                    "regenerate_embodiment" => {
                        let next_job_id =
                            submit_next_queued_regeneration(&ctx, &api_url, &headers)?;
                        publish_job_progression(
                            &ctx,
                            &api_url,
                            &headers,
                            &job_id,
                            "FinalizeCompletion",
                            &json!({
                                "followup_job_id": next_job_id.as_deref().unwrap_or(""),
                                "design_language_ids": "[]",
                            }),
                        )?;
                        next_job_id
                    }
                    _ => {
                        publish_job_progression(
                            &ctx,
                            &api_url,
                            &headers,
                            &job_id,
                            "FinalizeCompletion",
                            &json!({
                                "followup_job_id": "",
                                "design_language_ids": "[]",
                            }),
                        )?;
                        None
                    }
                };
                let synth_job_id = followup_job_id;

                // Finalize the Session if it's still in a finalizable state
                if session_already_terminal {
                    set_success_result(
                        "",
                        &json!({
                            "status": "cascade complete, session already terminal",
                            "session_status": session_status,
                            "synth_job_id": synth_job_id
                        }),
                    );
                    return Ok(());
                }

                if !matches!(session_status, "Thinking" | "Executing") {
                    set_success_result(
                        "",
                        &json!({
                            "status": "cascade complete, session not finalizable",
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

fn record_session_success(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    session_id: &str,
    session_status: &str,
    session_fields: &serde_json::Value,
    session_counters: &serde_json::Value,
    result_text: &str,
) -> Result<&'static str, String> {
    if matches!(session_status, "Completed" | "Failed" | "Cancelled") {
        return Ok("session already terminal");
    }

    if !matches!(session_status, "Thinking" | "Executing") {
        return Ok("session not finalizable");
    }

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
        headers,
        &body.to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to finalize Session '{session_id}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }

    Ok("session finalized")
}

fn run_typed_completion_fallback(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_id: &str,
    job_type: &str,
    fields: &serde_json::Value,
    workspace_id: &str,
    query_id: &str,
) -> Result<serde_json::Value, String> {
    let mut actions = Vec::new();

    match job_type {
        "source_search" => {
            let direction_ids = parse_json_string_array(fields.get("direction_ids"));
            for direction_id in &direction_ids {
                if job_exists(
                    ctx,
                    api_url,
                    headers,
                    "synthesize",
                    query_id,
                    Some(direction_id),
                )? {
                    continue;
                }

                let Some(direction) =
                    load_entity(ctx, api_url, headers, "CurationDirections", direction_id)?
                else {
                    continue;
                };
                let direction_fields = direction.get("fields").cloned().unwrap_or(json!({}));
                let synth_input = string_field(&direction_fields, "synth_input", "{}");
                let direction_workspace =
                    string_field(&direction_fields, "workspace_id", workspace_id);
                let direction_query = string_field(&direction_fields, "query_id", query_id);
                let synth_job_id = create_configure_submit_job(
                    ctx,
                    api_url,
                    headers,
                    "synthesize",
                    &direction_workspace,
                    &direction_query,
                    Some(direction_id),
                    &synth_input,
                )?;
                actions.push(json!({
                    "action": "created_synthesis_job",
                    "direction_id": direction_id,
                    "job_id": synth_job_id,
                }));
            }

            if !query_id.is_empty()
                && entity_status(ctx, api_url, headers, "CurationQueries", query_id)?
                    == Some("Researching".to_string())
            {
                dispatch_action(
                    ctx,
                    api_url,
                    headers,
                    "CurationQueries",
                    query_id,
                    "ResearchComplete",
                    &json!({
                        "source_search_job_id": job_id,
                        "synthesize_job_id": "",
                        "direction_ids": fields
                            .get("direction_ids")
                            .and_then(|v| v.as_str())
                            .unwrap_or("[]"),
                        "synthesize_job_ids": "[]",
                    }),
                )?;
                actions.push(json!({"action": "query_research_complete", "query_id": query_id}));
            }
        }
        "synthesize" => {
            let direction_id = string_field(fields, "direction_id", "");
            if !direction_id.is_empty()
                && entity_status(ctx, api_url, headers, "CurationDirections", &direction_id)?
                    == Some("Synthesizing".to_string())
            {
                dispatch_action(
                    ctx,
                    api_url,
                    headers,
                    "CurationDirections",
                    &direction_id,
                    "Complete",
                    &json!({
                        "design_language_ids": fields
                            .get("design_language_ids")
                            .and_then(|v| v.as_str())
                            .unwrap_or("[]"),
                    }),
                )?;
                actions.push(json!({"action": "direction_complete", "direction_id": direction_id}));
            }

            let query_status = if query_id.is_empty() {
                None
            } else {
                entity_status(ctx, api_url, headers, "CurationQueries", query_id)?
            };
            if query_status.as_deref() == Some("Synthesizing")
                && !job_exists(ctx, api_url, headers, "quality_review", query_id, None)?
            {
                let review_input = string_field(fields, "review_input", "{}");
                let review_job_id = create_configure_submit_job(
                    ctx,
                    api_url,
                    headers,
                    "quality_review",
                    workspace_id,
                    query_id,
                    None,
                    &review_input,
                )?;
                actions
                    .push(json!({"action": "created_quality_review_job", "job_id": review_job_id}));
            }
            if query_status.as_deref() == Some("Synthesizing") {
                dispatch_action(
                    ctx,
                    api_url,
                    headers,
                    "CurationQueries",
                    query_id,
                    "SynthesisComplete",
                    &json!({
                        "design_language_ids": fields
                            .get("design_language_ids")
                            .and_then(|v| v.as_str())
                            .unwrap_or("[]"),
                        "organize_job_id": "",
                        "quality_review_job_ids": "[]",
                    }),
                )?;
                actions.push(json!({"action": "query_synthesis_complete", "query_id": query_id}));
            }
        }
        "quality_review" => {
            if !query_id.is_empty()
                && !job_exists(ctx, api_url, headers, "organize_taxonomy", query_id, None)?
            {
                let organize_input = string_field(fields, "organize_input", "{}");
                let organize_job_id = create_configure_submit_job(
                    ctx,
                    api_url,
                    headers,
                    "organize_taxonomy",
                    workspace_id,
                    query_id,
                    None,
                    &organize_input,
                )?;
                actions
                    .push(json!({"action": "created_organization_job", "job_id": organize_job_id}));
            }
        }
        "organize_taxonomy" => {
            if !query_id.is_empty()
                && entity_status(ctx, api_url, headers, "CurationQueries", query_id)?
                    == Some("Organizing".to_string())
            {
                dispatch_action(
                    ctx,
                    api_url,
                    headers,
                    "CurationQueries",
                    query_id,
                    "OrganizationComplete",
                    &json!({}),
                )?;
                actions
                    .push(json!({"action": "query_organization_complete", "query_id": query_id}));
            }
        }
        _ => {}
    }

    Ok(json!(actions))
}

fn string_field(fields: &serde_json::Value, name: &str, default: &str) -> String {
    fields
        .get(name)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn parse_json_string_array(value: Option<&serde_json::Value>) -> Vec<String> {
    value
        .and_then(|v| v.as_str())
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
        .and_then(|v| {
            v.as_array().map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(|s| s.to_string()))
                    .collect::<Vec<_>>()
            })
        })
        .unwrap_or_default()
}

fn load_entity(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &str,
    entity_id: &str,
) -> Result<Option<serde_json::Value>, String> {
    if entity_id.is_empty() {
        return Ok(None);
    }
    let resp = ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/{set_name}('{entity_id}')"),
        headers,
        "",
    )?;
    if resp.status == 404 {
        return Ok(None);
    }
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to load {set_name}('{entity_id}'): HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    serde_json::from_str::<serde_json::Value>(&resp.body)
        .map(Some)
        .map_err(|e| format!("Failed to parse {set_name}('{entity_id}') response: {e}"))
}

fn entity_status(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &str,
    entity_id: &str,
) -> Result<Option<String>, String> {
    Ok(
        load_entity(ctx, api_url, headers, set_name, entity_id)?.and_then(|entity| {
            entity
                .get("status")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }),
    )
}

fn list_curation_jobs(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
) -> Result<Vec<serde_json::Value>, String> {
    let resp = ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/CurationJobs?$top=200"),
        headers,
        "",
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to list CurationJobs: HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    let body: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse CurationJobs response: {e}"))?;
    Ok(body
        .get("value")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default())
}

fn job_exists(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_type: &str,
    query_id: &str,
    direction_id: Option<&str>,
) -> Result<bool, String> {
    Ok(list_curation_jobs(ctx, api_url, headers)?
        .iter()
        .any(|job| {
            let fields = job.get("fields").unwrap_or(&serde_json::Value::Null);
            let matches_type = fields.get("job_type").and_then(|v| v.as_str()) == Some(job_type);
            let matches_query = query_id.is_empty()
                || fields.get("query_id").and_then(|v| v.as_str()) == Some(query_id);
            let matches_direction = match direction_id {
                Some(expected) => {
                    fields.get("direction_id").and_then(|v| v.as_str()) == Some(expected)
                }
                None => true,
            };
            matches_type && matches_query && matches_direction
        }))
}

fn create_configure_submit_job(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_type: &str,
    workspace_id: &str,
    query_id: &str,
    direction_id: Option<&str>,
    input: &str,
) -> Result<String, String> {
    let create_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs"),
        headers,
        "{}",
    )?;
    if !(200..300).contains(&create_resp.status) {
        return Err(format!(
            "Failed to create {job_type} CurationJob: HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(300)]
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&create_resp.body)
        .map_err(|e| format!("Failed to parse CurationJob creation response: {e}"))?;
    let job_id = created
        .get("entity_id")
        .and_then(|v| v.as_str())
        .ok_or("Created CurationJob has no entity_id")?
        .to_string();

    let mut body = json!({
        "job_type": job_type,
        "workspace_id": workspace_id,
        "input": input,
        "query_id": query_id,
        "completion_contract": "typed-v1",
    });
    if let Some(direction_id) = direction_id.filter(|id| !id.is_empty()) {
        body["direction_id"] = serde_json::Value::String(direction_id.to_string());
    }

    dispatch_action(
        ctx,
        api_url,
        headers,
        "CurationJobs",
        &job_id,
        "ConfigureAndSubmit",
        &body,
    )?;
    Ok(job_id)
}

fn dispatch_action(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &str,
    entity_id: &str,
    action: &str,
    params: &serde_json::Value,
) -> Result<(), String> {
    let resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/{set_name}('{entity_id}')/Temper.{action}"),
        headers,
        &params.to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to dispatch {set_name}('{entity_id}').{action}: HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    Ok(())
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

/// Spawn one synthesize CurationJob per discovered movement after a successful source_search.
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
        .or_else(|| {
            input_json
                .and_then(|v| v.get("task"))
                .and_then(|v| v.as_str())
        })
        .unwrap_or("")
        .to_string();
    let scope = output_json
        .and_then(|v| v.get("scope"))
        .and_then(|v| v.as_str())
        .or_else(|| {
            input_json
                .and_then(|v| v.get("scope"))
                .and_then(|v| v.as_str())
        })
        .unwrap_or("")
        .to_string();
    let topic_allowlist = string_array(
        output_json
            .and_then(|v| v.get("topic_allowlist"))
            .or_else(|| input_json.and_then(|v| v.get("topic_allowlist"))),
    );

    // Parse discovered_movements — supports both object format [{name, palette_direction}]
    // and legacy string format ["direction name"]
    let raw_movements = output_json
        .and_then(|v| v.get("discovered_movements"))
        .and_then(|v| v.as_array());
    let directions: Vec<(String, String)> = match raw_movements {
        Some(arr) => arr
            .iter()
            .filter_map(|item| {
                if let Some(obj) = item.as_object() {
                    let name = obj
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let palette = obj
                        .get("palette_direction")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if name.is_empty() {
                        None
                    } else {
                        Some((name, palette))
                    }
                } else if let Some(s) = item.as_str() {
                    if s.is_empty() {
                        None
                    } else {
                        Some((s.to_string(), String::new()))
                    }
                } else {
                    None
                }
            })
            .collect(),
        None => vec![(task.clone(), String::new())],
    };

    if directions.is_empty() {
        return Ok(None);
    }

    // Fan out: one synth job per direction
    let mut first_job_id: Option<String> = None;
    for (direction, palette) in &directions {
        let synth_input = json!({
            "task": task,
            "scope": scope,
            "target_direction": direction,
            "palette_direction": palette,
            "topic_allowlist": topic_allowlist,
            "source_ids": source_ids,
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
            ctx.log(
                "error",
                &format!(
                    "Failed to create synth job for '{}': HTTP {}",
                    direction, create_resp.status
                ),
            );
            continue;
        }
        let created: serde_json::Value = serde_json::from_str(&create_resp.body)
            .map_err(|e| format!("Failed to parse synth job creation response: {e}"))?;
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
            &format!("{api_url}/tdata/CurationJobs('{synth_job_id}')/Katagami.Curation.Configure"),
            headers,
            &configure_body.to_string(),
        )?;
        if !(200..300).contains(&configure_resp.status) {
            ctx.log(
                "error",
                &format!(
                    "Failed to configure synth job '{}' for '{}': HTTP {}",
                    synth_job_id, direction, configure_resp.status
                ),
            );
            continue;
        }

        // Submit to trigger build_session_message
        let submit_resp = ctx.http_call(
            "POST",
            &format!("{api_url}/tdata/CurationJobs('{synth_job_id}')/Katagami.Curation.Submit"),
            headers,
            "{}",
        )?;
        if !(200..300).contains(&submit_resp.status) {
            ctx.log(
                "error",
                &format!(
                    "Failed to submit synth job '{}' for '{}': HTTP {}",
                    synth_job_id, direction, submit_resp.status
                ),
            );
            continue;
        }

        ctx.log(
            "info",
            &format!(
                "Spawned synth job '{}' for direction '{}'",
                synth_job_id, direction
            ),
        );
        if first_job_id.is_none() {
            first_job_id = Some(synth_job_id);
        }
    }

    Ok(first_job_id)
}

/// Spawn a quality_review CurationJob after a successful synthesize.
fn spawn_quality_review_followup(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    query_id: &str,
    output_json: Option<&serde_json::Value>,
) -> Result<Option<String>, String> {
    let language_ids = string_array(output_json.and_then(|v| v.get("language_ids")));
    if language_ids.is_empty() {
        ctx.log(
            "info",
            "spawn_quality_review_followup: no language_ids in output, skipping",
        );
        return Ok(None);
    }

    let review_input = json!({
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
            "Failed to create quality_review CurationJob: HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(300)]
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&create_resp.body).map_err(|e| {
        format!("Failed to parse quality_review CurationJob creation response: {e}")
    })?;
    let review_job_id = created
        .get("entity_id")
        .and_then(|v| v.as_str())
        .ok_or("Created quality_review CurationJob has no entity_id")?
        .to_string();

    // Configure
    let configure_body = json!({
        "job_type": "quality_review",
        "workspace_id": workspace_id,
        "input": review_input.to_string(),
        "query_id": query_id
    });
    let configure_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs('{review_job_id}')/Katagami.Curation.Configure"),
        headers,
        &configure_body.to_string(),
    )?;
    if !(200..300).contains(&configure_resp.status) {
        return Err(format!(
            "Failed to configure quality_review CurationJob '{review_job_id}': HTTP {}: {}",
            configure_resp.status,
            &configure_resp.body[..configure_resp.body.len().min(300)]
        ));
    }

    // Submit
    let submit_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs('{review_job_id}')/Katagami.Curation.Submit"),
        headers,
        "{}",
    )?;
    if !(200..300).contains(&submit_resp.status) {
        return Err(format!(
            "Failed to submit quality_review CurationJob '{review_job_id}': HTTP {}: {}",
            submit_resp.status,
            &submit_resp.body[..submit_resp.body.len().min(300)]
        ));
    }

    ctx.log(
        "info",
        &format!("spawn_quality_review_followup: submitted quality_review job '{review_job_id}'"),
    );

    Ok(Some(review_job_id))
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
    let language_ids = string_array(output_json.and_then(|v| v.get("language_ids")));
    if language_ids.is_empty() {
        ctx.log(
            "info",
            "spawn_organize_followup: no language_ids in output, skipping",
        );
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
        &format!("{api_url}/tdata/CurationJobs('{organize_job_id}')/Katagami.Curation.Configure"),
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
        &format!("{api_url}/tdata/CurationJobs('{organize_job_id}')/Katagami.Curation.Submit"),
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
        ctx.log(
            "warn",
            &format!(
                "submit_next_queued_regeneration: failed to list jobs: HTTP {}",
                list_resp.status
            ),
        );
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
                let job_id = job.get("entity_id").and_then(|v| v.as_str()).unwrap_or("");
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

    ctx.log(
        "info",
        "submit_next_queued_regeneration: no more queued regeneration jobs",
    );
    Ok(None)
}

/// Dispatch a local completion-publish action so inline entity triggers can
/// advance the parent CurationQuery declaratively.
fn publish_job_progression(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_id: &str,
    action: &str,
    params: &serde_json::Value,
) -> Result<(), String> {
    let url = format!("{api_url}/tdata/CurationJobs('{job_id}')/Katagami.Curation.{action}");
    match ctx.http_call("POST", &url, headers, &params.to_string()) {
        Ok(resp) if (200..300).contains(&resp.status) => {
            ctx.log(
                "info",
                &format!("publish_job_progression: {action} succeeded for job '{job_id}'"),
            );
            Ok(())
        }
        Ok(resp) => Err(format!(
            "publish_job_progression: {action} failed for job '{job_id}': HTTP {} — {}",
            resp.status,
            &resp.body[..resp.body.len().min(200)]
        )),
        Err(e) => Err(format!(
            "publish_job_progression: {action} error for job '{job_id}': {e}"
        )),
    }
}
