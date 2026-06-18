use base64::Engine;
use temper_wasm_sdk::prelude::*;

const MAX_ARTIFACT_REPAIR_ATTEMPTS: i64 = 2;
const MAX_CONTRACT_REPAIR_ATTEMPTS: i64 = 3;
const MAX_TRANSIENT_PROVIDER_RETRIES: i64 = 4;
#[cfg(target_arch = "wasm32")]
const FILE_UPLOAD_STREAM_CHUNK_BYTES: usize = 64 * 1024;

/// Finalize a CurationJob's spawned session.
///
/// Typed-v1 jobs use entity triggers for follow-up orchestration, so this
/// module only records the temperpaw session result and moves the job to
/// Completed. Legacy Complete(output) jobs keep the old cascade path for one
/// compatibility window so already-running sessions can finish.
#[unsafe(no_mangle)]
pub extern "C" fn run(_ctx_ptr: i32, _ctx_len: i32) -> i32 {
    let result = (|| -> Result<(), String> {
        let ctx = Context::from_host()?;
        let mut fields = ctx.entity_state.get("fields").cloned().unwrap_or(json!({}));
        merge_trigger_params_into_fields(&mut fields, &ctx.trigger_params);
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
            .unwrap_or("typed-v1");
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
                let mut finalizing_fields =
                    load_entity(&ctx, &api_url, &headers, "CurationJobs", &job_id)?
                        .map(|job| entity_fields(&job))
                        .unwrap_or_else(|| fields.clone());
                merge_trigger_params_into_fields(&mut finalizing_fields, &ctx.trigger_params);
                let outcome = match finish_typed_completion_or_repair(
                    &ctx,
                    &api_url,
                    &headers,
                    &job_id,
                    &job_type,
                    &finalizing_fields,
                    &workspace_id,
                    &query_id,
                ) {
                    Ok(outcome) => outcome,
                    Err(error) => {
                        set_failed_job_callback(&ctx, &job_id, &error);
                        return Ok(());
                    }
                };
                ctx.log(
                    "info",
                    &format!(
                        "finalize_spawned_session: typed no-session completion handled for job '{job_id}': {outcome}"
                    ),
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
            let error = format!(
                "Failed to load Session '{session_id}': HTTP {}: {}",
                session_resp.status,
                &session_resp.body[..session_resp.body.len().min(300)]
            );
            if job_status == "Finalizing" {
                set_failed_job_callback(&ctx, &job_id, &error);
                return Ok(());
            }
            return Err(error);
        }

        let session: serde_json::Value = serde_json::from_str(&session_resp.body)
            .map_err(|e| format!("Failed to parse Session response: {e}"))?;
        let session_status = session.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let session_already_terminal = session_is_terminal(session_status);
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
                    let record_status = match record_session_success(
                        &ctx,
                        &api_url,
                        &headers,
                        &session_id,
                        session_status,
                        &session_fields,
                        &session_counters,
                        result_text,
                    ) {
                        Ok(record_status) => record_status,
                        Err(error) => {
                            set_failed_job_callback(&ctx, &job_id, &error);
                            return Ok(());
                        }
                    };
                    let mut finalizing_fields =
                        load_entity(&ctx, &api_url, &headers, "CurationJobs", &job_id)?
                            .map(|job| entity_fields(&job))
                            .unwrap_or_else(|| fields.clone());
                    merge_trigger_params_into_fields(&mut finalizing_fields, &ctx.trigger_params);
                    let outcome = match finish_typed_completion_or_repair(
                        &ctx,
                        &api_url,
                        &headers,
                        &job_id,
                        &job_type,
                        &finalizing_fields,
                        &workspace_id,
                        &query_id,
                    ) {
                        Ok(outcome) => outcome,
                        Err(error) => {
                            set_failed_job_callback(&ctx, &job_id, &error);
                            return Ok(());
                        }
                    };
                    ctx.log(
                        "info",
                        &format!(
                            "finalize_spawned_session: typed completion handled for job '{job_id}': {outcome}; session: {record_status}"
                        ),
                    );
                    return Ok(());
                }

                // Cascade logic: spawn follow-up jobs based on job_type
                let progression = match job_type.as_str() {
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
                            JobProgression {
                                action: "PublishResearchCompletion",
                                params: json!({
                                    "followup_job_id": synth_job_id,
                                    "synthesize_job_ids": json!([synth_job_id]).to_string(),
                                }),
                                followup_job_id: synth_id,
                            }
                        } else {
                            JobProgression {
                                action: "FinalizeCompletion",
                                params: json!({
                                    "followup_job_id": synth_id.as_deref().unwrap_or(""),
                                    "design_language_ids": "[]",
                                }),
                                followup_job_id: synth_id,
                            }
                        }
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
                            JobProgression {
                                action: "PublishSynthesisCompletion",
                                params: json!({
                                    "design_language_ids": language_ids,
                                    "followup_job_id": organize_stage_job_id,
                                }),
                                followup_job_id: review_id,
                            }
                        } else {
                            let language_ids = output_json
                                .as_ref()
                                .and_then(|v| v.get("language_ids"))
                                .map(|v| v.to_string())
                                .unwrap_or_else(|| "[]".to_string());
                            JobProgression {
                                action: "FinalizeCompletion",
                                params: json!({
                                    "design_language_ids": language_ids,
                                    "followup_job_id": review_id.as_deref().unwrap_or(""),
                                }),
                                followup_job_id: review_id,
                            }
                        }
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
                        JobProgression {
                            action: "FinalizeCompletion",
                            params: json!({
                                "followup_job_id": organize_id.as_deref().unwrap_or(""),
                                "design_language_ids": "[]",
                            }),
                            followup_job_id: organize_id,
                        }
                    }
                    // organize_taxonomy -> pipeline complete
                    "organize_taxonomy" => {
                        if !query_id.is_empty() {
                            JobProgression {
                                action: "PublishOrganizationCompletion",
                                params: json!({}),
                                followup_job_id: None,
                            }
                        } else {
                            JobProgression {
                                action: "FinalizeCompletion",
                                params: json!({
                                    "followup_job_id": "",
                                    "design_language_ids": "[]",
                                }),
                                followup_job_id: None,
                            }
                        }
                    }
                    // regenerate_embodiment -> submit next queued regen job
                    "regenerate_embodiment" => {
                        let next_job_id =
                            submit_next_queued_regeneration(&ctx, &api_url, &headers)?;
                        JobProgression {
                            action: "FinalizeCompletion",
                            params: json!({
                                "followup_job_id": next_job_id.as_deref().unwrap_or(""),
                                "design_language_ids": "[]",
                            }),
                            followup_job_id: next_job_id,
                        }
                    }
                    _ => JobProgression {
                        action: "FinalizeCompletion",
                        params: json!({
                            "followup_job_id": "",
                            "design_language_ids": "[]",
                        }),
                        followup_job_id: None,
                    },
                };
                let terminal_action = progression.action;
                let terminal_params = progression.params;
                let synth_job_id = progression.followup_job_id;

                // Finalize the Session if it's still in a finalizable state
                if session_already_terminal {
                    ctx.log(
                        "info",
                        &format!(
                            "finalize_spawned_session: legacy cascade complete for job '{job_id}', session already terminal ({session_status}), follow-up: {synth_job_id:?}"
                        ),
                    );
                    set_terminal_job_callback(
                        &ctx,
                        &job_id,
                        terminal_action,
                        terminal_params.clone(),
                    );
                    return Ok(());
                }

                if !session_can_be_finalized(session_status) {
                    ctx.log(
                        "info",
                        &format!(
                            "finalize_spawned_session: legacy cascade complete for job '{job_id}', session not finalizable ({session_status}), follow-up: {synth_job_id:?}"
                        ),
                    );
                    set_terminal_job_callback(
                        &ctx,
                        &job_id,
                        terminal_action,
                        terminal_params.clone(),
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
                    if record_result_rejected_because_session_terminal(&resp.body) {
                        ctx.log(
                            "info",
                            &format!(
                                "finalize_spawned_session: legacy session became terminal before record for job '{job_id}', follow-up: {synth_job_id:?}"
                            ),
                        );
                        set_terminal_job_callback(
                            &ctx,
                            &job_id,
                            terminal_action,
                            terminal_params.clone(),
                        );
                        return Ok(());
                    }
                    let error = format!(
                        "Failed to finalize Session '{session_id}': HTTP {}: {}",
                        resp.status,
                        &resp.body[..resp.body.len().min(300)]
                    );
                    set_failed_job_callback(&ctx, &job_id, &error);
                    return Ok(());
                }
                ctx.log(
                    "info",
                    &format!(
                        "finalize_spawned_session: legacy session finalized for job '{job_id}', follow-up: {synth_job_id:?}"
                    ),
                );
                set_terminal_job_callback(&ctx, &job_id, terminal_action, terminal_params);
            }
            "Failed" => {
                let error_message = fields
                    .get("error_message")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .unwrap_or("CurationJob failed");
                let record_status = if session_id.is_empty() {
                    "no session"
                } else {
                    record_session_failure(
                        &ctx,
                        &api_url,
                        &headers,
                        &session_id,
                        session_status,
                        error_message,
                    )?
                };
                if auto_retry_failed_job(&ctx, &api_url, &headers, &job_id, &fields, error_message)?
                {
                    set_success_result(
                        "",
                        &json!({
                            "status": "auto_retry_submitted",
                            "session_id": session_id,
                            "record_status": record_status,
                        }),
                    );
                    return Ok(());
                }
                if recover_failed_quality_review_job(
                    &ctx,
                    &api_url,
                    &headers,
                    &workspace_id,
                    &query_id,
                    &job_id,
                    &job_type,
                    &fields,
                    error_message,
                )? {
                    set_success_result(
                        "",
                        &json!({
                            "status": "repair_submitted_after_failed_quality_review",
                            "session_id": session_id,
                            "record_status": record_status,
                        }),
                    );
                    return Ok(());
                }
                propagate_failed_job(&ctx, &api_url, &headers, &fields, error_message)?;
                set_success_result(
                    "",
                    &json!({"status": record_status, "session_id": session_id}),
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

fn merge_trigger_params_into_fields(
    fields: &mut serde_json::Value,
    trigger_params: &serde_json::Value,
) {
    let Some(fields) = fields.as_object_mut() else {
        return;
    };
    let Some(params) = trigger_params.as_object() else {
        return;
    };
    for (key, value) in params {
        if !value.is_null() {
            fields.insert(key.clone(), value.clone());
        }
    }
}

struct JobProgression {
    action: &'static str,
    params: serde_json::Value,
    followup_job_id: Option<String>,
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
    if session_is_terminal(session_status) {
        return Ok("session already terminal");
    }

    if !session_can_be_finalized(session_status) {
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
        if record_result_rejected_because_session_terminal(&resp.body) {
            return Ok("session became terminal before record");
        }
        return Err(format!(
            "Failed to finalize Session '{session_id}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }

    Ok("session finalized")
}

fn record_result_rejected_because_session_terminal(body: &str) -> bool {
    let lower = body.to_ascii_lowercase();
    lower.contains("recordresult")
        && lower.contains("not valid from state")
        && (lower.contains("state 'completed'")
            || lower.contains("state \"completed\"")
            || lower.contains("state 'failed'")
            || lower.contains("state \"failed\"")
            || lower.contains("state 'cancelled'")
            || lower.contains("state \"cancelled\""))
}

fn record_session_failure(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    session_id: &str,
    session_status: &str,
    error_message: &str,
) -> Result<&'static str, String> {
    if session_is_terminal(session_status) {
        return Ok("session already terminal");
    }

    if !session_can_be_finalized(session_status) {
        return Ok("session not finalizable");
    }

    let resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/Sessions('{session_id}')/OpenPaw.Fail"),
        headers,
        &json!({"error_message": error_message}).to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to fail Session '{session_id}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    Ok("session failed")
}

fn auto_retry_failed_job(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_id: &str,
    fields: &serde_json::Value,
    error_message: &str,
) -> Result<bool, String> {
    if !is_transient_provider_failure(error_message) {
        return Ok(false);
    }

    let attempts = numeric_field_any(fields, &["retry_attempts", "RetryAttempts"]);
    if attempts >= MAX_TRANSIENT_PROVIDER_RETRIES {
        ctx.log(
            "warn",
            &format!(
                "finalize_spawned_session: transient provider failure on job '{job_id}' exceeded retry budget ({attempts}): {error_message}"
            ),
        );
        return Ok(false);
    }

    let next_attempt = attempts + 1;
    dispatch_action(
        ctx,
        api_url,
        headers,
        "CurationJobs",
        job_id,
        "Retry",
        &json!({
            "error_message": format!(
                "Auto-retrying transient provider failure attempt {next_attempt}/{MAX_TRANSIENT_PROVIDER_RETRIES}: {error_message}"
            ),
            "retry_attempts": next_attempt.to_string(),
        }),
    )?;
    dispatch_action(
        ctx,
        api_url,
        headers,
        "CurationJobs",
        job_id,
        "Submit",
        &json!({}),
    )?;
    ctx.log(
        "info",
        &format!(
            "finalize_spawned_session: auto_retry_failed_job submitted retry {next_attempt}/{MAX_TRANSIENT_PROVIDER_RETRIES} for job '{job_id}' after transient provider failure: {error_message}"
        ),
    );
    Ok(true)
}

fn recover_failed_quality_review_job(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    query_id: &str,
    job_id: &str,
    job_type: &str,
    fields: &serde_json::Value,
    error_message: &str,
) -> Result<bool, String> {
    if job_type != "quality_review" || !is_repairable_language_artifact_error(error_message) {
        return Ok(false);
    }

    let language_ids = design_language_ids_from_job(fields);
    if language_ids.is_empty() {
        return Ok(false);
    }

    let mut repair_job_ids = Vec::new();
    for language_id in &language_ids {
        if let Some(repair_job_id) = queue_artifact_repair_job(
            ctx,
            api_url,
            headers,
            workspace_id,
            query_id,
            fields,
            language_id,
            error_message,
        )? {
            repair_job_ids.push(repair_job_id);
        }
    }

    ctx.log(
        "warn",
        &format!(
            "finalize_spawned_session: recovered failed quality_review job '{job_id}' by queuing artifact/spec repair jobs {repair_job_ids:?} for languages {language_ids:?}: {error_message}"
        ),
    );
    Ok(true)
}

fn propagate_failed_job(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
    error_message: &str,
) -> Result<(), String> {
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
            "Fail",
            &json!({"error_message": error_message}),
        )?;
    }

    let query_id = string_field(fields, "query_id", "");
    if !query_id.is_empty()
        && matches!(
            entity_status(ctx, api_url, headers, "CurationQueries", &query_id)?.as_deref(),
            Some("Submitted" | "Researching" | "Synthesizing" | "Organizing")
        )
    {
        dispatch_action(
            ctx,
            api_url,
            headers,
            "CurationQueries",
            &query_id,
            "Fail",
            &json!({"error_message": error_message}),
        )?;
    }

    Ok(())
}

fn is_transient_provider_failure(error_message: &str) -> bool {
    let lower = error_message.to_ascii_lowercase();
    [
        "openai stream ended early",
        "stream ended early",
        "provider stream",
        "stream closed",
        "closed before final message",
        "unexpected eof",
        "incomplete chunk",
        "connection reset",
        "connection closed",
        "unfinished tool call",
        "typed completion ended",
        "typed completion did not report",
        "temporarily unavailable",
        "timeout",
        "timed out",
        "rate limit",
    ]
    .iter()
    .any(|needle| lower.contains(needle))
}

fn session_is_terminal(session_status: &str) -> bool {
    matches!(session_status, "Completed" | "Failed" | "Cancelled")
}

fn session_can_be_finalized(session_status: &str) -> bool {
    matches!(session_status, "Thinking" | "Executing")
}

fn set_terminal_job_callback(ctx: &Context, job_id: &str, action: &str, params: serde_json::Value) {
    ctx.log(
        "info",
        &format!(
            "finalize_spawned_session: requesting CurationJob.{action} callback for job '{job_id}'"
        ),
    );
    set_success_result(action, &params);
}

fn set_failed_job_callback(ctx: &Context, job_id: &str, error_message: &str) {
    ctx.log(
        "warn",
        &format!(
            "finalize_spawned_session: requesting CurationJob.Fail callback for job '{job_id}': {error_message}"
        ),
    );
    set_success_result("Fail", &json!({"error_message": error_message}));
}

fn finish_typed_completion_or_repair(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_id: &str,
    job_type: &str,
    fields: &serde_json::Value,
    workspace_id: &str,
    query_id: &str,
) -> Result<serde_json::Value, String> {
    let validation = match verify_typed_completion(
        ctx,
        api_url,
        headers,
        job_id,
        job_type,
        fields,
        workspace_id,
    ) {
        Ok(validation) => validation,
        Err(error) => {
            if is_repairable_contract_error(job_type, &error) {
                let validation = json!({
                    "validated": false,
                    "job_type": job_type,
                    "defects": [contract_defect(job_type, None, &error)],
                });
                let repaired = set_repair_required_or_fail(
                    ctx,
                    job_id,
                    job_type,
                    fields,
                    &validation,
                    &error,
                )?;
                return Ok(json!({
                    "status": if repaired { "repair_required" } else { "repair_exhausted" },
                    "validation": validation,
                }));
            }
            set_failed_job_callback(ctx, job_id, &error);
            return Ok(json!({
                "status": "failed_non_repairable_contract_error",
                "error": error,
            }));
        }
    };

    if validation_needs_repair(&validation) {
        let summary = validation_defect_summary(job_type, &validation);
        let repaired =
            set_repair_required_or_fail(ctx, job_id, job_type, fields, &validation, &summary)?;
        return Ok(json!({
            "status": if repaired { "repair_required" } else { "repair_exhausted" },
            "validation": validation,
        }));
    }

    let fallback = run_typed_completion_fallback(
        ctx,
        api_url,
        headers,
        job_id,
        job_type,
        fields,
        workspace_id,
        query_id,
        &validation,
    )?;
    let (terminal_action, terminal_params) =
        typed_success_terminal_action(job_type, fields, &fallback);
    set_terminal_job_callback(ctx, job_id, terminal_action, terminal_params.clone());
    Ok(json!({
        "status": "validated",
        "terminal_action": terminal_action,
        "terminal_params": terminal_params,
        "validation": validation,
        "fallback": fallback,
    }))
}

fn set_repair_required_or_fail(
    ctx: &Context,
    job_id: &str,
    job_type: &str,
    fields: &serde_json::Value,
    validation: &serde_json::Value,
    summary: &str,
) -> Result<bool, String> {
    let attempts = numeric_field_any(fields, &["retry_attempts", "RetryAttempts"]);
    if attempts >= MAX_CONTRACT_REPAIR_ATTEMPTS {
        set_failed_job_callback(
            ctx,
            job_id,
            &format!(
                "{job_type} contract defects remained after {MAX_CONTRACT_REPAIR_ATTEMPTS} repair attempts: {summary}"
            ),
        );
        return Ok(false);
    }

    let next_attempt = attempts + 1;
    let repair_input = contract_repair_input(job_type, fields, validation, next_attempt)?;
    set_repair_required_job_callback(ctx, job_id, summary, next_attempt, &repair_input);
    Ok(true)
}

fn set_repair_required_job_callback(
    ctx: &Context,
    job_id: &str,
    summary: &str,
    retry_attempts: i64,
    input: &serde_json::Value,
) {
    ctx.log(
        "warn",
        &format!(
            "finalize_spawned_session: requesting CurationJob.RepairRequired callback for job '{job_id}' attempt {retry_attempts}/{MAX_CONTRACT_REPAIR_ATTEMPTS}: {summary}"
        ),
    );
    set_success_result(
        "RepairRequired",
        &json!({
            "error_message": summary,
            "retry_attempts": retry_attempts.to_string(),
            "input": input.to_string(),
        }),
    );
}

fn contract_repair_input(
    job_type: &str,
    fields: &serde_json::Value,
    validation: &serde_json::Value,
    next_attempt: i64,
) -> Result<serde_json::Value, String> {
    let mut input = parse_json_field(fields.get("input")).unwrap_or_else(|| json!({}));
    if !input.is_object() {
        input = json!({ "original_input": input });
    }
    let Some(input_obj) = input.as_object_mut() else {
        return Err("contract repair input could not be represented as an object".to_string());
    };

    let existing_design_language_ids = design_language_ids_for_contract_repair(fields, validation);
    if !existing_design_language_ids.is_empty() && !input_obj.contains_key("language_ids") {
        input_obj.insert(
            "language_ids".to_string(),
            json!(existing_design_language_ids.clone()),
        );
    }
    if !existing_design_language_ids.is_empty() && !input_obj.contains_key("existing_language_id") {
        input_obj.insert(
            "existing_language_id".to_string(),
            json!(existing_design_language_ids[0].clone()),
        );
    }

    input_obj.insert(
        "contract_repair".to_string(),
        json!({
            "job_type": job_type,
            "attempt": next_attempt,
            "max_attempts": MAX_CONTRACT_REPAIR_ATTEMPTS,
            "summary": validation_defect_summary(job_type, validation),
            "defects": validation_defects(job_type, validation),
            "existing_design_language_ids": existing_design_language_ids,
            "repair_existing_artifacts": true,
            "do_not_create_duplicates": true,
        }),
    );
    Ok(input)
}

fn validation_needs_repair(validation: &serde_json::Value) -> bool {
    validation
        .get("repair_pending")
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
        || !validation
            .get("validated")
            .and_then(|value| value.as_bool())
            .unwrap_or(true)
        || validation
            .get("defects")
            .and_then(|value| value.as_array())
            .is_some_and(|defects| !defects.is_empty())
}

fn validation_defect_summary(job_type: &str, validation: &serde_json::Value) -> String {
    let messages = validation_defects(job_type, validation)
        .into_iter()
        .filter_map(|defect| {
            defect
                .get("message")
                .and_then(|value| value.as_str())
                .map(str::to_string)
        })
        .collect::<Vec<_>>();
    if messages.is_empty() {
        format!("{job_type} contract validation did not pass")
    } else {
        messages.join("; ")
    }
}

fn validation_defects(job_type: &str, validation: &serde_json::Value) -> Vec<serde_json::Value> {
    if let Some(defects) = validation.get("defects").and_then(|value| value.as_array()) {
        if !defects.is_empty() {
            return defects.clone();
        }
    }

    let mut defects = Vec::new();
    for language_id in string_array_flexible(validation.get("incomplete_language_ids")) {
        defects.push(contract_defect(
            job_type,
            Some(&language_id),
            "DesignLanguage is incomplete and must be repaired before the job can advance",
        ));
    }
    for language_id in string_array_flexible(validation.get("repair_language_ids")) {
        defects.push(contract_defect(
            job_type,
            Some(&language_id),
            "DesignLanguage has repairable artifact defects before publish",
        ));
    }
    if defects.is_empty() {
        defects.push(contract_defect(
            job_type,
            None,
            &format!("{job_type} contract validation did not pass"),
        ));
    }
    defects
}

fn contract_defect(job_type: &str, language_id: Option<&str>, message: &str) -> serde_json::Value {
    let lower = message.to_ascii_lowercase();
    let code = if lower.contains("thumbnail") {
        "missing_or_invalid_thumbnail"
    } else if lower.contains("design_language_ids") || lower.contains("language ids") {
        "missing_design_language_ids"
    } else if lower.contains("direction_ids") || lower.contains("direction ids") {
        "missing_direction_ids"
    } else if lower.contains("repair target") || lower.contains("duplicate") {
        "repair_target_mismatch"
    } else if lower.contains("shadcn") {
        "missing_or_invalid_shadcn_artifacts"
    } else if lower.contains("embodiment") {
        "missing_or_invalid_embodiment"
    } else if lower.contains("composition") || lower.contains("landing_file_id") {
        "missing_or_invalid_compositions"
    } else if lower.contains("design.md") || lower.contains("design_md") {
        "missing_or_invalid_design_md"
    } else if lower.contains("spec sections") || lower.contains("tokens") {
        "missing_or_invalid_spec"
    } else if lower.contains("unfinished tool call") || lower.contains("tool call") {
        "unfinished_typed_completion_tool_call"
    } else {
        "contract_validation_failed"
    };
    json!({
        "job_type": job_type,
        "language_id": language_id.unwrap_or(""),
        "code": code,
        "message": message,
        "repairable": true,
    })
}

fn is_repairable_contract_error(job_type: &str, error: &str) -> bool {
    let lower = error.to_ascii_lowercase();
    is_transient_provider_failure(error)
        || is_repairable_language_artifact_error(error)
        || lower.contains("did not report any design_language_ids")
        || lower.contains("did not report any direction_ids")
        || lower.contains("completed without any design_language_ids")
        || lower.contains("unfinished tool call")
        || (job_type == "quality_review" && lower.contains("without any design_language_ids"))
}

fn typed_success_terminal_action(
    job_type: &str,
    fields: &serde_json::Value,
    fallback: &serde_json::Value,
) -> (&'static str, serde_json::Value) {
    let design_language_ids = fields
        .get("design_language_ids")
        .and_then(|v| v.as_str())
        .unwrap_or("[]");
    let followup_job_id = followup_job_id_from_fallback(fallback);
    match job_type {
        "source_search" => ("PublishResearchCompletion", {
            let synthesize_job_ids = synthesis_job_ids_from_fallback(fallback);
            let effective_followup_job_id = synthesize_job_ids
                .first()
                .cloned()
                .unwrap_or_else(|| followup_job_id.clone());
            json!({
                "followup_job_id": effective_followup_job_id,
                "synthesize_job_ids": json!(synthesize_job_ids).to_string(),
            })
        }),
        "synthesize" => (
            "PublishSynthesisCompletion",
            json!({
                "design_language_ids": design_language_ids,
                "followup_job_id": followup_job_id,
            }),
        ),
        "organize_taxonomy" => ("PublishOrganizationCompletion", json!({})),
        _ => (
            "FinalizeCompletion",
            json!({
                "followup_job_id": followup_job_id,
                "design_language_ids": design_language_ids,
            }),
        ),
    }
}

fn followup_job_id_from_fallback(fallback: &serde_json::Value) -> String {
    fallback
        .as_array()
        .and_then(|actions| {
            actions.iter().find_map(|action| {
                let action_name = action.get("action").and_then(|value| value.as_str())?;
                if matches!(
                    action_name,
                    "created_quality_review_job"
                        | "created_organization_job"
                        | "created_quality_review_job_after_embodiment_repair"
                        | "submitted_next_queued_regeneration"
                ) {
                    action
                        .get("job_id")
                        .and_then(|value| value.as_str())
                        .map(str::to_string)
                } else {
                    None
                }
            })
        })
        .unwrap_or_default()
}

fn synthesis_job_ids_from_fallback(fallback: &serde_json::Value) -> Vec<String> {
    fallback
        .as_array()
        .and_then(|actions| {
            actions.iter().find_map(|action| {
                if action.get("action").and_then(|value| value.as_str())
                    != Some("collected_synthesis_jobs")
                {
                    return None;
                }
                Some(string_array_flexible(action.get("job_ids")))
            })
        })
        .unwrap_or_default()
}

fn verify_typed_completion(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    _job_id: &str,
    job_type: &str,
    fields: &serde_json::Value,
    workspace_id: &str,
) -> Result<serde_json::Value, String> {
    match job_type {
        "synthesize" | "regenerate_embodiment" | "evolve_language" => {
            verify_synthesized_languages(ctx, api_url, headers, fields, job_type, workspace_id)
        }
        "quality_review" => {
            verify_quality_reviewed_languages(ctx, api_url, headers, fields, workspace_id)
        }
        "organize_taxonomy" => Ok(json!({
            "validated": true,
            "job_type": job_type,
            "scope": "taxonomy organization"
        })),
        "source_search" => verify_source_search_completion(fields),
        _ if typed_completion_output_is_unfinished_tool_call(fields) => Err(format!(
            "{job_type} typed completion ended with an unfinished tool call instead of dispatching its typed completion action"
        )),
        _ => Ok(json!({"validated": true, "job_type": job_type})),
    }
}

fn verify_source_search_completion(
    fields: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let direction_ids = parse_json_string_array(fields.get("direction_ids"));
    if direction_ids.is_empty() {
        return Err(
            "source_search typed completion did not report any direction_ids; refusing to advance query without synthesis jobs"
                .to_string(),
        );
    }

    Ok(json!({
        "validated": true,
        "job_type": "source_search",
        "scope": "source metadata and direction fan-out",
        "direction_count": direction_ids.len(),
    }))
}

fn typed_completion_output_is_unfinished_tool_call(fields: &serde_json::Value) -> bool {
    let output = fields
        .get("output")
        .or_else(|| fields.get("Output"))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    if output.is_empty() {
        return false;
    }

    let lower = output.to_ascii_lowercase();
    lower.starts_with("tool call ")
        || lower.starts_with("tool_call ")
        || lower.contains("pending_tool_calls")
}

fn is_repairable_language_artifact_error(error: &str) -> bool {
    let lower = error.to_ascii_lowercase();
    [
        "has no thumbnail_file_id",
        "thumbnail file",
        "has no embodiment_file_id",
        "embodiment file",
        "has no landing_file_id",
        "has no dashboard_file_id",
        "composition file",
        "composition_landing file",
        "composition_dashboard file",
        "missing required compositions",
        "missing required spec sections",
        "missing required native katagami spec sections",
        "deeply empty",
        "deeply empty/incoherent",
        "run synthesize or regenerate_embodiment",
        "expected ready",
        "missing usable metadata",
        "failed to read files",
        "not browser-renderable image bytes",
        "base64 text",
        "mime_type",
        "too small",
        "cannot publish public artifacts without thumbnail_file_id",
    ]
    .iter()
    .any(|needle| lower.contains(needle))
}

fn artifact_repair_attempt(fields: &serde_json::Value) -> i64 {
    parse_json_field(fields.get("input"))
        .as_ref()
        .and_then(|input| {
            input
                .get("artifact_repair_attempt")
                .or_else(|| input.get("repair_attempt"))
        })
        .and_then(|value| {
            value
                .as_i64()
                .or_else(|| value.as_str().and_then(|raw| raw.parse::<i64>().ok()))
        })
        .unwrap_or(0)
}

fn next_artifact_repair_attempt(fields: &serde_json::Value, max_attempts: i64) -> Option<i64> {
    let next = artifact_repair_attempt(fields) + 1;
    (next <= max_attempts).then_some(next)
}

fn verify_synthesized_languages(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
    job_type: &str,
    workspace_id: &str,
) -> Result<serde_json::Value, String> {
    let language_ids = design_language_ids_for_contract_validation(fields);
    if language_ids.is_empty() {
        return Err(format!(
            "{job_type} typed completion did not report any design_language_ids"
        ));
    }
    if let Some(expected_ids) = contract_repair_existing_language_ids(fields) {
        if !same_string_set(&language_ids, &expected_ids) {
            let message = format!(
                "{job_type} repair target mismatch: contract repair requires existing DesignLanguage IDs [{}], but completion reported [{}]. Repair the existing entities instead of creating duplicates.",
                expected_ids.join(", "),
                language_ids.join(", ")
            );
            return Ok(json!({
                "validated": false,
                "job_type": job_type,
                "verified_language_ids": [],
                "incomplete_language_ids": expected_ids,
                "defects": [contract_defect(job_type, None, &message)],
            }));
        }
    }

    let mut verified = Vec::new();
    let mut incomplete = Vec::new();
    let mut defects = Vec::new();
    for language_id in &language_ids {
        let language = match load_entity(ctx, api_url, headers, "DesignLanguages", language_id)? {
            Some(l) => l,
            None => {
                ctx.log(
                    "warn",
                    &format!("verify_synthesized: DesignLanguage '{language_id}' does not exist, skipping"),
                );
                incomplete.push(language_id.clone());
                defects.push(contract_defect(
                    job_type,
                    Some(language_id),
                    &format!("DesignLanguage '{language_id}' does not exist"),
                ));
                continue;
            }
        };
        if matches!(job_type, "synthesize" | "evolve_language") {
            verify_generated_language_identity(language_id, &language)?;
        }
        let durable_defects =
            partial_design_language_contract_defects(job_type, language_id, &language);
        if !durable_defects.is_empty() {
            ctx.log(
                "warn",
                &format!(
                    "{job_type} completion found durable partial DesignLanguage defects for '{language_id}'; returning exact contract defects for same-job repair"
                ),
            );
            incomplete.push(language_id.clone());
            defects.extend(durable_defects);
            continue;
        }
        if let Err(e) = verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language) {
            if is_repairable_language_artifact_error(&e) {
                ctx.log(
                    "warn",
                    &format!(
                        "{job_type} completion found repairable thumbnail/artifact issue for DesignLanguage '{language_id}'; returning contract defect for same-job repair: {e}"
                    ),
                );
                incomplete.push(language_id.clone());
                defects.push(contract_defect(job_type, Some(language_id), &e));
                continue;
            }
            return Err(format!(
                "{job_type} completion requires a valid gallery thumbnail before review: {e}"
            ));
        }
        match verify_language_core(ctx, api_url, headers, language_id, &language) {
            Ok(()) => {
                let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
                    .ok_or_else(|| {
                        format!(
                            "DesignLanguage '{language_id}' disappeared after core verification"
                        )
                    })?;
                verify_compositions(ctx, api_url, headers, workspace_id, language_id, &language)?;
                let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
                    .ok_or_else(|| {
                        format!(
                            "DesignLanguage '{language_id}' disappeared after composition verification"
                        )
                    })?;
                if let Err(e) = verify_synthesis_finalizer_owned_artifacts(
                    ctx,
                    api_url,
                    headers,
                    workspace_id,
                    language_id,
                    &language,
                ) {
                    ctx.log(
                        "warn",
                        &format!(
                            "verify_synthesized: finalizer-owned artifact verification failed for DesignLanguage '{language_id}': {e}"
                        ),
                    );
                    incomplete.push(language_id.clone());
                    defects.push(contract_defect(job_type, Some(language_id), &e));
                    continue;
                }
                let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
                    .ok_or_else(|| {
                        format!(
                            "DesignLanguage '{language_id}' disappeared after deterministic artifact verification"
                        )
                    })?;
                let status = entity_status_value(&language);
                if status == "Draft" {
                    dispatch_action(
                        ctx,
                        api_url,
                        headers,
                        "DesignLanguages",
                        language_id,
                        "SubmitForReview",
                        &json!({}),
                    )?;
                }
                verified.push(language_id.clone());
            }
            Err(e) => {
                // Incomplete languages flow through to quality_review for fixing
                ctx.log(
                    "warn",
                    &format!(
                        "verify_synthesized: {e} — returning contract defect for same-job repair"
                    ),
                );
                incomplete.push(language_id.clone());
                defects.push(contract_defect(job_type, Some(language_id), &e));
            }
        }
    }

    // Fatal only if zero languages exist at all
    if verified.is_empty() && incomplete.is_empty() {
        return Err("synthesis produced language IDs but none of them exist".to_string());
    }

    Ok(json!({
        "validated": verified.len() == language_ids.len() && incomplete.is_empty(),
        "job_type": job_type,
        "verified_language_ids": verified,
        "incomplete_language_ids": incomplete,
        "defects": defects,
    }))
}

fn verify_synthesis_finalizer_owned_artifacts(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), String> {
    verify_design_md(ctx, api_url, headers, workspace_id, language_id, language)?;
    let language =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after DESIGN.md verification")
        })?;
    verify_shadcn_export(ctx, api_url, headers, workspace_id, language_id, &language)?;
    let language =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after shadcn export verification")
        })?;
    verify_shadcn_component_spec(ctx, api_url, headers, workspace_id, language_id, &language)?;
    let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| {
            format!(
                "DesignLanguage '{language_id}' disappeared after shadcn component spec verification"
            )
        })?;
    verify_shadcn_preview_shots(ctx, api_url, headers, workspace_id, language_id, &language)?;
    Ok(())
}

