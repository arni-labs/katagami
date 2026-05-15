use temper_wasm_sdk::prelude::*;

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
                let validation = match verify_typed_completion(
                    &ctx,
                    &api_url,
                    &headers,
                    &job_id,
                    &job_type,
                    &fields,
                    &workspace_id,
                ) {
                    Ok(validation) => validation,
                    Err(error) => {
                        set_failed_job_callback(&ctx, &job_id, &error);
                        return Ok(());
                    }
                };
                let fallback = match run_typed_completion_fallback(
                    &ctx,
                    &api_url,
                    &headers,
                    &job_id,
                    &job_type,
                    &fields,
                    &workspace_id,
                    &query_id,
                ) {
                    Ok(fallback) => fallback,
                    Err(error) => {
                        set_failed_job_callback(&ctx, &job_id, &error);
                        return Ok(());
                    }
                };
                ctx.log(
                    "info",
                    &format!(
                        "finalize_spawned_session: typed no-session validation passed for job '{job_id}': {validation}; fallback: {fallback}"
                    ),
                );
                set_terminal_job_callback(
                    &ctx,
                    &job_id,
                    "FinalizeCompletion",
                    json!({
                        "followup_job_id": "",
                        "design_language_ids": fields
                            .get("design_language_ids")
                            .and_then(|v| v.as_str())
                            .unwrap_or("[]"),
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
                    let validation = match verify_typed_completion(
                        &ctx,
                        &api_url,
                        &headers,
                        &job_id,
                        &job_type,
                        &fields,
                        &workspace_id,
                    ) {
                        Ok(validation) => validation,
                        Err(error) => {
                            set_failed_job_callback(&ctx, &job_id, &error);
                            return Ok(());
                        }
                    };
                    let fallback = match run_typed_completion_fallback(
                        &ctx,
                        &api_url,
                        &headers,
                        &job_id,
                        &job_type,
                        &fields,
                        &workspace_id,
                        &query_id,
                    ) {
                        Ok(fallback) => fallback,
                        Err(error) => {
                            set_failed_job_callback(&ctx, &job_id, &error);
                            return Ok(());
                        }
                    };
                    ctx.log(
                        "info",
                        &format!(
                            "finalize_spawned_session: typed validation passed for job '{job_id}': {validation}; session: {record_status}; fallback: {fallback}"
                        ),
                    );
                    set_terminal_job_callback(
                        &ctx,
                        &job_id,
                        "FinalizeCompletion",
                        json!({
                            "followup_job_id": "",
                            "design_language_ids": fields
                                .get("design_language_ids")
                                .and_then(|v| v.as_str())
                                .unwrap_or("[]"),
                        }),
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
                let record_status = record_session_failure(
                    &ctx,
                    &api_url,
                    &headers,
                    &session_id,
                    session_status,
                    error_message,
                )?;
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
        return Err(format!(
            "Failed to finalize Session '{session_id}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }

    Ok("session finalized")
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
            verify_synthesized_languages(ctx, api_url, headers, fields, job_type)
        }
        "quality_review" => {
            verify_quality_reviewed_languages(ctx, api_url, headers, fields, workspace_id)
        }
        "organize_taxonomy" => Ok(json!({
            "validated": true,
            "job_type": job_type,
            "scope": "taxonomy organization"
        })),
        "source_search" => Ok(json!({
            "validated": true,
            "job_type": job_type,
            "scope": "source metadata and direction fan-out"
        })),
        _ => Ok(json!({"validated": true, "job_type": job_type})),
    }
}

fn verify_synthesized_languages(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
    job_type: &str,
) -> Result<serde_json::Value, String> {
    let language_ids = design_language_ids_from_job(fields);
    if language_ids.is_empty() {
        return Err("synthesis completed without any design_language_ids".to_string());
    }

    let mut verified = Vec::new();
    let mut incomplete = Vec::new();
    for language_id in &language_ids {
        let language = match load_entity(ctx, api_url, headers, "DesignLanguages", language_id)? {
            Some(l) => l,
            None => {
                ctx.log(
                    "warn",
                    &format!("verify_synthesized: DesignLanguage '{language_id}' does not exist, skipping"),
                );
                continue;
            }
        };
        if matches!(job_type, "synthesize" | "evolve_language") {
            verify_generated_language_identity(language_id, &language)?;
        }
        verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language).map_err(|e| {
            format!("{job_type} completion requires a valid gallery thumbnail before review: {e}")
        })?;
        match verify_language_core(ctx, api_url, headers, language_id, &language) {
            Ok(()) => {
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
                    &format!("verify_synthesized: {e} — passing to quality_review for remediation"),
                );
                incomplete.push(language_id.clone());
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
    }))
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

    let mut published = Vec::new();
    for language_id in &language_ids {
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| format!("DesignLanguage '{language_id}' does not exist"))?;
        let mut status = entity_status_value(&language);
        if !matches!(status.as_str(), "Draft" | "UnderReview" | "Published") {
            return Err(format!(
                "DesignLanguage '{language_id}' is in state '{status}', expected Draft, UnderReview, or Published before quality_review finalization"
            ));
        }

        verify_language_core(ctx, api_url, headers, language_id, &language)?;
        if verify_design_md(ctx, api_url, headers, workspace_id, language_id, &language)?
            && status == "Published"
        {
            status = "UnderReview".to_string();
        }
        verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language)?;
        publish_public_assets(ctx, api_url, headers, language_id, &language)?;
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "MarkQualityPassed",
            &json!({}),
        )?;

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
            dispatch_action(
                ctx,
                api_url,
                headers,
                "DesignLanguages",
                language_id,
                "Publish",
                &json!({}),
            )?;
        } else if status == "UnderReview" {
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
        published.push(language_id.clone());
    }

    Ok(json!({
        "validated": true,
        "job_type": "quality_review",
        "published_language_ids": published
    }))
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
    let refresh_reason = design_md_projection_refresh_reason(&fields, &design_md_file_id);
    if let Some(refresh_reason) = refresh_reason {
        if workspace_id.is_empty() {
            return Err(format!(
                "DesignLanguage '{language_id}' needs deterministic DESIGN.md generation ({refresh_reason}) but the CurationJob has no workspace_id"
            ));
        }
        if status == "Published" {
            revise_published_for_design_md(ctx, api_url, headers, language_id)?;
            revised = true;
        }
        let generated = render_design_md_projection(language_id, &fields);
        let generated_file_id = write_workspace_file(
            ctx,
            api_url,
            workspace_id,
            &format!(
                "/katagami/design-md/{}/DESIGN.md",
                design_md_slug(language_id, &fields)
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
        fields = entity_fields(&refreshed);
        design_md_file_id = string_field_any(&fields, "design_md_file_id", "");
    }
    verify_file_value(
        ctx,
        api_url,
        headers,
        language_id,
        &design_md_file_id,
        "design_md",
        None,
    )?;
    verify_design_md_lint_result(language_id, &fields)?;

    // Revise resets has_design_md but leaves design_md_file_id intact.
    // Re-attach if the boolean is false so the Publish guard passes.
    let fresh =
        load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?.ok_or_else(|| {
            format!("DesignLanguage '{language_id}' disappeared before VerifyDesignMd")
        })?;
    let fresh_bools = fresh.get("booleans").cloned().unwrap_or_else(|| json!({}));
    if !bool_field(&fresh_bools, "has_design_md") {
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

    let file = load_entity(ctx, api_url, headers, "Files", &thumbnail_file_id)?
        .ok_or_else(|| {
            format!("DesignLanguage '{language_id}' thumbnail file '{thumbnail_file_id}' does not exist")
        })?;
    let file_status = entity_status_value(&file);
    if !file_status.is_empty() && !matches!(file_status.as_str(), "Ready" | "Locked") {
        return Err(format!(
            "DesignLanguage '{language_id}' thumbnail file '{thumbnail_file_id}' is in state '{file_status}', expected Ready"
        ));
    }

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

fn verify_file_value(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    file_id: &str,
    artifact_kind: &str,
    embodiment_format: Option<&str>,
) -> Result<(), String> {
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
    find_first_entity_id(
        ctx,
        api_url,
        headers,
        "Directories",
        &format!(
            "Path eq '{}' and WorkspaceId eq '{}' and Status ne 'Archived'",
            odata_escape(path),
            odata_escape(workspace_id)
        ),
    )
}

fn find_pawfs_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    workspace_id: &str,
    path: &str,
) -> Result<Option<String>, String> {
    find_first_entity_id(
        ctx,
        api_url,
        headers,
        "Files",
        &format!(
            "Path eq '{}' and WorkspaceId eq '{}' and Status ne 'Archived'",
            odata_escape(path),
            odata_escape(workspace_id)
        ),
    )
}

fn find_first_entity_id(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &str,
    filter: &str,
) -> Result<Option<String>, String> {
    let url = pawfs_filter_url(api_url, set_name, filter);
    let resp = ctx.http_call("GET", &url, headers, "")?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to query {set_name} with filter '{filter}': HTTP {}: {}",
            resp.status,
            truncate_body(&resp.body, 300)
        ));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body)
        .map_err(|e| format!("Failed to parse {set_name} query response: {e}"))?;
    Ok(parsed
        .get("value")
        .and_then(|value| value.as_array())
        .and_then(|items| items.first())
        .and_then(extract_entity_id))
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

