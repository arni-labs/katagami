use temper_wasm_sdk::prelude::*;

const ERROR_CONTRACT: &str = "katagami.finalizer.verification.v1";
const SHADCN_COMPONENTS: [&str; 16] = [
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

/// Finalize a CurationJob's spawned session.
///
/// This module is intentionally thin: it records the TemperPaw session result,
/// verifies the artifacts the agent attached, marks verifier-owned booleans, and
/// returns structured errors. Follow-up job creation, file projection, and
/// repair work belong to IOA triggers and the originating agent job.
#[unsafe(no_mangle)]
pub extern "C" fn run(_ctx_ptr: i32, _ctx_len: i32) -> i32 {
    let result = (|| -> Result<(), String> {
        let ctx = Context::from_host()?;
        run_inner(&ctx)
    })();

    if let Err(error) = result {
        set_error_result(&error);
    }
    0
}

fn run_inner(ctx: &Context) -> Result<(), String> {
    let fields = ctx.entity_state.get("fields").cloned().unwrap_or(json!({}));
    let job_id = ctx
        .entity_state
        .get("entity_id")
        .and_then(|v| v.as_str())
        .unwrap_or(&ctx.entity_id)
        .to_string();
    let job_status = ctx
        .entity_state
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let job_type = string_field_any(&fields, "job_type", "");
    let completion_contract = fields
        .get("completion_contract")
        .and_then(|v| v.as_str())
        .unwrap_or("typed-v1")
        .to_string();
    let workspace_id = string_field_any(&fields, "workspace_id", "");
    let session_id = string_field_any(&fields, "session_id", "");

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

    match job_status {
        "Finalizing" => {
            if completion_contract != "typed-v1" {
                let error = VerificationError::new(
                    "legacy_completion_contract_removed",
                    format!(
                        "CurationJob '{job_id}' uses completion_contract '{completion_contract}'. Legacy finalizer cascade support has been removed; complete through typed-v1 actions and inline triggers."
                    ),
                )
                .repairable(false);
                set_failed_job_callback(ctx, &job_id, &job_type, &error);
                return Ok(());
            }

            let mut session_record_status = "no session_id".to_string();
            if !session_id.is_empty() {
                match record_session_success(ctx, &api_url, &headers, &session_id, &fields) {
                    Ok(status) => session_record_status = status.to_string(),
                    Err(error) => {
                        let error = VerificationError::new("session_record_failed", error)
                            .repairable(false);
                        set_failed_job_callback(ctx, &job_id, &job_type, &error);
                        return Ok(());
                    }
                }
            }

            let finalizing_fields =
                match load_entity(ctx, &api_url, &headers, "CurationJobs", &job_id) {
                    Ok(Some(job)) => entity_fields(&job),
                    Ok(None) => fields.clone(),
                    Err(error) => {
                        let error = error.repairable(false);
                        set_failed_job_callback(ctx, &job_id, &job_type, &error);
                        return Ok(());
                    }
                };

            match verify_typed_completion(
                ctx,
                &api_url,
                &headers,
                &job_type,
                &finalizing_fields,
                &workspace_id,
            ) {
                Ok(validation) => {
                    ctx.log(
                        "info",
                        &format!(
                            "finalize_spawned_session: typed verification passed for job '{job_id}': {validation}; session: {session_record_status}"
                        ),
                    );
                    set_terminal_job_callback(
                        ctx,
                        &job_id,
                        "FinalizeCompletion",
                        json!({
                            "followup_job_id": "",
                            "design_language_ids": finalizing_fields
                                .get("design_language_ids")
                                .and_then(|v| v.as_str())
                                .unwrap_or("[]"),
                        }),
                    );
                }
                Err(error) => {
                    set_failed_job_callback(ctx, &job_id, &job_type, &error);
                }
            }
        }
        "Failed" => {
            if session_id.is_empty() {
                set_success_result(
                    "",
                    &json!({"status": "noop", "reason": "failed job has no session_id"}),
                );
                return Ok(());
            }
            let error_message = fields
                .get("error_message")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or("CurationJob failed");
            let record_status =
                record_session_failure(ctx, &api_url, &headers, &session_id, error_message)?;
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
}

#[derive(Clone, Debug)]
struct VerificationError {
    code: &'static str,
    message: String,
    entity_type: Option<&'static str>,
    entity_id: Option<String>,
    field: Option<&'static str>,
    artifact_kind: Option<&'static str>,
    file_id: Option<String>,
    repairable: bool,
}

impl VerificationError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            entity_type: None,
            entity_id: None,
            field: None,
            artifact_kind: None,
            file_id: None,
            repairable: true,
        }
    }

    fn entity(mut self, entity_type: &'static str, entity_id: impl Into<String>) -> Self {
        self.entity_type = Some(entity_type);
        self.entity_id = Some(entity_id.into());
        self
    }

    fn field(mut self, field: &'static str) -> Self {
        self.field = Some(field);
        self
    }

    fn artifact(mut self, artifact_kind: &'static str, file_id: impl Into<String>) -> Self {
        self.artifact_kind = Some(artifact_kind);
        self.file_id = Some(file_id.into());
        self
    }

    fn repairable(mut self, repairable: bool) -> Self {
        self.repairable = repairable;
        self
    }

    fn payload(&self, job_id: &str, job_type: &str) -> serde_json::Value {
        json!({
            "contract": ERROR_CONTRACT,
            "code": self.code,
            "message": self.message,
            "job_id": job_id,
            "job_type": job_type,
            "entity_type": self.entity_type.unwrap_or(""),
            "entity_id": self.entity_id.as_deref().unwrap_or(""),
            "field": self.field.unwrap_or(""),
            "artifact_kind": self.artifact_kind.unwrap_or(""),
            "file_id": self.file_id.as_deref().unwrap_or(""),
            "repairable": self.repairable,
        })
    }
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

fn set_failed_job_callback(ctx: &Context, job_id: &str, job_type: &str, error: &VerificationError) {
    let payload = error.payload(job_id, job_type);
    ctx.log(
        "warn",
        &format!("finalize_spawned_session: verification failed for job '{job_id}': {payload}"),
    );
    set_success_result("Fail", &json!({"error_message": payload.to_string()}));
}

fn verify_typed_completion(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    job_type: &str,
    fields: &serde_json::Value,
    workspace_id: &str,
) -> Result<serde_json::Value, VerificationError> {
    match job_type {
        "source_search" => verify_source_search(fields),
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
        "synthesize_palette" => verify_synthesized_palettes(ctx, api_url, headers, fields),
        "synthesize_art_style" => verify_synthesized_art_styles(ctx, api_url, headers, fields),
        _ => Ok(json!({"validated": true, "job_type": job_type})),
    }
}

fn verify_source_search(
    fields: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let direction_ids = string_array_field(fields, "direction_ids");
    if direction_ids.is_empty() {
        return Err(VerificationError::new(
            "missing_direction_ids",
            "source_search completed without direction_ids; inline triggers cannot fan out synthesis without explicit directions",
        )
        .field("direction_ids"));
    }
    Ok(json!({
        "validated": true,
        "job_type": "source_search",
        "direction_ids": direction_ids,
    }))
}

fn verify_synthesized_languages(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
    job_type: &str,
) -> Result<serde_json::Value, VerificationError> {
    let language_ids = design_language_ids_from_job(fields);
    if language_ids.is_empty() {
        return Err(VerificationError::new(
            "missing_design_language_ids",
            format!("{job_type} completed without design_language_ids"),
        )
        .field("design_language_ids"));
    }

    let mut verified = Vec::new();
    for language_id in &language_ids {
        let language = load_required_entity(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "missing_design_language",
        )?;
        verify_language_identity(language_id, &language)?;
        let verified_language = verify_complete_language_artifacts(
            ctx,
            api_url,
            headers,
            language_id,
            &language,
            fields,
        )?;
        ensure_language_under_review(ctx, api_url, headers, language_id, &verified_language)?;
        verified.push(language_id.clone());
    }

    Ok(json!({
        "validated": true,
        "job_type": job_type,
        "verified_language_ids": verified,
    }))
}

fn verify_quality_reviewed_languages(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
    _workspace_id: &str,
) -> Result<serde_json::Value, VerificationError> {
    let language_ids = design_language_ids_from_job(fields);
    if language_ids.is_empty() {
        return Err(VerificationError::new(
            "missing_design_language_ids",
            "quality_review completed without design_language_ids",
        )
        .field("design_language_ids"));
    }

    let mut published = Vec::new();
    for language_id in &language_ids {
        let language = load_required_entity(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            "missing_design_language",
        )?;
        let verified_language = verify_complete_language_artifacts(
            ctx,
            api_url,
            headers,
            language_id,
            &language,
            fields,
        )?;
        let under_review =
            ensure_language_under_review(ctx, api_url, headers, language_id, &verified_language)?;
        publish_public_assets(ctx, api_url, headers, language_id, &under_review)?;
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

    Ok(json!({
        "validated": true,
        "job_type": "quality_review",
        "published_language_ids": published,
    }))
}

fn verify_complete_language_artifacts(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
    job_fields: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let fields = entity_fields(language);
    verify_required_sections(language_id, language, &fields)?;

    let embodiment_format = string_field_any(&fields, "embodiment_format", "html");
    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "embodiment_file_id",
        "embodiment",
        Some(&embodiment_format),
    )?;
    dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyEmbodiment",
        &json!({}),
        &["embodiment_verified"],
    )?;

    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "landing_file_id",
        "composition_landing",
        None,
    )?;
    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "dashboard_file_id",
        "composition_dashboard",
        None,
    )?;
    dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyCompositions",
        &json!({}),
        &["compositions_verified"],
    )?;

    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "thumbnail_file_id",
        "thumbnail",
        None,
    )?;
    dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyThumbnail",
        &json!({}),
        &["thumbnail_verified"],
    )?;

    verify_design_md_metadata(language_id, &fields)?;
    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "design_md_file_id",
        "design_md",
        None,
    )?;
    dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyDesignMd",
        &json!({}),
        &["has_design_md", "has_valid_design_md", "design_md_verified"],
    )?;

    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "shadcn_export_file_id",
        "shadcn_export",
        None,
    )?;
    dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyShadcnExport",
        &json!({}),
        &["shadcn_export_verified"],
    )?;

    verify_shadcn_component_manifest(language_id, &fields)?;
    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "shadcn_component_spec_file_id",
        "shadcn_component_spec",
        None,
    )?;
    dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyShadcnComponentSpec",
        &json!({}),
        &["shadcn_component_spec_verified"],
    )?;

    verify_shadcn_preview_manifest(language_id, &fields)?;
    verify_file_field(
        ctx,
        api_url,
        headers,
        language_id,
        &fields,
        "shadcn_preview_shots_file_id",
        "shadcn_preview_shots",
        None,
    )?;
    let verified_language = dispatch_verifier_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "VerifyShadcnPreviewShots",
        &json!({}),
        &["shadcn_preview_shots_verified"],
    )?;

    verify_forced_shadcn_refresh(language_id, job_fields, &fields)?;
    Ok(verified_language)
}

