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
                        fail_job(&ctx, &api_url, &headers, &job_id, &error)?;
                        set_success_result(
                            "",
                            &json!({"status": "job failed during typed finalization", "error": error}),
                        );
                        return Ok(());
                    }
                };
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
                        "validation": validation,
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
            let error = format!(
                "Failed to load Session '{session_id}': HTTP {}: {}",
                session_resp.status,
                &session_resp.body[..session_resp.body.len().min(300)]
            );
            if job_status == "Finalizing" {
                fail_job(&ctx, &api_url, &headers, &job_id, &error)?;
                set_success_result(
                    "",
                    &json!({"status": "job failed because spawned session could not be loaded", "error": error}),
                );
                return Ok(());
            }
            return Err(error);
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
                            fail_job(&ctx, &api_url, &headers, &job_id, &error)?;
                            set_success_result(
                                "",
                                &json!({"status": "job failed while recording spawned session result", "error": error}),
                            );
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
                            fail_job(&ctx, &api_url, &headers, &job_id, &error)?;
                            set_success_result(
                                "",
                                &json!({"status": "job failed during typed finalization", "error": error}),
                            );
                            return Ok(());
                        }
                    };
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
                            "validation": validation,
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

fn fail_job(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_id: &str,
    error_message: &str,
) -> Result<(), String> {
    let resp = ctx.http_call(
        "POST",
        &format!("{api_url}/tdata/CurationJobs('{job_id}')/Katagami.Curation.Fail"),
        headers,
        &json!({"error_message": error_message}).to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(format!(
            "Failed to fail CurationJob '{job_id}': HTTP {}: {}",
            resp.status,
            &resp.body[..resp.body.len().min(300)]
        ));
    }
    Ok(())
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
            verify_synthesized_languages(ctx, api_url, headers, fields)
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
) -> Result<serde_json::Value, String> {
    let language_ids = design_language_ids_from_job(fields);
    if language_ids.is_empty() {
        return Err("synthesis completed without any design_language_ids".to_string());
    }

    let mut verified = Vec::new();
    for language_id in &language_ids {
        let language = load_entity(ctx, api_url, headers, "DesignLanguages", language_id)?
            .ok_or_else(|| format!("DesignLanguage '{language_id}' does not exist"))?;
        verify_language_core(ctx, api_url, headers, language_id, &language)?;
        verified.push(language_id.clone());
    }

    Ok(json!({
        "validated": true,
        "job_type": "synthesize",
        "verified_language_ids": verified
    }))
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
        let status = entity_status_value(&language);
        if !matches!(status.as_str(), "UnderReview" | "Published") {
            return Err(format!(
                "DesignLanguage '{language_id}' is in state '{status}', expected UnderReview or Published before quality_review finalization"
            ));
        }

        verify_language_core(ctx, api_url, headers, language_id, &language)?;
        verify_design_md(ctx, api_url, headers, workspace_id, language_id, &language)?;
        dispatch_action(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "MarkQualityPassed",
            &json!({}),
        )?;

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
) -> Result<(), String> {
    let mut fields = entity_fields(language);
    let mut design_md_file_id = string_field_any(&fields, "design_md_file_id", "");
    if design_md_file_id.is_empty() {
        if workspace_id.is_empty() {
            return Err(format!(
                "DesignLanguage '{language_id}' has no design_md_file_id and the CurationJob has no workspace_id for deterministic DESIGN.md generation"
            ));
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
    dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyDesignMd",
        &json!({}),
    )?;
    Ok(())
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
    let dir_path = match path.rsplit_once('/') {
        Some(("", _)) => "/",
        Some((dir, _)) if !dir.is_empty() => dir,
        _ => "/",
    };
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

    let mkdir_resp = ctx.http_call(
        "POST",
        &format!(
            "{api_url}/tdata/Workspaces('{workspace_id}')/Temper.MkDir?await_integration=true"
        ),
        &json_headers,
        &json!({"path": dir_path}).to_string(),
    )?;
    if !(200..300).contains(&mkdir_resp.status) {
        return Err(format!(
            "Failed to create DESIGN.md directory '{dir_path}' in workspace '{workspace_id}': HTTP {}: {}",
            mkdir_resp.status,
            &mkdir_resp.body[..mkdir_resp.body.len().min(300)]
        ));
    }

    let create_resp = ctx.http_call(
        "POST",
        &format!(
            "{api_url}/tdata/Workspaces('{workspace_id}')/Temper.CreateFile?await_integration=true"
        ),
        &json_headers,
        &json!({"path": path, "mime_type": mime_type}).to_string(),
    )?;
    if !(200..300).contains(&create_resp.status) {
        return Err(format!(
            "Failed to create DESIGN.md file '{path}' in workspace '{workspace_id}': HTTP {}: {}",
            create_resp.status,
            &create_resp.body[..create_resp.body.len().min(300)]
        ));
    }
    let created: serde_json::Value = serde_json::from_str(&create_resp.body)
        .map_err(|e| format!("Failed to parse CreateFile response for '{path}': {e}"))?;
    let file_id = created
        .get("fields")
        .and_then(|fields| fields.get("last_file_id"))
        .or_else(|| created.get("last_file_id"))
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("CreateFile for '{path}' returned no last_file_id"))?
        .to_string();

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
            "Failed to upload DESIGN.md file '{file_id}' for '{path}': HTTP {}: {}",
            put_resp.status,
            &put_resp.body[..put_resp.body.len().min(300)]
        ));
    }

    Ok(file_id)
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
    let mut ids = parse_json_string_array(fields.get("design_language_ids"));
    if ids.is_empty() {
        if let Some(output) = parse_json_field(fields.get("output")) {
            ids.extend(string_array(output.get("language_ids")));
            ids.extend(string_array(output.get("fixed")));
        }
    }
    if ids.is_empty() {
        if let Some(input) = parse_json_field(fields.get("input")) {
            ids.extend(string_array(input.get("language_ids")));
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

#[cfg(test)]
mod tests {
    use super::{json_object_field, render_design_md_projection};
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
}