fn verify_generated_language_identity(
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), String> {
    let fields = entity_fields(language);
    let slug = string_field_any(&fields, "slug", "");
    if !slug.is_empty() && slug == language_id {
        return Err(format!(
            "DesignLanguage '{language_id}' uses its slug as the entity ID; synthesize/evolve_language must use the generated entity_id and store '{slug}' only in the slug field"
        ));
    }
    Ok(())
}

fn verify_quality_reviewed_languages(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
    workspace_id: &str,
) -> Result<serde_json::Value, String> {
    let language_ids = design_language_ids_from_job(fields);
    if language_ids.is_empty() {
        return Err("quality_review completed without any design_language_ids".to_string());
    }
    if let Some(expected_ids) = contract_repair_existing_language_ids(fields) {
        if !same_string_set(&language_ids, &expected_ids) {
            let message = format!(
                "quality_review repair target mismatch: contract repair requires existing DesignLanguage IDs [{}], but completion reported [{}]. Repair the existing entities instead of creating duplicates.",
                expected_ids.join(", "),
                language_ids.join(", ")
            );
            return Ok(json!({
                "validated": false,
                "repair_pending": true,
                "job_type": "quality_review",
                "published_language_ids": [],
                "repair_language_ids": expected_ids,
                "defects": [contract_defect("quality_review", None, &message)],
            }));
        }
    }

    let mut published = Vec::new();
    let mut repair_language_ids = Vec::new();
    let mut defects = Vec::new();
    for language_id in &language_ids {
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| format!("DesignLanguage '{language_id}' does not exist"))?;
        let mut status = entity_status_value(&language);
        if !matches!(status.as_str(), "Draft" | "UnderReview" | "Published") {
            return Err(format!(
                "DesignLanguage '{language_id}' is in state '{status}', expected Draft, UnderReview, or Published before quality_review finalization"
            ));
        }

        if let Err(error) = verify_language_core(ctx, api_url, headers, language_id, &language) {
            if is_repairable_language_artifact_error(&error) {
                repair_language_ids.push(language_id.clone());
                defects.push(contract_defect("quality_review", Some(language_id), &error));
                continue;
            }
            return Err(error);
        }
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!("DesignLanguage '{language_id}' disappeared after core verification")
            })?;
        if verify_compositions(ctx, api_url, headers, workspace_id, language_id, &language)?
            && status == "Published"
        {
            status = "UnderReview".to_string();
        }
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!("DesignLanguage '{language_id}' disappeared after composition verification")
            })?;
        if verify_design_md(ctx, api_url, headers, workspace_id, language_id, &language)?
            && status == "Published"
        {
            status = "UnderReview".to_string();
        }
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!("DesignLanguage '{language_id}' disappeared after DESIGN.md verification")
            })?;
        if verify_shadcn_export(ctx, api_url, headers, workspace_id, language_id, &language)?
            && status == "Published"
        {
            status = "UnderReview".to_string();
        }
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!(
                    "DesignLanguage '{language_id}' disappeared after shadcn export verification"
                )
            })?;
        if verify_shadcn_component_spec(
            ctx,
            api_url,
            headers,
            workspace_id,
            language_id,
            &language,
        )? && status == "Published"
        {
            status = "UnderReview".to_string();
        }
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!("DesignLanguage '{language_id}' disappeared after shadcn component spec verification")
            })?;
        if verify_shadcn_preview_shots(ctx, api_url, headers, workspace_id, language_id, &language)?
            && status == "Published"
        {
            status = "UnderReview".to_string();
        }
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!("DesignLanguage '{language_id}' disappeared after shadcn preview-shot verification")
            })?;
        let language = recover_forced_agent_shadsync_artifacts(
            ctx,
            api_url,
            headers,
            workspace_id,
            language_id,
            fields,
            &language,
        )?;
        verify_forced_agent_shadsync_refresh(language_id, fields, &language)?;
        if let Err(error) = verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language)
        {
            if is_repairable_language_artifact_error(&error) {
                repair_language_ids.push(language_id.clone());
                defects.push(contract_defect("quality_review", Some(language_id), &error));
                continue;
            }
            return Err(error);
        }
        publish_public_assets(ctx, api_url, headers, language_id, &language)?;
        ensure_language_under_review(ctx, api_url, headers, language_id, &status)?;
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "MarkQualityPassed",
            &json!({}),
        )?;

        ensure_language_published(ctx, api_url, headers, language_id)?;
        published.push(language_id.clone());
    }

    if !repair_language_ids.is_empty() {
        return Ok(json!({
            "validated": false,
            "repair_pending": true,
            "job_type": "quality_review",
            "published_language_ids": published,
            "repair_language_ids": repair_language_ids,
            "defects": defects,
        }));
    }

    Ok(json!({
        "validated": true,
        "job_type": "quality_review",
        "published_language_ids": published
    }))
}

fn ensure_language_under_review(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    initial_status: &str,
) -> Result<(), String> {
    let status = if initial_status == "Draft" {
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "SubmitForReview",
            &json!({}),
        )?;
        let refreshed = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| {
                format!("DesignLanguage '{language_id}' disappeared after SubmitForReview")
            })?;
        entity_status_value(&refreshed)
    } else {
        initial_status.to_string()
    };

    if !matches!(status.as_str(), "UnderReview" | "Published") {
        return Err(format!(
            "DesignLanguage '{language_id}' remained in state '{status}' after quality finalizer SubmitForReview"
        ));
    }
    Ok(())
}

fn ensure_language_published(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| format!("DesignLanguage '{language_id}' disappeared before Publish"))?;
    let status = entity_status_value(&language);
    if status == "Published" {
        return Ok(());
    }

    if status == "UnderReview" {
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "Publish",
            &json!({}),
        )?;
    }

    let after_publish = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| format!("DesignLanguage '{language_id}' disappeared after Publish"))?;
    if entity_status_value(&after_publish) == "Published" {
        return Ok(());
    }

    match dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Publish",
        &json!({}),
    ) {
        Ok(()) => {}
        Err(error) if publish_rejected_because_already_published(&error) => return Ok(()),
        Err(error) => return Err(error),
    }
    let retried = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| format!("DesignLanguage '{language_id}' disappeared after Publish retry"))?;
    let final_status = entity_status_value(&retried);
    if final_status != "Published" {
        return Err(format!(
            "DesignLanguage '{language_id}' remained in state '{final_status}' after quality finalizer Publish"
        ));
    }
    Ok(())
}

fn publish_rejected_because_already_published(error: &str) -> bool {
    error.contains("Publish")
        && error.contains("not valid from state")
        && error.contains("Published")
}

fn verify_language_core(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), String> {
    let fields = entity_fields(language);
    let mut missing = Vec::new();
    for (bool_name, data_name) in [
        ("has_philosophy", "philosophy"),
        ("has_tokens", "tokens"),
        ("has_rules", "rules"),
        ("has_layout", "layout_principles"),
        ("has_guidance", "guidance"),
    ] {
        if !section_present(&fields, bool_name, data_name) {
            missing.push(bool_name.trim_start_matches("has_").to_string());
        }
    }
    if !missing.is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' is missing required spec sections: {}",
            missing.join(", ")
        ));
    }

    let embodiment_file_id = string_field_any(&fields, "embodiment_file_id", "");
    if embodiment_file_id.is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' has no embodiment_file_id"
        ));
    }
    let embodiment_format = string_field_any(&fields, "embodiment_format", "html");
    verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &embodiment_file_id,
        "embodiment",
        Some(&embodiment_format),
    )?;
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyEmbodiment",
        &json!({}),
    )?;
    Ok(())
}

fn verify_compositions(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Result<bool, String> {
    let mut fields = entity_fields(language);
    let status = entity_status_value(language);
    let mut revised = false;
    let mut landing_file_id = string_field_any(&fields, "landing_file_id", "");
    let mut dashboard_file_id = string_field_any(&fields, "dashboard_file_id", "");
    let landing_invalid = landing_file_id.trim().is_empty()
        || verify_file_value(
            ctx,
            api_url,
            headers,
            language_id,
            &landing_file_id,
            "composition_landing",
            None,
        )
        .is_err();
    let dashboard_invalid = dashboard_file_id.trim().is_empty()
        || verify_file_value(
            ctx,
            api_url,
            headers,
            language_id,
            &dashboard_file_id,
            "composition_dashboard",
            None,
        )
        .is_err();

    if !entity_bool_any(language, "has_compositions")
        || !entity_bool_any(language, "compositions_verified")
        || landing_invalid
        || dashboard_invalid
    {
        let (refreshed_fields, refreshed_landing_file_id, refreshed_dashboard_file_id, did_revise) =
            refresh_composition_projections(
                ctx,
                api_url,
                headers,
                workspace_id,
                language_id,
                &fields,
                &status,
            )?;
        fields = refreshed_fields;
        landing_file_id = refreshed_landing_file_id;
        dashboard_file_id = refreshed_dashboard_file_id;
        revised = revised || did_revise;
    }

    if landing_file_id.trim().is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' has no landing_file_id for required compositions"
        ));
    }
    if dashboard_file_id.trim().is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' has no dashboard_file_id for required compositions"
        ));
    }

    verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &landing_file_id,
        "composition_landing",
        None,
    )?;
    verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &dashboard_file_id,
        "composition_dashboard",
        None,
    )?;

    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyCompositions")
        })?;
    if !entity_bool_any(&fresh, "has_compositions") {
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "AttachCompositions",
            &json!({
                "landing_file_id": landing_file_id,
                "dashboard_file_id": dashboard_file_id,
                "composition_count": string_field_any(&fields, "composition_count", "2")
            }),
        )?;
    }

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyCompositions",
        &json!({}),
    )?;
    Ok(revised)
}

fn refresh_composition_projections(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    fields: &serde_json::Value,
    status: &str,
) -> Result<(serde_json::Value, String, String, bool), String> {
    if workspace_id.is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' is missing required compositions and the CurationJob has no workspace_id"
        ));
    }

    let mut revised = false;
    if status == "Published" {
        revise_published_for_compositions(ctx, api_url, headers, language_id)?;
        revised = true;
    }

    let artifact_workspace_id = design_md_workspace_id(ctx, workspace_id);
    let slug = design_md_slug(language_id, fields);
    let landing = render_landing_composition_projection(language_id, fields);
    let dashboard = render_dashboard_composition_projection(language_id, fields);
    let landing_file_id = write_workspace_file(
        ctx,
        api_url,
        &artifact_workspace_id,
        &format!("/katagami/compositions/{slug}/landing.html"),
        "text/html",
        &landing,
    )?;
    let dashboard_file_id = write_workspace_file(
        ctx,
        api_url,
        &artifact_workspace_id,
        &format!("/katagami/compositions/{slug}/dashboard.html"),
        "text/html",
        &dashboard,
    )?;

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachCompositions",
        &json!({
            "landing_file_id": landing_file_id,
            "dashboard_file_id": dashboard_file_id,
            "composition_count": string_field_any(fields, "composition_count", "2")
        }),
    )?;
    let refreshed = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after AttachCompositions")
        })?;
    let refreshed_fields = entity_fields(&refreshed);
    let refreshed_landing_file_id = string_field_any(&refreshed_fields, "landing_file_id", "");
    let refreshed_dashboard_file_id = string_field_any(&refreshed_fields, "dashboard_file_id", "");
    Ok((
        refreshed_fields,
        refreshed_landing_file_id,
        refreshed_dashboard_file_id,
        revised,
    ))
}

fn revise_published_for_compositions(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Revise",
        &json!({
            "curator_notes": "Refreshing deterministic landing and dashboard composition projections during quality finalization"
        }),
    )
}

fn verify_design_md(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Result<bool, String> {
    let mut fields = entity_fields(language);
    let mut status = entity_status_value(language);
    let mut revised = false;
    let mut design_md_file_id = string_field_any(&fields, "design_md_file_id", "");
    let mut attached_design_md_this_run = false;
    let refresh_reason = design_md_projection_refresh_reason(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        &design_md_file_id,
    );
    if let Some(refresh_reason) = refresh_reason {
        let (refreshed_fields, refreshed_file_id, did_revise) = refresh_design_md_projection(
            ctx,
            api_url,
            headers,
            workspace_id,
            language_id,
            &fields,
            &status,
            refresh_reason,
        )?;
        fields = refreshed_fields;
        design_md_file_id = refreshed_file_id;
        revised = revised || did_revise;
        attached_design_md_this_run = true;
    }
    if let Err(err) = verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &design_md_file_id,
        "design_md",
        None,
    ) {
        let refresh_reason = if err.contains("Failed to read Files") {
            "unreadable_design_md_file"
        } else {
            "invalid_design_md_file"
        };
        let (refreshed_fields, refreshed_file_id, did_revise) = refresh_design_md_projection(
            ctx,
            api_url,
            headers,
            workspace_id,
            language_id,
            &fields,
            &status,
            refresh_reason,
        )?;
        fields = refreshed_fields;
        design_md_file_id = refreshed_file_id;
        revised = revised || did_revise;
        attached_design_md_this_run = true;
        verify_file_value(
            ctx,
            api_url,
            headers,
            language_id,
            &design_md_file_id,
            "design_md",
            None,
        )?;
    }
    verify_design_md_lint_result(language_id, &fields)?;

    // Revise resets has_design_md but leaves design_md_file_id intact.
    // Re-attach if the boolean is false so the Publish guard passes.
    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyDesignMd")
        })?;
    if !attached_design_md_this_run && !entity_bool_any(&fresh, "has_design_md") {
        status = entity_status_value(&fresh);
        if status == "Published" {
            revise_published_for_design_md(ctx, api_url, headers, language_id)?;
            revised = true;
        }
        let lint_result = string_field_any(&fields, "design_md_lint_result", "");
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "AttachDesignMd",
            &json!({
                "design_md_file_id": design_md_file_id,
                "design_md_lint_result": lint_result,
                "design_md_format_version": "alpha"
            }),
        )?;
    }

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyDesignMd",
        &json!({}),
    )?;
    Ok(revised)
}

fn refresh_design_md_projection(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    fields: &serde_json::Value,
    status: &str,
    refresh_reason: &str,
) -> Result<(serde_json::Value, String, bool), String> {
    if workspace_id.is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' needs deterministic DESIGN.md generation ({refresh_reason}) but the CurationJob has no workspace_id"
        ));
    }

    let mut revised = false;
    if status == "Published" {
        revise_published_for_design_md(ctx, api_url, headers, language_id)?;
        revised = true;
    }
    let generated = render_design_md_projection(language_id, fields);
    let artifact_workspace_id = design_md_workspace_id(ctx, workspace_id);
    let generated_file_id = write_workspace_file(
        ctx,
        api_url,
        &artifact_workspace_id,
        &format!(
            "/katagami/design-md/{}/DESIGN.md",
            design_md_slug(language_id, fields)
        ),
        "text/markdown",
        &generated,
    )?;
    let lint_result = json!({
        "summary": {
            "errors": 0,
            "warnings": 0
        },
        "generated_by": "katagami-finalizer",
        "refresh_reason": refresh_reason,
        "checks": [
            "deterministic projection rendered from verified Katagami fields"
        ]
    });
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachDesignMd",
        &json!({
            "design_md_file_id": generated_file_id,
            "design_md_lint_result": lint_result.to_string(),
            "design_md_format_version": "alpha"
        }),
    )?;
    let refreshed = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after AttachDesignMd")
        })?;
    let refreshed_fields = entity_fields(&refreshed);
    let refreshed_file_id = string_field_any(&refreshed_fields, "design_md_file_id", "");
    Ok((refreshed_fields, refreshed_file_id, revised))
}