fn verify_required_sections(
    language_id: &str,
    language: &serde_json::Value,
    fields: &serde_json::Value,
) -> Result<(), VerificationError> {
    let mut missing = Vec::new();
    for (bool_name, data_name) in [
        ("has_philosophy", "philosophy"),
        ("has_tokens", "tokens"),
        ("has_rules", "rules"),
        ("has_layout", "layout_principles"),
        ("has_guidance", "guidance"),
    ] {
        if !entity_bool_any(language, bool_name) && !value_has_content(fields.get(data_name)) {
            missing.push(data_name);
        }
    }
    if !missing.is_empty() {
        return Err(VerificationError::new(
            "missing_spec_sections",
            format!(
                "DesignLanguage '{language_id}' is missing required spec sections: {}",
                missing.join(", ")
            ),
        )
        .entity("DesignLanguage", language_id));
    }
    Ok(())
}

fn verify_language_identity(
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), VerificationError> {
    let fields = entity_fields(language);
    let slug = string_field_any(&fields, "slug", "");
    if !slug.is_empty() && slug == language_id {
        return Err(VerificationError::new(
            "slug_used_as_entity_id",
            format!(
                "DesignLanguage '{language_id}' uses its slug as the entity ID; use the generated entity_id and store '{slug}' only in the slug field"
            ),
        )
        .entity("DesignLanguage", language_id)
        .field("slug"));
    }
    Ok(())
}