fn pawfs_filter_url(api_url: &str, set_name: &str, filter: &str) -> String {
    format!(
        "{api_url}/tdata/{set_name}?$filter={}",
        odata_filter_encode(filter)
    )
}

fn odata_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn odata_filter_encode(filter: &str) -> String {
    let mut encoded = String::new();
    for byte in filter.bytes() {
        match byte {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'~'
            | b'/'
            | b'('
            | b')'
            | b'$' => encoded.push(byte as char),
            b' ' => encoded.push_str("%20"),
            b'\'' => encoded.push_str("%27"),
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn extract_entity_id(entity: &serde_json::Value) -> Option<String> {
    entity
        .get("entity_id")
        .or_else(|| entity.get("Id"))
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
}

fn truncate_body(body: &str, max_len: usize) -> &str {
    &body[..body.len().min(max_len)]
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
        "---\nversion: \"alpha\"\nname: {}\ndescription: {}\ncolors:\n{}typography:\n{}rounded: {}\nspacing: {}\ncomponents:\n{}---\n\n# {}\n\n## Overview\n\n{}\n\n## Colors\n\n{}\n\n## Typography\n\n{}\n\n## Layout\n\n{}\n\n## Elevation & Depth\n\n{}\n\n## Shapes\n\n{}\n\n## Components\n\n{}\n\n## Do's and Don'ts\n\n### Do\n{}\n\n### Don't\n{}\n\n## Visual Character\n{}\n\n## Signature Patterns\n{}\n\n## Tags\n{}\n",
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
        public_url,
    })
}

fn design_md_projection_refresh_reason(
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
        Some("design_md_lint_errors")
    } else if warnings != 0 {
        Some("design_md_lint_warnings")
    } else {
        None
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
        "language_ids",
        "reviewed_ids",
        "fixed_ids",
    ] {
        ids.extend(string_array_flexible(fields.get(field_name)));
    }
    if ids.is_empty() {
        if let Some(output) = parse_json_field(fields.get("output")) {
            for field_name in [
                "design_language_ids",
                "language_ids",
                "reviewed_ids",
                "fixed_ids",
                "fixed",
            ] {
                ids.extend(string_array_flexible(output.get(field_name)));
            }
        }
    }
    if ids.is_empty() {
        if let Some(input) = parse_json_field(fields.get("input")) {
            ids.extend(string_array_flexible(input.get("language_ids")));
            ids.extend(string_array_flexible(input.get("design_language_ids")));
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
    fields.get(name).is_some_and(|value| {
        value
            .as_bool()
            .unwrap_or_else(|| value.as_str().is_some_and(|s| s == "true"))
    })
}

fn string_field_any(fields: &serde_json::Value, name: &str, default: &str) -> String {
    fields
        .get(name)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(default)
        .to_string()
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
mod tests {
    use super::{
        design_language_ids_from_job, design_md_projection_refresh_reason, json_object_field,
        normalize_pawfs_path, pawfs_filter_url, render_design_md_projection,
        session_can_be_finalized, session_is_terminal, split_pawfs_file_path,
        thumbnail_mime_type_is_acceptable, verify_file_body,
    };
    use serde_json::json;

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
    fn json_object_field_accepts_pascal_case_storage() {
        let fields = json!({
            "LayoutPrinciples": "{\"grid\":\"modular\"}"
        });

        let layout = json_object_field(&fields, "layout_principles");

        assert_eq!(layout.get("grid").and_then(|v| v.as_str()), Some("modular"));
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
    fn design_md_projection_refreshes_missing_or_dirty_lint_metadata() {
        assert_eq!(
            design_md_projection_refresh_reason(&json!({}), ""),
            Some("missing_design_md_file_id")
        );
        assert_eq!(
            design_md_projection_refresh_reason(&json!({}), "fl-design-md"),
            Some("missing_design_md_lint_result")
        );
        assert_eq!(
            design_md_projection_refresh_reason(
                &json!({"design_md_lint_result": "{\"summary\":{\"errors\":0,\"warnings\":2}}"}),
                "fl-design-md"
            ),
            Some("design_md_lint_warnings")
        );
        assert_eq!(
            design_md_projection_refresh_reason(
                &json!({"design_md_lint_result": "{\"summary\":{\"errors\":0,\"warnings\":0}}"}),
                "fl-design-md"
            ),
            None
        );
    }

    #[test]
    fn design_language_ids_accept_direct_arrays_and_review_aliases() {
        let fields = json!({
            "design_language_ids": ["en-1", "en-2"],
            "fixed_ids": ["en-2", "en-3"]
        });

        assert_eq!(
            design_language_ids_from_job(&fields),
            vec!["en-1", "en-2", "en-3"]
        );
    }

    #[test]
    fn design_language_ids_fall_back_to_json_output_aliases() {
        let fields = json!({
            "output": json!({
                "reviewed_ids": ["en-reviewed"],
                "fixed_ids": ["en-fixed"]
            }).to_string()
        });

        assert_eq!(
            design_language_ids_from_job(&fields),
            vec!["en-reviewed", "en-fixed"]
        );
    }

    #[test]
    fn pawfs_path_helpers_normalize_and_build_exact_lookup_urls() {
        assert_eq!(
            normalize_pawfs_path("katagami//design-md/./slug/DESIGN.md").unwrap(),
            "/katagami/design-md/slug/DESIGN.md"
        );
        assert!(normalize_pawfs_path("/katagami/../secret").is_err());
        assert_eq!(
            split_pawfs_file_path("/katagami/design-md/slug/DESIGN.md").unwrap(),
            (
                "/katagami/design-md/slug".to_string(),
                "DESIGN.md".to_string()
            )
        );

        let url = pawfs_filter_url(
            "https://temper.example",
            "Files",
            "Path eq '/katagami/design-md/slug/DESIGN.md' and WorkspaceId eq 'ws-1'",
        );

        assert!(url.contains("/tdata/Files?$filter="));
        assert!(url.contains("Path%20eq%20%27/katagami/design-md/slug/DESIGN.md%27"));
        assert!(url.contains("WorkspaceId%20eq%20%27ws-1%27"));
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
}
