use temper_wasm_sdk::prelude::*;

mod facets;
mod taste_doc;

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
        "source_search" => verify_source_search(ctx, api_url, headers, fields),
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
        "synthesize_writing_style" => verify_synthesized_writing_styles(ctx, api_url, headers, fields),
        _ => Ok(json!({"validated": true, "job_type": job_type})),
    }
}

fn verify_source_search(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    // The agent reports direction_ids via CompleteResearch, but the Monty REPL
    // resets its Python heap between provider turns: an agent that creates the
    // CurationDirection records in one turn and completes in a later turn can
    // report an empty list even though the directions exist and have already
    // queued synthesis. The CurationDirection entities are the source of truth,
    // so when the reported list is empty, derive the directions actually queued
    // for this source_search job instead of failing a job that did its work.
    let mut direction_ids = string_array_field(fields, "direction_ids");
    if direction_ids.is_empty() {
        direction_ids = queued_direction_ids(ctx, api_url, headers, &ctx.entity_id)?;
    }
    if direction_ids.is_empty() {
        return Err(VerificationError::new(
            "missing_direction_ids",
            "source_search completed without creating any CurationDirection records; nothing to fan out synthesis from",
        )
        .field("direction_ids"));
    }
    Ok(json!({
        "validated": true,
        "job_type": "source_search",
        "direction_ids": direction_ids,
    }))
}