fn ensure_language_under_review(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let status = entity_status_value(language);
    if status == "Published" || status == "UnderReview" {
        return Ok(language.clone());
    }
    if status != "Draft" {
        return Err(VerificationError::new(
            "invalid_language_state",
            format!(
                "DesignLanguage '{language_id}' is in state '{status}', expected Draft, UnderReview, or Published"
            ),
        )
        .entity("DesignLanguage", language_id)
        .repairable(false));
    }

    verify_review_ready_state(language_id, language)?;

    let submitted = dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "SubmitForReview",
        &json!({}),
    )?;
    let submitted_status = entity_status_value(&submitted);
    if submitted_status == "UnderReview" {
        return Ok(submitted);
    }
    if submitted_status == "Published" {
        return Ok(submitted);
    }
    if submitted_status != "Draft" {
        return Err(VerificationError::new(
            "invalid_language_state",
            format!(
                "DesignLanguage '{language_id}' is in state '{submitted_status}', expected Draft, UnderReview, or Published"
            ),
        )
        .entity("DesignLanguage", language_id)
        .repairable(false));
    }
    Err(VerificationError::new(
        "submit_for_review_did_not_transition",
        format!(
            "DesignLanguage '{language_id}' remained in state '{submitted_status}' after SubmitForReview"
        ),
    )
    .entity("DesignLanguage", language_id))
}

fn verify_review_ready_state(
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), VerificationError> {
    let missing_bools: Vec<&str> = [
        "has_philosophy",
        "has_tokens",
        "has_rules",
        "has_layout",
        "has_guidance",
        "has_embodiment",
        "embodiment_verified",
        "has_compositions",
        "compositions_verified",
        "has_thumbnail",
        "thumbnail_verified",
        "has_design_md",
        "has_valid_design_md",
        "design_md_verified",
        "has_shadcn_export",
        "shadcn_export_verified",
        "has_shadcn_component_spec",
        "shadcn_component_spec_verified",
        "has_shadcn_preview_shots",
        "shadcn_preview_shots_verified",
    ]
    .iter()
    .copied()
    .filter(|name| !entity_bool_any(language, name))
    .collect();

    let fields = entity_fields(language);
    let missing_fields: Vec<&str> = [
        "embodiment_file_id",
        "landing_file_id",
        "dashboard_file_id",
        "thumbnail_file_id",
        "design_md_file_id",
        "shadcn_export_file_id",
        "shadcn_component_spec_file_id",
        "shadcn_preview_shots_file_id",
    ]
    .iter()
    .copied()
    .filter(|name| string_field_any(&fields, name, "").trim().is_empty())
    .collect();

    if !missing_bools.is_empty() || !missing_fields.is_empty() {
        return Err(VerificationError::new(
            "review_prerequisites_missing",
            format!(
                "DesignLanguage '{language_id}' is not ready for SubmitForReview; missing booleans: [{}]; missing fields: [{}]",
                missing_bools.join(", "),
                missing_fields.join(", ")
            ),
        )
        .entity("DesignLanguage", language_id)
        .repairable(true));
    }

    Ok(())
}

fn ensure_language_published(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
) -> Result<(), VerificationError> {
    let current = load_required_entity(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "language_disappeared",
    )?;
    let status = entity_status_value(&current);
    if status == "Published" {
        return Ok(());
    }
    if status != "UnderReview" {
        return Err(VerificationError::new(
            "invalid_publish_state",
            format!(
                "DesignLanguage '{language_id}' is in state '{status}', expected UnderReview before Publish"
            ),
        )
        .entity("DesignLanguage", language_id));
    }

    let published = dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "Publish",
        &json!({}),
    )?;
    let final_status = entity_status_value(&published);
    if final_status != "Published" {
        return Err(VerificationError::new(
            "publish_did_not_transition",
            format!(
                "DesignLanguage '{language_id}' remained in state '{final_status}' after Publish"
            ),
        )
        .entity("DesignLanguage", language_id));
    }
    Ok(())
}

fn publish_public_assets(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
) -> Result<(), VerificationError> {
    if entity_bool_any(language, "has_published_assets") {
        return Ok(());
    }

    let fields = entity_fields(language);
    let thumbnail_file_id = required_string_field(language_id, &fields, "thumbnail_file_id")?;
    let embodiment_file_id = required_string_field(language_id, &fields, "embodiment_file_id")?;
    let design_md_file_id = required_string_field(language_id, &fields, "design_md_file_id")?;

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
            "thumbnail_asset_id": thumbnail.0,
            "thumbnail_asset_url": thumbnail.1,
            "embodiment_asset_id": embodiment.0,
            "embodiment_asset_url": embodiment.1,
            "design_md_asset_id": design_md.0,
            "design_md_asset_url": design_md.1,
        }),
    )?;
    Ok(())
}

fn publish_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    file_id: &str,
    label: &str,
) -> Result<(String, String), VerificationError> {
    let body = json!({
        "file_id": file_id,
        "label": label,
        "owner_ref_type": "DesignLanguage",
        "owner_ref_id": language_id,
        "namespace": "katagami/design-languages",
    });
    let resp = http_call(
        ctx,
        "POST",
        &format!("{api_url}/api/files/publish-artifact"),
        headers,
        &body.to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(VerificationError::new(
            "publish_artifact_failed",
            format!(
                "Failed to publish {label} artifact for DesignLanguage '{language_id}' from file '{file_id}': HTTP {}: {}",
                resp.status,
                truncate(&resp.body)
            ),
        )
        .entity("DesignLanguage", language_id)
        .artifact(label_to_artifact_kind(label), file_id));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body).map_err(|e| {
        VerificationError::new(
            "publish_artifact_bad_response",
            format!("Failed to parse publish-artifact response: {e}"),
        )
        .entity("DesignLanguage", language_id)
        .artifact(label_to_artifact_kind(label), file_id)
    })?;
    let artifact = parsed.get("artifact").ok_or_else(|| {
        VerificationError::new(
            "publish_artifact_bad_response",
            "publish-artifact response has no artifact object",
        )
        .entity("DesignLanguage", language_id)
        .artifact(label_to_artifact_kind(label), file_id)
    })?;
    let asset_id = artifact
        .get("id")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    let public_url = artifact
        .get("public_url")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    if asset_id.is_empty() || public_url.is_empty() {
        return Err(VerificationError::new(
            "publish_artifact_bad_response",
            "publish-artifact response is missing id or public_url",
        )
        .entity("DesignLanguage", language_id)
        .artifact(label_to_artifact_kind(label), file_id));
    }
    Ok((asset_id, canonicalize_public_asset_url(&public_url)))
}