fn revise_published_for_design_md(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Revise",
        &json!({
            "curator_notes": "Refreshing deterministic DESIGN.md projection during quality finalization"
        }),
    )
}

fn verify_shadcn_export(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Result<bool, String> {
    let mut fields = entity_fields(language);
    let mut status = entity_status_value(language);
    let mut revised = false;
    let mut export_file_id = string_field_any(&fields, "shadcn_export_file_id", "");
    let initial_bools = language
        .get("booleans")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let source_invalidated_export = !bool_field(&initial_bools, "has_shadcn_export");
    if source_invalidated_export
        || shadcn_export_projection_refresh_reason(&fields, &export_file_id).is_some()
    {
        let (refreshed_fields, refreshed_file_id, did_revise) = refresh_shadcn_export_projection(
            ctx,
            api_url,
            headers,
            workspace_id,
            language_id,
            &fields,
            &status,
        )?;
        fields = refreshed_fields;
        export_file_id = refreshed_file_id;
        revised = revised || did_revise;
    }

    if let Err(err) = verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &export_file_id,
        "shadcn_export",
        None,
    ) {
        let (refreshed_fields, refreshed_file_id, did_revise) = refresh_shadcn_export_projection(
            ctx,
            api_url,
            headers,
            workspace_id,
            language_id,
            &fields,
            &status,
        )?;
        fields = refreshed_fields;
        export_file_id = refreshed_file_id;
        revised = revised || did_revise;
        verify_file_value(
            ctx,
            api_url,
            headers,
            language_id,
            &export_file_id,
            "shadcn_export",
            None,
        )
        .map_err(|verify_err| format!("{verify_err}; initial shadcn export error: {err}"))?;
    }

    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyShadcnExport")
        })?;
    let fresh_bools = fresh.get("booleans").cloned().unwrap_or_else(|| json!({}));
    if !bool_field(&fresh_bools, "has_shadcn_export") {
        status = entity_status_value(&fresh);
        if status == "Published" {
            revise_published_for_shadcn_export(ctx, api_url, headers, language_id)?;
            revised = true;
        }
        let manifest = string_field_any(&fields, "shadcn_export_manifest", "{}");
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "AttachShadcnExport",
            &json!({
                "shadcn_export_file_id": export_file_id,
                "shadcn_export_format_version": "registry-theme-v1",
                "shadcn_export_manifest": manifest
            }),
        )?;
    }

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyShadcnExport",
        &json!({}),
    )?;
    Ok(revised)
}

fn refresh_shadcn_export_projection(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    fields: &serde_json::Value,
    status: &str,
) -> Result<(serde_json::Value, String, bool), String> {
    let mut revised = false;
    if status == "Published" {
        revise_published_for_shadcn_export(ctx, api_url, headers, language_id)?;
        revised = true;
    }
    let generated = render_shadcn_export_projection(language_id, fields);
    let artifact_workspace_id = shadcn_export_workspace_id(ctx, workspace_id);
    let generated_file_id = write_workspace_file(
        ctx,
        api_url,
        &artifact_workspace_id,
        &format!(
            "/katagami/shadcn/{}/registry-theme.json",
            design_md_slug(language_id, fields)
        ),
        "application/json",
        &generated,
    )?;
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachShadcnExport",
        &json!({
            "shadcn_export_file_id": generated_file_id,
            "shadcn_export_format_version": "registry-theme-v1",
            "shadcn_export_manifest": render_shadcn_component_manifest().to_string()
        }),
    )?;
    let refreshed = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after AttachShadcnExport")
        })?;
    let refreshed_fields = entity_fields(&refreshed);
    let refreshed_file_id = string_field_any(&refreshed_fields, "shadcn_export_file_id", "");
    Ok((refreshed_fields, refreshed_file_id, revised))
}

fn revise_published_for_shadcn_export(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Revise",
        &json!({
            "curator_notes": "Refreshing deterministic shadcn/ui registry theme projection during quality finalization"
        }),
    )
}

fn verify_shadcn_component_spec(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Result<bool, String> {
    let mut fields = entity_fields(language);
    let mut status = entity_status_value(language);
    let mut revised = false;
    let mut file_id = string_field_any(&fields, "shadcn_component_spec_file_id", "");
    let initial_bools = language
        .get("booleans")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let source_invalidated_component_spec =
        !bool_field(&initial_bools, "has_shadcn_component_spec");
    if source_invalidated_component_spec
        || shadcn_component_spec_projection_refresh_reason(
            ctx,
            api_url,
            headers,
            language_id,
            &fields,
            &file_id,
        )
        .is_some()
    {
        let (refreshed_fields, refreshed_file_id, did_revise) =
            refresh_shadcn_component_spec_projection(
                ctx,
                api_url,
                headers,
                workspace_id,
                language_id,
                &fields,
                &status,
            )?;
        fields = refreshed_fields;
        file_id = refreshed_file_id;
        revised = revised || did_revise;
    }

    if let Err(err) = verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &file_id,
        "shadcn_component_spec",
        None,
    ) {
        let (refreshed_fields, refreshed_file_id, did_revise) =
            refresh_shadcn_component_spec_projection(
                ctx,
                api_url,
                headers,
                workspace_id,
                language_id,
                &fields,
                &status,
            )?;
        fields = refreshed_fields;
        file_id = refreshed_file_id;
        revised = revised || did_revise;
        verify_file_value(
            ctx,
            api_url,
            headers,
            language_id,
            &file_id,
            "shadcn_component_spec",
            None,
        )
        .map_err(|verify_err| {
            format!("{verify_err}; initial shadcn component spec error: {err}")
        })?;
    }

    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyShadcnComponentSpec")
        })?;
    let fresh_bools = fresh.get("booleans").cloned().unwrap_or_else(|| json!({}));
    if !bool_field(&fresh_bools, "has_shadcn_component_spec") {
        status = entity_status_value(&fresh);
        if status == "Published" {
            revise_published_for_shadcn_component_spec(ctx, api_url, headers, language_id)?;
            revised = true;
        }
        let manifest = string_field_any(&fields, "shadcn_component_spec_manifest", "{}");
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "AttachShadcnComponentSpec",
            &json!({
                "shadcn_component_spec_file_id": file_id,
                "shadcn_component_spec_format_version": "component-recipes-v1",
                "shadcn_component_spec_manifest": manifest
            }),
        )?;
    }

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyShadcnComponentSpec",
        &json!({}),
    )?;
    Ok(revised)
}

fn refresh_shadcn_component_spec_projection(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    fields: &serde_json::Value,
    status: &str,
) -> Result<(serde_json::Value, String, bool), String> {
    let mut revised = false;
    if status == "Published" {
        revise_published_for_shadcn_component_spec(ctx, api_url, headers, language_id)?;
        revised = true;
    }
    let generated = render_shadcn_component_spec_projection(language_id, fields);
    let artifact_workspace_id = shadcn_export_workspace_id(ctx, workspace_id);
    let generated_file_id = write_workspace_file(
        ctx,
        api_url,
        &artifact_workspace_id,
        &format!(
            "/katagami/shadcn/{}/components.md",
            design_md_slug(language_id, fields)
        ),
        "text/markdown",
        &generated,
    )?;
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachShadcnComponentSpec",
        &json!({
            "shadcn_component_spec_file_id": generated_file_id,
            "shadcn_component_spec_format_version": "component-recipes-v1",
            "shadcn_component_spec_manifest": render_shadcn_component_spec_manifest().to_string()
        }),
    )?;
    let refreshed = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after AttachShadcnComponentSpec")
        })?;
    let refreshed_fields = entity_fields(&refreshed);
    let refreshed_file_id =
        string_field_any(&refreshed_fields, "shadcn_component_spec_file_id", "");
    Ok((refreshed_fields, refreshed_file_id, revised))
}

fn revise_published_for_shadcn_component_spec(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Revise",
        &json!({
            "curator_notes": "Refreshing shadcn/ui component recipe artifact during quality finalization"
        }),
    )
}

fn verify_shadcn_preview_shots(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Result<bool, String> {
    let mut fields = entity_fields(language);
    let mut status = entity_status_value(language);
    let mut revised = false;
    let mut file_id = string_field_any(&fields, "shadcn_preview_shots_file_id", "");
    let initial_bools = language
        .get("booleans")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let source_invalidated_preview_shots = !bool_field(&initial_bools, "has_shadcn_preview_shots");
    if source_invalidated_preview_shots
        || shadcn_preview_shots_projection_refresh_reason(
            ctx,
            api_url,
            headers,
            language_id,
            &fields,
            &file_id,
        )
        .is_some()
    {
        let (refreshed_fields, refreshed_file_id, did_revise) =
            refresh_shadcn_preview_shots_projection(
                ctx,
                api_url,
                headers,
                workspace_id,
                language_id,
                &fields,
                &status,
            )?;
        fields = refreshed_fields;
        file_id = refreshed_file_id;
        revised = revised || did_revise;
    }

    if let Err(err) = verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &file_id,
        "shadcn_preview_shots",
        None,
    ) {
        let (refreshed_fields, refreshed_file_id, did_revise) =
            refresh_shadcn_preview_shots_projection(
                ctx,
                api_url,
                headers,
                workspace_id,
                language_id,
                &fields,
                &status,
            )?;
        fields = refreshed_fields;
        file_id = refreshed_file_id;
        revised = revised || did_revise;
        verify_file_value(
            ctx,
            api_url,
            headers,
            language_id,
            &file_id,
            "shadcn_preview_shots",
            None,
        )
        .map_err(|verify_err| {
            format!("{verify_err}; initial shadcn preview-shot manifest error: {err}")
        })?;
    }

    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyShadcnPreviewShots")
        })?;
    let fresh_bools = fresh.get("booleans").cloned().unwrap_or_else(|| json!({}));
    if !bool_field(&fresh_bools, "has_shadcn_preview_shots") {
        status = entity_status_value(&fresh);
        if status == "Published" {
            revise_published_for_shadcn_preview_shots(ctx, api_url, headers, language_id)?;
            revised = true;
        }
        let manifest = string_field_any(&fields, "shadcn_preview_shots_manifest", "{}");
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "AttachShadcnPreviewShots",
            &json!({
                "shadcn_preview_shots_file_id": file_id,
                "shadcn_preview_shots_format_version": "preview-shots-v1",
                "shadcn_preview_shots_manifest": manifest
            }),
        )?;
    }

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyShadcnPreviewShots",
        &json!({}),
    )?;
    Ok(revised)
}

fn refresh_shadcn_preview_shots_projection(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    fields: &serde_json::Value,
    status: &str,
) -> Result<(serde_json::Value, String, bool), String> {
    let mut revised = false;
    if status == "Published" {
        revise_published_for_shadcn_preview_shots(ctx, api_url, headers, language_id)?;
        revised = true;
    }
    let generated = render_shadcn_preview_shots_projection(language_id, fields);
    let artifact_workspace_id = shadcn_export_workspace_id(ctx, workspace_id);
    let generated_file_id = write_workspace_file(
        ctx,
        api_url,
        &artifact_workspace_id,
        &format!(
            "/katagami/shadcn/{}/preview-shots.json",
            design_md_slug(language_id, fields)
        ),
        "application/json",
        &generated,
    )?;
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachShadcnPreviewShots",
        &json!({
            "shadcn_preview_shots_file_id": generated_file_id,
            "shadcn_preview_shots_format_version": "preview-shots-v1",
            "shadcn_preview_shots_manifest": render_shadcn_preview_shots_manifest().to_string()
        }),
    )?;
    let refreshed = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
        .ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared after AttachShadcnPreviewShots")
        })?;
    let refreshed_fields = entity_fields(&refreshed);
    let refreshed_file_id = string_field_any(&refreshed_fields, "shadcn_preview_shots_file_id", "");
    Ok((refreshed_fields, refreshed_file_id, revised))
}

fn revise_published_for_shadcn_preview_shots(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Revise",
        &json!({
            "curator_notes": "Refreshing shadcn/ui preview-shot artifact during quality finalization"
        }),
    )
}

fn shadcn_export_workspace_id(ctx: &Context, job_workspace_id: &str) -> String {
    design_md_workspace_id(ctx, job_workspace_id)
}

fn design_md_workspace_id(ctx: &Context, _job_workspace_id: &str) -> String {
    ctx.config
        .get("katagami_artifact_workspace_id")
        .filter(|s| !s.trim().is_empty() && !s.contains("{secret:"))
        .cloned()
        .unwrap_or_else(|| "os-app-docs".to_string())
}

fn revise_published_for_thumbnail(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), String> {
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Revise",
        &json!({
            "curator_notes": "Refreshing verified thumbnail attachment during quality finalization"
        }),
    )
}

fn verify_ready_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    file_id: &str,
    artifact_kind: &str,
) -> Result<serde_json::Value, String> {
    let file = load_entity(ctx, api_url, headers, "Files", file_id)?.ok_or_else(|| {
        format!("DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' does not exist")
    })?;
    let file_status = entity_status_value(&file);
    if file_status != "Ready" {
        if file_status == "Created" {
            if let Some(recovered) = recover_created_file_artifact(
                ctx,
                api_url,
                headers,
                language_id,
                file_id,
                artifact_kind,
                &file,
            )? {
                verify_ready_file_metadata(language_id, file_id, artifact_kind, &recovered)?;
                return Ok(recovered);
            }
        }
        return Err(format!(
            "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' is in state '{file_status}', expected Ready"
        ));
    }

    verify_ready_file_metadata(language_id, file_id, artifact_kind, &file)?;
    Ok(file)
}

fn verify_ready_file_metadata(
    language_id: &str,
    file_id: &str,
    artifact_kind: &str,
    file: &serde_json::Value,
) -> Result<(), String> {
    let file_fields = entity_fields(file);
    let path = first_nonempty(&[
        string_field_any(&file_fields, "path", ""),
        string_field_any(&file_fields, "Path", ""),
    ]);
    let name = first_nonempty(&[
        string_field_any(&file_fields, "name", ""),
        string_field_any(&file_fields, "Name", ""),
    ]);
    let mime_type = first_nonempty(&[
        string_field_any(&file_fields, "mime_type", ""),
        string_field_any(&file_fields, "MimeType", ""),
    ]);
    let size_bytes = numeric_field_any(&file, &["size_bytes", "SizeBytes"]);

    let mut missing = Vec::new();
    if path.trim().is_empty() {
        missing.push("Path");
    }
    if name.trim().is_empty() {
        missing.push("Name");
    }
    if mime_type.trim().is_empty() {
        missing.push("MimeType");
    }
    if size_bytes <= 0 {
        missing.push("SizeBytes");
    }
    if !missing.is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' is Ready but missing usable metadata: {}",
            missing.join(", ")
        ));
    }

    Ok(())
}

fn recover_created_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    file_id: &str,
    artifact_kind: &str,
    file: &serde_json::Value,
) -> Result<Option<serde_json::Value>, String> {
    if artifact_kind != "thumbnail" {
        return Ok(None);
    }
    let file_fields = entity_fields(file);
    let content = first_nonempty(&[
        string_field_any(&file_fields, "content", ""),
        string_field_any(&file_fields, "Content", ""),
    ]);
    if content.trim().is_empty() {
        return Ok(None);
    }
    let mime_type = first_nonempty(&[
        string_field_any(&file_fields, "mime_type", ""),
        string_field_any(&file_fields, "MimeType", ""),
    ]);
    let recovered = recoverable_image_bytes_from_text(&content, &mime_type).map_err(|error| {
        format!(
            "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' is Created with inline Content but cannot be recovered as browser-renderable image bytes: {error}"
        )
    })?;
    let value_headers = vec![
        ("X-Tenant-Id".to_string(), ctx.tenant.clone()),
        ("Content-Type".to_string(), recovered.mime_type.clone()),
        ("x-temper-principal-kind".to_string(), "agent".to_string()),
        (
            "x-temper-principal-id".to_string(),
            "katagami-finalizer".to_string(),
        ),
        ("x-temper-agent-type".to_string(), "system".to_string()),
    ];
    put_file_value_stream(
        &format!("{api_url}/tdata/Files('{file_id}')/$value"),
        &value_headers,
        &recovered.bytes,
    )?;
    let recovered_file =
        load_entity(ctx, api_url, headers, "Files", file_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' disappeared after recovery")
        })?;
    let recovered_status = entity_status_value(&recovered_file);
    if recovered_status != "Ready" {
        return Err(format!(
            "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' remained in state '{recovered_status}' after streaming PUT $value recovery"
        ));
    }
    ctx.log(
        "info",
        &format!(
            "finalize_spawned_session: recovered Created {artifact_kind} file '{file_id}' for DesignLanguage '{language_id}' to Ready using same file id"
        ),
    );
    Ok(Some(recovered_file))
}

fn verify_thumbnail(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), String> {
    let fields = entity_fields(language);
    let thumbnail_file_id = string_field_any(&fields, "thumbnail_file_id", "");
    if thumbnail_file_id.is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' has no thumbnail_file_id"
        ));
    }

    let file = verify_ready_file_artifact(
        ctx,
        api_url,
        headers,
        language_id,
        &thumbnail_file_id,
        "thumbnail",
    )?;
    let file_fields = entity_fields(&file);
    let mime_type = first_nonempty(&[
        string_field_any(&file_fields, "mime_type", ""),
        string_field_any(&file_fields, "MimeType", ""),
    ])
    .to_ascii_lowercase();
    let body = read_file_value(ctx, api_url, headers, &thumbnail_file_id)?;
    if thumbnail_payload_looks_text_encoded_image(&body) {
        return Err(format!(
            "DesignLanguage '{language_id}' thumbnail file '{thumbnail_file_id}' stores base64 text; upload decoded browser-renderable image bytes"
        ));
    }
    if !thumbnail_mime_type_is_acceptable(&mime_type, &body) {
        return Err(format!(
            "DesignLanguage '{language_id}' thumbnail file '{thumbnail_file_id}' has mime_type '{mime_type}', expected image/jpeg or image-like octet-stream payload"
        ));
    }

    let size_bytes = numeric_field_any(&file, &["size_bytes", "SizeBytes"]);
    if size_bytes > 0 && size_bytes < 1024 {
        return Err(format!(
            "DesignLanguage '{language_id}' thumbnail file '{thumbnail_file_id}' is too small ({size_bytes} bytes)"
        ));
    }

    verify_file_body(language_id, &thumbnail_file_id, "thumbnail", None, &body)?;

    Ok(())
}

fn verify_and_mark_thumbnail(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), String> {
    verify_thumbnail(ctx, api_url, headers, language_id, language)?;
    let fields = entity_fields(language);
    let thumbnail_file_id = string_field_any(&fields, "thumbnail_file_id", "");
    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyThumbnail")
        })?;
    if !entity_bool_any(&fresh, "has_thumbnail") {
        let status = entity_status_value(&fresh);
        if status == "Published" {
            revise_published_for_thumbnail(ctx, api_url, headers, language_id)?;
        } else if !matches!(status.as_str(), "Draft" | "UnderReview") {
            return Err(format!(
                "DesignLanguage '{language_id}' is in state '{status}', expected Draft, UnderReview, or Published before thumbnail attachment repair"
            ));
        }
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "AttachVerifiedThumbnail",
            &json!({
                "thumbnail_file_id": thumbnail_file_id
            }),
        )?;
        return Ok(());
    }
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyThumbnail",
        &json!({}),
    )?;
    Ok(())
}

fn publish_public_assets(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), String> {
    let fields = entity_fields(language);
    let thumbnail_file_id = string_field_any(&fields, "thumbnail_file_id", "");
    let embodiment_file_id = string_field_any(&fields, "embodiment_file_id", "");
    let design_md_file_id = string_field_any(&fields, "design_md_file_id", "");
    if thumbnail_file_id.is_empty() || embodiment_file_id.is_empty() || design_md_file_id.is_empty()
    {
        return Err(format!(
            "DesignLanguage '{language_id}' cannot publish public artifacts without thumbnail_file_id, embodiment_file_id, and design_md_file_id"
        ));
    }

    let thumbnail = publish_file_artifact(
        ctx,
        api_url,
        headers,
        language_id,
        &thumbnail_file_id,
        "thumbnail",
    )?;
    let embodiment = publish_file_artifact(
        ctx,
        api_url,
        headers,
        language_id,
        &embodiment_file_id,
        "embodiment",
    )?;
    let design_md = publish_file_artifact(
        ctx,
        api_url,
        headers,
        language_id,
        &design_md_file_id,
        "design_md",
    )?;

    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachPublishedAssets",
        &json!({
            "thumbnail_asset_id": thumbnail.asset_id,
            "thumbnail_asset_url": thumbnail.public_url,
            "embodiment_asset_id": embodiment.asset_id,
            "embodiment_asset_url": embodiment.public_url,
            "design_md_asset_id": design_md.asset_id,
            "design_md_asset_url": design_md.public_url
        }),
    )?;
    Ok(())
}

fn thumbnail_mime_type_is_acceptable(mime_type: &str, body: &str) -> bool {
    let normalized = mime_type.trim().to_ascii_lowercase();
    if thumbnail_payload_looks_text_encoded_image(body) {
        return false;
    }
    matches!(
        normalized.as_str(),
        "image/jpeg" | "image/jpg" | "image/png" | "image/webp" | "image/gif"
    ) || (matches!(
        normalized.as_str(),
        "" | "application/octet-stream" | "text/plain"
    ) && thumbnail_payload_looks_image_like(body))
}

fn thumbnail_payload_looks_image_like(body: &str) -> bool {
    let trimmed = body.trim_start();
    let bytes = trimmed.as_bytes();
    bytes.starts_with(&[0xff, 0xd8, 0xff])
        || bytes.starts_with(b"\x89PNG\r\n\x1a\n")
        || bytes.starts_with(b"GIF87a")
        || bytes.starts_with(b"GIF89a")
        || (bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP")
}

fn thumbnail_payload_looks_text_encoded_image(body: &str) -> bool {
    let trimmed = body.trim_start();
    let payload = if let Some(tail) = base64_data_url_payload(trimmed) {
        tail.trim_start()
    } else {
        trimmed
    };
    let bytes = payload.as_bytes();
    bytes.starts_with(b"/9j/")
        || bytes.starts_with(b"iVBORw0KGgo")
        || bytes.starts_with(b"R0lGOD")
        || bytes.starts_with(b"UklGR")
}

fn base64_data_url_payload(value: &str) -> Option<&str> {
    let lower = value.get(..value.len().min(64))?.to_ascii_lowercase();
    if !lower.starts_with("data:image/") || !lower.contains(";base64,") {
        return None;
    }
    value.split_once(',').map(|(_, payload)| payload)
}

struct RecoverableImageBytes {
    bytes: Vec<u8>,
    mime_type: String,
}

fn recoverable_image_bytes_from_text(
    raw_content: &str,
    declared_mime_type: &str,
) -> Result<RecoverableImageBytes, String> {
    let compact = recoverable_base64_payload(raw_content)
        .ok_or_else(|| "no base64 image payload found".to_string())?;
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(compact.as_bytes())
        .or_else(|_| base64::engine::general_purpose::STANDARD_NO_PAD.decode(compact.as_bytes()))
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(compact.as_bytes()))
        .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(compact.as_bytes()))
        .map_err(|error| format!("invalid base64 image payload: {error}"))?;
    let detected_mime = detect_browser_image_mime(&decoded)
        .ok_or_else(|| "decoded payload is not a supported browser image".to_string())?;
    if let Some(declared) = normalize_browser_image_mime(declared_mime_type) {
        if declared != detected_mime {
            return Err(format!(
                "declared MIME type '{declared}' does not match decoded image bytes '{detected_mime}'"
            ));
        }
    }
    Ok(RecoverableImageBytes {
        bytes: decoded,
        mime_type: detected_mime.to_string(),
    })
}

fn recoverable_base64_payload(raw_content: &str) -> Option<String> {
    let trimmed = raw_content.trim_start();
    let payload = base64_data_url_payload(trimmed).unwrap_or(trimmed);
    let mut compact = String::new();
    for ch in payload.chars() {
        if ch.is_ascii_whitespace() {
            continue;
        }
        if ch.is_ascii_alphanumeric() || matches!(ch, '+' | '/' | '=' | '-' | '_') {
            compact.push(ch);
            continue;
        }
        break;
    }
    if compact.len() < 16 {
        None
    } else {
        Some(compact)
    }
}

fn detect_browser_image_mime(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        Some("image/jpeg")
    } else if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("image/png")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some("image/gif")
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

fn normalize_browser_image_mime(mime_type: &str) -> Option<&'static str> {
    match mime_type.trim().to_ascii_lowercase().as_str() {
        "image/jpeg" | "image/jpg" => Some("image/jpeg"),
        "image/png" => Some("image/png"),
        "image/gif" => Some("image/gif"),
        "image/webp" => Some("image/webp"),
        _ => None,
    }
}