/// List the CurationDirection entity ids queued for a given source_search job.
/// Reads the entities directly (the source of truth) so source_search
/// verification does not depend on the agent re-threading direction_ids across
/// Monty REPL turns. Equality filter on source_search_job_id pushes down at the
/// query plane (bounded with $top), so this stays a cheap point lookup.
fn queued_direction_ids(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    source_search_job_id: &str,
) -> Result<Vec<String>, VerificationError> {
    if source_search_job_id.is_empty() {
        return Ok(Vec::new());
    }
    let url = format!(
        "{api_url}/tdata/CurationDirections?$filter=source_search_job_id%20eq%20%27{source_search_job_id}%27&$top=200"
    );
    let resp = http_call(ctx, "GET", &url, headers, "")?;
    if !(200..300).contains(&resp.status) {
        return Err(VerificationError::new(
            "direction_lookup_failed",
            format!(
                "failed to list CurationDirections for source_search job '{source_search_job_id}': HTTP {}: {}",
                resp.status,
                truncate(&resp.body)
            ),
        )
        .repairable(false));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body).map_err(|error| {
        VerificationError::new(
            "direction_lookup_failed",
            format!("failed to parse CurationDirections response: {error}"),
        )
        .repairable(false)
    })?;
    let mut ids = Vec::new();
    if let Some(items) = parsed.get("value").and_then(|v| v.as_array()) {
        for item in items {
            let id = item
                .get("fields")
                .and_then(|f| f.get("Id"))
                .and_then(|v| v.as_str())
                .or_else(|| item.get("entity_id").and_then(|v| v.as_str()))
                .unwrap_or("");
            if !id.is_empty() {
                ids.push(id.to_string());
            }
        }
    }
    Ok(ids)
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

// Fetch the taxonomy tree once as id -> parent_id, for family_id derivation.
// Best-effort: a failure yields an empty map (family_id resolves to "").
fn load_taxonomy_parents(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let url = format!("{api_url}/tdata/Taxonomies?$top=5000");
    let resp = match http_call(ctx, "GET", &url, headers, "") {
        Ok(r) if (200..300).contains(&r.status) => r,
        _ => return map,
    };
    let doc: serde_json::Value = serde_json::from_str(&resp.body).unwrap_or_else(|_| json!({}));
    if let Some(arr) = doc.get("value").and_then(|v| v.as_array()) {
        for row in arr {
            let id = row
                .get("entity_id")
                .and_then(|v| v.as_str())
                .or_else(|| row.get("fields").and_then(|f| f.get("Id")).and_then(|v| v.as_str()))
                .unwrap_or("");
            if id.is_empty() {
                continue;
            }
            let f = row.get("fields").unwrap_or(row);
            let parent = f
                .get("parent_id")
                .or_else(|| f.get("ParentId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            map.insert(id.to_string(), parent.to_string());
        }
    }
    map
}

// Derive the gallery facets from a published language's fields and store them via
// AttachComputedFacets — Temper governs the write. Non-fatal by contract.
fn attach_computed_facets(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    language_id: &str,
    language: &serde_json::Value,
    tax_parents: &std::collections::HashMap<String, String>,
) {
    let fields = language
        .get("fields")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let tokens = fields.get("tokens").and_then(|v| v.as_str()).unwrap_or("");
    let tax_ids = fields
        .get("taxonomy_ids")
        .and_then(|v| v.as_str())
        .unwrap_or("[]");
    let params = json!({
        "search_blob": facets::search_blob(&fields),
        "hue_bucket": facets::hue_bucket(tokens),
        "family_id": facets::family_id(tax_ids, tax_parents),
    });
    if dispatch_action(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "AttachComputedFacets",
        &params,
    )
    .is_err()
    {
        ctx.log(
            "warn",
            &format!("facets: AttachComputedFacets failed for {language_id} (non-fatal)"),
        );
    }
}

/// Embed-service endpoint + bearer, resolved the same way `temper_api_url` is:
/// from the trigger's `[[integration]]` config, ignoring unresolved `{secret:…}`
/// placeholders. The URL falls back to the production embed service; a missing
/// bearer means the call cannot authenticate, so the caller skips (and logs).
fn embed_config(ctx: &Context) -> Option<(String, String)> {
    let url = ctx
        .config
        .get("katagami_embed_url")
        .filter(|s| !s.is_empty() && !s.contains("{secret:"))
        .cloned()
        .unwrap_or_else(|| "https://katagami.ai/api/taste/embed".to_string());
    let key = ctx
        .config
        .get("katagami_embed_key")
        .filter(|s| !s.is_empty() && !s.contains("{secret:"))
        .cloned()?;
    Some((url, key))
}

/// Compute a just-published entity's taste embedding and store it via
/// AttachTasteVector (Temper governs the write). Best-effort by contract, exactly
/// like `attach_computed_facets`: a failed embed or dispatch must never fail a
/// publish — but every failure logs loudly (silent failure is itself a bug).
///
/// `doc` is the lane's canonical taste document (see `taste_doc`); the document
/// format is the single source of truth shared with the TS embed service, so a
/// vector computed here is comparable to one computed by the backfill.
fn attach_taste_vector(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    set_name: &'static str,
    entity_id: &str,
    doc: &str,
) {
    if doc.trim().is_empty() {
        return; // no embeddable content — nothing to store, nothing to log
    }
    let (embed_url, embed_key) = match embed_config(ctx) {
        Some(cfg) => cfg,
        None => {
            ctx.log(
                "warn",
                &format!(
                    "taste: no embed key configured (katagami_embed_key) — skipping taste vector for {set_name}('{entity_id}')"
                ),
            );
            return;
        }
    };
    let embed_headers = vec![
        ("Content-Type".to_string(), "application/json".to_string()),
        ("Authorization".to_string(), format!("Bearer {embed_key}")),
    ];
    let body = json!({ "doc": doc }).to_string();
    let resp = match ctx.http_call("POST", &embed_url, &embed_headers, &body) {
        Ok(resp) => resp,
        Err(error) => {
            ctx.log(
                "warn",
                &format!("taste: embed request failed for {set_name}('{entity_id}'): {error} (non-fatal)"),
            );
            return;
        }
    };
    if !(200..300).contains(&resp.status) {
        ctx.log(
            "warn",
            &format!(
                "taste: embed service HTTP {} for {set_name}('{entity_id}'): {} (non-fatal)",
                resp.status,
                truncate(&resp.body)
            ),
        );
        return;
    }
    let parsed = match serde_json::from_str::<serde_json::Value>(&resp.body) {
        Ok(value) => value,
        Err(error) => {
            ctx.log(
                "warn",
                &format!("taste: embed response parse failed for {set_name}('{entity_id}'): {error} (non-fatal)"),
            );
            return;
        }
    };
    let model = parsed.get("model").and_then(|v| v.as_str()).unwrap_or("");
    let vector = parsed.get("vector").filter(|v| v.is_array());
    let (model, vector) = match (model.is_empty(), vector) {
        (false, Some(vector)) if !vector.as_array().unwrap().is_empty() => (model, vector),
        _ => {
            ctx.log(
                "warn",
                &format!("taste: embed response missing model/vector for {set_name}('{entity_id}') (non-fatal)"),
            );
            return;
        }
    };
    let dim = vector.as_array().map(Vec::len).unwrap_or(0);
    if dim != taste_doc::TASTE_EMBEDDING_DIM || model != taste_doc::TASTE_EMBEDDING_MODEL {
        // Do NOT store an off-space vector: readers reject it (parseStoredTasteVector
        // requires model + dim to match) while the backfill's candidate check would see
        // a matching model and a non-empty field — a stored bad vector could never
        // self-heal without --force. Skip the attach and surface the drift loudly.
        ctx.log(
            "warn",
            &format!(
                "taste: embed returned model '{model}' dim {dim} (expected '{}' dim {}) for {set_name}('{entity_id}') — skipping attach",
                taste_doc::TASTE_EMBEDDING_MODEL,
                taste_doc::TASTE_EMBEDDING_DIM
            ),
        );
        return;
    }
    let params = json!({
        "taste_vector": vector.to_string(),
        "taste_vector_model": model,
    });
    if dispatch_action(
        ctx,
        api_url,
        headers,
        set_name,
        entity_id,
        "AttachTasteVector",
        &params,
    )
    .is_err()
    {
        ctx.log(
            "warn",
            &format!("taste: AttachTasteVector failed for {set_name}('{entity_id}') (non-fatal)"),
        );
    }
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

    // Taxonomy tree for family_id, fetched once (best-effort — empty map just
    // means family_id resolves to "").
    let tax_parents = load_taxonomy_parents(ctx, api_url, headers);

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
        // Derive + store gallery facets (compute here, Temper governs the write).
        // Best-effort: a facet write must never fail a publish.
        attach_computed_facets(ctx, api_url, headers, language_id, &verified_language, &tax_parents);
        // Derive + store the semantic taste vector (embed here, Temper governs
        // the write). Best-effort like facets — never fails a publish.
        let empty = json!({});
        attach_taste_vector(
            ctx,
            api_url,
            headers,
            "DesignLanguages",
            language_id,
            &taste_doc::build_language_doc(verified_language.get("fields").unwrap_or(&empty)),
        );
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

    verify_forced_shadcn_refresh(language_id, job_fields, &fields)?;
    // Re-load so the caller keeps a current snapshot after the byte-level
    // verification above; readiness is now enforced by the spec's
    // cross_entity_state File guards, not by WASM-set *_verified booleans.
    let verified_language = load_required_entity(
        ctx,
        api_url,
        headers,
        "DesignLanguages",
        language_id,
        "language_disappeared",
    )?;
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
        "has_compositions",
        "has_thumbnail",
        "has_design_md",
        "has_valid_design_md",
        "has_shadcn_export",
        "has_shadcn_component_spec",
        "has_shadcn_preview_shots",
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
        let tokens_export_file_id =
            required_string_field(id, &lane_fields, "tokens_export_file_id")?;
        let thumbnail_file_id = required_string_field(id, &lane_fields, "thumbnail_file_id")?;

        verify_palette_signature(id, &lane_fields)?;
        verify_palette_role_map(id, &lane_fields, "neutrals")?;
        verify_palette_role_map(id, &lane_fields, "semantic")?;

        let tokens_body = read_lane_file_value(
            ctx,
            api_url,
            headers,
            "PaletteSystem",
            id,
            &tokens_export_file_id,
            "tokens_export",
        )?;
        verify_palette_tokens_export(id, &tokens_export_file_id, &tokens_body)?;

        verify_lane_image_file(
            ctx,
            api_url,
            headers,
            "PaletteSystem",
            id,
            &thumbnail_file_id,
            "thumbnail",
        )?;

        if !entity_bool_any(&entity, "has_published_assets") {
            let thumbnail_asset = publish_lane_file_artifact(
                ctx,
                api_url,
                headers,
                "PaletteSystem",
                "katagami/palettes",
                id,
                &thumbnail_file_id,
                "thumbnail",
            )?;
            let tokens_asset = publish_lane_file_artifact(
                ctx,
                api_url,
                headers,
                "PaletteSystem",
                "katagami/palettes",
                id,
                &tokens_export_file_id,
                "tokens_export",
            )?;
            dispatch_action(
                ctx,
                api_url,
                headers,
                "PaletteSystems",
                id,
                "AttachPublishedAssets",
                &json!({
                    "thumbnail_asset_id": thumbnail_asset.0,
                    "thumbnail_asset_url": thumbnail_asset.1,
                    "tokens_export_asset_id": tokens_asset.0,
                    "tokens_export_asset_url": tokens_asset.1,
                }),
            )?;
        }

        walk_lane_entity_to_published(
            ctx,
            api_url,
            headers,
            "PaletteSystems",
            id,
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
        let prompt_template = required_string_field(id, &lane_fields, "prompt_template")?;
        verify_prompt_template_holes(id, &prompt_template)?;

        require_lane_json_object(id, "ArtStyle", &lane_fields, "slot_recipes")?;
        require_lane_json_array(id, "ArtStyle", &lane_fields, "credits")?;
        require_lane_json_object(id, "ArtStyle", &lane_fields, "model_provenance")?;

        let reference_ids = string_array_flexible(lane_fields.get("reference_image_file_ids"));
        if reference_ids.is_empty() {
            return Err(VerificationError::new(
                "missing_reference_image_file_ids",
                format!("ArtStyle '{id}' has no reference_image_file_ids"),
            )
            .entity("ArtStyle", id)
            .field("reference_image_file_ids"));
        }
        let proof_ids = string_array_flexible(lane_fields.get("proof_shots_file_ids"));
        if proof_ids.is_empty() {
            return Err(VerificationError::new(
                "missing_proof_shots_file_ids",
                format!("ArtStyle '{id}' has no proof_shots_file_ids"),
            )
            .entity("ArtStyle", id)
            .field("proof_shots_file_ids"));
        }
        let thumbnail_file_id = required_string_field(id, &lane_fields, "thumbnail_file_id")?;

        for file_id in &reference_ids {
            verify_lane_image_file(
                ctx,
                api_url,
                headers,
                "ArtStyle",
                id,
                file_id,
                "reference_image",
            )?;
        }
        for file_id in &proof_ids {
            verify_lane_image_file(ctx, api_url, headers, "ArtStyle", id, file_id, "proof_shot")?;
        }
        verify_lane_image_file(
            ctx,
            api_url,
            headers,
            "ArtStyle",
            id,
            &thumbnail_file_id,
            "thumbnail",
        )?;

        verify_lane_manifest_files(id, "ArtStyle", &lane_fields, "reference_manifest", &reference_ids)?;
        verify_lane_manifest_files(id, "ArtStyle", &lane_fields, "proof_shots_manifest", &proof_ids)?;

        if !entity_bool_any(&entity, "has_published_assets") {
            let thumbnail_asset = publish_lane_file_artifact(
                ctx,
                api_url,
                headers,
                "ArtStyle",
                "katagami/art-styles",
                id,
                &thumbnail_file_id,
                "thumbnail",
            )?;
            let mut reference_assets = serde_json::Map::new();
            for file_id in &reference_ids {
                let asset = publish_lane_file_artifact(
                    ctx,
                    api_url,
                    headers,
                    "ArtStyle",
                    "katagami/art-styles",
                    id,
                    file_id,
                    "reference",
                )?;
                reference_assets.insert(file_id.clone(), serde_json::Value::String(asset.1));
            }
            dispatch_action(
                ctx,
                api_url,
                headers,
                "ArtStyles",
                id,
                "AttachPublishedAssets",
                &json!({
                    "thumbnail_asset_id": thumbnail_asset.0,
                    "thumbnail_asset_url": thumbnail_asset.1,
                    "reference_assets": serde_json::Value::Object(reference_assets).to_string(),
                }),
            )?;
        }

        walk_lane_entity_to_published(
            ctx,
            api_url,
            headers,
            "ArtStyles",
            id,
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
    publish_action: &str,
) -> Result<(), VerificationError> {
    let entity = load_required_entity(
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
    // Readiness of the lane's artifact Files is now enforced by the spec's
    // cross_entity_state guards on SubmitForReview/Publish (Files must be
    // Ready/Locked), not by WASM-dispatched Verify* actions.
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
    // Derive + store the lane's case-insensitive search blob (compute here, Temper
    // governs the write). Non-fatal — never fails a publish.
    let empty = json!({});
    let sb = facets::lane_search_blob(set_name, entity.get("fields").unwrap_or(&empty));
    if !sb.is_empty()
        && dispatch_action(
            ctx,
            api_url,
            headers,
            set_name,
            entity_id,
            "AttachComputedFacets",
            &json!({ "search_blob": sb }),
        )
        .is_err()
    {
        ctx.log(
            "warn",
            &format!("facets: AttachComputedFacets failed for {set_name}('{entity_id}') (non-fatal)"),
        );
    }
    // Derive + store the semantic taste vector for the lane entity (embed here,
    // Temper governs the write). Best-effort like facets — never fails a publish.
    let lane_fields = entity.get("fields").unwrap_or(&empty);
    let doc = match set_name {
        "PaletteSystems" => taste_doc::build_palette_doc(lane_fields),
        "ArtStyles" => taste_doc::build_art_style_doc(lane_fields),
        _ => String::new(),
    };
    attach_taste_vector(ctx, api_url, headers, set_name, entity_id, &doc);
    Ok(())
}

// --- Lane deep verification (ARN-148 / RFC-0002 §7) ---
//
// Art styles and palettes must never publish on a rubber stamp. Before
// walk_lane_entity_to_published dispatches MarkQualityPassed, the finalizer
// reads the actual artifact evidence: image file bodies (rejecting text,
// markup, JSON, SVG, and base64 payloads), prompt-template holes, manifests
// matching attached file ids, credits + model provenance, and palette color
// data. Bodies arrive through the host's lossy UTF-8 http_call, so binary
// image checks use the same negative-heuristic discipline as the
// design-language thumbnail path rather than requiring magic bytes.

fn verify_prompt_template_holes(
    owner_id: &str,
    template: &str,
) -> Result<(), VerificationError> {
    for hole in ["{subject}", "{palette}"] {
        if !template.contains(hole) {
            return Err(VerificationError::new(
                "prompt_template_missing_hole",
                format!(
                    "ArtStyle '{owner_id}' prompt_template is missing its required '{hole}' hole"
                ),
            )
            .entity("ArtStyle", owner_id)
            .field("prompt_template"));
        }
    }
    Ok(())
}

fn lane_field<'a>(
    fields: &'a serde_json::Value,
    name: &str,
) -> Option<&'a serde_json::Value> {
    fields
        .get(name)
        .or_else(|| fields.get(pascal_case(name).as_str()))
}

// Entity fields arrive either as JSON-encoded strings (the OData Edm.String
// storage shape) or as already-parsed objects/arrays depending on the read
// path; accept both, like the skills' own field helpers do.
fn lane_json_value(fields: &serde_json::Value, name: &str) -> Option<serde_json::Value> {
    let value = lane_field(fields, name)?;
    match value {
        serde_json::Value::Object(_) | serde_json::Value::Array(_) => Some(value.clone()),
        _ => parse_json_field(Some(value)),
    }
}

fn require_lane_json_object(
    owner_id: &str,
    entity_label: &'static str,
    fields: &serde_json::Value,
    field_name: &'static str,
) -> Result<serde_json::Value, VerificationError> {
    match lane_json_value(fields, field_name) {
        Some(serde_json::Value::Object(map)) if !map.is_empty() => {
            Ok(serde_json::Value::Object(map))
        }
        _ => Err(VerificationError::new(
            "lane_field_not_object",
            format!(
                "{entity_label} '{owner_id}' field '{field_name}' must be a non-empty JSON object"
            ),
        )
        .entity(entity_label, owner_id)
        .field(field_name)),
    }
}

fn require_lane_json_array(
    owner_id: &str,
    entity_label: &'static str,
    fields: &serde_json::Value,
    field_name: &'static str,
) -> Result<Vec<serde_json::Value>, VerificationError> {
    match lane_json_value(fields, field_name) {
        Some(serde_json::Value::Array(items)) if !items.is_empty() => Ok(items),
        _ => Err(VerificationError::new(
            "lane_field_not_array",
            format!(
                "{entity_label} '{owner_id}' field '{field_name}' must be a non-empty JSON array"
            ),
        )
        .entity(entity_label, owner_id)
        .field(field_name)),
    }
}

fn verify_lane_manifest_files(
    owner_id: &str,
    entity_label: &'static str,
    fields: &serde_json::Value,
    manifest_field: &'static str,
    file_ids: &[String],
) -> Result<(), VerificationError> {
    let manifest = require_lane_json_object(owner_id, entity_label, fields, manifest_field)?;
    let items = manifest
        .get("items")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();
    if items.is_empty() {
        return Err(VerificationError::new(
            "lane_manifest_empty",
            format!("{entity_label} '{owner_id}' {manifest_field} has no items"),
        )
        .entity(entity_label, owner_id)
        .field(manifest_field));
    }
    let mut manifest_ids: Vec<String> = Vec::new();
    for item in &items {
        let file_id = item
            .get("file_id")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string();
        if file_id.is_empty() {
            return Err(VerificationError::new(
                "lane_manifest_item_missing_file_id",
                format!(
                    "{entity_label} '{owner_id}' {manifest_field} has an item without a file_id"
                ),
            )
            .entity(entity_label, owner_id)
            .field(manifest_field));
        }
        manifest_ids.push(file_id);
    }
    let mut expected: Vec<String> = file_ids.to_vec();
    expected.sort();
    expected.dedup();
    manifest_ids.sort();
    manifest_ids.dedup();
    if manifest_ids != expected {
        return Err(VerificationError::new(
            "lane_manifest_files_mismatch",
            format!(
                "{entity_label} '{owner_id}' {manifest_field} items do not match the attached file ids 1:1"
            ),
        )
        .entity(entity_label, owner_id)
        .field(manifest_field));
    }
    Ok(())
}

fn verify_lane_image_file(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    entity_label: &'static str,
    owner_id: &str,
    file_id: &str,
    artifact_kind: &'static str,
) -> Result<(), VerificationError> {
    let file = load_entity(ctx, api_url, headers, "Files", file_id)?.ok_or_else(|| {
        VerificationError::new(
            "lane_file_missing",
            format!(
                "{entity_label} '{owner_id}' {artifact_kind} file '{file_id}' does not exist"
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(artifact_kind, file_id)
    })?;
    let file_status = entity_status_value(&file);
    if file_status != "Ready" && file_status != "Locked" {
        return Err(VerificationError::new(
            "lane_file_not_ready",
            format!(
                "{entity_label} '{owner_id}' {artifact_kind} file '{file_id}' is in state '{file_status}', expected Ready or Locked"
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(artifact_kind, file_id));
    }
    let file_fields = entity_fields(&file);
    let mime_type = first_nonempty(&[
        string_field_any(&file_fields, "mime_type", ""),
        string_field_any(&file_fields, "MimeType", ""),
    ]);
    let size_bytes = numeric_field_any(&file, &["size_bytes", "SizeBytes"]);
    if size_bytes <= 0 {
        return Err(VerificationError::new(
            "lane_file_metadata_missing",
            format!(
                "{entity_label} '{owner_id}' {artifact_kind} file '{file_id}' is Ready but has no usable SizeBytes"
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(artifact_kind, file_id));
    }
    let body = read_lane_file_value(
        ctx,
        api_url,
        headers,
        entity_label,
        owner_id,
        file_id,
        artifact_kind,
    )?;
    if !lane_payload_plausible_image(&mime_type, &body) {
        return Err(VerificationError::new(
            "lane_file_not_image",
            format!(
                "{entity_label} '{owner_id}' {artifact_kind} file '{file_id}' does not look like image bytes (mime '{mime_type}'); text, markup, JSON, SVG, and base64 payloads are not publishable images"
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(artifact_kind, file_id));
    }
    Ok(())
}

fn read_lane_file_value(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    entity_label: &'static str,
    owner_id: &str,
    file_id: &str,
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
            "lane_file_value_missing",
            format!(
                "{entity_label} '{owner_id}' {artifact_kind} file '{file_id}' has no readable $value bytes"
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(artifact_kind, file_id));
    }
    if !(200..300).contains(&resp.status) {
        return Err(VerificationError::new(
            "lane_file_value_read_failed",
            format!(
                "Failed to read Files('{file_id}')/$value for {entity_label} '{owner_id}': HTTP {}: {}",
                resp.status,
                truncate(&resp.body)
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(artifact_kind, file_id));
    }
    Ok(resp.body)
}

// Lanes must carry public assets before Publish (the has_published_assets
// guard), same as design languages. Promote each governed file through the
// generic publish-artifact flow and attach the immutable URLs.
fn publish_lane_file_artifact(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    entity_label: &'static str,
    namespace: &str,
    owner_id: &str,
    file_id: &str,
    label: &str,
) -> Result<(String, String), VerificationError> {
    let body = json!({
        "file_id": file_id,
        "label": label,
        "owner_ref_type": entity_label,
        "owner_ref_id": owner_id,
        "namespace": namespace,
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
                "Failed to publish {label} artifact for {entity_label} '{owner_id}' from file '{file_id}': HTTP {}: {}",
                resp.status,
                truncate(&resp.body)
            ),
        )
        .entity(entity_label, owner_id)
        .artifact(label_to_artifact_kind(label), file_id));
    }
    let parsed: serde_json::Value = serde_json::from_str(&resp.body).map_err(|e| {
        VerificationError::new(
            "publish_artifact_bad_response",
            format!("Failed to parse publish-artifact response: {e}"),
        )
        .entity(entity_label, owner_id)
        .artifact(label_to_artifact_kind(label), file_id)
    })?;
    let artifact = parsed.get("artifact").ok_or_else(|| {
        VerificationError::new(
            "publish_artifact_bad_response",
            "publish-artifact response has no artifact object",
        )
        .entity(entity_label, owner_id)
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
        .entity(entity_label, owner_id)
        .artifact(label_to_artifact_kind(label), file_id));
    }
    Ok((asset_id, canonicalize_public_asset_url(&public_url)))
}

fn lane_payload_plausible_image(mime_type: &str, body: &str) -> bool {
    if body.len() < 64 {
        return false;
    }
    if thumbnail_payload_looks_text_encoded_image(body) {
        return false;
    }
    let prefix: String = body
        .chars()
        .take(4096)
        .collect::<String>()
        .to_ascii_lowercase();
    let trimmed = prefix.trim_start();
    let looks_textual = trimmed.starts_with("<!doctype")
        || (trimmed.starts_with('<') && (prefix.contains("<html") || prefix.contains("<svg")))
        || trimmed.starts_with('{')
        || trimmed.starts_with('[')
        || trimmed.starts_with("version:")
        || trimmed.starts_with("---");
    if looks_textual {
        return false;
    }
    let normalized = mime_type.trim().to_ascii_lowercase();
    if normalized.starts_with("image/") && normalized != "image/svg+xml" {
        return true;
    }
    let binary_signal =
        thumbnail_payload_looks_image_like(body) || body.starts_with('\u{FFFD}');
    matches!(normalized.as_str(), "" | "application/octet-stream") && binary_signal
}

fn is_hex_color(value: &str) -> bool {
    let v = value.trim();
    if !matches!(v.len(), 4 | 7 | 9) {
        return false;
    }
    let mut chars = v.chars();
    if chars.next() != Some('#') {
        return false;
    }
    chars.all(|c| c.is_ascii_hexdigit())
}

fn count_distinct_hex_colors(body: &str) -> usize {
    let bytes = body.as_bytes();
    let mut found: Vec<String> = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'#' && i + 6 < bytes.len() {
            let candidate = &bytes[i + 1..i + 7];
            if candidate.iter().all(|b| b.is_ascii_hexdigit())
                && bytes
                    .get(i + 7)
                    .map(|b| !b.is_ascii_hexdigit())
                    .unwrap_or(true)
            {
                let hex = format!(
                    "#{}",
                    String::from_utf8_lossy(candidate).to_ascii_lowercase()
                );
                if !found.contains(&hex) {
                    found.push(hex);
                }
                i += 7;
                continue;
            }
        }
        i += 1;
    }
    found.len()
}

fn verify_palette_signature(
    owner_id: &str,
    fields: &serde_json::Value,
) -> Result<(), VerificationError> {
    let items = require_lane_json_array(owner_id, "PaletteSystem", fields, "signature")?;
    if items.len() > 4 {
        return Err(VerificationError::new(
            "palette_signature_invalid",
            format!(
                "PaletteSystem '{owner_id}' signature must carry 1-4 accent colors, found {}",
                items.len()
            ),
        )
        .entity("PaletteSystem", owner_id)
        .field("signature"));
    }
    for item in &items {
        let hex = item
            .get("hex")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        if !is_hex_color(hex) {
            return Err(VerificationError::new(
                "palette_signature_invalid",
                format!(
                    "PaletteSystem '{owner_id}' signature entry '{hex}' is not a real hex color"
                ),
            )
            .entity("PaletteSystem", owner_id)
            .field("signature"));
        }
    }
    Ok(())
}

fn verify_palette_role_map(
    owner_id: &str,
    fields: &serde_json::Value,
    field_name: &'static str,
) -> Result<(), VerificationError> {
    let map = require_lane_json_object(owner_id, "PaletteSystem", fields, field_name)?;
    let entries = map.as_object().cloned().unwrap_or_default();
    for (role, value) in &entries {
        let hex = value.as_str().unwrap_or("");
        if !is_hex_color(hex) {
            return Err(VerificationError::new(
                "palette_role_not_hex",
                format!(
                    "PaletteSystem '{owner_id}' {field_name}.{role} is not a real hex color"
                ),
            )
            .entity("PaletteSystem", owner_id)
            .field(field_name));
        }
    }
    Ok(())
}

fn verify_palette_tokens_export(
    owner_id: &str,
    file_id: &str,
    body: &str,
) -> Result<(), VerificationError> {
    let trimmed = body.trim();
    let hex_count = count_distinct_hex_colors(trimmed);
    if trimmed.len() < 200 || !trimmed.contains("--") || hex_count < 6 {
        return Err(VerificationError::new(
            "palette_tokens_export_invalid",
            format!(
                "PaletteSystem '{owner_id}' tokens export '{file_id}' must be a real CSS+DTCG document ({} chars, {hex_count} distinct hex colors); regenerate the export",
                trimmed.len()
            ),
        )
        .entity("PaletteSystem", owner_id)
        .artifact("tokens_export", file_id));
    }
    Ok(())
}


// --- WritingStyle lane: consent attestation + bands self-consistency (RFC-0002 §5-6) ---
//
// A writing style publishes only as a CHECKED contract: the consent block must
// be opt-in with author + license (-> AttestConsent), and every corpus file and
// long-enough exemplar must pass the style's own mechanical bands
// (-> MarkBandsSelfConsistent). Banned phrases/patterns are hard fails on every
// text; statistical bands (sentence rhythm, punctuation, TTR, function-word
// distance) evaluate only texts at or above min_words_to_evaluate — the abstain
// discipline — and at least one text must be evaluable.

fn verify_synthesized_writing_styles(
    ctx: &Context,
    api_url: &str,
    headers: &[(String, String)],
    fields: &serde_json::Value,
) -> Result<serde_json::Value, VerificationError> {
    let ids = lane_ids_from_job(fields, &["writing_style_ids", "writingstyle_ids"]);
    if ids.is_empty() {
        return Err(VerificationError::new(
            "missing_writing_style_ids",
            "synthesize_writing_style completed without writing_style_ids",
        )
        .field("writing_style_ids"));
    }
    for id in &ids {
        let entity = load_required_entity(
            ctx,
            api_url,
            headers,
            "WritingStyles",
            id,
            "missing_writing_style",
        )?;
        let lane_fields = entity_fields(&entity);

        let consent = require_lane_json_object(id, "WritingStyle", &lane_fields, "consent")?;
        verify_voice_consent(id, &consent)?;
        require_lane_json_array(id, "WritingStyle", &lane_fields, "credits")?;
        require_lane_json_object(id, "WritingStyle", &lane_fields, "model_provenance")?;
        require_lane_json_object(id, "WritingStyle", &lane_fields, "vocabulary")?;

        let bands = require_lane_json_object(id, "WritingStyle", &lane_fields, "mechanical_bands")?;
        if bands.get("schema").and_then(|v| v.as_str()) != Some("katagami:voice-bands/v1") {
            return Err(VerificationError::new(
                "voice_bands_schema_invalid",
                format!(
                    "WritingStyle '{id}' mechanical_bands must declare schema katagami:voice-bands/v1"
                ),
            )
            .entity("WritingStyle", id)
            .field("mechanical_bands"));
        }

        let corpus_ids = string_array_flexible(lane_fields.get("corpus_file_ids"));
        if corpus_ids.is_empty() {
            return Err(VerificationError::new(
                "missing_corpus_file_ids",
                format!("WritingStyle '{id}' has no corpus_file_ids"),
            )
            .entity("WritingStyle", id)
            .field("corpus_file_ids"));
        }
        let exemplars = require_lane_json_array(id, "WritingStyle", &lane_fields, "exemplars")?;
        if exemplars.len() < 3 {
            return Err(VerificationError::new(
                "insufficient_exemplars",
                format!(
                    "WritingStyle '{id}' needs at least 3 annotated exemplars, found {}",
                    exemplars.len()
                ),
            )
            .entity("WritingStyle", id)
            .field("exemplars"));
        }

        let voice_md_file_id = required_string_field(id, &lane_fields, "voice_md_file_id")?;
        let thumbnail_file_id = required_string_field(id, &lane_fields, "thumbnail_file_id")?;

        // Gather the texts the bands must hold over: every corpus file body plus
        // every exemplar passage.
        let mut texts: Vec<(String, String)> = Vec::new();
        for file_id in &corpus_ids {
            let body = read_lane_file_value(
                ctx,
                api_url,
                headers,
                "WritingStyle",
                id,
                file_id,
                "corpus",
            )?;
            texts.push((format!("corpus:{file_id}"), body));
        }
        for (index, exemplar) in exemplars.iter().enumerate() {
            let passage = exemplar.get("text").and_then(|v| v.as_str()).unwrap_or("");
            if passage.trim().is_empty() {
                return Err(VerificationError::new(
                    "exemplar_missing_text",
                    format!("WritingStyle '{id}' exemplar {index} has no text"),
                )
                .entity("WritingStyle", id)
                .field("exemplars"));
            }
            texts.push((format!("exemplar:{index}"), passage.to_string()));
        }

        if let Err(violation) = check_voice_bands(&bands, &texts) {
            return Err(VerificationError::new(
                "voice_bands_violation",
                format!("WritingStyle '{id}' fails its own mechanical bands: {violation}"),
            )
            .entity("WritingStyle", id)
            .field("mechanical_bands"));
        }

        let voice_md = read_lane_file_value(
            ctx,
            api_url,
            headers,
            "WritingStyle",
            id,
            &voice_md_file_id,
            "voice_md",
        )?;
        verify_voice_md_body(id, &voice_md_file_id, &voice_md)?;

        verify_lane_image_file(
            ctx,
            api_url,
            headers,
            "WritingStyle",
            id,
            &thumbnail_file_id,
            "thumbnail",
        )?;

        // Evidence checks passed: flip the verifier-owned gates.
        dispatch_action(ctx, api_url, headers, "WritingStyles", id, "AttestConsent", &json!({}))?;
        dispatch_action(
            ctx,
            api_url,
            headers,
            "WritingStyles",
            id,
            "MarkBandsSelfConsistent",
            &json!({}),
        )?;

        if !entity_bool_any(&entity, "has_published_assets") {
            let voice_md_asset = publish_lane_file_artifact(
                ctx,
                api_url,
                headers,
                "WritingStyle",
                "katagami/writing-styles",
                id,
                &voice_md_file_id,
                "voice_md",
            )?;
            let thumbnail_asset = publish_lane_file_artifact(
                ctx,
                api_url,
                headers,
                "WritingStyle",
                "katagami/writing-styles",
                id,
                &thumbnail_file_id,
                "thumbnail",
            )?;
            dispatch_action(
                ctx,
                api_url,
                headers,
                "WritingStyles",
                id,
                "AttachPublishedAssets",
                &json!({
                    "voice_md_asset_id": voice_md_asset.0,
                    "voice_md_asset_url": voice_md_asset.1,
                    "thumbnail_asset_id": thumbnail_asset.0,
                    "thumbnail_asset_url": thumbnail_asset.1,
                }),
            )?;
        }

        // CURATOR GATE (Rita, 2026-07-04): writing styles never auto-publish.
        // Mechanics are machine-verified above; taste stays human. Walk the
        // entity to UnderReview fully publish-ready (quality marked, assets
        // attached, every Publish guard satisfied) and STOP — the curator
        // reads the voice and dispatches Publish from the owner UI.
        let current = load_required_entity(
            ctx,
            api_url,
            headers,
            "WritingStyles",
            id,
            "missing_writing_style",
        )?;
        if entity_status_value(&current) == "Draft" {
            dispatch_action(
                ctx,
                api_url,
                headers,
                "WritingStyles",
                id,
                "SubmitForReview",
                &json!({}),
            )?;
        }
        dispatch_action(
            ctx,
            api_url,
            headers,
            "WritingStyles",
            id,
            "MarkQualityPassed",
            &json!({}),
        )?;
        // Derive + store the semantic taste vector from the voice layer (embed
        // here, Temper governs the write). The style stays UnderReview for the
        // curator; AttachTasteVector is allowed there. Best-effort — never blocks
        // the review-ready handoff.
        attach_taste_vector(
            ctx,
            api_url,
            headers,
            "WritingStyles",
            id,
            &taste_doc::build_writing_style_doc(&lane_fields),
        );
    }
    Ok(json!({
        "validated": true,
        "job_type": "synthesize_writing_style",
        "review_ready_writing_style_ids": ids,
        "auto_publish": false,
    }))
}

fn verify_voice_consent(
    owner_id: &str,
    consent: &serde_json::Value,
) -> Result<(), VerificationError> {
    let basis = consent.get("basis").and_then(|v| v.as_str()).unwrap_or("");
    let author = consent.get("author").and_then(|v| v.as_str()).unwrap_or("");
    let license = consent.get("license").and_then(|v| v.as_str()).unwrap_or("");
    let provenance = consent
        .get("provenance")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    // Three honest bases (RFC-0002 §5.1 as refined 2026-07-04):
    //   opt_in        — a person/brand handed over their corpus (the intake gate;
    //                   the ONLY basis the personal-voice track accepts)
    //   public_domain — a verified-PD corpus; provenance must name the
    //                   author/work/edition
    //   original      — the pipeline authored the corpus in-register itself
    let basis_ok = matches!(basis, "opt_in" | "public_domain" | "original");
    let provenance_ok = basis != "public_domain" || !provenance.trim().is_empty();
    if !basis_ok || !provenance_ok || author.trim().is_empty() || license.trim().is_empty() {
        return Err(VerificationError::new(
            "voice_consent_invalid",
            format!(
                "WritingStyle '{owner_id}' consent must carry basis opt_in | public_domain | original with author and license (public_domain also requires provenance naming the source work/edition); found basis '{basis}'"
            ),
        )
        .entity("WritingStyle", owner_id)
        .field("consent"));
    }
    Ok(())
}

fn verify_voice_md_body(
    owner_id: &str,
    file_id: &str,
    body: &str,
) -> Result<(), VerificationError> {
    let trimmed = body.trim();
    let lower = trimmed.to_ascii_lowercase();
    let mut problems: Vec<String> = Vec::new();
    if !trimmed.starts_with("---") {
        problems.push("missing YAML front matter".to_string());
    }
    if !lower.contains("kind: voice") {
        problems.push("front matter missing kind: voice".to_string());
    }
    if !["consent: opt_in", "consent: public_domain", "consent: original"]
        .iter()
        .any(|marker| lower.contains(marker))
    {
        problems.push(
            "front matter missing consent basis (opt_in | public_domain | original)".to_string(),
        );
    }
    for heading in ["## Overview", "## Tone", "## Vocabulary", "## Moves", "## Register", "## Never"] {
        if !trimmed.contains(heading) {
            problems.push(format!("missing {heading}"));
        }
    }
    if !trimmed.contains("katagami:voice-bands/v1") {
        problems.push("missing katagami:voice-bands/v1 bands block".to_string());
    }
    for marker in ["TBD", "TODO", "lorem ipsum", "placeholder"] {
        if lower.contains(&marker.to_ascii_lowercase()) {
            problems.push(format!("placeholder text '{marker}'"));
        }
    }
    if !problems.is_empty() {
        return Err(VerificationError::new(
            "voice_md_invalid",
            format!("WritingStyle '{owner_id}' VOICE.md is not a valid contract projection: {}", problems.join("; ")),
        )
        .entity("WritingStyle", owner_id)
        .artifact("voice_md", file_id));
    }
    Ok(())
}

// --- Deterministic voice-bands checker (katagami:voice-bands/v1) ---

const FUNCTION_WORDS: [&str; 48] = [
    "the", "a", "an", "and", "or", "but", "if", "then", "so", "of", "to", "in", "on", "at",
    "by", "for", "with", "from", "as", "is", "are", "was", "were", "be", "been", "it", "its",
    "this", "that", "these", "those", "i", "you", "we", "they", "he", "she", "not", "no",
    "do", "does", "did", "have", "has", "had", "will", "would", "can",
];

fn words_of(text: &str) -> Vec<String> {
    text.split(|c: char| !(c.is_alphanumeric() || c == '\''))
        .filter(|w| !w.is_empty())
        .map(|w| w.to_ascii_lowercase())
        .collect()
}

fn sentences_of(text: &str) -> Vec<String> {
    text.split(|c: char| c == '.' || c == '!' || c == '?')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn mean_stdev(values: &[f64]) -> (f64, f64) {
    if values.is_empty() {
        return (0.0, 0.0);
    }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter().map(|v| (v - mean) * (v - mean)).sum::<f64>() / values.len() as f64;
    (mean, variance.sqrt())
}

fn function_word_distribution(words: &[String]) -> Vec<f64> {
    let mut counts = vec![0f64; FUNCTION_WORDS.len()];
    for word in words {
        if let Some(pos) = FUNCTION_WORDS.iter().position(|f| f == word) {
            counts[pos] += 1.0;
        }
    }
    let total: f64 = counts.iter().sum();
    if total > 0.0 {
        for count in counts.iter_mut() {
            *count /= total;
        }
    }
    counts
}

fn js_divergence(p: &[f64], q: &[f64]) -> f64 {
    let kl = |a: &[f64], b: &[f64]| -> f64 {
        a.iter()
            .zip(b.iter())
            .filter(|(x, _)| **x > 0.0)
            .map(|(x, y)| x * (x / (y.max(1e-12))).ln())
            .sum::<f64>()
    };
    let m: Vec<f64> = p.iter().zip(q.iter()).map(|(x, y)| 0.5 * (x + y)).collect();
    (0.5 * kl(p, &m) + 0.5 * kl(q, &m)).max(0.0)
}

// ── Bands v2: evenness + character-level fingerprint (2026-07-04) ──
// AI-text detectors mostly detect EVENNESS (uniform rhythm, repeated openers,
// connective overuse). These are the deterministic cousins of those signals —
// no reference LM required — plus char-trigram distance, one of the strongest
// classical authorship features.

const CONNECTIVES: [&str; 14] = [
    "however", "moreover", "furthermore", "additionally", "thus", "therefore",
    "indeed", "notably", "importantly", "crucially", "consequently",
    "nevertheless", "nonetheless", "ultimately",
];

fn paragraphs_of(text: &str) -> Vec<String> {
    text.split("\n\n")
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty())
        .collect()
}

fn char_trigram_distribution(text: &str) -> std::collections::BTreeMap<String, f64> {
    let cleaned: String = text
        .to_ascii_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '\'' { c } else { ' ' })
        .collect();
    let chars: Vec<char> = cleaned.chars().collect();
    let mut counts: std::collections::BTreeMap<String, f64> = std::collections::BTreeMap::new();
    for window in chars.windows(3) {
        let gram: String = window.iter().collect();
        if gram.trim().len() < 2 {
            continue;
        }
        *counts.entry(gram).or_insert(0.0) += 1.0;
    }
    let total: f64 = counts.values().sum();
    if total > 0.0 {
        for value in counts.values_mut() {
            *value /= total;
        }
    }
    counts
}

fn trigram_js_divergence(
    p: &std::collections::BTreeMap<String, f64>,
    q: &std::collections::BTreeMap<String, f64>,
) -> f64 {
    let keys: std::collections::BTreeSet<&String> = p.keys().chain(q.keys()).collect();
    let mut pv = Vec::with_capacity(keys.len());
    let mut qv = Vec::with_capacity(keys.len());
    for key in keys {
        pv.push(*p.get(key).unwrap_or(&0.0));
        qv.push(*q.get(key).unwrap_or(&0.0));
    }
    js_divergence(&pv, &qv)
}

fn range_of(value: Option<&serde_json::Value>) -> Option<(f64, f64)> {
    let arr = value?.as_array()?;
    if arr.len() != 2 {
        return None;
    }
    Some((arr[0].as_f64()?, arr[1].as_f64()?))
}

/// Check every text against the bands. Banned phrases and patterns are hard
/// fails on every text; statistical bands evaluate only texts with at least
/// min_words_to_evaluate words (default 150). At least one text must be
/// evaluable, or there is no evidence the contract is satisfiable.
fn check_voice_bands(
    bands: &serde_json::Value,
    texts: &[(String, String)],
) -> Result<usize, String> {
    let min_words = bands
        .get("min_words_to_evaluate")
        .and_then(|v| v.as_f64())
        .unwrap_or(150.0) as usize;

    let banned_phrases: Vec<String> = bands
        .get("banned_phrases")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_ascii_lowercase())
                .collect()
        })
        .unwrap_or_default();
    let banned_patterns: Vec<regex_lite::Regex> = bands
        .get("banned_patterns")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .filter_map(|s| regex_lite::Regex::new(&format!("(?i){s}")).ok())
                .collect()
        })
        .unwrap_or_default();

    // The corpus aggregate is the reference for self-consistency: function
    // words and character trigrams both compare each text against the whole.
    let all_words: Vec<String> = texts.iter().flat_map(|(_, body)| words_of(body)).collect();
    let reference_dist = function_word_distribution(&all_words);
    let all_text: String = texts
        .iter()
        .map(|(_, body)| body.as_str())
        .collect::<Vec<_>>()
        .join("\n\n");
    let reference_trigrams = char_trigram_distribution(&all_text);

    let mut evaluated = 0usize;
    for (label, body) in texts {
        let lower = body.to_ascii_lowercase();
        for phrase in &banned_phrases {
            if lower.contains(phrase.as_str()) {
                return Err(format!("{label}: banned phrase '{phrase}'"));
            }
        }
        for pattern in &banned_patterns {
            if pattern.is_match(body) {
                return Err(format!("{label}: banned pattern '{}'", pattern.as_str()));
            }
        }

        let words = words_of(body);
        if words.len() < min_words {
            continue; // abstain: too short for statistical bands
        }
        evaluated += 1;

        if let Some(sentence_band) = bands.get("sentence_length") {
            let lengths: Vec<f64> = sentences_of(body)
                .iter()
                .map(|s| words_of(s).len() as f64)
                .collect();
            let (mean, stdev) = mean_stdev(&lengths);
            if let Some((lo, hi)) = range_of(sentence_band.get("mean")) {
                if mean < lo || mean > hi {
                    return Err(format!(
                        "{label}: sentence mean {mean:.1} outside [{lo}, {hi}]"
                    ));
                }
            }
            if let Some(stdev_min) = sentence_band.get("stdev_min").and_then(|v| v.as_f64()) {
                if stdev < stdev_min {
                    return Err(format!(
                        "{label}: sentence stdev {stdev:.1} below burstiness floor {stdev_min}"
                    ));
                }
            }
        }

        if let Some(punct) = bands.get("punctuation").and_then(|v| v.as_object()) {
            let per_1000 = |count: usize| count as f64 * 1000.0 / words.len() as f64;
            for (key, range) in punct {
                let needle = match key.as_str() {
                    "em_dash_per_1000_words" => "—",
                    "exclamations_per_1000_words" => "!",
                    "semicolons_per_1000_words" => ";",
                    _ => continue,
                };
                let rate = per_1000(body.matches(needle).count());
                if let Some((lo, hi)) = range_of(Some(range)) {
                    if rate < lo || rate > hi {
                        return Err(format!(
                            "{label}: {key} {rate:.2} outside [{lo}, {hi}]"
                        ));
                    }
                }
            }
        }

        if let Some(ttr_band) = bands.get("type_token_ratio") {
            if let Some(ttr_min) = ttr_band.get("min").and_then(|v| v.as_f64()) {
                // TTR decays with length, so evaluate over fixed windows
                // (window_words, default 500) and average — the schema's shape.
                let window = ttr_band
                    .get("window_words")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(500.0)
                    .max(1.0) as usize;
                let mut ratios: Vec<f64> = Vec::new();
                for chunk in words.chunks(window) {
                    let mut distinct: Vec<&String> = chunk.iter().collect();
                    distinct.sort();
                    distinct.dedup();
                    ratios.push(distinct.len() as f64 / chunk.len() as f64);
                }
                let (ttr, _) = mean_stdev(&ratios);
                if ttr < ttr_min {
                    return Err(format!(
                        "{label}: windowed type-token ratio {ttr:.2} below {ttr_min}"
                    ));
                }
            }
        }

        if let Some(max_distance) = bands
            .get("function_words")
            .and_then(|v| v.get("max_distance"))
            .and_then(|v| v.as_f64())
        {
            let dist = js_divergence(&function_word_distribution(&words), &reference_dist);
            if dist > max_distance {
                return Err(format!(
                    "{label}: function-word divergence {dist:.3} above {max_distance}"
                ));
            }
        }

        if let Some(max_distance) = bands
            .get("char_trigrams")
            .and_then(|v| v.get("max_distance"))
            .and_then(|v| v.as_f64())
        {
            let dist = trigram_js_divergence(&char_trigram_distribution(body), &reference_trigrams);
            if dist > max_distance {
                return Err(format!(
                    "{label}: char-trigram divergence {dist:.3} above {max_distance}"
                ));
            }
        }

        if let Some(max_share) = bands
            .get("sentence_openers")
            .and_then(|v| v.get("max_top_share"))
            .and_then(|v| v.as_f64())
        {
            let sentences = sentences_of(body);
            if sentences.len() >= 8 {
                let mut opener_counts: std::collections::BTreeMap<String, usize> =
                    std::collections::BTreeMap::new();
                for sentence in &sentences {
                    if let Some(first) = words_of(sentence).into_iter().next() {
                        *opener_counts.entry(first).or_insert(0) += 1;
                    }
                }
                if let Some((opener, top)) = opener_counts.iter().max_by_key(|(_, n)| **n) {
                    let share = *top as f64 / sentences.len() as f64;
                    if share > max_share {
                        return Err(format!(
                            "{label}: {share:.0}% of sentences open with '{opener}' (ceiling {:.0}%) — evenness tell",
                            max_share * 100.0, share = share * 100.0
                        ));
                    }
                }
            }
        }

        if let Some(range) = bands.get("connectives_per_1000_words") {
            if let Some((lo, hi)) = range_of(Some(range)) {
                let count = words
                    .iter()
                    .filter(|w| CONNECTIVES.contains(&w.as_str()))
                    .count();
                let rate = count as f64 * 1000.0 / words.len() as f64;
                if rate < lo || rate > hi {
                    return Err(format!(
                        "{label}: connective rate {rate:.1}/1000 outside [{lo}, {hi}] — discourse-marker tell"
                    ));
                }
            }
        }

        if let Some(stdev_min) = bands
            .get("paragraph_length")
            .and_then(|v| v.get("stdev_min"))
            .and_then(|v| v.as_f64())
        {
            let lengths: Vec<f64> = paragraphs_of(body)
                .iter()
                .map(|p| words_of(p).len() as f64)
                .collect();
            if lengths.len() >= 4 {
                let (_, stdev) = mean_stdev(&lengths);
                if stdev < stdev_min {
                    return Err(format!(
                        "{label}: paragraph-length stdev {stdev:.1} below {stdev_min} — uniform-block tell"
                    ));
                }
            }
        }

        if let Some(hapax_min) = bands
            .get("hapax_ratio")
            .and_then(|v| v.get("min"))
            .and_then(|v| v.as_f64())
        {
            let window = bands
                .get("hapax_ratio")
                .and_then(|v| v.get("window_words"))
                .and_then(|v| v.as_f64())
                .unwrap_or(500.0)
                .max(1.0) as usize;
            let mut ratios: Vec<f64> = Vec::new();
            for chunk in words.chunks(window) {
                let mut counts: std::collections::BTreeMap<&String, usize> =
                    std::collections::BTreeMap::new();
                for word in chunk {
                    *counts.entry(word).or_insert(0) += 1;
                }
                let hapax = counts.values().filter(|n| **n == 1).count();
                ratios.push(hapax as f64 / chunk.len() as f64);
            }
            let (ratio, _) = mean_stdev(&ratios);
            if ratio < hapax_min {
                return Err(format!(
                    "{label}: windowed hapax ratio {ratio:.2} below {hapax_min} — vocabulary-evenness tell"
                ));
            }
        }
    }

    if evaluated == 0 {
        return Err(format!(
            "no text reached min_words_to_evaluate ({min_words}); the contract has no evaluable evidence"
        ));
    }
    Ok(evaluated)
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

// Stubs for the wasm host imports so host-target builds (cargo test and the
// incidental host cdylib) link. Excluded from the shipped wasm32 artifact;
// never called by the pure functions under test.
#[cfg(not(target_arch = "wasm32"))]
mod host_stubs {
        #[no_mangle]
        pub extern "C" fn host_log(_a: i32, _b: i32, _c: i32, _d: i32) {}
        #[no_mangle]
        pub extern "C" fn host_get_context(_a: i32, _b: i32) -> i32 {
            -1
        }
        #[no_mangle]
        pub extern "C" fn host_set_result(_a: i32, _b: i32) {}
        #[no_mangle]
        pub extern "C" fn host_emit_progress(_a: i32, _b: i32) -> i32 {
            -1
        }
        #[no_mangle]
        pub extern "C" fn host_get_secret(_a: i32, _b: i32, _c: i32, _d: i32) -> i32 {
            -1
        }
        #[no_mangle]
        pub extern "C" fn host_http_call(
            _a: i32,
            _b: i32,
            _c: i32,
            _d: i32,
            _e: i32,
            _f: i32,
            _g: i32,
            _h: i32,
            _i: i32,
            _j: i32,
        ) -> i32 {
            -1
        }
        #[no_mangle]
        pub extern "C" fn host_connect_call(
            _a: i32,
            _b: i32,
            _c: i32,
            _d: i32,
            _e: i32,
            _f: i32,
            _g: i32,
            _h: i32,
        ) -> i32 {
            -1
        }
        #[no_mangle]
        pub extern "C" fn host_evaluate_spec(
            _a: i32,
            _b: i32,
            _c: i32,
            _d: i32,
            _e: i32,
            _f: i32,
            _g: i32,
            _h: i32,
            _i: i32,
            _j: i32,
        ) -> i32 {
            -1
        }
}

#[cfg(test)]
mod lane_verification_tests {
    use super::*;

    // Real image files generated with PIL (testdata/). The production body
    // path is reqwest `.text()` = lossy UTF-8 decoding; reproduce it exactly.
    const REAL_JPEG: &[u8] = include_bytes!("../testdata/real.jpg");
    const REAL_PNG: &[u8] = include_bytes!("../testdata/real.png");

    fn lossy(bytes: &[u8]) -> String {
        String::from_utf8_lossy(bytes).to_string()
    }

    #[test]
    fn real_jpeg_lossy_body_passes_the_image_gate() {
        let body = lossy(REAL_JPEG);
        assert!(
            body.starts_with('\u{FFFD}'),
            "lossy-decoded JPEG must start with the replacement char"
        );
        assert!(lane_payload_plausible_image("image/jpeg", &body));
        assert!(lane_payload_plausible_image("", &body));
        assert!(lane_payload_plausible_image("application/octet-stream", &body));
    }

    #[test]
    fn real_png_lossy_body_passes_the_image_gate() {
        let body = lossy(REAL_PNG);
        assert!(body.starts_with('\u{FFFD}'));
        assert!(lane_payload_plausible_image("image/png", &body));
        assert!(lane_payload_plausible_image("application/octet-stream", &body));
    }

    #[test]
    fn ascii_magic_gif_passes_without_mime() {
        let mut body = String::from("GIF89a");
        body.push_str(&"\u{FFFD}x".repeat(64));
        assert!(lane_payload_plausible_image("", &body));
    }

    #[test]
    fn html_markup_is_rejected_even_with_image_mime() {
        let body = format!(
            "<!doctype html><html><body>{}</body></html>",
            "broken render ".repeat(16)
        );
        assert!(!lane_payload_plausible_image("image/jpeg", &body));
        let body2 = format!("  <html><head></head><body>{}</body></html>", "x".repeat(128));
        assert!(!lane_payload_plausible_image("image/png", &body2));
    }

    #[test]
    fn svg_recovery_placeholders_are_rejected() {
        let body = format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"600\" height=\"400\">{}</svg>",
            "<rect width=\"10\" height=\"10\"/>".repeat(8)
        );
        assert!(!lane_payload_plausible_image("image/jpeg", &body));
        assert!(!lane_payload_plausible_image("", &body));
    }

    #[test]
    fn svg_mime_is_rejected_even_with_binary_body() {
        assert!(!lane_payload_plausible_image("image/svg+xml", &lossy(REAL_JPEG)));
    }

    #[test]
    fn base64_and_data_url_payloads_are_rejected() {
        let b64 = format!("/9j/{}", "4AAQSkZJRgABAQAA".repeat(16));
        assert!(!lane_payload_plausible_image("image/jpeg", &b64));
        let data_url = format!("data:image/jpeg;base64,/9j/{}", "4AAQSkZJRg".repeat(16));
        assert!(!lane_payload_plausible_image("image/jpeg", &data_url));
        let png_b64 = format!("iVBORw0KGgo{}", "AAAANSUhEUg".repeat(16));
        assert!(!lane_payload_plausible_image("image/png", &png_b64));
    }

    #[test]
    fn json_and_yaml_bodies_are_rejected() {
        let json_err = format!(
            "{{\"error\": \"file not found\", \"detail\": \"{}\"}}",
            "x".repeat(80)
        );
        assert!(!lane_payload_plausible_image("application/octet-stream", &json_err));
        assert!(!lane_payload_plausible_image("image/jpeg", &json_err));
        let yaml = format!("version: alpha\nname: fake\ncomponents:\n  - {}", "x".repeat(80));
        assert!(!lane_payload_plausible_image("image/jpeg", &yaml));
        let front_matter = format!("---\nname: fake\n---\n{}", "body ".repeat(32));
        assert!(!lane_payload_plausible_image("image/jpeg", &front_matter));
    }

    #[test]
    fn tiny_bodies_are_rejected() {
        assert!(!lane_payload_plausible_image("image/jpeg", "x"));
        assert!(!lane_payload_plausible_image("image/jpeg", ""));
    }

    #[test]
    fn prompt_template_holes_are_required() {
        assert!(verify_prompt_template_holes(
            "as-1",
            "{subject}, two-color Risograph print, {palette}, coarse halftone grain"
        )
        .is_ok());
        let err = verify_prompt_template_holes("as-1", "{subject} without palette").unwrap_err();
        assert_eq!(err.code, "prompt_template_missing_hole");
        assert!(verify_prompt_template_holes("as-1", "{palette} without subject").is_err());
        assert!(verify_prompt_template_holes("as-1", "no holes at all").is_err());
    }

    #[test]
    fn hex_color_rules() {
        assert!(is_hex_color("#7c6f57"));
        assert!(is_hex_color("#fff"));
        assert!(is_hex_color("#7c6f57ff"));
        assert!(!is_hex_color("7c6f57"));
        assert!(!is_hex_color("#7c6f5"));
        assert!(!is_hex_color("#gggggg"));
        assert!(!is_hex_color("muddy"));
        assert!(!is_hex_color(""));
    }

    #[test]
    fn distinct_hex_counting() {
        let body = "--ds-bg: #ffffff; --ds-ink: #111111; --ds-accent: #7c6f57; again #FFFFFF; not#7c6f57X a-hash #12345 short";
        // #ffffff and #FFFFFF dedupe; #7c6f57X has a 7th hex digit... 'X' is
        // not a hex digit, so #7c6f57 counts (already seen); #12345 is short.
        assert_eq!(count_distinct_hex_colors(body), 3);
    }

    #[test]
    fn skill_shaped_tokens_export_passes_and_garbage_fails() {
        // Exact shape produced by synthesize-palette: CSS vars + "/* DTCG */" + JSON.
        let css: String = [
            ("bg", "#faf7f0"),
            ("surface", "#ffffff"),
            ("ink", "#1c1a16"),
            ("muted", "#6b655a"),
            ("accent", "#7c6f57"),
            ("error", "#b3402f"),
            ("warning", "#b3862f"),
            ("success", "#3f7a4e"),
        ]
        .iter()
        .map(|(k, v)| format!("  --ds-{k}: {v};\n"))
        .collect();
        let tokens_doc = format!(
            "/* Ochre Field — Katagami palette tokens */\n:root {{\n{css}}}\n/* DTCG */\n{{\"color\": {{\"accent\": {{\"$type\": \"color\", \"$value\": \"#7c6f57\"}}}}}}"
        );
        assert!(verify_palette_tokens_export("ps-1", "file-1", &tokens_doc).is_ok());

        let err = verify_palette_tokens_export("ps-1", "file-1", "not a tokens doc").unwrap_err();
        assert_eq!(err.code, "palette_tokens_export_invalid");
        // Long but colorless documents fail too.
        let colorless = format!("/* doc */\n{}", "--ds-x: none; ".repeat(40));
        assert!(verify_palette_tokens_export("ps-1", "file-1", &colorless).is_err());
    }

    #[test]
    fn manifest_must_match_attached_file_ids() {
        // Fields bag exactly as the skill writes it: manifest json.dumps'd
        // into a string field with an {items: [...]} envelope.
        let fields = json!({
            "reference_manifest": "{\"items\": [{\"file_id\": \"f1\", \"role\": \"reference\", \"aspect\": \"1:1\"}, {\"file_id\": \"f2\", \"role\": \"reference\", \"aspect\": \"1:1\"}]}"
        });
        let ok = verify_lane_manifest_files(
            "as-1",
            "ArtStyle",
            &fields,
            "reference_manifest",
            &["f1".to_string(), "f2".to_string()],
        );
        assert!(ok.is_ok());

        let mismatch = verify_lane_manifest_files(
            "as-1",
            "ArtStyle",
            &fields,
            "reference_manifest",
            &["f1".to_string(), "f3".to_string()],
        )
        .unwrap_err();
        assert_eq!(mismatch.code, "lane_manifest_files_mismatch");

        let missing_id_fields = json!({
            "proof_shots_manifest": "{\"items\": [{\"subject\": \"portrait\"}]}"
        });
        let missing = verify_lane_manifest_files(
            "as-1",
            "ArtStyle",
            &missing_id_fields,
            "proof_shots_manifest",
            &["f1".to_string()],
        )
        .unwrap_err();
        assert_eq!(missing.code, "lane_manifest_item_missing_file_id");
    }

    #[test]
    fn manifest_pascal_case_fallback() {
        let fields = json!({
            "ReferenceManifest": {"items": [{"file_id": "f1"}]}
        });
        assert!(verify_lane_manifest_files(
            "as-1",
            "ArtStyle",
            &fields,
            "reference_manifest",
            &["f1".to_string()],
        )
        .is_ok());
    }

    #[test]
    fn json_field_requirements() {
        let fields = json!({
            "slot_recipes": "{\"hero\": \"wide establishing scene\"}",
            "credits": [{"name": "Risograph print culture", "kind": "tradition"}],
            "model_provenance": {"style": {"model": "m"}},
            "empty_obj": "{}",
            "empty_arr": "[]"
        });
        assert!(require_lane_json_object("as-1", "ArtStyle", &fields, "slot_recipes").is_ok());
        assert!(require_lane_json_array("as-1", "ArtStyle", &fields, "credits").is_ok());
        assert!(
            require_lane_json_object("as-1", "ArtStyle", &fields, "model_provenance").is_ok()
        );
        assert_eq!(
            require_lane_json_object("as-1", "ArtStyle", &fields, "empty_obj")
                .unwrap_err()
                .code,
            "lane_field_not_object"
        );
        assert_eq!(
            require_lane_json_array("as-1", "ArtStyle", &fields, "empty_arr")
                .unwrap_err()
                .code,
            "lane_field_not_array"
        );
        assert!(require_lane_json_object("as-1", "ArtStyle", &fields, "absent").is_err());
    }

    #[test]
    fn palette_signature_and_role_maps() {
        let fields = json!({
            "signature": "[{\"hex\": \"#7c6f57\", \"name\": \"Ochre ink\"}]",
            "neutrals": "{\"bg\": \"#faf7f0\", \"surface\": \"#ffffff\", \"ink\": \"#1c1a16\"}",
            "semantic": "{\"error\": \"#b3402f\", \"success\": \"#3f7a4e\"}"
        });
        assert!(verify_palette_signature("ps-1", &fields).is_ok());
        assert!(verify_palette_role_map("ps-1", &fields, "neutrals").is_ok());
        assert!(verify_palette_role_map("ps-1", &fields, "semantic").is_ok());

        let five = json!({
            "signature": [
                {"hex": "#111111"}, {"hex": "#222222"}, {"hex": "#333333"},
                {"hex": "#444444"}, {"hex": "#555555"}
            ]
        });
        assert_eq!(
            verify_palette_signature("ps-1", &five).unwrap_err().code,
            "palette_signature_invalid"
        );

        let bad_hex = json!({ "signature": [{"hex": "ochre"}] });
        assert!(verify_palette_signature("ps-1", &bad_hex).is_err());

        let muddy = json!({ "neutrals": {"bg": "muddy beige"} });
        assert_eq!(
            verify_palette_role_map("ps-1", &muddy, "neutrals")
                .unwrap_err()
                .code,
            "palette_role_not_hex"
        );
    }
}

#[cfg(test)]
mod voice_bands_tests {
    use super::*;

    fn bands(json_str: &str) -> serde_json::Value {
        serde_json::from_str(json_str).unwrap()
    }

    // A plain, punchy register: short sentences with real variance.
    fn on_voice_corpus() -> String {
        let mut paragraphs = Vec::new();
        let topics = [
            ("deploy", "rollout", "latency"), ("cache", "eviction", "hit rate"),
            ("queue", "backlog", "drain time"), ("schema", "migration", "row count"),
            ("index", "rebuild", "scan cost"), ("alert", "paging", "noise floor"),
            ("budget", "burn rate", "headroom"), ("retry", "backoff", "tail loss"),
            ("shard", "rebalance", "skew"), ("batch", "windowing", "lag"),
            ("probe", "timeout", "false alarm"), ("replica", "failover", "gap"),
        ];
        for (i, (noun, action, metric)) in topics.iter().enumerate() {
            paragraphs.push(format!(
                "Ship the {noun} change. Run {i} passed clean, and the {metric} held steady. \
No drama here. We cut the flaky {action} path, measured everything twice, and watched \
the {metric} drop by a third while the error budget stayed flat in each region. \
Plain words win arguments. When a claim about the {noun} carries no number, either \
count it honestly or delete the sentence before anyone reads it."
            ));
        }
        paragraphs.join("\n\n")
    }

    #[test]
    fn on_voice_corpus_passes_its_own_bands() {
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "sentence_length": {"mean": [3, 16], "stdev_min": 2.0},
                "banned_phrases": ["delve", "leverage", "game-changer"],
                "type_token_ratio": {"min": 0.15},
                "function_words": {"max_distance": 0.2},
                "min_words_to_evaluate": 100}"#,
        );
        let texts = vec![
            ("corpus:a".to_string(), on_voice_corpus()),
            ("exemplar:0".to_string(), "Shipped. 3 bugs, 0 regressions.".to_string()),
        ];
        let evaluated = check_voice_bands(&b, &texts).expect("corpus must pass its own bands");
        assert_eq!(evaluated, 1); // the short exemplar abstains
    }

    #[test]
    fn banned_phrase_fails_even_in_short_texts() {
        let b = bands(r#"{"schema": "katagami:voice-bands/v1", "banned_phrases": ["delve"], "min_words_to_evaluate": 100}"#);
        let texts = vec![
            ("corpus:a".to_string(), on_voice_corpus()),
            ("exemplar:0".to_string(), "Let us Delve into this.".to_string()),
        ];
        let err = check_voice_bands(&b, &texts).unwrap_err();
        assert!(err.contains("banned phrase 'delve'"), "{err}");
    }

    #[test]
    fn banned_pattern_is_matched_case_insensitively() {
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "banned_patterns": ["not just \\w+, but"],
                "min_words_to_evaluate": 100}"#,
        );
        let texts = vec![
            ("corpus:a".to_string(), on_voice_corpus()),
            ("exemplar:0".to_string(), "This is Not just speed, but craft.".to_string()),
        ];
        let err = check_voice_bands(&b, &texts).unwrap_err();
        assert!(err.contains("banned pattern"), "{err}");
    }

    #[test]
    fn droning_uniform_prose_fails_the_burstiness_floor() {
        // Every sentence exactly the same length: stdev ~0.
        let drone = std::iter::repeat("This sentence has exactly seven words total.")
            .take(40)
            .collect::<Vec<_>>()
            .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "sentence_length": {"mean": [3, 16], "stdev_min": 2.0},
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), drone)]).unwrap_err();
        assert!(err.contains("burstiness floor"), "{err}");
    }

    #[test]
    fn purple_long_sentences_fail_the_mean_band() {
        let purple = std::iter::repeat(
            "The luminous and endlessly unfolding evening, which had been gathering itself \
across the low hills like a slow tide of amber light that no one in the valley could \
quite bring themselves to ignore, settled over everything we had ever tried to name.",
        )
        .take(12)
        .collect::<Vec<_>>()
        .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "sentence_length": {"mean": [3, 16], "stdev_min": 0.0},
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), purple)]).unwrap_err();
        assert!(err.contains("sentence mean"), "{err}");
    }

    #[test]
    fn exclamation_rate_band_enforced() {
        let shouty = std::iter::repeat("We did it! The launch worked! Everyone cheered loudly!")
            .take(30)
            .collect::<Vec<_>>()
            .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "punctuation": {"exclamations_per_1000_words": [0, 3]},
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), shouty)]).unwrap_err();
        assert!(err.contains("exclamations_per_1000_words"), "{err}");
    }

    #[test]
    fn all_short_texts_mean_no_evidence() {
        let b = bands(r#"{"schema": "katagami:voice-bands/v1", "min_words_to_evaluate": 150}"#);
        let texts = vec![("exemplar:0".to_string(), "Too short to evaluate.".to_string())];
        let err = check_voice_bands(&b, &texts).unwrap_err();
        assert!(err.contains("no evaluable evidence"), "{err}");
    }

    #[test]
    fn off_register_text_fails_function_word_distance() {
        // Reference is dominated by the plain corpus; the off text is archaic/ornate
        // with a very different function-word profile.
        let ornate = std::iter::repeat(
            "Whereupon yonder gentleman, being of the most agreeable disposition amongst \
all whom fortune had thither conveyed, did graciously consent unto the proposal.",
        )
        .take(14)
        .collect::<Vec<_>>()
        .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "function_words": {"max_distance": 0.05},
                "min_words_to_evaluate": 100}"#,
        );
        let mut texts = Vec::new();
        for i in 0..6 {
            texts.push((format!("corpus:{i}"), on_voice_corpus()));
        }
        texts.push(("exemplar:0".to_string(), ornate));
        let err = check_voice_bands(&b, &texts).unwrap_err();
        assert!(err.contains("function-word divergence"), "{err}");
    }

    #[test]
    fn repeated_openers_fail_the_evenness_band() {
        let same_opener = (0..20)
            .map(|i| format!("The system handled case {i} without any trouble at all today."))
            .collect::<Vec<_>>()
            .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "sentence_openers": {"max_top_share": 0.5},
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), same_opener)]).unwrap_err();
        assert!(err.contains("evenness tell"), "{err}");
    }

    #[test]
    fn connective_overuse_fails_the_discourse_band() {
        let stuffed = (0..15)
            .map(|i| format!(
                "However, the {i} result held. Moreover, the trend continued upward. Furthermore, the budget survived intact."
            ))
            .collect::<Vec<_>>()
            .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "connectives_per_1000_words": [0, 20],
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), stuffed)]).unwrap_err();
        assert!(err.contains("discourse-marker tell"), "{err}");
    }

    #[test]
    fn uniform_paragraphs_fail_the_block_band() {
        let para = "Ship it now. The count held steady. Nothing else moved today, and the ledger closed on time without a single retry across regions.";
        let uniform = (0..6).map(|_| para.to_string()).collect::<Vec<_>>().join("\n\n");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "paragraph_length": {"stdev_min": 3.0},
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), uniform)]).unwrap_err();
        assert!(err.contains("uniform-block tell"), "{err}");
    }

    #[test]
    fn low_hapax_fails_the_vocabulary_band() {
        let recycled = std::iter::repeat("the same words repeat and repeat in the same order again")
            .take(30)
            .collect::<Vec<_>>()
            .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "hapax_ratio": {"min": 0.3, "window_words": 200},
                "min_words_to_evaluate": 100}"#,
        );
        let err = check_voice_bands(&b, &[("corpus:a".to_string(), recycled)]).unwrap_err();
        assert!(err.contains("vocabulary-evenness tell"), "{err}");
    }

    #[test]
    fn off_fingerprint_text_fails_char_trigram_distance() {
        let ornate = std::iter::repeat(
            "Whereupon yonder gentleman, being of the most agreeable disposition amongst all whom fortune had thither conveyed, did graciously consent unto the proposal.",
        )
        .take(14)
        .collect::<Vec<_>>()
        .join(" ");
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "char_trigrams": {"max_distance": 0.08},
                "min_words_to_evaluate": 100}"#,
        );
        let mut texts = Vec::new();
        for i in 0..6 {
            texts.push((format!("corpus:{i}"), on_voice_corpus()));
        }
        texts.push(("exemplar:0".to_string(), ornate));
        let err = check_voice_bands(&b, &texts).unwrap_err();
        assert!(err.contains("char-trigram divergence"), "{err}");
    }

    #[test]
    fn varied_prose_passes_the_v2_bands() {
        let b = bands(
            r#"{"schema": "katagami:voice-bands/v1",
                "sentence_openers": {"max_top_share": 0.5},
                "connectives_per_1000_words": [0, 20],
                "paragraph_length": {"stdev_min": 0.5},
                "hapax_ratio": {"min": 0.03, "window_words": 500},
                "char_trigrams": {"max_distance": 0.2},
                "min_words_to_evaluate": 100}"#,
        );
        let evaluated =
            check_voice_bands(&b, &[("corpus:a".to_string(), on_voice_corpus())]).unwrap();
        assert_eq!(evaluated, 1);
    }

    #[test]
    fn consent_and_voice_md_checks() {
        assert!(verify_voice_consent("ws-1", &serde_json::json!({
            "basis": "opt_in", "author": "Rita", "license": "internal"
        })).is_ok());
        assert!(verify_voice_consent("ws-1", &serde_json::json!({
            "basis": "original", "author": "katagami-curation", "license": "katagami-commons"
        })).is_ok());
        assert!(verify_voice_consent("ws-1", &serde_json::json!({
            "basis": "public_domain", "author": "Jane Austen",
            "license": "public domain",
            "provenance": "Pride and Prejudice (1813), Project Gutenberg ebook 1342"
        })).is_ok());
        // public_domain without a named source is not attestable.
        assert_eq!(
            verify_voice_consent("ws-1", &serde_json::json!({
                "basis": "public_domain", "author": "Jane Austen", "license": "public domain"
            })).unwrap_err().code,
            "voice_consent_invalid"
        );
        assert_eq!(
            verify_voice_consent("ws-1", &serde_json::json!({"basis": "scraped", "author": "x", "license": "y"}))
                .unwrap_err().code,
            "voice_consent_invalid"
        );
        let good = "---\nversion: alpha\nkind: voice\nconsent: opt_in\n---\n## Overview\nx\n## Tone\nx\n## Vocabulary\nx\n## Moves\nx\n## Register\nx\n## Never\nx\n```json\n{\"schema\": \"katagami:voice-bands/v1\"}\n```\n";
        assert!(verify_voice_md_body("ws-1", "f1", good).is_ok());
        let err = verify_voice_md_body("ws-1", "f1", "just some text with TODO left in").unwrap_err();
        assert_eq!(err.code, "voice_md_invalid");
    }
}