fn canonicalize_public_asset_url(public_url: &str) -> String {
    public_url
        .strip_prefix("https://temperpaw-assets.katagami.ai")
        .map(|suffix| format!("https://assets.katagami.ai{suffix}"))
        .unwrap_or_else(|| public_url.to_string())
}

fn label_to_artifact_kind(label: &str) -> &'static str {
    match label {
        "thumbnail" => "thumbnail",
        "embodiment" => "embodiment",
        "design_md" => "design_md",
        _ => "file",
    }
}

fn verify_file_field(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    fields: &serde_json::Value,
    field_name: &'static str,
    artifact_kind: &'static str,
    embodiment_format: Option<&str>,
) -> Result<(), VerificationError> {
    let file_id = required_string_field(language_id, fields, field_name)?;
    verify_file_artifact(
        ctx,
        api_url,
        headers,
        language_id,
        &file_id,
        artifact_kind,
        embodiment_format,
    )
}

fn verify_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    owner_id: &str,
    file_id: &str,
    artifact_kind: &'static str,
    embodiment_format: Option<&str>,
) -> Result<(), VerificationError> {
    let file = verify_ready_file_artifact(ctx, api_url, headers, owner_id, file_id, artifact_kind)?;

    let file_fields = entity_fields(&file);
    let mime_type = first_nonempty(&[
        string_field_any(&file_fields, "mime_type", ""),
        string_field_any(&file_fields, "MimeType", ""),
    ])
    .to_ascii_lowercase();
    let size_bytes = numeric_field_any(&file, &["size_bytes", "SizeBytes"]);
    if size_bytes > 0 && size_bytes < 64 {
        return Err(VerificationError::new(
            "file_too_small",
            format!(
                "DesignLanguage '{owner_id}' {artifact_kind} file '{file_id}' is too small ({size_bytes} bytes)"
            ),
        )
        .entity("DesignLanguage", owner_id)
        .artifact(artifact_kind, file_id));
    }

    let body = read_file_value(ctx, api_url, headers, file_id, owner_id, artifact_kind)?;
    verify_file_body(
        owner_id,
        file_id,
        artifact_kind,
        embodiment_format,
        &mime_type,
        &body,
    )
}

fn verify_ready_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    owner_id: &str,
    file_id: &str,
    artifact_kind: &'static str,
) -> Result<serde_json::Value, VerificationError> {
    let file = load_entity(ctx, api_url, headers, "Files", file_id)?.ok_or_else(|| {
        VerificationError::new(
            "missing_file",
            format!("DesignLanguage '{owner_id}' {artifact_kind} file '{file_id}' does not exist"),
        )
        .entity("DesignLanguage", owner_id)
        .artifact(artifact_kind, file_id)
    })?;
    let file_status = entity_status_value(&file);
    if file_status != "Ready" {
        return Err(VerificationError::new(
            "file_not_ready",
            format!(
                "DesignLanguage '{owner_id}' {artifact_kind} file '{file_id}' is in state '{file_status}', expected Ready"
            ),
        )
        .entity("DesignLanguage", owner_id)
        .artifact(artifact_kind, file_id));
    }

    verify_ready_file_metadata(owner_id, file_id, artifact_kind, &file)?;
    Ok(file)
}

fn verify_ready_file_metadata(
    owner_id: &str,
    file_id: &str,
    artifact_kind: &'static str,
    file: &serde_json::Value,
) -> Result<(), VerificationError> {
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
    let size_bytes = numeric_field_any(file, &["size_bytes", "SizeBytes"]);

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
        return Err(VerificationError::new(
            "file_ready_metadata_missing",
            format!(
                "DesignLanguage '{owner_id}' {artifact_kind} file '{file_id}' is Ready but missing usable metadata: {}",
                missing.join(", ")
            ),
        )
        .entity("DesignLanguage", owner_id)
        .artifact(artifact_kind, file_id));
    }

    Ok(())
}

fn read_file_value(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    file_id: &str,
    owner_id: &str,
    artifact_kind: &'static str,
) -> Result<String, VerificationError> {
    let resp = http_call(
        ctx,
        "GET",
        &format!("{api_url}/tdata/Files('{file_id}')/$value"),
        headers,
        "",
    )?;
    if resp.status == 404 {
        return Err(VerificationError::new(
            "file_value_missing",
            format!(
                "DesignLanguage '{owner_id}' {artifact_kind} file '{file_id}' has no readable $value bytes"
            ),
        )
        .entity("DesignLanguage", owner_id)
        .artifact(artifact_kind, file_id));
    }
    if !(200..300).contains(&resp.status) {
        return Err(VerificationError::new(
            "file_value_read_failed",
            format!(
                "Failed to read Files('{file_id}')/$value: HTTP {}: {}",
                resp.status,
                truncate(&resp.body)
            ),
        )
        .entity("DesignLanguage", owner_id)
        .artifact(artifact_kind, file_id));
    }
    Ok(resp.body)
}