#[cfg(target_arch = "wasm32")]
fn put_file_value_stream(
    url: &str,
    headers: &[(String, String)],
    bytes: &[u8],
) -> Result<(), String> {
    let header_refs: Vec<(&str, &str)> = headers
        .iter()
        .map(|(key, value)| (key.as_str(), value.as_str()))
        .collect::<Vec<_>>();
    let (mut request_body, response_body, response_head) =
        temper_wasm_sdk::http_stream::streaming_call("PUT", url, &header_refs)
            .map_err(|error| format!("streaming PUT $value failed to start: {error}"))?;

    for chunk in bytes.chunks(FILE_UPLOAD_STREAM_CHUNK_BYTES) {
        request_body
            .write_all_chunk(chunk)
            .map_err(|error| format!("streaming PUT $value failed while writing body: {error}"))?;
    }
    request_body
        .finish()
        .map_err(|error| format!("streaming PUT $value failed while closing body: {error}"))?;

    let head = response_head()
        .map_err(|error| format!("streaming PUT $value failed before response: {error}"))?;
    let _ = response_body.close();
    if head.status >= 400 || head.status == 0 {
        let stream_error = head
            .headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case("x-temper-stream-error"))
            .map(|(_, value)| format!(": {value}"))
            .unwrap_or_default();
        return Err(format!(
            "streaming PUT $value failed: HTTP {}{stream_error}",
            head.status
        ));
    }
    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
fn put_file_value_stream(
    _url: &str,
    _headers: &[(String, String)],
    _bytes: &[u8],
) -> Result<(), String> {
    Err("streaming PUT $value requires the Temper WASM host".to_string())
}

fn verify_file_value(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    file_id: &str,
    artifact_kind: &str,
    embodiment_format: Option<&str>,
) -> Result<(), String> {
    verify_ready_file_artifact(ctx, api_url, headers, language_id, file_id, artifact_kind)?;
    let body = read_file_value(ctx, api_url, headers, file_id)?;
    verify_file_body(
        language_id,
        file_id,
        artifact_kind,
        embodiment_format,
        &body,
    )
}

fn verify_file_body(
    language_id: &str,
    file_id: &str,
    artifact_kind: &str,
    embodiment_format: Option<&str>,
    body: &str,
) -> Result<(), String> {
    let trimmed = body.trim();
    if trimmed.len() < 64 {
        return Err(format!(
            "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' is empty or too small"
        ));
    }

    if artifact_kind == "embodiment" {
        let lower = trimmed.to_ascii_lowercase();
        match embodiment_format.unwrap_or("html") {
            "html" if !lower.contains("<html") && !lower.contains("<!doctype") => {
                return Err(format!(
                    "DesignLanguage '{language_id}' embodiment file '{file_id}' is not self-contained HTML"
                ));
            }
            "tsx" if !trimmed.contains("export") && !trimmed.contains("function") => {
                return Err(format!(
                    "DesignLanguage '{language_id}' embodiment file '{file_id}' is not recognizable TSX"
                ));
            }
            _ => {}
        }
    } else if artifact_kind == "design_md"
        && (!trimmed.contains("version:") || !trimmed.contains("components"))
    {
        return Err(format!(
            "DesignLanguage '{language_id}' DESIGN.md file '{file_id}' is missing required design.md front matter"
        ));
    } else if matches!(
        artifact_kind,
        "composition_landing" | "composition_dashboard"
    ) {
        let lower = trimmed.to_ascii_lowercase();
        if !lower.contains("<html") && !lower.contains("<!doctype") {
            return Err(format!(
                "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' is not self-contained HTML"
            ));
        }
        if artifact_kind == "composition_landing" && !trimmed.contains("--hero-image") {
            return Err(format!(
                "DesignLanguage '{language_id}' composition_landing file '{file_id}' is missing required --hero-image projection"
            ));
        }
        if artifact_kind == "composition_dashboard"
            && (!lower.contains("dashboard") || !lower.contains("status"))
        {
            return Err(format!(
                "DesignLanguage '{language_id}' composition_dashboard file '{file_id}' is missing required dashboard/status projection"
            ));
        }
    } else if artifact_kind == "shadcn_export"
        && (!trimmed.contains("\"registry:theme\"")
            || !trimmed.contains("\"cssVars\"")
            || !trimmed.contains("\"componentManifest\""))
    {
        return Err(format!(
            "DesignLanguage '{language_id}' shadcn export file '{file_id}' is missing required registry theme fields"
        ));
    } else if artifact_kind == "shadcn_component_spec"
        && (!trimmed.contains("shadcn/ui Components")
            || !trimmed.contains("ShadSync visual profile")
            || !trimmed.contains("Signature component recipes")
            || !trimmed.contains("Preview shots")
            || !trimmed.contains("button")
            || !trimmed.contains("card")
            || !trimmed.contains("input")
            || !trimmed.contains("tabs"))
    {
        return Err(format!(
            "DesignLanguage '{language_id}' shadcn component spec file '{file_id}' is missing required recipe sections"
        ));
    } else if artifact_kind == "shadcn_preview_shots" {
        let parsed: serde_json::Value = serde_json::from_str(trimmed).map_err(|e| {
            format!(
                "DesignLanguage '{language_id}' shadcn preview-shot file '{file_id}' is invalid JSON: {e}"
            )
        })?;
        let artifact = parsed
            .get("artifact")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        let shots_len = parsed
            .get("shots")
            .and_then(|value| value.as_array())
            .map(|items| items.len())
            .unwrap_or(0);
        let recipes_len = parsed
            .get("componentRecipes")
            .map(|value| {
                value
                    .as_array()
                    .map(|items| items.len())
                    .or_else(|| value.as_object().map(|items| items.len()))
                    .unwrap_or(0)
            })
            .unwrap_or(0);
        let scene_len = parsed
            .get("shots")
            .and_then(|value| value.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter(|item| {
                        item.get("scene")
                            .and_then(|value| value.as_object())
                            .map(|scene| {
                                scene.contains_key("headline")
                                    && scene.contains_key("description")
                                    && (scene.contains_key("rows")
                                        || scene.contains_key("fields")
                                        || scene.contains_key("stats"))
                            })
                            .unwrap_or(false)
                    })
                    .count()
            })
            .unwrap_or(0);
        let has_visual_profile = parsed
            .get("visualProfile")
            .and_then(|value| value.as_object())
            .map(|profile| {
                profile
                    .get("family")
                    .and_then(|value| value.as_str())
                    .map(|value| !value.trim().is_empty())
                    .unwrap_or(false)
                    && profile
                        .get("material")
                        .and_then(|value| value.as_str())
                        .map(|value| !value.trim().is_empty())
                        .unwrap_or(false)
                    && profile
                        .get("contour")
                        .and_then(|value| value.as_str())
                        .map(|value| !value.trim().is_empty())
                        .unwrap_or(false)
                    && profile
                        .get("border")
                        .and_then(|value| value.as_str())
                        .map(|value| !value.trim().is_empty())
                        .unwrap_or(false)
            })
            .unwrap_or(false);
        if artifact != "katagami:shadcn-preview-shots"
            || shots_len < 3
            || scene_len < 3
            || recipes_len < SHADCN_COMPONENTS.len()
            || !has_visual_profile
        {
            return Err(format!(
                "DesignLanguage '{language_id}' shadcn preview-shot file '{file_id}' is missing required renderable scenes, visualProfile, or component recipes"
            ));
        }
    } else if artifact_kind == "thumbnail" {
        let lower = trimmed.to_ascii_lowercase();
        if lower.contains("<html")
            || lower.contains("<!doctype")
            || lower.contains("version:")
            || lower.contains("components:")
            || lower.contains("{\"error\"")
            || thumbnail_payload_looks_text_encoded_image(trimmed)
        {
            return Err(format!(
                "DesignLanguage '{language_id}' thumbnail file '{file_id}' looks like text-encoded image or markup, not browser-renderable image bytes"
            ));
        }
    }

    Ok(())
}

fn write_workspace_file(
    ctx: &Context,
    api_url: &str,
    workspace_id: &str,
    path: &str,
    mime_type: &str,
    content: &str,
) -> Result<String, String> {
    let normalized_path = normalize_pawfs_path(path)?;
    let (dir_path, filename) = split_pawfs_file_path(&normalized_path)?;
    let json_headers = vec![
        ("Content-Type".to_string(), "application/json".to_string()),
        ("X-Tenant-Id".to_string(), ctx.tenant.clone()),
        ("x-temper-principal-kind".to_string(), "agent".to_string()),
        (
            "x-temper-principal-id".to_string(),
            "katagami-finalizer".to_string(),
        ),
        ("x-temper-agent-type".to_string(), "system".to_string()),
    ];

    let dir_id = ensure_pawfs_directory(ctx, api_url, &json_headers, workspace_id, &dir_path)?;
    let file_id = ensure_pawfs_file(
        ctx,
        api_url,
        &json_headers,
        workspace_id,
        &normalized_path,
        &dir_id,
        &filename,
        mime_type,
    )?;

    let value_headers = vec![
        ("X-Tenant-Id".to_string(), ctx.tenant.clone()),
        ("Content-Type".to_string(), mime_type.to_string()),
        ("x-temper-principal-kind".to_string(), "agent".to_string()),
        (
            "x-temper-principal-id".to_string(),
            "katagami-finalizer".to_string(),
        ),
        ("x-temper-agent-type".to_string(), "system".to_string()),
    ];
    let put_resp = ctx.http_call(
        "PUT",
        &format!("{api_url}/tdata/Files('{file_id}')/$value"),
        &value_headers,
        content,
    )?;
    if !(200..300).contains(&put_resp.status) {
        return Err(format!(
            "Failed to upload DESIGN.md file '{file_id}' for '{normalized_path}': HTTP {}: {}",
            put_resp.status,
            truncate_body(&put_resp.body, 300)
        ));
    }

    Ok(file_id)
}

fn ensure_pawfs_directory(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    dir_path: &str,
) -> Result<String, String> {
    let normalized = normalize_pawfs_path(dir_path)?;
    if let Some(existing) = find_pawfs_directory(ctx, api_url, headers, workspace_id, &normalized)?
    {
        return Ok(existing);
    }

    let mut parent_id = match find_pawfs_directory(ctx, api_url, headers, workspace_id, "/")? {
        Some(id) => id,
        None => create_pawfs_directory(ctx, api_url, headers, workspace_id, "/", "/", None)?,
    };
    if normalized == "/" {
        return Ok(parent_id);
    }

    let mut current_path = String::new();
    for segment in normalized.trim_matches('/').split('/') {
        if segment.is_empty() {
            continue;
        }
        current_path.push('/');
        current_path.push_str(segment);
        if let Some(existing) =
            find_pawfs_directory(ctx, api_url, headers, workspace_id, &current_path)?
        {
            parent_id = existing;
            continue;
        }
        parent_id = create_pawfs_directory(
            ctx,
            api_url,
            headers,
            workspace_id,
            segment,
            &current_path,
            Some(&parent_id),
        )?;
    }

    Ok(parent_id)
}

#[allow(clippy::too_many_arguments)]
fn ensure_pawfs_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    file_path: &str,
    directory_id: &str,
    filename: &str,
    mime_type: &str,
) -> Result<String, String> {
    if let Some(existing) = find_pawfs_file(ctx, api_url, headers, workspace_id, file_path)? {
        return Ok(existing);
    }

    let body = json!({
        "Id": pawfs_file_id(workspace_id, file_path),
        "Name": filename,
        "Path": file_path,
        "DirectoryId": directory_id,
        "WorkspaceId": workspace_id,
        "MimeType": mime_type,
    });
    let resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/Files"),
        headers,
        &body.to_string(),
    )?;
    if resp.status == 409 {
        return find_pawfs_file(ctx, api_url, headers, workspace_id, file_path)?
            .ok_or_else(|| format!("File create raced for '{file_path}' but lookup still missed"));
    }
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to create DESIGN.md file '{file_path}' in workspace '{workspace_id}': HTTP {}: {}",
            resp.status,
            truncate_body(&resp.body, 300)
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse File create response for '{file_path}': {e}"))?;
    extract_entity_id(&created)
        .ok_or_else(|| format!("File create for '{file_path}' returned no entity_id"))
}

fn find_pawfs_directory(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    path: &str,
) -> Result<Option<String>, String> {
    let normalized = normalize_pawfs_path(path)?;
    let directory_id = pawfs_directory_id(workspace_id, &normalized);
    let Some(directory) = load_entity(ctx, api_url, headers, "Directories", &directory_id)? else {
        return Ok(None);
    };
    if pawfs_entity_is_archived(&directory) {
        return Ok(None);
    }
    Ok(extract_entity_id(&directory))
}

fn find_pawfs_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    path: &str,
) -> Result<Option<String>, String> {
    let normalized = normalize_pawfs_path(path)?;
    let file_id = pawfs_file_id(workspace_id, &normalized);
    let Some(file) = load_entity(ctx, api_url, headers, "Files", &file_id)? else {
        return Ok(None);
    };
    if pawfs_entity_is_archived(&file) {
        return Ok(None);
    }
    Ok(extract_entity_id(&file))
}

fn create_pawfs_directory(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    name: &str,
    path: &str,
    parent_id: Option<&str>,
) -> Result<String, String> {
    let body = json!({
        "Id": pawfs_directory_id(workspace_id, path),
        "Name": name,
        "Path": path,
        "ParentId": parent_id,
        "WorkspaceId": workspace_id,
    });
    let resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/Directories"),
        headers,
        &body.to_string(),
    )?;
    if resp.status == 409 {
        return find_pawfs_directory(ctx, api_url, headers, workspace_id, path)?
            .ok_or_else(|| format!("Directory create raced for '{path}' but lookup still missed"));
    }
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to create DESIGN.md directory '{path}' in workspace '{workspace_id}': HTTP {}: {}",
            resp.status,
            truncate_body(&resp.body, 300)
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse Directory create response for '{path}': {e}"))?;
    extract_entity_id(&created)
        .ok_or_else(|| format!("Directory create for '{path}' returned no entity_id"))
}

fn normalize_pawfs_path(path: &str) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("PawFS path cannot be empty".to_string());
    }

    let mut segments = Vec::new();
    for segment in trimmed.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                return Err(format!(
                    "PawFS path '{path}' cannot contain parent traversal"
                ))
            }
            _ => segments.push(segment),
        }
    }

    if segments.is_empty() {
        Ok("/".to_string())
    } else {
        Ok(format!("/{}", segments.join("/")))
    }
}

fn split_pawfs_file_path(path: &str) -> Result<(String, String), String> {
    let normalized = normalize_pawfs_path(path)?;
    let (dir, filename) = normalized
        .rsplit_once('/')
        .ok_or_else(|| format!("Invalid PawFS file path '{path}'"))?;
    if filename.is_empty() {
        return Err(format!("PawFS file path '{path}' has no file name"));
    }
    let dir_path = if dir.is_empty() { "/" } else { dir };
    Ok((dir_path.to_string(), filename.to_string()))
}

fn extract_entity_id(entity: &serde_json::Value) -> Option<String> {
    entity
        .get("entity_id")
        .or_else(|| entity.get("Id"))
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
}

fn pawfs_entity_is_archived(entity: &serde_json::Value) -> bool {
    entity_status_value(entity) == "Archived"
}

fn pawfs_stable_hash(parts: &[&str]) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64;
    for part in parts {
        for byte in part.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash ^= 0xff;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn pawfs_directory_id(workspace_id: &str, path: &str) -> String {
    format!("dir-{:016x}", pawfs_stable_hash(&[workspace_id, path]))
}

fn pawfs_file_id(workspace_id: &str, path: &str) -> String {
    format!("fl-{:016x}", pawfs_stable_hash(&[workspace_id, path]))
}

fn truncate_body(body: &str, max_len: usize) -> &str {
    &body[..body.len().min(max_len)]
}

fn render_landing_composition_projection(language_id: &str, fields: &serde_json::Value) -> String {
    let name = first_nonempty(&[
        string_field_any(fields, "name", ""),
        string_field_any(fields, "Name", ""),
        language_id.to_string(),
    ]);
    let slug = design_md_slug(language_id, fields);
    let philosophy = json_object_field(fields, "philosophy");
    let tokens = json_object_field(fields, "tokens");
    let rules = json_object_field(fields, "rules");
    let guidance = json_object_field(fields, "guidance");
    let colors = tokens.get("colors").cloned().unwrap_or_else(|| json!({}));
    let background = color_value(&colors, &["background", "bg", "paper"], "#f8fafc");
    let foreground = color_value(&colors, &["foreground", "text", "ink"], "#111827");
    let surface = color_value(&colors, &["surface", "card"], "#ffffff");
    let primary = color_value(&colors, &["primary", "ink"], "#111827");
    let accent = color_value(&colors, &["accent", "info"], "#2563eb");
    let border = color_value(&colors, &["border", "line"], "#d4d4d8");
    let summary = first_nonempty(&[
        string_path(&philosophy, &["summary"]),
        string_path(&philosophy, &["description"]),
        format!("A Katagami landing composition for {name}."),
    ]);
    let identity = first_nonempty_list(vec![
        string_array_path(&philosophy, &["visual_character"]),
        string_array_path(&rules, &["signature_patterns"]),
    ]);
    let do_rules = string_array_path(&guidance, &["do"]);

    format!(
        r##"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} Landing Composition</title>
  <style>
    :root {{
      --bg: {background};
      --fg: {foreground};
      --surface: {surface};
      --primary: {primary};
      --accent: {accent};
      --border: {border};
      --hero-image: linear-gradient(135deg, color-mix(in srgb, var(--primary) 26%, transparent), transparent 56%), linear-gradient(90deg, color-mix(in srgb, var(--accent) 18%, var(--surface)), var(--bg));
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; color: var(--fg); background: var(--bg); }}
    .page {{ min-height: 100vh; background-image: var(--hero-image); }}
    .nav {{ display: flex; align-items: center; justify-content: space-between; padding: 24px clamp(20px, 5vw, 72px); border-bottom: 1px solid var(--border); }}
    .brand {{ font-weight: 800; letter-spacing: 0; }}
    .hero {{ display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr); gap: clamp(28px, 6vw, 88px); align-items: center; padding: clamp(44px, 8vw, 108px) clamp(20px, 5vw, 72px); }}
    .eyebrow {{ margin: 0 0 16px; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; color: var(--primary); font-weight: 800; }}
    h1 {{ margin: 0; max-width: 880px; font-size: clamp(44px, 6vw, 86px); line-height: .95; letter-spacing: 0; }}
    .summary {{ max-width: 720px; margin: 24px 0 0; font-size: 19px; line-height: 1.6; }}
    .actions {{ display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }}
    .button {{ border: 1px solid var(--primary); background: var(--primary); color: var(--surface); padding: 12px 18px; font-weight: 800; text-decoration: none; }}
    .button.secondary {{ background: transparent; color: var(--fg); border-color: var(--border); }}
    .panel {{ background: color-mix(in srgb, var(--surface) 92%, transparent); border: 1px solid var(--border); padding: 24px; }}
    .panel h2 {{ margin: 0 0 16px; font-size: 20px; }}
    ul {{ margin: 0; padding-left: 20px; line-height: 1.55; }}
    .proof {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--border); margin-top: 28px; border: 1px solid var(--border); }}
    .proof div {{ background: var(--surface); padding: 16px; }}
    .proof strong {{ display: block; font-size: 22px; }}
    @media (max-width: 760px) {{
      .hero {{ grid-template-columns: 1fr; }}
      h1 {{ font-size: 44px; }}
      .proof {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <main class="page" data-language-id="{language_id}" data-slug="{slug}">
    <nav class="nav" aria-label="Primary">
      <div class="brand">{title}</div>
      <a class="button secondary" href="#principles">Principles</a>
    </nav>
    <section class="hero">
      <div>
        <p class="eyebrow">Katagami landing system</p>
        <h1>{title}</h1>
        <p class="summary">{summary}</p>
        <div class="actions">
          <a class="button" href="#principles">Apply language</a>
          <a class="button secondary" href="#proof">Review proof</a>
        </div>
      </div>
      <aside class="panel" id="principles">
        <h2>Visible language cues</h2>
        <ul>{identity_items}</ul>
      </aside>
    </section>
    <section class="proof" id="proof" aria-label="Landing composition proof">
      <div><strong>Hero</strong><span>Uses --hero-image as the first-viewport signal.</span></div>
      <div><strong>Rules</strong><span>{rule_count} source cues represented.</span></div>
      <div><strong>Status</strong><span>Ready for review guard verification.</span></div>
    </section>
    <section class="hero">
      <aside class="panel">
        <h2>Usage guidance</h2>
        <ul>{do_items}</ul>
      </aside>
      <div>
        <p class="eyebrow">Composition role</p>
        <h2>Landing pages expose the language before any dashboard chrome.</h2>
        <p class="summary">This deterministic projection keeps review moving when an agent omits composition files, while preserving the language's source tokens and rules.</p>
      </div>
    </section>
  </main>
</body>
</html>
"##,
        title = html_escape(&name),
        language_id = html_escape(language_id),
        slug = html_escape(&slug),
        background = background,
        foreground = foreground,
        surface = surface,
        primary = primary,
        accent = accent,
        border = border,
        summary = html_escape(&summary),
        identity_items = html_list_items(
            &identity,
            "Use the language philosophy as visible structure."
        ),
        do_items = html_list_items(
            &do_rules,
            "Apply the documented visual character consistently."
        ),
        rule_count = identity.len().max(do_rules.len()).max(1)
    )
}

fn render_dashboard_composition_projection(
    language_id: &str,
    fields: &serde_json::Value,
) -> String {
    let name = first_nonempty(&[
        string_field_any(fields, "name", ""),
        string_field_any(fields, "Name", ""),
        language_id.to_string(),
    ]);
    let slug = design_md_slug(language_id, fields);
    let philosophy = json_object_field(fields, "philosophy");
    let tokens = json_object_field(fields, "tokens");
    let rules = json_object_field(fields, "rules");
    let layout = json_object_field(fields, "layout_principles");
    let colors = tokens.get("colors").cloned().unwrap_or_else(|| json!({}));
    let background = color_value(&colors, &["background", "bg", "paper"], "#f8fafc");
    let foreground = color_value(&colors, &["foreground", "text", "ink"], "#111827");
    let surface = color_value(&colors, &["surface", "card"], "#ffffff");
    let primary = color_value(&colors, &["primary", "ink"], "#111827");
    let accent = color_value(&colors, &["accent", "info"], "#2563eb");
    let border = color_value(&colors, &["border", "line"], "#d4d4d8");
    let summary = first_nonempty(&[
        string_path(&philosophy, &["summary"]),
        format!("A dashboard composition proving {name} in dense product use."),
    ]);
    let patterns = first_nonempty_list(vec![
        string_array_path(&rules, &["signature_patterns"]),
        string_array_path(&philosophy, &["visual_character"]),
    ]);
    let grid_note = first_nonempty(&[
        string_path(&layout, &["grid"]),
        string_path(&layout, &["structure"]),
        "Responsive work surface with stable side navigation and dense review rows.".to_string(),
    ]);

    format!(
        r##"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} Dashboard Composition</title>
  <style>
    :root {{
      --bg: {background};
      --fg: {foreground};
      --surface: {surface};
      --primary: {primary};
      --accent: {accent};
      --border: {border};
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; color: var(--fg); background: var(--bg); }}
    .dashboard {{ min-height: 100vh; display: grid; grid-template-columns: 260px minmax(0, 1fr); }}
    .sidebar {{ border-right: 1px solid var(--border); padding: 24px; background: color-mix(in srgb, var(--surface) 88%, var(--bg)); }}
    .brand {{ font-size: 20px; font-weight: 900; margin-bottom: 28px; }}
    .nav-item {{ display: block; padding: 10px 0; color: var(--fg); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent); }}
    .nav-item[aria-current="page"] {{ color: var(--primary); font-weight: 800; }}
    .main {{ padding: clamp(20px, 4vw, 52px); }}
    .topbar {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 28px; }}
    .eyebrow {{ margin: 0 0 10px; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; font-weight: 800; color: var(--primary); }}
    h1 {{ margin: 0; font-size: clamp(34px, 5vw, 62px); line-height: 1; letter-spacing: 0; }}
    .summary {{ max-width: 760px; margin: 16px 0 0; line-height: 1.6; }}
    .button {{ border: 1px solid var(--primary); background: var(--primary); color: var(--surface); padding: 11px 16px; font-weight: 800; }}
    .metrics {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-bottom: 28px; }}
    .metric {{ background: var(--surface); padding: 18px; }}
    .metric span {{ display: block; color: color-mix(in srgb, var(--fg) 70%, transparent); }}
    .metric strong {{ display: block; margin-top: 8px; font-size: 26px; }}
    .work {{ display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, .8fr); gap: 20px; }}
    .panel {{ background: var(--surface); border: 1px solid var(--border); padding: 20px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
    th, td {{ text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--border); }}
    .status {{ display: inline-flex; border: 1px solid var(--border); padding: 4px 8px; font-weight: 800; color: var(--primary); }}
    ul {{ margin: 0; padding-left: 20px; line-height: 1.55; }}
    @media (max-width: 820px) {{
      .dashboard {{ grid-template-columns: 1fr; }}
      .sidebar {{ border-right: 0; border-bottom: 1px solid var(--border); }}
      .topbar, .work {{ display: block; }}
      .metrics {{ grid-template-columns: 1fr; }}
      .panel {{ margin-top: 16px; }}
    }}
  </style>
</head>
<body>
  <main class="dashboard" data-language-id="{language_id}" data-slug="{slug}">
    <aside class="sidebar">
      <div class="brand">{title}</div>
      <a class="nav-item" aria-current="page" href="#overview">Dashboard</a>
      <a class="nav-item" href="#status">Status</a>
      <a class="nav-item" href="#rules">Rules</a>
    </aside>
    <section class="main">
      <header class="topbar" id="overview">
        <div>
          <p class="eyebrow">Katagami dashboard system</p>
          <h1>{title}</h1>
          <p class="summary">{summary}</p>
        </div>
        <button class="button" type="button">Sync review</button>
      </header>
      <section class="metrics" aria-label="Dashboard status metrics">
        <div class="metric"><span>Composition files</span><strong>2</strong></div>
        <div class="metric"><span>Review status</span><strong>Ready</strong></div>
        <div class="metric"><span>Layout</span><strong>Verified</strong></div>
      </section>
      <section class="work">
        <article class="panel" id="status">
          <h2>Review queue</h2>
          <table>
            <thead><tr><th>Area</th><th>Evidence</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Landing</td><td>Hero signal and source rules</td><td><span class="status">ready</span></td></tr>
              <tr><td>Dashboard</td><td>{grid_note}</td><td><span class="status">ready</span></td></tr>
              <tr><td>Publish guard</td><td>AttachCompositions and VerifyCompositions</td><td><span class="status">ready</span></td></tr>
            </tbody>
          </table>
        </article>
        <aside class="panel" id="rules">
          <h2>Signature rules</h2>
          <ul>{pattern_items}</ul>
        </aside>
      </section>
    </section>
  </main>
</body>
</html>
"##,
        title = html_escape(&name),
        language_id = html_escape(language_id),
        slug = html_escape(&slug),
        background = background,
        foreground = foreground,
        surface = surface,
        primary = primary,
        accent = accent,
        border = border,
        summary = html_escape(&summary),
        grid_note = html_escape(&grid_note),
        pattern_items = html_list_items(
            &patterns,
            "Keep product states dense, legible, and visibly tied to source tokens."
        )
    )
}

fn html_list_items(values: &[String], fallback: &str) -> String {
    let source = if values.is_empty() {
        vec![fallback.to_string()]
    } else {
        values.to_vec()
    };
    source
        .iter()
        .map(|value| format!("<li>{}</li>", html_escape(value)))
        .collect::<Vec<_>>()
        .join("")
}

fn html_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn render_design_md_projection(language_id: &str, fields: &serde_json::Value) -> String {
    let name = first_nonempty(&[
        string_field_any(fields, "name", ""),
        string_field_any(fields, "Name", ""),
        language_id.to_string(),
    ]);
    let slug = design_md_slug(language_id, fields);
    let philosophy = json_object_field(fields, "philosophy");
    let tokens = json_object_field(fields, "tokens");
    let rules = json_object_field(fields, "rules");
    let layout = json_object_field(fields, "layout_principles");
    let guidance = json_object_field(fields, "guidance");
    let tags = json_array_field(fields, "tags");

    let description = first_nonempty(&[
        string_path(&philosophy, &["summary"]),
        string_path(&philosophy, &["description"]),
        format!("Portable DESIGN.md projection for the Katagami language {name}."),
    ]);
    let colors = tokens.get("colors").cloned().unwrap_or_else(|| json!({}));
    let typography = tokens
        .get("typography")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let surfaces = tokens.get("surfaces").cloned().unwrap_or_else(|| json!({}));
    let borders = tokens.get("borders").cloned().unwrap_or_else(|| json!({}));
    let spacing = first_nonempty(&[
        string_path(&tokens, &["spacing", "base"]),
        string_path(&rules, &["density"]),
        "systematic".to_string(),
    ]);
    let rounded = first_nonempty(&[
        string_path(&tokens, &["radius", "default"]),
        string_path(&tokens, &["radii", "default"]),
        "0px".to_string(),
    ]);
    let components = string_array_path(&rules, &["components"]);
    let components = if components.is_empty() {
        vec![
            "buttons".to_string(),
            "cards".to_string(),
            "forms".to_string(),
            "tables".to_string(),
            "navigation".to_string(),
        ]
    } else {
        components
    };

    format!(
        "---\nversion: \"alpha\"\nname: {}\ndescription: {}\ncolors:\n{}typography:\n{}rounded: {}\nspacing: {}\ncomponents:\n{}---\n\n# {}\n\n## Overview\n\n{}\n\n## Colors\n\n{}\n\n## Typography\n\n{}\n\n## Layout\n\n{}\n\n## Elevation & Depth\n\n{}\n\n## Shapes\n\n{}\n\n## Components\n\n{}\n\n## shadcn/ui Usage\n\n{}\n\n## Do's and Don'ts\n\n### Do\n{}\n\n### Don't\n{}\n\n## Visual Character\n{}\n\n## Signature Patterns\n{}\n\n## Tags\n{}\n",
        yaml_quote(&name),
        yaml_quote(&description),
        yaml_map_block(&colors, 2),
        yaml_map_block(&typography, 2),
        yaml_quote(&rounded),
        yaml_quote(&spacing),
        yaml_list_block(&components, 2),
        name,
        markdown_text(&description),
        markdown_json_or_text(&colors),
        markdown_json_or_text(&typography),
        markdown_json_or_text(&layout),
        markdown_json_or_text(&surfaces),
        markdown_json_or_text(&borders),
        markdown_list_or_fallback(&components, "Use the language tokens and rules across standard UI components."),
        markdown_shadcn_usage(),
        markdown_list_or_fallback(
            &string_array_path(&guidance, &["do"]),
            "Apply the documented visual character consistently."
        ),
        markdown_list_or_fallback(
            &string_array_path(&guidance, &["dont"]),
            "Do not replace the language with generic UI defaults."
        ),
        markdown_list_or_fallback(
            &string_array_path(&philosophy, &["visual_character"]),
            "Use the language philosophy as the visual character source."
        ),
        markdown_list_or_fallback(
            &string_array_path(&rules, &["signature_patterns"]),
            "Project the signature rules into visible interface structure."
        ),
        markdown_list_or_fallback(&tags, &slug),
    )
}

const SHADCN_COMPONENTS: &[&str] = &[
    "button",
    "card",
    "input",
    "textarea",
    "select",
    "dialog",
    "sheet",
    "tabs",
    "badge",
    "separator",
    "checkbox",
    "switch",
    "slider",
    "tooltip",
    "dropdown-menu",
    "table",
];

fn markdown_shadcn_usage() -> String {
    let components = SHADCN_COMPONENTS
        .iter()
        .map(|component| format!("- {component}"))
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "Use shadcn/ui primitives as the component baseline, then apply this Katagami-generated theme through CSS variables.\n\nInstall recommended primitives with `{}`.\n\nRecommended primitives:\n{}",
        shadcn_install_command(),
        components
    )
}

fn render_shadcn_export_projection(language_id: &str, fields: &serde_json::Value) -> String {
    let name = first_nonempty(&[
        string_field_any(fields, "name", ""),
        string_field_any(fields, "Name", ""),
        language_id.to_string(),
    ]);
    let slug = design_md_slug(language_id, fields);
    let tokens = json_object_field(fields, "tokens");
    let light = shadcn_light_vars(&tokens);
    let dark = shadcn_dark_vars(&tokens, &light);
    let registry = json!({
        "$schema": "https://ui.shadcn.com/schema/registry-item.json",
        "name": slug,
        "type": "registry:theme",
        "title": format!("{name} shadcn Theme"),
        "cssVars": {
            "theme": {},
            "light": light,
            "dark": dark
        },
        "meta": {
            "source": "katagami",
            "languageId": language_id,
            "slug": slug,
            "componentManifest": SHADCN_COMPONENTS,
            "installCommand": shadcn_install_command(),
            "nativeTokenNames": native_token_names(&tokens)
        }
    });
    serde_json::to_string_pretty(&registry).unwrap_or_else(|_| "{}".to_string()) + "\n"
}

fn render_shadcn_component_manifest() -> serde_json::Value {
    json!({
        "components": SHADCN_COMPONENTS,
        "installCommand": shadcn_install_command(),
        "artifact": "registry:theme"
    })
}

fn render_shadcn_component_spec_projection(
    language_id: &str,
    fields: &serde_json::Value,
) -> String {
    let name = first_nonempty(&[
        string_field_any(fields, "name", ""),
        string_field_any(fields, "Name", ""),
        language_id.to_string(),
    ]);
    let slug = design_md_slug(language_id, fields);
    let philosophy = json_object_field(fields, "philosophy");
    let rules = json_object_field(fields, "rules");
    let layout = json_object_field(fields, "layout_principles");
    let tokens = json_object_field(fields, "tokens");
    let guidance = json_object_field(fields, "guidance");
    let summary = first_nonempty(&[
        string_path(&philosophy, &["summary"]),
        format!("shadcn/ui component recipes for the Katagami language {name}."),
    ]);
    let visual_character = string_array_path(&philosophy, &["visual_character"]);
    let signature_patterns = string_array_path(&rules, &["signature_patterns"]);
    let do_rules = string_array_path(&guidance, &["do"]);
    let dont_rules = string_array_path(&guidance, &["dont"]);
    let colors = tokens.get("colors").cloned().unwrap_or_else(|| json!({}));
    let typography = tokens
        .get("typography")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let visual_profile = render_shadsync_visual_profile(fields);

    format!(
        "# {} shadcn/ui Components\n\nArtifact: `component-recipes-v1`\nAuthor: `katagami-agent`\nGenerated By: `katagami-agent`\nRequires Visual Profile: `true`\nLanguage ID: `{}`\nSlug: `{}`\n\n## Intent\n\n{}\n\n## Required primitives\n\n{}\n\nInstall with `{}`.\n\n## Token cues\n\nColors:\n\n{}\n\nTypography:\n\n{}\n\n## ShadSync visual profile\n\n{}\n\n## Visual character to preserve\n\n{}\n\n## Signature component recipes\n\n### Button\nUse `Button` for primary, secondary, outline, and ghost actions. Primary actions must expose the language's strongest contrast pair, while secondary and ghost actions should preserve the surface treatment instead of falling back to default neutral SaaS styling.\n\n### Card\nUse `Card`, `CardHeader`, `CardContent`, `CardFooter`, and `CardAction` as the main composition frame. Cards should demonstrate the language's surface, border, hierarchy, and density rules rather than appearing as generic rounded rectangles.\n\n### Input and Textarea\nUse `Input` and `Textarea` with visible focus rings, field labels, validation states, and the language's rhythm. Forms should show real product content, not placeholder-only controls.\n\n### Select, Tabs, and Table\nUse `Select`, `Tabs`, and `Table` to prove navigation, filtering, and dense data states. The table should show row rhythm, separators, hover/focus states, and an empty or status state when the language calls for it.\n\n### Dialog and Sheet\nUse `Dialog` for centered decisions and `Sheet` for contextual editing. Both should inherit the language's spacing, border, overlay, and motion rules.\n\n## Preview shots\n\n- `application-shell`: dashboard or workspace shell with navigation, cards, forms, and state badges.\n- `detail-editor`: focused editing flow using input, textarea, select, switch/checkbox, dialog or sheet, and action buttons.\n- `data-operations`: table-heavy operational view with tabs, dropdown menu affordances, badges, and destructive/empty states.\n- Each preview shot must include a renderable `scene` payload with concrete headline, description, actions, and rows/fields/stats for the UI preview.\n\n## Implementation contract\n\n- Start from local `ui/src/components/ui` shadcn-style primitives; do not create a second component system.\n- Apply `/katagami/shadcn/{}/registry-theme.json` variables, then use these recipes for composition and state design.\n- Preserve Katagami token names as source metadata; shadcn semantic names are only the export surface.\n- Do: {}\n- Do not: {}\n\n## Layout notes\n\n{}\n",
        name,
        language_id,
        slug,
        markdown_text(&summary),
        markdown_list_or_fallback(
            &SHADCN_COMPONENTS
                .iter()
                .map(|component| component.to_string())
                .collect::<Vec<_>>(),
            "Use the core shadcn/ui primitives."
        ),
        shadcn_install_command(),
        markdown_json_or_text(&colors),
        markdown_json_or_text(&typography),
        markdown_json_or_text(&visual_profile),
        markdown_list_or_fallback(
            &first_nonempty_list(vec![visual_character, signature_patterns.clone()]),
            "Make the source language's structural identity visible in every component state."
        ),
        slug,
        markdown_inline_list(&do_rules, "follow the Katagami source guidance"),
        markdown_inline_list(&dont_rules, "do not collapse the language into generic defaults"),
        markdown_json_or_text(&layout)
    )
}

fn render_shadcn_component_spec_manifest() -> serde_json::Value {
    json!({
        "artifact": "katagami:shadcn-component-recipes",
        "version": "component-recipes-v1",
        "author": "katagami-agent",
        "generatedBy": "katagami-agent",
        "generator": "katagami-finalizer-projection",
        "components": SHADCN_COMPONENTS,
        "installCommand": shadcn_install_command(),
        "requiresVisualProfile": true,
        "requiredSections": [
            "Intent",
            "Required primitives",
            "ShadSync visual profile",
            "Signature component recipes",
            "Preview shots",
            "Implementation contract"
        ]
    })
}

fn render_shadsync_visual_profile(fields: &serde_json::Value) -> serde_json::Value {
    let philosophy = json_object_field(fields, "philosophy");
    let rules = json_object_field(fields, "rules");
    let visual_character = string_array_path(&philosophy, &["visual_character"]);
    let signature_patterns = string_array_path(&rules, &["signature_patterns"]);
    let identity_notes = first_nonempty_list(vec![visual_character, signature_patterns]);
    let identity_text = identity_notes.join(" ").to_ascii_lowercase();
    let is_paper = [
        "paper", "collage", "washi", "sticker", "scrap", "torn", "grain",
    ]
    .iter()
    .any(|needle| identity_text.contains(needle));
    let is_brutalist = ["brutalist", "industrial", "terminal", "mechanical"]
        .iter()
        .any(|needle| identity_text.contains(needle));
    let is_editorial = ["editorial", "magazine", "folio", "serif"]
        .iter()
        .any(|needle| identity_text.contains(needle));

    json!({
        "family": if is_paper { "paper-collage" } else if is_brutalist { "brutalist" } else if is_editorial { "editorial" } else { "system" },
        "material": if is_paper { "paper" } else if is_brutalist { "ink" } else { "flat" },
        "contour": if identity_text.contains("blob") || identity_text.contains("scallop") || identity_text.contains("irregular") { "blob" } else if identity_text.contains("pebble") || identity_text.contains("pill") { "pebble" } else { "default" },
        "border": if identity_text.contains("dashed") || identity_text.contains("hand-drawn") || identity_text.contains("pencil") || identity_text.contains("stitched") { "dashed" } else { "solid" },
        "underlay": identity_text.contains("underlay") || identity_text.contains("offset") || identity_text.contains("layered"),
        "grain": identity_text.contains("grain") || identity_text.contains("texture") || identity_text.contains("paper") || identity_text.contains("washi"),
        "stickerBadges": identity_text.contains("sticker") || identity_text.contains("stamp") || identity_text.contains("ribbon") || identity_text.contains("badge"),
        "motion": if identity_text.contains("rotate") || identity_text.contains("tilt") { "lift-rotate" } else if identity_text.contains("lift") || identity_text.contains("spring") || identity_text.contains("hop") { "lift" } else { "still" },
        "density": if identity_text.contains("dense") || identity_text.contains("compact") || identity_text.contains("ledger") { "dense" } else if identity_text.contains("airy") || identity_text.contains("roomy") { "airy" } else { "balanced" },
        "accents": ["primary", "accent", "secondary", "muted"]
    })
}

fn render_shadcn_preview_shots_projection(language_id: &str, fields: &serde_json::Value) -> String {
    let name = first_nonempty(&[
        string_field_any(fields, "name", ""),
        string_field_any(fields, "Name", ""),
        language_id.to_string(),
    ]);
    let slug = design_md_slug(language_id, fields);
    let philosophy = json_object_field(fields, "philosophy");
    let rules = json_object_field(fields, "rules");
    let guidance = json_object_field(fields, "guidance");
    let visual_character = string_array_path(&philosophy, &["visual_character"]);
    let signature_patterns = string_array_path(&rules, &["signature_patterns"]);
    let do_rules = string_array_path(&guidance, &["do"]);
    let dont_rules = string_array_path(&guidance, &["dont"]);
    let identity_notes = first_nonempty_list(vec![visual_character, signature_patterns]);
    let identity_text = identity_notes.join(" ").to_ascii_lowercase();
    let is_paper = [
        "paper", "collage", "washi", "sticker", "scrap", "torn", "grain",
    ]
    .iter()
    .any(|needle| identity_text.contains(needle));
    let is_brutalist = ["brutalist", "industrial", "terminal", "mechanical"]
        .iter()
        .any(|needle| identity_text.contains(needle));
    let is_editorial = ["editorial", "magazine", "folio", "serif"]
        .iter()
        .any(|needle| identity_text.contains(needle));
    let visual_profile = json!({
        "family": if is_paper { "paper-collage" } else if is_brutalist { "brutalist" } else if is_editorial { "editorial" } else { "system" },
        "material": if is_paper { "paper" } else if is_brutalist { "ink" } else { "flat" },
        "contour": if identity_text.contains("blob") || identity_text.contains("scallop") || identity_text.contains("irregular") { "blob" } else if identity_text.contains("pebble") || identity_text.contains("pill") { "pebble" } else { "default" },
        "border": if identity_text.contains("dashed") || identity_text.contains("hand-drawn") || identity_text.contains("pencil") || identity_text.contains("stitched") { "dashed" } else { "solid" },
        "underlay": identity_text.contains("underlay") || identity_text.contains("offset") || identity_text.contains("layered"),
        "grain": identity_text.contains("grain") || identity_text.contains("texture") || identity_text.contains("paper") || identity_text.contains("washi"),
        "stickerBadges": identity_text.contains("sticker") || identity_text.contains("stamp") || identity_text.contains("ribbon") || identity_text.contains("badge"),
        "motion": if identity_text.contains("rotate") || identity_text.contains("tilt") { "lift-rotate" } else if identity_text.contains("lift") || identity_text.contains("spring") || identity_text.contains("hop") { "lift" } else { "still" },
        "density": if identity_text.contains("dense") || identity_text.contains("compact") || identity_text.contains("ledger") { "dense" } else if identity_text.contains("airy") || identity_text.contains("roomy") { "airy" } else { "balanced" },
        "accents": ["primary", "accent", "secondary", "muted"]
    });
    let application_headline = format!("{name} launch room");

    let manifest = json!({
        "artifact": "katagami:shadcn-preview-shots",
        "version": "preview-shots-v1",
        "author": "katagami-agent",
        "generatedBy": "katagami-agent",
        "requiresVisualProfile": true,
        "schema": "katagami:shadcn-preview-shots/renderable-v1",
        "renderable": true,
        "language": {
            "id": language_id,
            "name": name,
            "slug": slug
        },
        "installCommand": shadcn_install_command(),
        "primitives": SHADCN_COMPONENTS,
        "identityNotes": identity_notes,
        "visualProfile": visual_profile,
        "shots": [
            {
                "id": "application-shell",
                "title": "Application shell",
                "viewport": "desktop",
                "primitives": ["button", "card", "input", "select", "tabs", "badge", "separator", "table"],
                "composition": "A real product workspace with navigation, summary cards, filtering controls, and one dense content region.",
                "mustShow": ["primary and secondary actions", "card hierarchy", "filterable state", "table or list density"],
                "avoid": ["component inventory walls", "placeholder-only content", "generic rounded SaaS chrome"],
                "scene": {
                    "eyebrow": "workspace spread",
                    "headline": application_headline,
                    "description": "A product team workspace where navigation, filters, metrics, and dense rows carry the language's visible structure.",
                    "primaryAction": "Apply theme",
                    "secondaryAction": "Review states",
                    "stats": [
                        {"label": "components", "value": "16", "tone": "accent"},
                        {"label": "states", "value": "ready"},
                        {"label": "density", "value": "balanced", "tone": "warning"}
                    ],
                    "rows": [
                        {"label": "Primary flow", "value": "mapped", "status": "active"},
                        {"label": "Token coverage", "value": "semantic", "status": "synced"},
                        {"label": "Responsive proof", "value": "queued", "status": "review"}
                    ],
                    "statuses": ["Active", "Synced", "Draft"]
                }
            },
            {
                "id": "detail-editor",
                "title": "Detail editor",
                "viewport": "tablet",
                "primitives": ["button", "card", "input", "textarea", "select", "checkbox", "switch", "slider", "dialog", "sheet"],
                "composition": "A focused editing flow with form fields, validation, confirmation, and a contextual side panel.",
                "mustShow": ["focus ring", "error or destructive state", "dialog or sheet treatment", "written guidance content"],
                "avoid": ["unstyled browser controls", "floating cards inside cards", "missing labels"],
                "scene": {
                    "eyebrow": "editing flow",
                    "headline": "Language recipe editor",
                    "description": "A focused form proving labels, validation, toggles, panel rhythm, and action hierarchy.",
                    "primaryAction": "Save recipe",
                    "secondaryAction": "Open sheet",
                    "fields": [
                        {"label": "Component family", "value": "Narrative cards"},
                        {"label": "State treatment", "value": "Visible focus + validation"},
                        {"label": "Motion", "value": "Small lift, no opacity-only fade"}
                    ],
                    "statuses": ["Focus", "Invalid", "Confirmed"]
                }
            },
            {
                "id": "data-operations",
                "title": "Data operations",
                "viewport": "mobile",
                "primitives": ["button", "tabs", "badge", "dropdown-menu", "table", "tooltip", "separator"],
                "composition": "A compact operational view proving row rhythm, stacked actions, menu states, badges, and empty/destructive states.",
                "mustShow": ["responsive reflow", "dense row styling", "menu affordance", "status badge system"],
                "avoid": ["desktop-only tables", "text overflow", "default shadcn spacing without Katagami character"],
                "scene": {
                    "eyebrow": "operations",
                    "headline": "Compact review queue",
                    "description": "A narrow viewport scene with rows, menus, tooltips, badges, and destructive affordances.",
                    "primaryAction": "Resolve",
                    "secondaryAction": "Filter",
                    "rows": [
                        {"label": "Button hierarchy", "value": "approved", "status": "ok"},
                        {"label": "Table rhythm", "value": "needs pass", "status": "watch"},
                        {"label": "Empty state", "value": "designed", "status": "done"}
                    ],
                    "statuses": ["Queued", "Blocked", "Done"]
                }
            }
        ],
        "componentRecipes": [
            {"primitive": "button", "intent": "Prove action hierarchy, focus, disabled, and destructive states."},
            {"primitive": "card", "intent": "Carry the language surface, border, elevation, and density rules."},
            {"primitive": "input", "intent": "Show labels, focus rings, validation, and spacing rhythm."},
            {"primitive": "textarea", "intent": "Show longer guidance, validation copy, and writing density."},
            {"primitive": "select", "intent": "Show filtering, selection contrast, and menu trigger styling."},
            {"primitive": "dialog", "intent": "Show centered decision states and overlay treatment."},
            {"primitive": "sheet", "intent": "Show contextual side panels and responsive editing."},
            {"primitive": "tabs", "intent": "Show navigational structure and active/inactive contrast."},
            {"primitive": "badge", "intent": "Show compact status vocabulary and semantic colors."},
            {"primitive": "separator", "intent": "Show section rhythm without generic gray dividers."},
            {"primitive": "checkbox", "intent": "Show binary selection with visible focus and checked states."},
            {"primitive": "switch", "intent": "Show settings toggles and on/off contrast."},
            {"primitive": "slider", "intent": "Show numeric adjustment with track/thumb styling."},
            {"primitive": "tooltip", "intent": "Show concise explanation styling above compact controls."},
            {"primitive": "dropdown-menu", "intent": "Show action menus, destructive items, and grouped choices."},
            {"primitive": "table", "intent": "Show dense operational data, separators, row states, and responsive behavior."}
        ],
        "qualityRules": {
            "do": do_rules,
            "dont": dont_rules
        }
    });
    serde_json::to_string_pretty(&manifest).unwrap_or_else(|_| "{}".to_string()) + "\n"
}

fn render_shadcn_preview_shots_manifest() -> serde_json::Value {
    json!({
        "artifact": "katagami:shadcn-preview-shots",
        "version": "preview-shots-v1",
        "author": "katagami-agent",
        "generatedBy": "katagami-agent",
        "generator": "katagami-finalizer-projection",
        "schema": "katagami:shadcn-preview-shots/renderable-v1",
        "renderable": true,
        "requiresVisualProfile": true,
        "shotIds": ["application-shell", "detail-editor", "data-operations"],
        "components": SHADCN_COMPONENTS
    })
}

fn shadcn_install_command() -> String {
    format!("npx shadcn@latest add {}", SHADCN_COMPONENTS.join(" "))
}

fn shadcn_light_vars(tokens: &serde_json::Value) -> serde_json::Value {
    let colors = tokens.get("colors").cloned().unwrap_or_else(|| json!({}));
    let background = color_value(&colors, &["background", "bg"], "#ffffff");
    let foreground = color_value(&colors, &["foreground", "text", "ink"], "#111111");
    let surface = color_value(&colors, &["surface", "card"], &background);
    let primary = color_value(&colors, &["primary"], &foreground);
    let secondary = color_value(&colors, &["secondary"], "#f4f4f5");
    let muted = color_value(&colors, &["muted"], "#f4f4f5");
    let accent = color_value(&colors, &["accent", "info"], &primary);
    let destructive = color_value(&colors, &["destructive", "error"], "#dc2626");
    let border = color_value(&colors, &["border"], "#e4e4e7");
    let success = color_value(&colors, &["success"], "#16a34a");
    let warning = color_value(&colors, &["warning"], "#d97706");
    let info = color_value(&colors, &["info"], &accent);
    let radius = shadcn_radius(tokens);

    json!({
        "background": background,
        "foreground": foreground,
        "card": surface,
        "card-foreground": foreground,
        "popover": surface,
        "popover-foreground": foreground,
        "primary": primary,
        "primary-foreground": readable_text_color(&primary, "#ffffff"),
        "secondary": secondary,
        "secondary-foreground": readable_text_color(&secondary, &foreground),
        "muted": muted,
        "muted-foreground": color_value(&colors, &["muted_foreground", "muted-foreground", "text_secondary"], &foreground),
        "accent": accent,
        "accent-foreground": readable_text_color(&accent, &foreground),
        "destructive": destructive,
        "border": border,
        "input": color_value(&colors, &["input"], &border),
        "ring": color_value(&colors, &["ring"], &accent),
        "chart-1": primary,
        "chart-2": secondary,
        "chart-3": accent,
        "chart-4": success,
        "chart-5": warning,
        "sidebar": color_value(&colors, &["sidebar"], &surface),
        "sidebar-foreground": foreground,
        "sidebar-primary": primary,
        "sidebar-primary-foreground": readable_text_color(&primary, "#ffffff"),
        "sidebar-accent": info,
        "sidebar-accent-foreground": readable_text_color(&info, &foreground),
        "sidebar-border": border,
        "sidebar-ring": color_value(&colors, &["sidebar_ring", "sidebar-ring"], &accent),
        "radius": radius
    })
}