fn verify_file_body(
    language_id: &str,
    file_id: &str,
    artifact_kind: &'static str,
    embodiment_format: Option<&str>,
    mime_type: &str,
    body: &str,
) -> Result<(), VerificationError> {
    let trimmed = body.trim();
    if trimmed.len() < 64 {
        return Err(VerificationError::new(
            "file_body_too_small",
            format!(
                "DesignLanguage '{language_id}' {artifact_kind} file '{file_id}' is empty or too small"
            ),
        )
        .entity("DesignLanguage", language_id)
        .artifact(artifact_kind, file_id));
    }

    let lower = trimmed.to_ascii_lowercase();
    match artifact_kind {
        "embodiment" => match embodiment_format.unwrap_or("html") {
            "html" if !lower.contains("<html") && !lower.contains("<!doctype") => {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "embodiment_not_html",
                    "embodiment file is not self-contained HTML",
                );
            }
            "tsx" if !trimmed.contains("export") && !trimmed.contains("function") => {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "embodiment_not_tsx",
                    "embodiment file is not recognizable TSX",
                );
            }
            _ => {}
        },
        "composition_landing" | "composition_dashboard" => {
            if !lower.contains("<html") && !lower.contains("<!doctype") {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "composition_not_html",
                    "composition file is not self-contained HTML",
                );
            }
            if !lower.contains("var(--") {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "composition_not_tokenized",
                    "composition file must use CSS custom properties such as var(--...)",
                );
            }
            if artifact_kind == "composition_landing" && !lower.contains("--hero-image") {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "landing_missing_hero_slot",
                    "landing composition is missing the --hero-image slot",
                );
            }
        }
        "thumbnail" => {
            if thumbnail_payload_looks_text_encoded_image(trimmed)
                || lower.contains("<html")
                || lower.contains("<!doctype")
                || lower.contains("version:")
                || lower.contains("components:")
                || lower.contains("{\"error\"")
            {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "thumbnail_not_image_bytes",
                    "thumbnail file looks like text, markup, or base64 rather than image bytes",
                );
            }
            if !thumbnail_mime_type_is_acceptable(mime_type, trimmed) {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "thumbnail_bad_mime",
                    "thumbnail file must be image/jpeg, another image MIME type, or image-like octet-stream bytes",
                );
            }
        }
        "design_md" => {
            if !trimmed.contains("version:") || !trimmed.contains("components") {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "design_md_invalid",
                    "DESIGN.md file is missing required front matter",
                );
            }
        }
        "shadcn_export" => {
            if !trimmed.contains("\"registry:theme\"")
                || !trimmed.contains("\"cssVars\"")
                || !trimmed.contains("\"componentManifest\"")
            {
                return artifact_error(
                    language_id,
                    file_id,
                    artifact_kind,
                    "shadcn_export_invalid",
                    "shadcn registry theme is missing registry:theme, cssVars, or componentManifest",
                );
            }
        }
        "shadcn_component_spec" => {
            for required in [
                "shadcn/ui Components",
                "ShadSync visual profile",
                "Signature component recipes",
                "Preview shots",
                "button",
                "card",
                "input",
                "tabs",
            ] {
                if !trimmed.contains(required) {
                    return artifact_error(
                        language_id,
                        file_id,
                        artifact_kind,
                        "shadcn_component_spec_invalid",
                        "shadcn component spec is missing required recipe sections",
                    );
                }
            }
        }
        "shadcn_preview_shots" => verify_preview_shots_body(language_id, file_id, trimmed)?,
        _ => {}
    }
    Ok(())
}

fn artifact_error<T>(
    language_id: &str,
    file_id: &str,
    artifact_kind: &'static str,
    code: &'static str,
    message: &str,
) -> Result<T, VerificationError> {
    Err(VerificationError::new(
        code,
        format!("DesignLanguage '{language_id}' {message}: file '{file_id}'"),
    )
    .entity("DesignLanguage", language_id)
    .artifact(artifact_kind, file_id))
}