fn shadcn_dark_vars(tokens: &serde_json::Value, light: &serde_json::Value) -> serde_json::Value {
    let dark_colors = tokens
        .get("dark_colors")
        .or_else(|| tokens.get("colors_dark"))
        .cloned()
        .or_else(|| {
            tokens
                .get("dark")
                .and_then(|dark| dark.get("colors"))
                .cloned()
        })
        .filter(|value| value.is_object())
        .unwrap_or_else(|| json!({}));

    if dark_colors
        .as_object()
        .map(|m| !m.is_empty())
        .unwrap_or(false)
    {
        let mut dark_tokens = tokens.clone();
        if let Some(obj) = dark_tokens.as_object_mut() {
            obj.insert("colors".to_string(), dark_colors);
        }
        let mut dark = shadcn_light_vars(&dark_tokens);
        if let Some(obj) = dark.as_object_mut() {
            obj.insert(
                "radius".to_string(),
                light
                    .get("radius")
                    .cloned()
                    .unwrap_or_else(|| json!("0.625rem")),
            );
        }
        return dark;
    }

    let primary = light
        .get("primary")
        .and_then(|v| v.as_str())
        .unwrap_or("#f8fafc");
    let accent = light
        .get("accent")
        .and_then(|v| v.as_str())
        .unwrap_or(primary);
    let destructive = light
        .get("destructive")
        .and_then(|v| v.as_str())
        .unwrap_or("#dc2626");
    let radius = light
        .get("radius")
        .cloned()
        .unwrap_or_else(|| json!("0.625rem"));

    json!({
        "background": "#0f1115",
        "foreground": "#f8fafc",
        "card": "#181b22",
        "card-foreground": "#f8fafc",
        "popover": "#181b22",
        "popover-foreground": "#f8fafc",
        "primary": primary,
        "primary-foreground": readable_text_color(primary, "#0f1115"),
        "secondary": "#252a33",
        "secondary-foreground": "#f8fafc",
        "muted": "#252a33",
        "muted-foreground": "#a1a1aa",
        "accent": accent,
        "accent-foreground": readable_text_color(accent, "#0f1115"),
        "destructive": destructive,
        "border": "#303642",
        "input": "#303642",
        "ring": accent,
        "chart-1": light.get("chart-1").cloned().unwrap_or_else(|| json!(primary)),
        "chart-2": light.get("chart-2").cloned().unwrap_or_else(|| json!("#252a33")),
        "chart-3": light.get("chart-3").cloned().unwrap_or_else(|| json!(accent)),
        "chart-4": light.get("chart-4").cloned().unwrap_or_else(|| json!("#16a34a")),
        "chart-5": light.get("chart-5").cloned().unwrap_or_else(|| json!("#d97706")),
        "sidebar": "#181b22",
        "sidebar-foreground": "#f8fafc",
        "sidebar-primary": primary,
        "sidebar-primary-foreground": readable_text_color(primary, "#0f1115"),
        "sidebar-accent": accent,
        "sidebar-accent-foreground": readable_text_color(accent, "#0f1115"),
        "sidebar-border": "#303642",
        "sidebar-ring": accent,
        "radius": radius
    })
}

fn color_value(colors: &serde_json::Value, keys: &[&str], fallback: &str) -> String {
    for key in keys {
        if let Some(value) = colors.get(*key).and_then(|value| value.as_str()) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    fallback.to_string()
}

fn shadcn_radius(tokens: &serde_json::Value) -> String {
    let radii = tokens
        .get("radii")
        .or_else(|| tokens.get("radius"))
        .cloned()
        .unwrap_or_else(|| json!({}));
    color_value(&radii, &["default", "md", "lg", "base"], "0.625rem")
}

fn readable_text_color(color: &str, fallback: &str) -> String {
    let Some((r, g, b)) = hex_rgb(color) else {
        return fallback.to_string();
    };
    let channel = |value: u8| {
        let c = f64::from(value) / 255.0;
        if c <= 0.03928 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    };
    let luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    if luminance > 0.54 {
        "#111111".to_string()
    } else {
        "#ffffff".to_string()
    }
}

fn hex_rgb(color: &str) -> Option<(u8, u8, u8)> {
    let raw = color.trim().trim_start_matches('#');
    let expanded = match raw.len() {
        3 => raw.chars().flat_map(|ch| [ch, ch]).collect::<String>(),
        6 => raw.to_string(),
        _ => return None,
    };
    let parsed = u32::from_str_radix(&expanded, 16).ok()?;
    Some((
        ((parsed >> 16) & 0xff) as u8,
        ((parsed >> 8) & 0xff) as u8,
        (parsed & 0xff) as u8,
    ))
}

fn native_token_names(tokens: &serde_json::Value) -> serde_json::Value {
    let mut out = serde_json::Map::new();
    if let Some(map) = tokens.as_object() {
        for (key, value) in map {
            if let Some(nested) = value.as_object() {
                let mut keys: Vec<_> = nested.keys().cloned().collect();
                keys.sort();
                out.insert(key.clone(), json!(keys));
            }
        }
    }
    serde_json::Value::Object(out)
}

fn design_md_slug(language_id: &str, fields: &serde_json::Value) -> String {
    first_nonempty(&[
        string_field_any(fields, "slug", ""),
        string_field_any(fields, "Slug", ""),
        language_id.to_string(),
    ])
}

fn json_object_field(fields: &serde_json::Value, name: &str) -> serde_json::Value {
    fields
        .get(name)
        .or_else(|| fields.get(&pascal_case(name)))
        .and_then(|value| {
            if value.is_object() {
                Some(value.clone())
            } else {
                value
                    .as_str()
                    .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
                    .filter(|parsed| parsed.is_object())
            }
        })
        .unwrap_or_else(|| json!({}))
}

fn json_array_field(fields: &serde_json::Value, name: &str) -> Vec<String> {
    fields
        .get(name)
        .or_else(|| fields.get(&pascal_case(name)))
        .and_then(|value| {
            if value.is_array() {
                Some(value.clone())
            } else {
                value
                    .as_str()
                    .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
                    .filter(|parsed| parsed.is_array())
            }
        })
        .as_ref()
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn pascal_case(name: &str) -> String {
    let mut out = String::new();
    let mut upper = true;
    for ch in name.chars() {
        if ch == '_' {
            upper = true;
        } else if upper {
            out.extend(ch.to_uppercase());
            upper = false;
        } else {
            out.push(ch);
        }
    }
    out
}

fn first_nonempty(values: &[String]) -> String {
    values
        .iter()
        .find(|value| !value.trim().is_empty())
        .cloned()
        .unwrap_or_default()
}

fn string_path(value: &serde_json::Value, path: &[&str]) -> String {
    let mut cursor = value;
    for part in path {
        match cursor.get(*part) {
            Some(next) => cursor = next,
            None => return String::new(),
        }
    }
    cursor.as_str().unwrap_or("").to_string()
}

fn string_array_path(value: &serde_json::Value, path: &[&str]) -> Vec<String> {
    let mut cursor = value;
    for part in path {
        match cursor.get(*part) {
            Some(next) => cursor = next,
            None => return Vec::new(),
        }
    }
    cursor
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn yaml_quote(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn yaml_map_block(value: &serde_json::Value, indent: usize) -> String {
    let padding = " ".repeat(indent);
    let Some(map) = value.as_object() else {
        return format!("{padding}default: \"\"\n");
    };
    if map.is_empty() {
        return format!("{padding}default: \"\"\n");
    }
    let mut lines = String::new();
    for (key, value) in map {
        lines.push_str(&format!(
            "{padding}{}: {}\n",
            yaml_key(key),
            yaml_quote(&yaml_scalar(value))
        ));
    }
    lines
}

fn yaml_list_block(values: &[String], indent: usize) -> String {
    let padding = " ".repeat(indent);
    if values.is_empty() {
        return format!("{padding}- \"default\"\n");
    }
    values
        .iter()
        .map(|value| format!("{padding}- {}\n", yaml_quote(value)))
        .collect::<String>()
}

fn yaml_key(key: &str) -> String {
    key.chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn yaml_scalar(value: &serde_json::Value) -> String {
    value
        .as_str()
        .map(ToString::to_string)
        .unwrap_or_else(|| value.to_string())
}

fn markdown_text(value: &str) -> String {
    if value.trim().is_empty() {
        "Generated from the verified Katagami language fields.".to_string()
    } else {
        value.to_string()
    }
}

fn markdown_json_or_text(value: &serde_json::Value) -> String {
    if value.is_null() || value.as_object().is_some_and(|map| map.is_empty()) {
        "Defined by the Katagami source fields.".to_string()
    } else {
        serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
    }
}

fn markdown_list_or_fallback(values: &[String], fallback: &str) -> String {
    if values.is_empty() {
        format!("- {fallback}")
    } else {
        values
            .iter()
            .map(|value| format!("- {value}"))
            .collect::<Vec<_>>()
            .join("\n")
    }
}

fn markdown_inline_list(values: &[String], fallback: &str) -> String {
    if values.is_empty() {
        fallback.to_string()
    } else {
        values.join("; ")
    }
}

fn first_nonempty_list(lists: Vec<Vec<String>>) -> Vec<String> {
    lists
        .into_iter()
        .find(|items| !items.is_empty())
        .unwrap_or_default()
}

fn read_file_value(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    file_id: &str,
) -> Result<String, String> {
    if file_id.trim().is_empty() {
        return Err("Cannot read Files('')/$value: missing file id".to_string());
    }

    let resp = ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/Files('{file_id}')/$value"),
        headers,
        "",
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to read Files('{file_id}')/$value: HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    Ok(resp.body)
}

struct PublishedArtifactRef {
    asset_id: String,
    public_url: String,
}

const KATAGAMI_CANONICAL_ASSET_BASE_URL: &str = "https://assets.katagami.ai";
const KATAGAMI_LEGACY_ASSET_BASE_URL: &str = "https://temperpaw-assets.katagami.ai";

fn canonicalize_katagami_public_asset_url(public_url: &str) -> String {
    public_url
        .strip_prefix(KATAGAMI_LEGACY_ASSET_BASE_URL)
        .map(|suffix| format!("{KATAGAMI_CANONICAL_ASSET_BASE_URL}{suffix}"))
        .unwrap_or_else(|| public_url.to_string())
}

fn publish_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    file_id: &str,
    label: &str,
) -> Result<PublishedArtifactRef, String> {
    let body = json!({
        "file_id": file_id,
        "label": label,
        "owner_ref_type": "DesignLanguage",
        "owner_ref_id": language_id,
        "namespace": "katagami/design-languages"
    });
    let resp = ctx.http_call(
        "POST",
        &format!("{api_url}/api/files/publish-artifact"),
        headers,
        &body.to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to publish {label} artifact for DesignLanguage '{language_id}' from file '{file_id}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse publish-artifact response: {e}"))?;
    let artifact = parsed
        .get("artifact")
        .ok_or_else(|| "publish-artifact response has no artifact object".to_string())?;
    let asset_id = artifact
        .get("id")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "publish-artifact response artifact has no id".to_string())?
        .to_string();
    let public_url = artifact
        .get("public_url")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "publish-artifact response artifact has no public_url".to_string())?
        .to_string();
    Ok(PublishedArtifactRef {
        asset_id,
        public_url: canonicalize_katagami_public_asset_url(&public_url),
    })
}

fn design_md_projection_refresh_reason(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    fields: &serde_json::Value,
    design_md_file_id: &str,
) -> Option<&'static str> {
    if design_md_file_id.trim().is_empty() {
        return Some("missing_design_md_file_id");
    }

    let raw = string_field_any(fields, "design_md_lint_result", "");
    if raw.trim().is_empty() {
        return Some("missing_design_md_lint_result");
    }

    let parsed: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(parsed) => parsed,
        Err(_) => return Some("invalid_design_md_lint_json"),
    };
    let errors = parsed
        .get("summary")
        .and_then(|summary| summary.get("errors"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let warnings = parsed
        .get("summary")
        .and_then(|summary| summary.get("warnings"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    if errors != 0 {
        return Some("design_md_lint_errors");
    }
    if warnings != 0 {
        return Some("design_md_lint_warnings");
    }

    match read_file_value(ctx, api_url, headers, design_md_file_id) {
        Ok(body) => design_md_body_refresh_reason(language_id, design_md_file_id, &body),
        Err(_) => Some("unreadable_design_md_file"),
    }
}

fn design_md_body_refresh_reason(
    language_id: &str,
    file_id: &str,
    body: &str,
) -> Option<&'static str> {
    match verify_file_body(language_id, file_id, "design_md", None, body) {
        Ok(()) => None,
        Err(_) => Some("invalid_design_md_body"),
    }
}

fn shadcn_export_projection_refresh_reason(
    fields: &serde_json::Value,
    shadcn_export_file_id: &str,
) -> Option<&'static str> {
    if shadcn_export_file_id.trim().is_empty() {
        return Some("missing_shadcn_export_file_id");
    }

    let format_version = string_field_any(fields, "shadcn_export_format_version", "");
    if format_version.trim().is_empty() {
        return Some("missing_shadcn_export_format_version");
    }

    let manifest = string_field_any(fields, "shadcn_export_manifest", "");
    if manifest.trim().is_empty() {
        return Some("missing_shadcn_export_manifest");
    }

    None
}

fn shadcn_component_spec_projection_refresh_reason(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    fields: &serde_json::Value,
    shadcn_component_spec_file_id: &str,
) -> Option<&'static str> {
    if shadcn_component_spec_file_id.trim().is_empty() {
        return Some("missing_shadcn_component_spec_file_id");
    }

    let format_version = string_field_any(fields, "shadcn_component_spec_format_version", "");
    if format_version.trim().is_empty() {
        return Some("missing_shadcn_component_spec_format_version");
    }

    let manifest = string_field_any(fields, "shadcn_component_spec_manifest", "");
    if manifest.trim().is_empty() {
        return Some("missing_shadcn_component_spec_manifest");
    }

    match read_file_value(ctx, api_url, headers, shadcn_component_spec_file_id) {
        Ok(body) => shadcn_component_spec_body_refresh_reason(
            language_id,
            shadcn_component_spec_file_id,
            &body,
        ),
        Err(_) => Some("unreadable_shadcn_component_spec_file"),
    }
}

fn shadcn_component_spec_body_refresh_reason(
    language_id: &str,
    file_id: &str,
    body: &str,
) -> Option<&'static str> {
    match verify_file_body(language_id, file_id, "shadcn_component_spec", None, body) {
        Ok(()) => None,
        Err(_) => Some("invalid_shadcn_component_spec_body"),
    }
}

fn shadcn_preview_shots_projection_refresh_reason(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    fields: &serde_json::Value,
    shadcn_preview_shots_file_id: &str,
) -> Option<&'static str> {
    if shadcn_preview_shots_file_id.trim().is_empty() {
        return Some("missing_shadcn_preview_shots_file_id");
    }

    let format_version = string_field_any(fields, "shadcn_preview_shots_format_version", "");
    if format_version.trim().is_empty() {
        return Some("missing_shadcn_preview_shots_format_version");
    }

    let manifest = string_field_any(fields, "shadcn_preview_shots_manifest", "");
    if manifest.trim().is_empty() {
        return Some("missing_shadcn_preview_shots_manifest");
    }
    if !manifest.contains("requiresVisualProfile") {
        return Some("missing_shadsync_visual_profile_manifest");
    }

    match read_file_value(ctx, api_url, headers, shadcn_preview_shots_file_id) {
        Ok(body) => shadcn_preview_shots_body_refresh_reason(
            language_id,
            shadcn_preview_shots_file_id,
            &body,
        ),
        Err(_) => Some("unreadable_shadcn_preview_shots_file"),
    }
}

fn shadcn_preview_shots_body_refresh_reason(
    language_id: &str,
    file_id: &str,
    body: &str,
) -> Option<&'static str> {
    match verify_file_body(language_id, file_id, "shadcn_preview_shots", None, body) {
        Ok(()) => None,
        Err(_) => Some("invalid_shadcn_preview_shots_body"),
    }
}

fn verify_design_md_lint_result(
    language_id: &str,
    fields: &serde_json::Value,
) -> Result<(), String> {
    let raw = string_field_any(fields, "design_md_lint_result", "");
    if raw.trim().is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' has no DESIGN.md lint result"
        ));
    }
    let parsed: serde_json::Value = serde_json::from_str(&raw).map_err(|e| {
        format!("DesignLanguage '{language_id}' has invalid DESIGN.md lint JSON: {e}")
    })?;
    let errors = parsed
        .get("summary")
        .and_then(|summary| summary.get("errors"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let warnings = parsed
        .get("summary")
        .and_then(|summary| summary.get("warnings"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    if errors != 0 || warnings != 0 {
        return Err(format!(
            "DesignLanguage '{language_id}' DESIGN.md lint result is not clean: errors={errors}, warnings={warnings}"
        ));
    }
    Ok(())
}

fn design_language_ids_from_job(fields: &serde_json::Value) -> Vec<String> {
    let mut ids = Vec::new();
    for field_name in [
        "design_language_ids",
        "DesignLanguageIds",
        "language_ids",
        "LanguageIds",
        "reviewed_ids",
        "ReviewedIds",
        "fixed_ids",
        "FixedIds",
    ] {
        ids.extend(string_array_flexible(fields.get(field_name)));
    }
    if ids.is_empty() {
        if let Some(output) =
            parse_json_field(fields.get("output").or_else(|| fields.get("Output")))
        {
            for field_name in [
                "design_language_ids",
                "DesignLanguageIds",
                "language_ids",
                "LanguageIds",
                "reviewed_ids",
                "ReviewedIds",
                "fixed_ids",
                "FixedIds",
                "fixed",
                "Fixed",
            ] {
                ids.extend(string_array_flexible(output.get(field_name)));
            }
        }
    }
    if ids.is_empty() {
        if let Some(input) = parse_json_field(fields.get("input").or_else(|| fields.get("Input"))) {
            ids.extend(string_array_flexible(input.get("language_ids")));
            ids.extend(string_array_flexible(input.get("design_language_ids")));
            ids.extend(string_array_flexible(input.get("LanguageIds")));
            ids.extend(string_array_flexible(input.get("DesignLanguageIds")));
        }
    }

    let mut deduped = Vec::new();
    for id in ids {
        if !id.is_empty() && !deduped.contains(&id) {
            deduped.push(id);
        }
    }
    deduped
}

fn contract_repair_existing_language_ids(fields: &serde_json::Value) -> Option<Vec<String>> {
    let input = parse_json_field(fields.get("input").or_else(|| fields.get("Input")))?;
    let repair = input.get("contract_repair")?;
    let ids = dedupe_nonempty_strings(string_array_flexible(
        repair.get("existing_design_language_ids"),
    ));
    (!ids.is_empty()).then_some(ids)
}

fn same_string_set(left: &[String], right: &[String]) -> bool {
    let mut left = dedupe_nonempty_strings(left.to_vec());
    let mut right = dedupe_nonempty_strings(right.to_vec());
    left.sort();
    right.sort();
    left == right
}

fn dedupe_nonempty_strings(ids: Vec<String>) -> Vec<String> {
    let mut deduped = Vec::new();
    for id in ids {
        if !id.is_empty() && !deduped.contains(&id) {
            deduped.push(id);
        }
    }
    deduped
}

fn design_language_ids_for_contract_validation(fields: &serde_json::Value) -> Vec<String> {
    let completion_ids = design_language_ids_from_completion(fields);
    if !completion_ids.is_empty() {
        return completion_ids;
    }
    if let Some(repair_ids) = contract_repair_existing_language_ids(fields) {
        if !repair_ids.is_empty() {
            return repair_ids;
        }
    }
    design_language_ids_from_job(fields)
}

fn design_language_ids_for_contract_repair(
    fields: &serde_json::Value,
    validation: &serde_json::Value,
) -> Vec<String> {
    let field_ids = design_language_ids_for_contract_validation(fields);
    if !field_ids.is_empty() {
        return field_ids;
    }

    let mut ids = Vec::new();
    ids.extend(string_array_flexible(
        validation.get("incomplete_language_ids"),
    ));
    ids.extend(string_array_flexible(validation.get("repair_language_ids")));
    if let Some(defects) = validation.get("defects").and_then(|value| value.as_array()) {
        for defect in defects {
            if let Some(language_id) = defect.get("language_id").and_then(|value| value.as_str()) {
                ids.push(language_id.to_string());
            }
        }
    }
    dedupe_nonempty_strings(ids)
}

fn design_language_ids_from_completion(fields: &serde_json::Value) -> Vec<String> {
    let mut ids = Vec::new();
    for field_name in [
        "design_language_ids",
        "DesignLanguageIds",
        "language_ids",
        "LanguageIds",
        "reviewed_ids",
        "ReviewedIds",
        "fixed_ids",
        "FixedIds",
    ] {
        ids.extend(string_array_flexible(fields.get(field_name)));
    }
    if ids.is_empty() {
        if let Some(output) =
            parse_json_field(fields.get("output").or_else(|| fields.get("Output")))
        {
            for field_name in [
                "design_language_ids",
                "DesignLanguageIds",
                "language_ids",
                "LanguageIds",
                "reviewed_ids",
                "ReviewedIds",
                "fixed_ids",
                "FixedIds",
                "fixed",
                "Fixed",
            ] {
                ids.extend(string_array_flexible(output.get(field_name)));
            }
        }
    }

    let mut deduped = Vec::new();
    for id in ids {
        if !id.is_empty() && !deduped.contains(&id) {
            deduped.push(id);
        }
    }
    deduped
}

fn partial_design_language_contract_defects(
    job_type: &str,
    language_id: &str,
    language: &serde_json::Value,
) -> Vec<serde_json::Value> {
    let fields = entity_fields(language);
    let mut defects = Vec::new();

    let mut missing_sections = Vec::new();
    for (bool_name, data_name) in [
        ("has_philosophy", "philosophy"),
        ("has_tokens", "tokens"),
        ("has_rules", "rules"),
        ("has_layout", "layout_principles"),
        ("has_guidance", "guidance"),
    ] {
        if !section_present(&fields, bool_name, data_name) {
            missing_sections.push(bool_name.trim_start_matches("has_").to_string());
        }
    }
    if !missing_sections.is_empty() {
        defects.push(contract_defect(
            job_type,
            Some(language_id),
            &format!(
                "DesignLanguage '{language_id}' is missing required spec sections: {}",
                missing_sections.join(", ")
            ),
        ));
    }

    for (field_name, message) in [
        (
            "embodiment_file_id",
            "missing embodiment_file_id for the generated embodiment artifact",
        ),
        (
            "thumbnail_file_id",
            "missing thumbnail_file_id for the gallery thumbnail artifact",
        ),
    ] {
        if string_field_any(&fields, field_name, "").trim().is_empty() {
            defects.push(contract_defect(
                job_type,
                Some(language_id),
                &format!("DesignLanguage '{language_id}' {message}"),
            ));
        }
    }

    defects
}

fn verify_forced_agent_shadsync_refresh(
    language_id: &str,
    job_fields: &serde_json::Value,
    language: &serde_json::Value,
) -> Result<(), String> {
    let Some(input) = parse_json_field(job_fields.get("input")) else {
        return Ok(());
    };
    if !json_bool(&input, "force_agent_shadcn_artifact_refresh") {
        return Ok(());
    }

    let fields = entity_fields(language);
    verify_forced_agent_shadsync_file(
        language_id,
        &input,
        &fields,
        "shadcn_component_spec_file_id",
        "shadcn_component_spec_manifest",
        "components.md",
    )?;
    verify_forced_agent_shadsync_file(
        language_id,
        &input,
        &fields,
        "shadcn_preview_shots_file_id",
        "shadcn_preview_shots_manifest",
        "preview-shots.json",
    )?;
    Ok(())
}

fn recover_forced_agent_shadsync_artifacts(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    job_fields: &serde_json::Value,
    language: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let Some(input) = parse_json_field(job_fields.get("input")) else {
        return Ok(language.clone());
    };
    if !json_bool(&input, "force_agent_shadcn_artifact_refresh") {
        return Ok(language.clone());
    }

    let mut current_language = language.clone();
    current_language = recover_forced_agent_shadsync_file(
        ctx,
        api_url,
        headers,
        workspace_id,
        language_id,
        &input,
        &current_language,
        "components",
        "components.md",
        "text/markdown",
        "shadcn_component_spec_file_id",
        "AttachShadcnComponentSpec",
        json!({
            "artifact": "katagami:shadcn-component-recipes",
            "version": "component-recipes-v1",
            "author": "katagami-agent",
            "generatedBy": "katagami-agent",
            "requiresVisualProfile": true,
            "components": SHADCN_COMPONENTS,
            "shots": ["application-shell", "detail-editor", "data-operations"]
        }),
    )?;
    current_language = recover_forced_agent_shadsync_file(
        ctx,
        api_url,
        headers,
        workspace_id,
        language_id,
        &input,
        &current_language,
        "preview-shots",
        "preview-shots.json",
        "application/json",
        "shadcn_preview_shots_file_id",
        "AttachShadcnPreviewShots",
        json!({
            "artifact": "katagami:shadcn-preview-shots",
            "version": "preview-shots-v1",
            "author": "katagami-agent",
            "generatedBy": "katagami-agent",
            "schema": "katagami:shadcn-preview-shots/renderable-v1",
            "renderable": true,
            "requiresVisualProfile": true,
            "shotIds": ["application-shell", "detail-editor", "data-operations"],
            "components": SHADCN_COMPONENTS
        }),
    )?;
    Ok(current_language)
}

#[allow(clippy::too_many_arguments)]
fn recover_forced_agent_shadsync_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    input: &serde_json::Value,
    language: &serde_json::Value,
    path_prefix: &str,
    canonical_filename: &str,
    _mime_type: &str,
    file_id_field: &str,
    attach_action: &str,
    manifest: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let fields = entity_fields(language);
    let current_file_id = string_field_any(&fields, file_id_field, "");
    let previous_file_id = input
        .get("previous_file_ids")
        .and_then(|previous| previous.get(file_id_field))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    if !previous_file_id.is_empty() && current_file_id != previous_file_id {
        return Ok(language.clone());
    }
    if forced_shadsync_manifest_is_agent(&fields, file_id_field)
        && current_file_id != previous_file_id
    {
        return Ok(language.clone());
    }

    let slug = design_md_slug(language_id, &fields);
    let Some(candidate_file_id) = find_latest_agent_shadsync_file(
        ctx,
        api_url,
        headers,
        workspace_id,
        language_id,
        &slug,
        path_prefix,
        canonical_filename,
        previous_file_id,
        &current_file_id,
    )?
    else {
        return Ok(language.clone());
    };
    if candidate_file_id == current_file_id {
        return Ok(language.clone());
    }

    let mut params = json!({});
    if attach_action == "AttachShadcnComponentSpec" {
        params = json!({
            "shadcn_component_spec_file_id": candidate_file_id,
            "shadcn_component_spec_format_version": "component-recipes-v1",
            "shadcn_component_spec_manifest": manifest.to_string()
        });
    } else if attach_action == "AttachShadcnPreviewShots" {
        params = json!({
            "shadcn_preview_shots_file_id": candidate_file_id,
            "shadcn_preview_shots_format_version": "preview-shots-v1",
            "shadcn_preview_shots_manifest": manifest.to_string()
        });
    }
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        attach_action,
        &params,
    )?;
    load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
        format!("DesignLanguage '{language_id}' disappeared after recovering {canonical_filename}")
    })
}