fn verify_preview_shots_body(
    language_id: &str,
    file_id: &str,
    body: &str,
) -> Result<(), VerificationError> {
    let parsed: serde_json::Value = serde_json::from_str(body).map_err(|e| {
        VerificationError::new(
            "shadcn_preview_shots_invalid_json",
            format!(
                "DesignLanguage '{language_id}' shadcn preview-shot file '{file_id}' is invalid JSON: {e}"
            ),
        )
        .entity("DesignLanguage", language_id)
        .artifact("shadcn_preview_shots", file_id)
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
    let recipe_len = parsed
        .get("componentRecipes")
        .map(|value| {
            value
                .as_array()
                .map(|items| items.len())
                .or_else(|| value.as_object().map(|items| items.len()))
                .unwrap_or(0)
        })
        .unwrap_or(0);
    let visual_profile_ok = parsed
        .get("visualProfile")
        .and_then(|value| value.as_object())
        .map(|profile| {
            ["family", "material", "contour", "border"]
                .iter()
                .all(|key| {
                    profile
                        .get(*key)
                        .and_then(|value| value.as_str())
                        .map(|value| !value.trim().is_empty())
                        .unwrap_or(false)
                })
        })
        .unwrap_or(false);

    if artifact != "katagami:shadcn-preview-shots"
        || shots_len < 3
        || scene_len < 3
        || recipe_len < SHADCN_COMPONENTS.len()
        || !visual_profile_ok
    {
        return artifact_error(
            language_id,
            file_id,
            "shadcn_preview_shots",
            "shadcn_preview_shots_invalid",
            "shadcn preview-shot file is missing renderable scenes, visualProfile, or component recipes",
        );
    }
    Ok(())
}

fn verify_design_md_metadata(
    language_id: &str,
    fields: &serde_json::Value,
) -> Result<(), VerificationError> {
    let version = string_field_any(fields, "design_md_format_version", "");
    if version.trim().is_empty() {
        return Err(VerificationError::new(
            "missing_design_md_format_version",
            format!("DesignLanguage '{language_id}' is missing design_md_format_version"),
        )
        .entity("DesignLanguage", language_id)
        .field("design_md_format_version"));
    }

    let lint_raw = string_field_any(fields, "design_md_lint_result", "");
    if lint_raw.trim().is_empty() {
        return Err(VerificationError::new(
            "missing_design_md_lint_result",
            format!("DesignLanguage '{language_id}' is missing design_md_lint_result"),
        )
        .entity("DesignLanguage", language_id)
        .field("design_md_lint_result"));
    }
    let lint: serde_json::Value = serde_json::from_str(&lint_raw).map_err(|e| {
        VerificationError::new(
            "invalid_design_md_lint_result",
            format!("DesignLanguage '{language_id}' design_md_lint_result is invalid JSON: {e}"),
        )
        .entity("DesignLanguage", language_id)
        .field("design_md_lint_result")
    })?;
    if let Some(raw) = lint.get("raw").and_then(|value| value.as_str()) {
        let normalized = raw.to_ascii_lowercase();
        if normalized.contains("exit code")
            || normalized.contains("command not found")
            || normalized.contains("stderr:")
        {
            return Err(VerificationError::new(
                "design_md_lint_command_failed",
                format!(
                    "DesignLanguage '{language_id}' DESIGN.md lint result captured a failed command instead of a clean lint report"
                ),
            )
            .entity("DesignLanguage", language_id)
            .field("design_md_lint_result"));
        }
    }
    let summary = lint.get("summary").unwrap_or(&serde_json::Value::Null);
    let errors = summary.get("errors").and_then(|v| v.as_i64()).unwrap_or(0);
    let warnings = summary
        .get("warnings")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    if errors != 0 || warnings != 0 {
        return Err(VerificationError::new(
            "design_md_lint_failed",
            format!(
                "DesignLanguage '{language_id}' DESIGN.md lint summary has errors={errors}, warnings={warnings}; both must be zero"
            ),
        )
        .entity("DesignLanguage", language_id)
        .field("design_md_lint_result"));
    }
    Ok(())
}

fn verify_shadcn_component_manifest(
    language_id: &str,
    fields: &serde_json::Value,
) -> Result<(), VerificationError> {
    verify_manifest_components(
        language_id,
        fields,
        "shadcn_component_spec_manifest",
        "katagami:shadcn-component-recipes",
    )?;
    Ok(())
}

fn verify_shadcn_preview_manifest(
    language_id: &str,
    fields: &serde_json::Value,
) -> Result<(), VerificationError> {
    let manifest = verify_manifest_components(
        language_id,
        fields,
        "shadcn_preview_shots_manifest",
        "katagami:shadcn-preview-shots",
    )?;
    let renderable = manifest
        .get("renderable")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if !renderable {
        return Err(VerificationError::new(
            "shadcn_preview_manifest_not_renderable",
            format!("DesignLanguage '{language_id}' shadcn preview manifest must declare renderable=true"),
        )
        .entity("DesignLanguage", language_id)
        .field("shadcn_preview_shots_manifest"));
    }
    Ok(())
}

fn verify_manifest_components(
    language_id: &str,
    fields: &serde_json::Value,
    field_name: &'static str,
    expected_artifact: &'static str,
) -> Result<serde_json::Value, VerificationError> {
    let raw = string_field_any(fields, field_name, "");
    if raw.trim().is_empty() {
        return Err(VerificationError::new(
            "missing_shadcn_manifest",
            format!("DesignLanguage '{language_id}' is missing {field_name}"),
        )
        .entity("DesignLanguage", language_id)
        .field(field_name));
    }
    let manifest: serde_json::Value = serde_json::from_str(&raw).map_err(|e| {
        VerificationError::new(
            "invalid_shadcn_manifest",
            format!("DesignLanguage '{language_id}' {field_name} is invalid JSON: {e}"),
        )
        .entity("DesignLanguage", language_id)
        .field(field_name)
    })?;
    let artifact = manifest
        .get("artifact")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if artifact != expected_artifact {
        return Err(VerificationError::new(
            "wrong_shadcn_manifest_artifact",
            format!(
                "DesignLanguage '{language_id}' {field_name} artifact is '{artifact}', expected '{expected_artifact}'"
            ),
        )
        .entity("DesignLanguage", language_id)
        .field(field_name));
    }
    let components = manifest
        .get("components")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let missing: Vec<&str> = SHADCN_COMPONENTS
        .iter()
        .copied()
        .filter(|component| !components.contains(component))
        .collect();
    if !missing.is_empty() {
        return Err(VerificationError::new(
            "shadcn_manifest_missing_components",
            format!(
                "DesignLanguage '{language_id}' {field_name} is missing components: {}",
                missing.join(", ")
            ),
        )
        .entity("DesignLanguage", language_id)
        .field(field_name));
    }
    Ok(manifest)
}

fn verify_forced_shadcn_refresh(
    language_id: &str,
    job_fields: &serde_json::Value,
    language_fields: &serde_json::Value,
) -> Result<(), VerificationError> {
    let input = parse_json_field(job_fields.get("input"));
    let force = input
        .as_ref()
        .and_then(|value| value.get("force_agent_shadcn_artifact_refresh"))
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if !force {
        return Ok(());
    }
    let previous = input
        .as_ref()
        .and_then(|value| value.get("previous_file_ids"))
        .unwrap_or(&serde_json::Value::Null);
    for field in [
        "shadcn_component_spec_file_id",
        "shadcn_preview_shots_file_id",
    ] {
        let current = string_field_any(language_fields, field, "");
        let old = previous
            .get(field)
            .and_then(|value| value.as_str())
            .unwrap_or("");
        if !old.is_empty() && current == old {
            return Err(VerificationError::new(
                "forced_shadcn_refresh_reused_file",
                format!(
                    "DesignLanguage '{language_id}' force refresh reused previous {field} '{old}'"
                ),
            )
            .entity("DesignLanguage", language_id)
            .field(field));
        }
    }
    Ok(())
}

fn verify_synthesized_palettes(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let ids = lane_ids_from_job(fields, &["palette_system_ids", "palette_ids"]);
    if ids.is_empty() {
        return Err(VerificationError::new(
            "missing_palette_system_ids",
            "synthesize_palette completed without palette_system_ids",
        )
        .field("palette_system_ids"));
    }
    for id in &ids {
        let entity = load_required_entity(
            ctx,
            api_url,
            headers,
            "PaletteSystems",
            id,
            "missing_palette_system",
        )?;
        let lane_fields = entity_fields(&entity);
        required_string_field(id, &lane_fields, "tokens_export_file_id")?;
        required_string_field(id, &lane_fields, "thumbnail_file_id")?;
        walk_lane_entity_to_published(
            ctx,
            api_url,
            headers,
            "PaletteSystems",
            id,
            &["VerifyTokensExport", "VerifyThumbnail"],
            "Publish",
        )?;
    }
    Ok(json!({
        "validated": true,
        "job_type": "synthesize_palette",
        "published_palette_system_ids": ids,
    }))
}

fn verify_synthesized_art_styles(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let ids = lane_ids_from_job(fields, &["art_style_ids", "artstyle_ids"]);
    if ids.is_empty() {
        return Err(VerificationError::new(
            "missing_art_style_ids",
            "synthesize_art_style completed without art_style_ids",
        )
        .field("art_style_ids"));
    }
    for id in &ids {
        let entity =
            load_required_entity(ctx, api_url, headers, "ArtStyles", id, "missing_art_style")?;
        let lane_fields = entity_fields(&entity);
        required_string_field(id, &lane_fields, "prompt_template")?;
        required_string_field(id, &lane_fields, "thumbnail_file_id")?;
        if string_array_flexible(lane_fields.get("reference_image_file_ids")).is_empty() {
            return Err(VerificationError::new(
                "missing_reference_image_file_ids",
                format!("ArtStyle '{id}' has no reference_image_file_ids"),
            )
            .entity("ArtStyle", id)
            .field("reference_image_file_ids"));
        }
        walk_lane_entity_to_published(
            ctx,
            api_url,
            headers,
            "ArtStyles",
            id,
            &[
                "VerifyReferenceImages",
                "VerifyProofShots",
                "VerifyThumbnail",
            ],
            "Publish",
        )?;
    }
    Ok(json!({
        "validated": true,
        "job_type": "synthesize_art_style",
        "published_art_style_ids": ids,
    }))
}

fn walk_lane_entity_to_published(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &'static str,
    entity_id: &str,
    verify_actions: &[&str],
    publish_action: &str,
) -> Result<(), VerificationError> {
    let mut entity = load_required_entity(
        ctx,
        api_url,
        headers,
        set_name,
        entity_id,
        "missing_lane_entity",
    )?;
    let status = entity_status_value(&entity);
    if status == "Published" {
        return Ok(());
    }
    for action in verify_actions {
        dispatch_action(
            ctx,
            api_url,
            headers,
            set_name,
            entity_id,
            action,
            &json!({}),
        )?;
    }
    entity = load_required_entity(
        ctx,
        api_url,
        headers,
        set_name,
        entity_id,
        "missing_lane_entity",
    )?;
    let status = entity_status_value(&entity);
    if status == "Draft" {
        dispatch_action(
            ctx,
            api_url,
            headers,
            set_name,
            entity_id,
            "SubmitForReview",
            &json!({}),
        )?;
    }
    dispatch_action(
        ctx,
        api_url,
        headers,
        set_name,
        entity_id,
        "MarkQualityPassed",
        &json!({}),
    )?;
    dispatch_action(
        ctx,
        api_url,
        headers,
        set_name,
        entity_id,
        publish_action,
        &json!({}),
    )?;
    Ok(())
}

fn record_session_success(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    session_id: &str,
    job_fields: &serde_json::Value,
) -> Result<&'static str, String> {
    let session = load_entity_string_error(ctx, api_url, headers, "Sessions", session_id)?
        .ok_or_else(|| format!("Session '{session_id}' does not exist"))?;
    let session_status = entity_status_value(&session);
    if session_is_terminal(&session_status) {
        return Ok("session already terminal");
    }
    if !session_can_be_finalized(&session_status) {
        return Ok("session not finalizable");
    }
    let session_fields = entity_fields(&session);
    let session_counters = session.get("counters").cloned().unwrap_or(json!({}));
    let result_text = job_fields
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
        "output_tokens": session_counters.get("output_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
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
            "Failed to record Session '{session_id}' result: HTTP {}: {}",
            resp.status,
            truncate(&resp.body)
        ));
    }
    Ok("session finalized")
}

fn record_session_failure(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    session_id: &str,
    error_message: &str,
) -> Result<&'static str, String> {
    let session = load_entity_string_error(ctx, api_url, headers, "Sessions", session_id)?
        .ok_or_else(|| format!("Session '{session_id}' does not exist"))?;
    let session_status = entity_status_value(&session);
    if session_is_terminal(&session_status) {
        return Ok("session already terminal");
    }
    if !session_can_be_finalized(&session_status) {
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
            truncate(&resp.body)
        ));
    }
    Ok("session failed")
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

fn session_is_terminal(session_status: &str) -> bool {
    matches!(session_status, "Completed" | "Failed" | "Cancelled")
}

fn session_can_be_finalized(session_status: &str) -> bool {
    matches!(session_status, "Thinking" | "Executing")
}

fn required_string_field(
    entity_id: &str,
    fields: &serde_json::Value,
    field_name: &'static str,
) -> Result<String, VerificationError> {
    let value = string_field_any(fields, field_name, "");
    if value.trim().is_empty() {
        return Err(VerificationError::new(
            "missing_required_field",
            format!("Entity '{entity_id}' is missing required field '{field_name}'"),
        )
        .entity("Entity", entity_id)
        .field(field_name));
    }
    Ok(value)
}

fn load_required_entity(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &'static str,
    entity_id: &str,
    code: &'static str,
) -> Result<serde_json::Value, VerificationError> {
    load_entity(ctx, api_url, headers, set_name, entity_id)?.ok_or_else(|| {
        VerificationError::new(code, format!("{set_name}('{entity_id}') does not exist"))
            .entity(set_name, entity_id)
    })
}

fn load_entity(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &'static str,
    entity_id: &str,
) -> Result<Option<serde_json::Value>, VerificationError> {
    load_entity_string_error(ctx, api_url, headers, set_name, entity_id).map_err(|error| {
        VerificationError::new("entity_load_failed", error)
            .entity(set_name, entity_id)
            .repairable(false)
    })
}

fn load_entity_string_error(
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
            truncate(&resp.body)
        ));
    }
    serde_json::from_str::<serde_json::Value>(&resp.body)
        .map(Some)
        .map_err(|e| format!("Failed to parse {set_name}('{entity_id}') response: {e}"))
}

fn dispatch_action(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &'static str,
    entity_id: &str,
    action: &str,
    params: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let resp = http_call(
        ctx,
        "POST",
        &format!("{api_url}/tdata/{set_name}('{entity_id}')/Temper.{action}"),
        headers,
        &params.to_string(),
    )?;
    if !(200..300).contains(&resp.status) {
        return Err(VerificationError::new(
            "action_dispatch_failed",
            format!(
                "Failed to dispatch {set_name}('{entity_id}').{action}: HTTP {}: {}",
                resp.status,
                truncate(&resp.body)
            ),
        )
        .entity(set_name, entity_id));
    }
    serde_json::from_str::<serde_json::Value>(&resp.body).map_err(|error| {
        VerificationError::new(
            "action_response_parse_failed",
            format!(
                "Failed to parse {set_name}('{entity_id}').{action} response: {error}: {}",
                truncate(&resp.body)
            ),
        )
        .entity(set_name, entity_id)
        .repairable(false)
    })
}