fn forced_shadsync_manifest_is_agent(fields: &serde_json::Value, file_id_field: &str) -> bool {
    let manifest_field = if file_id_field == "shadcn_component_spec_file_id" {
        "shadcn_component_spec_manifest"
    } else {
        "shadcn_preview_shots_manifest"
    };
    let manifest_raw = string_field_any(fields, manifest_field, "");
    serde_json::from_str::<serde_json::Value>(&manifest_raw).is_ok_and(|manifest| {
        manifest
            .get("author")
            .or_else(|| manifest.get("generatedBy"))
            .and_then(|value| value.as_str())
            == Some("katagami-agent")
            && json_bool(&manifest, "requiresVisualProfile")
    })
}

#[allow(clippy::too_many_arguments)]
fn find_latest_agent_shadsync_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    language_id: &str,
    slug: &str,
    path_prefix: &str,
    canonical_filename: &str,
    previous_file_id: &str,
    current_file_id: &str,
) -> Result<Option<String>, String> {
    let resp = ctx.http_call(
        "GET",
        &format!("{api_url}/tdata/Files?$top=500"),
        headers,
        "",
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to list Files while recovering forced ShadSync {canonical_filename}: HTTP {}: {}",
            resp.status,
            truncate_body(&resp.body, 300)
        ));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse Files response for ShadSync recovery: {e}"))?;
    let expected_dir = format!("/katagami/shadcn/{slug}/");
    let mut candidates: Vec<String> = parsed
        .get("value")
        .and_then(|value| value.as_array())
        .into_iter()
        .flatten()
        .filter_map(|file| {
            let file_id = extract_entity_id(file)?;
            if file_id == previous_file_id || file_id == current_file_id {
                return None;
            }
            let fields = entity_fields(file);
            let path = string_field_any(&fields, "path", "");
            let candidate_workspace = string_field_any(&fields, "workspace_id", "");
            if !candidate_workspace.is_empty() && candidate_workspace != workspace_id {
                return None;
            }
            let file_name = path.rsplit('/').next().unwrap_or("");
            if path.starts_with(&expected_dir)
                && file_name.starts_with(path_prefix)
                && file_name.ends_with(canonical_filename.rsplit('.').next().unwrap_or(""))
            {
                Some(file_id)
            } else {
                None
            }
        })
        .collect();
    candidates.sort();
    candidates.reverse();
    for file_id in candidates {
        let body = read_file_value(ctx, api_url, headers, &file_id)?;
        let artifact_kind = if canonical_filename.ends_with(".json") {
            "shadcn_preview_shots"
        } else {
            "shadcn_component_spec"
        };
        if verify_file_body(language_id, &file_id, artifact_kind, None, &body).is_ok()
            && agent_artifact_body(&body)
        {
            return Ok(Some(file_id));
        }
    }
    Ok(None)
}

fn agent_artifact_body(body: &str) -> bool {
    let trimmed = body.trim();
    if trimmed.starts_with('{') {
        serde_json::from_str::<serde_json::Value>(trimmed).is_ok_and(|parsed| {
            parsed
                .get("author")
                .or_else(|| parsed.get("generatedBy"))
                .and_then(|value| value.as_str())
                == Some("katagami-agent")
                && json_bool(&parsed, "requiresVisualProfile")
        })
    } else {
        trimmed.contains("ShadSync visual profile")
            && trimmed.contains("Signature component recipes")
            && trimmed.contains("Preview shots")
    }
}