fn dispatch_verifier_action(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &'static str,
    entity_id: &str,
    action: &str,
    params: &serde_json::Value,
    expected_bools: &[&str],
) -> Result<serde_json::Value, VerificationError> {
    let action_entity =
        dispatch_action(ctx, api_url, headers, set_name, entity_id, action, params)?;
    if expected_bools.is_empty() {
        return Ok(action_entity);
    }
    if expected_bools
        .iter()
        .all(|name| entity_bool_any(&action_entity, name))
    {
        return Ok(action_entity);
    }

    let mut latest = None;
    for _ in 0..5 {
        let entity = load_required_entity(
            ctx,
            api_url,
            headers,
            set_name,
            entity_id,
            "verifier_entity_disappeared",
        )?;
        if expected_bools
            .iter()
            .all(|name| entity_bool_any(&entity, name))
        {
            return Ok(entity);
        }
        latest = Some(entity);
    }

    let missing: Vec<&str> = expected_bools
        .iter()
        .copied()
        .filter(|name| {
            latest
                .as_ref()
                .map(|entity| !entity_bool_any(entity, name))
                .unwrap_or(true)
        })
        .collect();
    Err(VerificationError::new(
        "verifier_action_effect_not_visible",
        format!(
            "{set_name}('{entity_id}') verifier action '{action}' completed, but expected booleans are not visible: [{}]",
            missing.join(", ")
        ),
    )
    .entity(set_name, entity_id)
    .repairable(true))
}

fn http_call(
    ctx: &Context,
    method: &str,
    url: &str,
    headers: &[(String, String)],
    body: &str,
) -> Result<HttpResponse, VerificationError> {
    ctx.http_call(method, url, headers, body).map_err(|error| {
        VerificationError::new(
            "http_call_failed",
            format!("{method} {url} failed before response: {error}"),
        )
        .repairable(false)
    })
}

fn design_language_ids_from_job(fields: &serde_json::Value) -> Vec<String> {
    let mut ids = string_array_field(fields, "design_language_ids");
    if ids.is_empty() {
        let output = parse_json_field(fields.get("output"));
        ids = string_array(output.as_ref().and_then(|v| v.get("language_ids")));
        if ids.is_empty() {
            ids = string_array(output.as_ref().and_then(|v| v.get("fixed")));
        }
    }
    let input = parse_json_field(fields.get("input"));
    if ids.is_empty() {
        ids = string_array(input.as_ref().and_then(|v| v.get("language_ids")));
    }
    dedupe_strings(&mut ids);
    ids
}

fn lane_ids_from_job(fields: &serde_json::Value, names: &[&str]) -> Vec<String> {
    let mut ids = Vec::new();
    for name in names {
        ids.extend(string_array_field(fields, name));
    }
    let output = parse_json_field(fields.get("output"));
    for name in names {
        ids.extend(string_array(output.as_ref().and_then(|v| v.get(*name))));
    }
    dedupe_strings(&mut ids);
    ids
}

fn parse_json_field(value: Option<&serde_json::Value>) -> Option<serde_json::Value> {
    let raw = value
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())?;
    serde_json::from_str::<serde_json::Value>(raw).ok()
}

fn string_array_field(fields: &serde_json::Value, name: &str) -> Vec<String> {
    string_array_flexible(fields.get(name).or_else(|| fields.get(&pascal_case(name))))
}

fn string_array(value: Option<&serde_json::Value>) -> Vec<String> {
    value
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|s| s.trim().to_string()))
                .filter(|item| !item.is_empty())
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

fn dedupe_strings(values: &mut Vec<String>) {
    let mut deduped = Vec::new();
    for value in values.drain(..) {
        if !value.is_empty() && !deduped.contains(&value) {
            deduped.push(value);
        }
    }
    *values = deduped;
}

fn entity_fields(entity: &serde_json::Value) -> serde_json::Value {
    entity.get("fields").cloned().unwrap_or(json!({}))
}

fn entity_status_value(entity: &serde_json::Value) -> String {
    entity
        .get("status")
        .or_else(|| entity.get("Status"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

fn entity_bool_any(entity: &serde_json::Value, name: &str) -> bool {
    let fields = entity.get("fields").unwrap_or(&serde_json::Value::Null);
    let booleans = entity.get("booleans").unwrap_or(&serde_json::Value::Null);
    bool_field(fields, name) || bool_field(booleans, name) || bool_field(entity, name)
}

fn bool_field(value: &serde_json::Value, name: &str) -> bool {
    let pascal = pascal_case(name);
    value
        .get(name)
        .or_else(|| value.get(&pascal))
        .map(|v| match v {
            serde_json::Value::Bool(b) => *b,
            serde_json::Value::String(s) => s.eq_ignore_ascii_case("true"),
            _ => false,
        })
        .unwrap_or(false)
}

fn string_field_any(fields: &serde_json::Value, name: &str, default: &str) -> String {
    let pascal = pascal_case(name);
    fields
        .get(name)
        .or_else(|| fields.get(&pascal))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(default)
        .to_string()
}

fn numeric_field_any(entity: &serde_json::Value, names: &[&str]) -> i64 {
    let fields = entity.get("fields").unwrap_or(&serde_json::Value::Null);
    for name in names {
        let pascal = pascal_case(name);
        for container in [entity, fields] {
            if let Some(value) = container.get(*name).or_else(|| container.get(&pascal)) {
                if let Some(number) = value.as_i64() {
                    return number;
                }
                if let Some(text) = value.as_str().and_then(|s| s.parse::<i64>().ok()) {
                    return text;
                }
            }
        }
    }
    0
}

fn first_nonempty(values: &[String]) -> String {
    values
        .iter()
        .find(|value| !value.trim().is_empty())
        .cloned()
        .unwrap_or_default()
}

fn value_has_content(value: Option<&serde_json::Value>) -> bool {
    match value {
        Some(serde_json::Value::String(raw)) => {
            let trimmed = raw.trim();
            !trimmed.is_empty() && trimmed != "{}" && trimmed != "[]"
        }
        Some(serde_json::Value::Array(items)) => !items.is_empty(),
        Some(serde_json::Value::Object(items)) => !items.is_empty(),
        Some(serde_json::Value::Bool(value)) => *value,
        Some(serde_json::Value::Number(_)) => true,
        _ => false,
    }
}

fn pascal_case(name: &str) -> String {
    let mut out = String::new();
    for part in name.split('_').filter(|part| !part.is_empty()) {
        let mut chars = part.chars();
        if let Some(first) = chars.next() {
            out.push(first.to_ascii_uppercase());
            out.extend(chars);
        }
    }
    out
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
    let bytes = body.trim_start().as_bytes();
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

fn truncate(value: &str) -> String {
    value.chars().take(300).collect()
}