fn verify_forced_agent_shadsync_file(
    language_id: &str,
    input: &serde_json::Value,
    fields: &serde_json::Value,
    file_id_field: &str,
    manifest_field: &str,
    label: &str,
) -> Result<(), String> {
    let current_file_id = string_field_any(fields, file_id_field, "");
    if current_file_id.trim().is_empty() {
        return Err(format!(
            "DesignLanguage '{language_id}' forced ShadSync refresh did not attach {label}"
        ));
    }

    let previous_file_id = input
        .get("previous_file_ids")
        .and_then(|previous| previous.get(file_id_field))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    if !previous_file_id.is_empty() && current_file_id == previous_file_id {
        return Err(format!(
            "DesignLanguage '{language_id}' forced ShadSync refresh reused previous {label} file id '{current_file_id}'"
        ));
    }

    let manifest_raw = string_field_any(fields, manifest_field, "");
    let manifest: serde_json::Value = serde_json::from_str(&manifest_raw).map_err(|e| {
        format!(
            "DesignLanguage '{language_id}' forced ShadSync refresh has invalid {label} manifest JSON: {e}"
        )
    })?;
    let author = manifest
        .get("author")
        .or_else(|| manifest.get("generatedBy"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if author != "katagami-agent" {
        return Err(format!(
            "DesignLanguage '{language_id}' forced ShadSync refresh requires agent-authored {label}; manifest author was '{author}'"
        ));
    }
    if !json_bool(&manifest, "requiresVisualProfile") {
        return Err(format!(
            "DesignLanguage '{language_id}' forced ShadSync refresh {label} manifest must require visualProfile"
        ));
    }
    Ok(())
}

fn json_bool(value: &serde_json::Value, name: &str) -> bool {
    match value.get(name) {
        Some(serde_json::Value::Bool(flag)) => *flag,
        Some(serde_json::Value::String(text)) => text.eq_ignore_ascii_case("true"),
        _ => false,
    }
}

fn entity_fields(entity: &serde_json::Value) -> serde_json::Value {
    entity.get("fields").cloned().unwrap_or_else(|| json!({}))
}

fn entity_status_value(entity: &serde_json::Value) -> String {
    entity
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

fn section_present(fields: &serde_json::Value, bool_name: &str, data_name: &str) -> bool {
    bool_field(fields, bool_name) || !string_field_any(fields, data_name, "").trim().is_empty()
}

fn bool_field(fields: &serde_json::Value, name: &str) -> bool {
    fields
        .get(name)
        .or_else(|| fields.get(&pascal_case(name)))
        .is_some_and(|value| {
            value
                .as_bool()
                .unwrap_or_else(|| value.as_str().is_some_and(|s| s == "true"))
        })
}

fn string_field_any(fields: &serde_json::Value, name: &str, default: &str) -> String {
    fields
        .get(name)
        .or_else(|| fields.get(&pascal_case(name)))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn entity_bool_any(entity: &serde_json::Value, name: &str) -> bool {
    entity
        .get("booleans")
        .is_some_and(|booleans| bool_field(booleans, name))
        || entity
            .get("fields")
            .is_some_and(|fields| bool_field(fields, name))
        || bool_field(entity, name)
}

fn numeric_field_any(entity: &serde_json::Value, names: &[&str]) -> i64 {
    let bags = [entity.get("fields"), entity.get("counters"), Some(entity)];
    for bag in bags.into_iter().flatten() {
        for name in names {
            if let Some(value) = bag.get(*name) {
                if let Some(number) = value.as_i64() {
                    return number;
                }
                if let Some(text) = value.as_str() {
                    if let Ok(number) = text.parse::<i64>() {
                        return number;
                    }
                }
            }
        }
    }
    0
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
    validation: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut actions = Vec::new();
    let parent_session_id = parent_session_id_from_fields(fields);

    match job_type {
        "source_search" => {
            let direction_ids = parse_json_string_array(fields.get("direction_ids"));
            if direction_ids.is_empty() {
                return Err(
                    "source_search typed completion did not report any direction_ids; refusing to advance query without synthesis jobs"
                        .to_string(),
                );
            }
            let mut synthesize_job_ids = Vec::new();
            for direction_id in &direction_ids {
                let Some(direction) =
                    load_entity(ctx, api_url, headers, "CurationDirections", direction_id)?
                else {
                    continue;
                };
                let direction_status = entity_status_value(&direction);
                let existing_synth_ids =
                    synthesis_job_ids_for_direction(ctx, api_url, headers, query_id, direction_id)?;
                if !existing_synth_ids.is_empty() {
                    for existing_id in existing_synth_ids {
                        if !synthesize_job_ids
                            .iter()
                            .any(|job_id| job_id == &existing_id)
                        {
                            synthesize_job_ids.push(existing_id);
                        }
                    }
                    if direction_status.as_str() == "Discovered"
                        && dispatch_action_or_already_in_state(
                            ctx,
                            api_url,
                            headers,
                            "CurationDirections",
                            direction_id,
                            "QueueSynthesis",
                            &json!({}),
                            &["Synthesizing", "Completed"],
                        )?
                    {
                        actions.push(json!({
                            "action": "marked_existing_synthesis_job_direction_queued",
                            "direction_id": direction_id,
                        }));
                    }
                    actions.push(json!({
                        "action": "skipped_synthesis_job_existing_job",
                        "direction_id": direction_id,
                    }));
                    continue;
                }
                if direction_status.as_str() == "Failed" {
                    actions.push(json!({
                        "action": "skipped_synthesis_job_direction_failed",
                        "direction_id": direction_id,
                    }));
                    continue;
                }
                if direction_status.as_str() == "Completed" {
                    actions.push(json!({
                        "action": "skipped_synthesis_job_direction_completed_without_job",
                        "direction_id": direction_id,
                    }));
                    continue;
                }

                let direction_fields = entity_fields(&direction);
                let synth_input = string_field_any(&direction_fields, "synth_input", "{}");
                let direction_workspace_id =
                    string_field_any(&direction_fields, "workspace_id", "");
                let effective_workspace_id = if workspace_id.is_empty() {
                    direction_workspace_id.as_str()
                } else {
                    workspace_id
                };
                let synth_job_id = create_configure_submit_job(
                    ctx,
                    api_url,
                    headers,
                    "synthesize",
                    effective_workspace_id,
                    query_id,
                    Some(direction_id),
                    &synth_input,
                    parent_session_id.as_deref(),
                )?;
                synthesize_job_ids.push(synth_job_id.clone());
                if direction_status.as_str() == "Discovered"
                    && dispatch_action_or_already_in_state(
                        ctx,
                        api_url,
                        headers,
                        "CurationDirections",
                        direction_id,
                        "QueueSynthesis",
                        &json!({}),
                        &["Synthesizing", "Completed"],
                    )?
                {
                    actions.push(json!({
                        "action": "created_and_queued_synthesis_job",
                        "direction_id": direction_id,
                        "job_id": synth_job_id,
                    }));
                } else {
                    actions.push(json!({
                        "action": "skipped_synthesis_job_direction_already_queued",
                        "direction_id": direction_id,
                    }));
                }
            }

            actions.push(json!({
                "action": "research_query_advancement_deferred_to_validated_internal_action",
                "query_id": query_id,
                "job_id": job_id,
            }));
            let existing_synth_ids =
                synthesis_job_ids_for_directions(ctx, api_url, headers, query_id, &direction_ids)?;
            for existing_id in existing_synth_ids {
                if !synthesize_job_ids
                    .iter()
                    .any(|job_id| job_id == &existing_id)
                {
                    synthesize_job_ids.push(existing_id);
                }
            }
            if synthesize_job_ids.is_empty() {
                return Err(
                    "source_search finalizer could not create or find any synthesize jobs for the completed direction_ids; refusing to publish ResearchComplete with an empty synthesize_job_ids contract"
                        .to_string(),
                );
            }
            actions.push(json!({
                "action": "collected_synthesis_jobs",
                "job_ids": synthesize_job_ids,
            }));
        }
        "synthesize" => {
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
                    parent_session_id.as_deref(),
                )?;
                actions
                    .push(json!({"action": "created_quality_review_job", "job_id": review_job_id}));
            }
            if query_status.as_deref() == Some("Synthesizing") {
                actions.push(json!({
                    "action": "synthesis_direction_and_query_advancement_deferred_to_validated_internal_action",
                    "query_id": query_id,
                }));
            }
        }
        "quality_review" => {
            if validation
                .get("repair_pending")
                .and_then(|value| value.as_bool())
                .unwrap_or(false)
            {
                actions.push(json!({
                    "action": "skipped_organization_pending_artifact_repair",
                    "repair_job_ids": validation
                        .get("repair_job_ids")
                        .cloned()
                        .unwrap_or_else(|| json!([])),
                }));
                return Ok(json!(actions));
            }
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
                    parent_session_id.as_deref(),
                )?;
                actions
                    .push(json!({"action": "created_organization_job", "job_id": organize_job_id}));
            }
        }
        "regenerate_embodiment" | "evolve_language" => {
            let input_json = parse_json_field(fields.get("input"));
            let repair_set =
                string_array(input_json.as_ref().and_then(|v| v.get("all_language_ids")));
            let language_ids = if repair_set.is_empty() {
                design_language_ids_from_job(fields)
            } else {
                repair_set
            };
            if !language_ids.is_empty()
                && !active_quality_review_job_exists_for_languages(
                    ctx,
                    api_url,
                    headers,
                    query_id,
                    &language_ids,
                )?
            {
                let review_input = json!({
                    "language_ids": language_ids,
                    "query_id": query_id,
                    "artifact_repair_attempt": artifact_repair_attempt(fields)
                })
                .to_string();
                let review_job_id = create_configure_submit_job(
                    ctx,
                    api_url,
                    headers,
                    "quality_review",
                    workspace_id,
                    query_id,
                    None,
                    &review_input,
                    parent_session_id.as_deref(),
                )?;
                actions.push(json!({
                    "action": "created_quality_review_job_after_embodiment_repair",
                    "job_id": review_job_id,
                }));
            }

            if job_type == "regenerate_embodiment" {
                if let Some(next_job_id) = submit_next_queued_regeneration(ctx, api_url, headers)? {
                    actions.push(json!({
                        "action": "submitted_next_queued_regeneration",
                        "job_id": next_job_id,
                    }));
                }
            }
        }
        "organize_taxonomy" => {
            actions.push(json!({
                "action": "organization_query_advancement_deferred_to_validated_internal_action",
                "query_id": query_id,
            }));
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
        .map(|parsed| string_array_flexible(Some(&parsed)))
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

fn list_curation_jobs_filtered(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    filter: &str,
    top: usize,
) -> Result<Vec<serde_json::Value>, String> {
    let resp = ctx.http_call(
        "GET",
        &format!(
            "{api_url}/tdata/CurationJobs?$filter={}&$top={top}",
            url_query_component(filter)
        ),
        headers,
        "",
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to list filtered CurationJobs with '{filter}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    let body: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse filtered CurationJobs response: {e}"))?;
    Ok(body
        .get("value")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default())
}

fn curation_job_filter(job_type: &str, query_id: &str, direction_id: Option<&str>) -> String {
    let mut clauses = vec![format!("job_type eq '{}'", odata_string_literal(job_type))];
    if !query_id.is_empty() {
        clauses.push(format!("query_id eq '{}'", odata_string_literal(query_id)));
    }
    if let Some(direction_id) = direction_id.filter(|id| !id.is_empty()) {
        clauses.push(format!(
            "direction_id eq '{}'",
            odata_string_literal(direction_id)
        ));
    }
    clauses.join(" and ")
}

fn odata_string_literal(value: &str) -> String {
    value.replace('\'', "''")
}

fn url_query_component(value: &str) -> String {
    let mut out = String::new();
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

fn job_exists(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_type: &str,
    query_id: &str,
    direction_id: Option<&str>,
) -> Result<bool, String> {
    let filter = curation_job_filter(job_type, query_id, direction_id);
    Ok(!list_curation_jobs_filtered(ctx, api_url, headers, &filter, 1)?.is_empty())
}

fn synthesis_job_ids_for_direction(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    query_id: &str,
    direction_id: &str,
) -> Result<Vec<String>, String> {
    let filter = curation_job_filter("synthesize", query_id, Some(direction_id));
    let jobs = list_curation_jobs_filtered(ctx, api_url, headers, &filter, 25)?;
    Ok(job_entity_ids(&jobs))
}

fn job_entity_ids(jobs: &[serde_json::Value]) -> Vec<String> {
    let mut ids = Vec::new();
    for job in jobs {
        let Some(job_id) = job
            .get("entity_id")
            .or_else(|| job.get("Id"))
            .and_then(|value| value.as_str())
        else {
            continue;
        };
        if !ids.iter().any(|existing| existing == job_id) {
            ids.push(job_id.to_string());
        }
    }
    ids
}

fn synthesis_job_ids_for_directions(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    query_id: &str,
    direction_ids: &[String],
) -> Result<Vec<String>, String> {
    let mut ids = Vec::new();
    for direction_id in direction_ids {
        for job_id in
            synthesis_job_ids_for_direction(ctx, api_url, headers, query_id, direction_id)?
        {
            if !ids.iter().any(|existing| existing == &job_id) {
                ids.push(job_id);
            }
        }
    }
    Ok(ids)
}

fn active_quality_review_job_exists_for_languages(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    query_id: &str,
    language_ids: &[String],
) -> Result<bool, String> {
    let mut expected = language_ids.to_vec();
    expected.sort();
    Ok(list_curation_jobs(ctx, api_url, headers)?
        .iter()
        .any(|job| {
            let status = job.get("status").and_then(|v| v.as_str()).unwrap_or("");
            if matches!(status, "Completed" | "Failed") {
                return false;
            }
            let fields = job.get("fields").unwrap_or(&serde_json::Value::Null);
            if fields.get("job_type").and_then(|v| v.as_str()) != Some("quality_review") {
                return false;
            }
            if !query_id.is_empty()
                && fields.get("query_id").and_then(|v| v.as_str()) != Some(query_id)
            {
                return false;
            }
            let input_json = parse_json_field(fields.get("input"));
            let mut actual = string_array(input_json.as_ref().and_then(|v| v.get("language_ids")));
            actual.sort();
            actual == expected
        }))
}

fn queue_artifact_repair_job(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    query_id: &str,
    fields: &serde_json::Value,
    language_id: &str,
    repair_reason: &str,
) -> Result<Option<String>, String> {
    if active_regeneration_job_exists_for_language(ctx, api_url, headers, query_id, language_id)? {
        ctx.log(
            "info",
            &format!(
                "queue_artifact_repair_job: active regenerate_embodiment job already exists for DesignLanguage '{language_id}'"
            ),
        );
        return Ok(None);
    }

    let Some(next_attempt) = next_artifact_repair_attempt(fields, MAX_ARTIFACT_REPAIR_ATTEMPTS)
    else {
        return Err(format!(
            "DesignLanguage '{language_id}' still has repairable artifact defects after {MAX_ARTIFACT_REPAIR_ATTEMPTS} repair attempts: {repair_reason}"
        ));
    };

    let repair_input = json!({
        "existing_language_id": language_id,
        "language_ids": [language_id],
        "all_language_ids": design_language_ids_from_job(fields),
        "query_id": query_id,
        "artifact_repair_attempt": next_attempt,
        "repair_kind": "artifact_finalization",
        "repair_artifacts": [
            "spec",
            "embodiment",
            "thumbnail",
            "shadcn_component_spec",
            "shadcn_preview_shots"
        ],
        "repair_reason": repair_reason,
    })
    .to_string();
    let job_id = create_configure_submit_job(
        ctx,
        api_url,
        headers,
        "regenerate_embodiment",
        workspace_id,
        query_id,
        None,
        &repair_input,
        parent_session_id_from_fields(fields).as_deref(),
    )?;
    ctx.log(
        "warn",
        &format!(
            "queue_artifact_repair_job: queued regenerate_embodiment job '{job_id}' for DesignLanguage '{language_id}' after quality_review finalizer found repairable artifact issue: {repair_reason}"
        ),
    );
    Ok(Some(job_id))
}

fn active_regeneration_job_exists_for_language(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    query_id: &str,
    language_id: &str,
) -> Result<bool, String> {
    Ok(list_curation_jobs(ctx, api_url, headers)?
        .iter()
        .any(|job| {
            let status = job.get("status").and_then(|v| v.as_str()).unwrap_or("");
            if matches!(status, "Completed" | "Failed") {
                return false;
            }
            let fields = job.get("fields").unwrap_or(&serde_json::Value::Null);
            if fields.get("job_type").and_then(|v| v.as_str()) != Some("regenerate_embodiment") {
                return false;
            }
            if !query_id.is_empty()
                && fields.get("query_id").and_then(|v| v.as_str()) != Some(query_id)
            {
                return false;
            }
            let input_json = parse_json_field(fields.get("input"));
            let existing_language_id = input_json
                .as_ref()
                .and_then(|v| v.get("existing_language_id"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if existing_language_id == language_id {
                return true;
            }
            string_array(input_json.as_ref().and_then(|v| v.get("language_ids")))
                .iter()
                .any(|id| id == language_id)
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
    parent_session_id: Option<&str>,
) -> Result<String, String> {
    let create_body = curation_job_create_body(parent_session_id);
    let create_resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs"),
        headers,
        &create_body.to_string(),
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

    let mut configure_body = json!({
        "job_type": job_type,
        "workspace_id": workspace_id,
        "input": input,
        "query_id": query_id,
        "completion_contract": "typed-v1",
    });
    if let Some(direction_id) = direction_id.filter(|id| !id.is_empty()) {
        configure_body["direction_id"] = serde_json::Value::String(direction_id.to_string());
    }
    add_parent_session_id(&mut configure_body, parent_session_id);

    dispatch_action(
        ctx,
        api_url,
        headers,
        "CurationJobs",
        &job_id,
        "ConfigureAndSubmit",
        &configure_body,
    )?;
    Ok(job_id)
}

fn parent_session_id_from_fields(fields: &serde_json::Value) -> Option<String> {
    let direct = string_field_any(fields, "parent_session_id", "");
    if !direct.is_empty() {
        return Some(direct);
    }
    parse_json_field(fields.get("input").or_else(|| fields.get("Input"))).and_then(|input| {
        let nested = string_field_any(&input, "parent_session_id", "");
        (!nested.is_empty()).then_some(nested)
    })
}

fn curation_job_create_body(parent_session_id: Option<&str>) -> serde_json::Value {
    match parent_session_id.filter(|id| !id.is_empty()) {
        Some(parent_session_id) => json!({"fields": {"ParentSessionId": parent_session_id}}),
        None => json!({}),
    }
}

fn add_parent_session_id(configure_body: &mut serde_json::Value, parent_session_id: Option<&str>) {
    if let Some(parent_session_id) = parent_session_id.filter(|id| !id.is_empty()) {
        configure_body["parent_session_id"] =
            serde_json::Value::String(parent_session_id.to_string());
    }
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

fn dispatch_action_or_already_in_state(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &str,
    entity_id: &str,
    action: &str,
    params: &serde_json::Value,
    already_ok_states: &[&str],
) -> Result<bool, String> {
    match dispatch_action(ctx, api_url, headers, set_name, entity_id, action, params) {
        Ok(()) => Ok(true),
        Err(error) if action_rejected_for_current_state(&error) => {
            let status =
                entity_status(ctx, api_url, headers, set_name, entity_id)?.unwrap_or_default();
            if already_ok_states
                .iter()
                .any(|expected| *expected == status.as_str())
            {
                ctx.log(
                    "info",
                    &format!(
                        "finalize_spawned_session: treating duplicate {set_name}('{entity_id}').{action} dispatch as idempotent because current state is '{status}'"
                    ),
                );
                Ok(false)
            } else {
                Err(error)
            }
        }
        Err(error) => Err(error),
    }
}

fn action_rejected_for_current_state(error: &str) -> bool {
    let lower = error.to_ascii_lowercase();
    lower.contains("not valid from state") || lower.contains("\"code\":\"actionfailed\"")
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

fn string_array_flexible(value: Option<&serde_json::Value>) -> Vec<String> {
    let Some(value) = value else {
        return Vec::new();
    };
    if let Some(items) = value.as_array() {
        return items
            .iter()
            .filter_map(|item| item.as_str().map(|s| s.trim().to_string()))
            .filter(|item| !item.is_empty())
            .collect();
    }
    if let Some(raw) = value.as_str().map(str::trim).filter(|raw| !raw.is_empty()) {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(raw) {
            let parsed_ids = string_array_flexible(Some(&parsed));
            if !parsed_ids.is_empty() {
                return parsed_ids;
            }
        }
        return vec![raw.to_string()];
    }
    Vec::new()
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
            "query_id": query_id,
            "inline_job_docs": true
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
        "query_id": query_id,
        "inline_job_docs": true
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

#[cfg(test)]
#[unsafe(no_mangle)]
pub extern "C" fn host_http_call(
    _method_ptr: i32,
    _method_len: i32,
    _url_ptr: i32,
    _url_len: i32,
    _headers_ptr: i32,
    _headers_len: i32,
    _body_ptr: i32,
    _body_len: i32,
    _result_buf_ptr: i32,
    _result_buf_len: i32,
) -> i32 {
    -1
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::{
        action_rejected_for_current_state, bool_field, canonicalize_katagami_public_asset_url,
        contract_defect, contract_repair_existing_language_ids, contract_repair_input,
        curation_job_create_body, curation_job_filter, design_language_ids_for_contract_validation,
        design_language_ids_from_completion, design_language_ids_from_job,
        design_md_projection_refresh_reason, entity_bool_any, is_repairable_contract_error,
        is_repairable_language_artifact_error, is_transient_provider_failure, json_object_field,
        merge_trigger_params_into_fields, next_artifact_repair_attempt, normalize_pawfs_path,
        parent_session_id_from_fields, partial_design_language_contract_defects,
        pawfs_directory_id, pawfs_file_id, recoverable_image_bytes_from_text,
        render_dashboard_composition_projection, render_design_md_projection,
        render_landing_composition_projection, same_string_set, session_can_be_finalized,
        session_is_terminal, split_pawfs_file_path, string_field_any,
        thumbnail_mime_type_is_acceptable, typed_completion_output_is_unfinished_tool_call,
        typed_success_terminal_action, url_query_component, validation_needs_repair,
        verify_file_body, verify_source_search_completion,
    };
    use serde_json::json;
    use temper_wasm_sdk::prelude::Context;

    fn test_context() -> Context {
        Context {
            config: BTreeMap::new(),
            trigger_params: json!({}),
            entity_state: json!({}),
            tenant: "test".to_string(),
            entity_type: "CurationJob".to_string(),
            entity_id: "job-test".to_string(),
            trigger_action: "CompleteQualityReview".to_string(),
            http_request: None,
        }
    }

    #[test]
    fn finalizer_projection_contains_design_md_contract_sections() {
        let fields = json!({
            "name": "Compact Editorial Ink",
            "slug": "compact-editorial-ink",
            "philosophy": json!({
                "summary": "Dense editorial surfaces with ink-led fine-art structure.",
                "visual_character": [
                    "Tight column grids with ruled gutters and folio labels.",
                    "Ink-heavy hierarchy over warm paper surfaces.",
                    "Proof-like annotations arranged as marginalia."
                ]
            }).to_string(),
            "tokens": json!({
                "colors": {"ink": "#111111", "paper": "#f8f4ea"},
                "typography": {"heading": "Libre Baskerville", "body": "Source Serif 4"},
                "surfaces": {"base": "warm paper"},
                "borders": {"default_width": "1px", "style": "solid"}
            }).to_string(),
            "rules": json!({
                "signature_patterns": [
                    "Use thin editorial rules to divide dense information.",
                    "Place captions and annotations in consistent side rails."
                ]
            }).to_string(),
            "layout_principles": json!({"grid": "compact editorial grid"}).to_string(),
            "guidance": json!({
                "do": ["Use visible ink rules."],
                "dont": ["Do not use generic rounded SaaS cards."]
            }).to_string(),
            "tags": json!(["editorial", "ink"]).to_string()
        });

        let md = render_design_md_projection("compact-editorial-ink", &fields);

        assert!(md.contains("version: \"alpha\""));
        assert!(md.contains("components:"));
        assert!(md.contains("## Visual Character"));
        assert!(md.contains("Tight column grids"));
        assert!(md.contains("## Do's and Don'ts"));
        assert!(md.contains("editorial"));
    }

    #[test]
    fn composition_projections_are_self_contained_and_guard_ready() {
        let fields = json!({
            "name": "Margin Signal Ledger",
            "slug": "margin-signal-ledger",
            "philosophy": json!({
                "summary": "Dense margin-led knowledge work surfaces.",
                "visual_character": ["Thin rules and annotated side rails."]
            }).to_string(),
            "tokens": json!({
                "colors": {
                    "background": "#f8fafc",
                    "foreground": "#111827",
                    "primary": "#1f2937",
                    "accent": "#2563eb",
                    "border": "#d4d4d8"
                }
            }).to_string(),
            "rules": json!({
                "signature_patterns": ["Use ledgers and status rails to organize review work."]
            }).to_string(),
            "layout_principles": json!({"grid": "side rail and dense content well"}).to_string(),
            "guidance": json!({"do": ["Preserve density without hiding hierarchy."]}).to_string()
        });

        let landing = render_landing_composition_projection("dl-ledger", &fields);
        let dashboard = render_dashboard_composition_projection("dl-ledger", &fields);

        assert!(landing.contains("--hero-image"));
        assert!(landing.contains("<html"));
        assert!(dashboard.contains("Dashboard"));
        assert!(dashboard.contains("status"));
        verify_file_body(
            "dl-ledger",
            "fl-landing",
            "composition_landing",
            None,
            &landing,
        )
        .expect("landing composition should verify");
        verify_file_body(
            "dl-ledger",
            "fl-dashboard",
            "composition_dashboard",
            None,
            &dashboard,
        )
        .expect("dashboard composition should verify");
    }

    #[test]
    fn json_object_field_accepts_pascal_case_storage() {
        let fields = json!({
            "LayoutPrinciples": "{\"grid\":\"modular\"}"
        });

        let layout = json_object_field(&fields, "layout_principles");

        assert_eq!(layout.get("grid").and_then(|v| v.as_str()), Some("modular"));
    }

    #[test]
    fn scalar_helpers_accept_pascal_case_storage() {
        let fields = json!({
            "DesignMdLintResult": "{\"summary\":{\"errors\":0,\"warnings\":0}}",
            "HasDesignMd": true
        });

        assert_eq!(
            string_field_any(&fields, "design_md_lint_result", ""),
            "{\"summary\":{\"errors\":0,\"warnings\":0}}"
        );
        assert!(bool_field(&fields, "has_design_md"));
        assert!(entity_bool_any(&json!({"fields": fields}), "has_design_md"));
    }

    #[test]
    fn parent_session_id_propagates_to_followup_job_create_body() {
        let fields = json!({
            "Input": json!({"ParentSessionId": "ss-parent"}).to_string()
        });
        let parent_session_id = parent_session_id_from_fields(&fields);

        assert_eq!(parent_session_id.as_deref(), Some("ss-parent"));
        assert_eq!(
            curation_job_create_body(parent_session_id.as_deref()),
            json!({"fields": {"ParentSessionId": "ss-parent"}})
        );
    }

    #[test]
    fn thumbnail_mime_rejects_octet_stream_when_payload_is_base64_text() {
        assert!(!thumbnail_mime_type_is_acceptable(
            "application/octet-stream",
            "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"
        ));
        assert!(!thumbnail_mime_type_is_acceptable(
            "application/octet-stream",
            "<html><body>not a thumbnail</body></html>"
        ));
    }

    #[test]
    fn thumbnail_mime_rejects_text_plain_when_payload_is_base64_text() {
        assert!(!thumbnail_mime_type_is_acceptable(
            "text/plain",
            "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"
        ));
    }

    #[test]
    fn thumbnail_body_rejects_base64_text_even_with_image_mime() {
        let result = verify_file_body(
            "dl-test",
            "fl-test",
            "thumbnail",
            None,
            "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVF",
        );

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("not browser-renderable image bytes"));
    }

    #[test]
    fn created_thumbnail_recovery_extracts_image_bytes_from_agent_command_output() {
        let recovered = recoverable_image_bytes_from_text(
            "data:image/jpeg;base64,/9j/4AAQSkZJRg==\n[exit code: 0]\n",
            "image/jpeg",
        )
        .expect("base64 JPEG content with shell footer should be recoverable");

        assert_eq!(recovered.mime_type, "image/jpeg");
        assert!(recovered.bytes.starts_with(&[0xff, 0xd8, 0xff]));
        assert!(recovered.bytes.len() > 8);
    }

    #[test]
    fn missing_and_invalid_artifact_errors_are_repairable() {
        for error in [
            "DesignLanguage 'dl' has no thumbnail_file_id",
            "DesignLanguage 'dl' thumbnail file 'fl' is too small (92 bytes)",
            "DesignLanguage 'dl' has no embodiment_file_id",
            "DesignLanguage 'dl' embodiment file 'fl' expected Ready",
            "Quality review cannot proceed: DesignLanguage dl is deeply empty/incoherent and missing required native Katagami spec sections; run synthesize or regenerate_embodiment first",
        ] {
            assert!(
                is_repairable_language_artifact_error(error),
                "{error} should be classified as contract-repairable"
            );
        }

        assert!(!is_repairable_language_artifact_error(
            "DesignLanguage 'dl' uses its slug as the entity ID"
        ));
    }

    #[test]
    fn artifact_repair_attempts_increment_and_cap() {
        let fields = json!({
            "input": json!({"artifact_repair_attempt": 1}).to_string()
        });

        assert_eq!(next_artifact_repair_attempt(&fields, 2), Some(2));
        assert_eq!(next_artifact_repair_attempt(&fields, 1), None);
    }

    #[test]
    fn provider_stream_failures_are_transient_retry_candidates() {
        assert!(is_transient_provider_failure("OpenAI stream ended early"));
        assert!(is_transient_provider_failure(
            "provider stream closed before final message"
        ));
        assert!(!is_transient_provider_failure(
            "DesignLanguage 'dl' is missing required spec sections"
        ));
    }

    #[test]
    fn action_state_rejections_are_detected_for_idempotent_completion() {
        assert!(action_rejected_for_current_state(
            "Failed to dispatch CurationQueries('q').SynthesisComplete: HTTP 409: {\"error\":{\"code\":\"ActionFailed\",\"message\":\"Action 'SynthesisComplete' not valid from state 'Organizing'\"}}"
        ));
        assert!(!action_rejected_for_current_state(
            "Failed to dispatch CurationQueries('q').SynthesisComplete: HTTP 500"
        ));
    }

    #[test]
    fn raw_tool_call_completion_is_retryable_not_successful_regeneration() {
        let fields = json!({
            "output": "Tool call call_lI7pYVXXeFK8Id7b39Q0NP: execute({\"code\":\"skill = temper.read('/agents/curator/skills/synthesize-language/SKILL.md')\"})"
        });

        assert!(typed_completion_output_is_unfinished_tool_call(&fields));
        assert!(is_transient_provider_failure(
            "regenerate_embodiment typed completion ended with an unfinished tool call instead of dispatching CompleteRegeneration"
        ));
    }

    #[test]
    fn source_search_completion_without_directions_is_retryable_not_successful() {
        let fields = json!({
            "direction_ids": "[]"
        });

        let error = verify_source_search_completion(&fields)
            .expect_err("empty source_search direction_ids should be rejected");

        assert!(error.contains("typed completion did not report any direction_ids"));
        assert!(is_transient_provider_failure(&error));
    }

    #[test]
    fn source_search_completion_with_directions_is_validated() {
        let fields = json!({
            "direction_ids": "[\"dir-1\"]"
        });

        let validation =
            verify_source_search_completion(&fields).expect("non-empty directions are valid");

        assert_eq!(validation["validated"], true);
        assert_eq!(validation["direction_count"], 1);
    }

    #[test]
    fn contract_repair_input_preserves_existing_artifacts_and_defects() {
        let fields = json!({
            "input": json!({"task": "repair this language"}).to_string(),
            "design_language_ids": "[\"en-existing\"]"
        });
        let validation = json!({
            "validated": false,
            "defects": [
                contract_defect(
                    "synthesize",
                    Some("en-existing"),
                    "DesignLanguage 'en-existing' has no thumbnail_file_id"
                )
            ]
        });

        let input = contract_repair_input("synthesize", &fields, &validation, 2)
            .expect("repair input should render");
        let repair = input
            .get("contract_repair")
            .expect("repair context should be present");

        assert_eq!(input["language_ids"], json!(["en-existing"]));
        assert_eq!(input["existing_language_id"], "en-existing");
        assert_eq!(repair["attempt"], 2);
        assert_eq!(repair["do_not_create_duplicates"], true);
        assert_eq!(
            repair["existing_design_language_ids"],
            json!(["en-existing"])
        );
        assert_eq!(repair["defects"][0]["code"], "missing_or_invalid_thumbnail");
    }

    #[test]
    fn contract_repair_input_preserves_validator_partial_ids_when_job_fields_are_empty() {
        let fields = json!({
            "input": json!({"task": "repair this language"}).to_string()
        });
        let validation = json!({
            "validated": false,
            "job_type": "synthesize",
            "incomplete_language_ids": ["en-partial"],
            "defects": [
                contract_defect(
                    "synthesize",
                    Some("en-partial"),
                    "DesignLanguage 'en-partial' missing thumbnail_file_id"
                )
            ]
        });

        let input = contract_repair_input("synthesize", &fields, &validation, 2)
            .expect("repair input should be created from validator partial ids");
        let repair = input
            .get("contract_repair")
            .expect("repair context should be present");

        assert_eq!(input["language_ids"], json!(["en-partial"]));
        assert_eq!(input["existing_language_id"], "en-partial");
        assert_eq!(
            repair["existing_design_language_ids"],
            json!(["en-partial"])
        );
    }

    #[test]
    fn contract_repair_existing_language_ids_are_a_set_invariant() {
        let fields = json!({
            "input": json!({
                "contract_repair": {
                    "existing_design_language_ids": ["en-existing", "en-second", "en-existing"]
                }
            }).to_string()
        });

        let expected =
            contract_repair_existing_language_ids(&fields).expect("repair ids should parse");

        assert_eq!(expected, vec!["en-existing", "en-second"]);
        assert!(same_string_set(
            &["en-second".to_string(), "en-existing".to_string()],
            &expected
        ));
        assert!(!same_string_set(&["en-new".to_string()], &expected));
        assert_eq!(
            contract_defect(
                "synthesize",
                None,
                "synthesize repair target mismatch: duplicate DesignLanguage created"
            )["code"],
            "repair_target_mismatch"
        );
    }

    #[test]
    fn contract_validation_ids_fall_back_to_existing_repair_artifacts() {
        let fields = json!({
            "output": "Tool call call_123: execute({\"code\":\"still reading\"})",
            "input": json!({
                "contract_repair": {
                    "existing_design_language_ids": ["en-existing"]
                }
            }).to_string()
        });

        assert!(typed_completion_output_is_unfinished_tool_call(&fields));
        assert_eq!(
            design_language_ids_from_completion(&fields),
            Vec::<String>::new()
        );
        assert_eq!(
            design_language_ids_for_contract_validation(&fields),
            vec!["en-existing"]
        );
    }

    #[test]
    fn partial_design_language_contract_defects_only_blocks_non_derivable_artifacts() {
        let language = json!({
            "status": "Draft",
            "fields": {
                "name": "AYA Woven Reading Workspace",
                "philosophy": "{\"summary\":\"ok\"}",
                "tokens": "{\"colors\":{}}",
                "rules": "{\"signature_patterns\":[]}",
                "layout_principles": "{\"grid\":\"ok\"}",
                "guidance": "{\"do\":[]}",
                "has_philosophy": true,
                "has_tokens": true,
                "has_rules": true,
                "has_layout": true,
                "has_guidance": true,
                "has_design_md": false,
                "has_valid_design_md": false,
                "shadcn_component_spec_verified": false,
                "shadcn_preview_shots_verified": false
            }
        });

        let defects =
            partial_design_language_contract_defects("synthesize", "en-partial", &language);
        let codes = defects
            .iter()
            .filter_map(|defect| defect.get("code").and_then(|value| value.as_str()))
            .collect::<Vec<_>>();
        let messages = defects
            .iter()
            .filter_map(|defect| defect.get("message").and_then(|value| value.as_str()))
            .collect::<Vec<_>>()
            .join("\n");

        assert!(codes.contains(&"missing_or_invalid_thumbnail"));
        assert!(codes.contains(&"missing_or_invalid_embodiment"));
        assert!(!codes.contains(&"missing_or_invalid_design_md"));
        assert!(!codes.contains(&"missing_or_invalid_shadcn_artifacts"));
        assert!(messages.contains("missing thumbnail_file_id"));
        assert!(messages.contains("missing embodiment_file_id"));
        assert!(!messages.contains("DESIGN.md"));
        assert!(!messages.contains("shadcn"));
    }

    #[test]
    fn curation_job_filter_uses_query_and_direction_without_bounded_scan() {
        let filter = curation_job_filter("synthesize", "query-with-'quote'", Some("direction-1"));

        assert_eq!(
            filter,
            "job_type eq 'synthesize' and query_id eq 'query-with-''quote''' and direction_id eq 'direction-1'"
        );
        assert_eq!(
            url_query_component(&filter),
            "job_type%20eq%20%27synthesize%27%20and%20query_id%20eq%20%27query-with-%27%27quote%27%27%27%20and%20direction_id%20eq%20%27direction-1%27"
        );
    }

    #[test]
    fn contract_validation_false_requires_repair() {
        let validation = json!({
            "validated": false,
            "defects": [contract_defect("quality_review", Some("dl"), "no shadcn artifacts")]
        });

        assert!(validation_needs_repair(&validation));
        assert!(is_repairable_contract_error(
            "synthesize",
            "synthesize typed completion did not report any design_language_ids"
        ));
    }

    #[test]
    fn typed_success_routes_through_validator_gated_internal_actions() {
        let fields = json!({
            "design_language_ids": "[\"en-1\"]"
        });
        let fallback = json!([
            {"action": "created_quality_review_job", "job_id": "job-review"}
        ]);

        let (action, params) = typed_success_terminal_action("synthesize", &fields, &fallback);

        assert_eq!(action, "PublishSynthesisCompletion");
        assert_eq!(params["followup_job_id"], "job-review");
        assert_eq!(params["design_language_ids"], "[\"en-1\"]");

        let (action, _) = typed_success_terminal_action("source_search", &json!({}), &json!([]));
        assert_eq!(action, "PublishResearchCompletion");

        let fallback = json!([
            {"action": "collected_synthesis_jobs", "job_ids": ["job-synth-1"]}
        ]);
        let (action, params) =
            typed_success_terminal_action("source_search", &json!({}), &fallback);
        assert_eq!(action, "PublishResearchCompletion");
        assert_eq!(params["followup_job_id"], "job-synth-1");
        assert_eq!(params["synthesize_job_ids"], "[\"job-synth-1\"]");

        let (action, _) =
            typed_success_terminal_action("organize_taxonomy", &json!({}), &json!([]));
        assert_eq!(action, "PublishOrganizationCompletion");
    }

    #[test]
    fn design_md_projection_refreshes_missing_or_dirty_lint_metadata() {
        assert_eq!(
            design_md_projection_refresh_reason(
                &test_context(),
                "",
                &[],
                "dl-test",
                &json!({}),
                ""
            ),
            Some("missing_design_md_file_id")
        );
        assert_eq!(
            design_md_projection_refresh_reason(
                &test_context(),
                "",
                &[],
                "dl-test",
                &json!({}),
                "fl-design-md"
            ),
            Some("missing_design_md_lint_result")
        );
        assert_eq!(
            design_md_projection_refresh_reason(
                &test_context(),
                "",
                &[],
                "dl-test",
                &json!({"design_md_lint_result": "{\"summary\":{\"errors\":0,\"warnings\":2}}"}),
                "fl-design-md"
            ),
            Some("design_md_lint_warnings")
        );
        assert_eq!(
            design_md_projection_refresh_reason(
                &test_context(),
                "",
                &[],
                "dl-test",
                &json!({"design_md_lint_result": "{\"summary\":{\"errors\":1,\"warnings\":0}}"}),
                "fl-design-md"
            ),
            Some("design_md_lint_errors")
        );
        assert_eq!(
            design_md_projection_refresh_reason(
                &test_context(),
                "",
                &[],
                "dl-test",
                &json!({"DesignMdLintResult": "{\"summary\":{\"errors\":0,\"warnings\":2}}"}),
                "fl-design-md"
            ),
            Some("design_md_lint_warnings")
        );
    }

    #[test]
    fn design_language_ids_accept_direct_arrays_and_review_aliases() {
        let fields = json!({
            "design_language_ids": ["en-1", "en-2"],
            "fixed_ids": ["en-2", "en-3"],
            "DesignLanguageIds": "[\"en-3\", \"en-4\"]",
            "FixedIds": ["en-4", "en-5"]
        });

        assert_eq!(
            design_language_ids_from_job(&fields),
            vec!["en-1", "en-2", "en-3", "en-4", "en-5"]
        );
    }

    #[test]
    fn completion_language_ids_do_not_fall_back_to_repair_input() {
        let repair_fields = json!({
            "input": json!({
                "existing_language_id": "en-existing",
                "language_ids": ["en-existing"]
            }).to_string()
        });

        assert_eq!(
            design_language_ids_from_job(&repair_fields),
            vec!["en-existing"]
        );
        assert!(design_language_ids_from_completion(&repair_fields).is_empty());

        let completed_fields = json!({
            "design_language_ids": "[\"en-existing\"]"
        });
        assert_eq!(
            design_language_ids_from_completion(&completed_fields),
            vec!["en-existing"]
        );
    }

    #[test]
    fn trigger_params_override_pre_action_completion_fields() {
        let mut fields = json!({
            "job_type": "quality_review",
            "DesignLanguageIds": "[]"
        });
        merge_trigger_params_into_fields(
            &mut fields,
            &json!({
                "DesignLanguageIds": "[\"en-trigger\"]",
                "OrganizeInput": "{}"
            }),
        );

        assert_eq!(design_language_ids_from_job(&fields), vec!["en-trigger"]);
    }

    #[test]
    fn design_language_ids_fall_back_to_json_output_aliases() {
        let fields = json!({
            "Output": json!({
                "ReviewedIds": ["en-reviewed"],
                "FixedIds": ["en-fixed"]
            }).to_string()
        });

        assert_eq!(
            design_language_ids_from_job(&fields),
            vec!["en-reviewed", "en-fixed"]
        );
    }

    #[test]
    fn pawfs_path_helpers_normalize_and_build_direct_keys() {
        let normalized = normalize_pawfs_path("katagami//design-md/./slug/DESIGN.md").unwrap();
        assert_eq!(normalized, "/katagami/design-md/slug/DESIGN.md");
        assert!(normalize_pawfs_path("/katagami/../secret").is_err());
        assert_eq!(
            split_pawfs_file_path("/katagami/design-md/slug/DESIGN.md").unwrap(),
            (
                "/katagami/design-md/slug".to_string(),
                "DESIGN.md".to_string()
            )
        );

        assert_eq!(
            pawfs_file_id("ws-1", &normalized),
            pawfs_file_id("ws-1", "/katagami/design-md/slug/DESIGN.md")
        );
        assert_ne!(
            pawfs_file_id("ws-1", &normalized),
            pawfs_file_id("ws-2", &normalized)
        );
        assert_ne!(
            pawfs_directory_id("ws-1", &normalized),
            pawfs_file_id("ws-1", &normalized)
        );
        assert!(pawfs_directory_id("ws-1", &normalized).starts_with("dir-"));
        assert!(pawfs_file_id("ws-1", &normalized).starts_with("fl-"));
    }

    #[test]
    fn failed_job_session_cleanup_tolerates_terminal_sessions() {
        for status in ["Completed", "Failed", "Cancelled"] {
            assert!(session_is_terminal(status));
            assert!(!session_can_be_finalized(status));
        }

        for status in ["Thinking", "Executing"] {
            assert!(!session_is_terminal(status));
            assert!(session_can_be_finalized(status));
        }
    }

    #[test]
    fn public_asset_urls_use_katagami_worker_host() {
        assert_eq!(
            canonicalize_katagami_public_asset_url(
                "https://temperpaw-assets.katagami.ai/katagami/design-languages/x/embodiment.html"
            ),
            "https://assets.katagami.ai/katagami/design-languages/x/embodiment.html"
        );
        assert_eq!(
            canonicalize_katagami_public_asset_url(
                "https://assets.katagami.ai/katagami/design-languages/x/embodiment.html"
            ),
            "https://assets.katagami.ai/katagami/design-languages/x/embodiment.html"
        );
    }
}
