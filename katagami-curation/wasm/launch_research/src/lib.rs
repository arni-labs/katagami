use temper_wasm_sdk::prelude::*;

/// On CurationQuery.Submit: creates a source_search CurationJob and dispatches
/// ConfigureAndSubmit so the spec-owned session trigger starts it. This module
/// only bootstraps the first job and ensures the shared workspace exists.
#[unsafe(no_mangle)]
pub extern "C" fn run(_ctx_ptr: i32, _ctx_len: i32) -> i32 {
    let result = (|| -> Result<(), String> {
        let ctx = Context::from_host()?;
        ctx.log("info", "launch_research: starting");

        let fields = ctx.entity_state.get("fields").cloned().unwrap_or(json!({}));

        let query_text = fields
            .get("query_text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if query_text.is_empty() {
            return Err("launch_research: query_text is empty".to_string());
        }

        let configured_output_type = fields
            .get("output_type")
            .or_else(|| fields.get("OutputType"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let output_type = normalize_output_type(configured_output_type)
            .filter(|value| value != "auto")
            .unwrap_or_else(|| infer_output_type(&query_text));

        let query_id = ctx
            .entity_state
            .get("entity_id")
            .and_then(|v| v.as_str())
            .unwrap_or(&ctx.entity_id)
            .to_string();

        // --- Config ---
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

        // --- Ensure workspace ---
        let workspace_id = ensure_workspace(&ctx, &api_url, &headers, "katagami-library")?;

        // --- Build input JSON ---
        let input = json!({
            "task": query_text,
            "scope": "targeted",
            "query_id": query_id,
            "output_type": output_type
        });

        // --- Create CurationJob ---
        let create_resp = ctx.http_call(
            "POST",
            &format!("{api_url}/tdata/CurationJobs"),
            &headers,
            r#"{"fields":{}}"#,
        )?;
        if !(200..300).contains(&create_resp.status) {
            return Err(format!(
                "Failed to create CurationJob: HTTP {}: {}",
                create_resp.status,
                &create_resp.body[..create_resp.body.len().min(500)]
            ));
        }

        let created: serde_json::Value = serde_json::from_str(&create_resp.body)
            .map_err(|e| format!("Failed to parse CurationJob creation response: {e}"))?;

        let job_id = created
            .get("entity_id")
            .and_then(|v| v.as_str())
            .ok_or("Created CurationJob has no entity_id")?
            .to_string();

        ctx.log(
            "info",
            &format!("launch_research: created CurationJob '{job_id}'"),
        );

        // --- Configure and submit the job through the spec-native action ---
        let configure_body = json!({
            "job_type": "source_search",
            "workspace_id": workspace_id,
            "input": input.to_string(),
            "query_id": query_id,
            "completion_contract": "typed-v1"
        });

        let configure_resp = ctx.http_call(
            "POST",
            &format!(
                "{api_url}/tdata/CurationJobs('{job_id}')/Katagami.Curation.ConfigureAndSubmit"
            ),
            &headers,
            &configure_body.to_string(),
        )?;
        if !(200..300).contains(&configure_resp.status) {
            return Err(format!(
                "Failed to configure and submit CurationJob '{job_id}': HTTP {}: {}",
                configure_resp.status,
                &configure_resp.body[..configure_resp.body.len().min(500)]
            ));
        }

        ctx.log(
            "info",
            &format!(
                "launch_research: submitted source_search job '{job_id}' for query '{query_id}'"
            ),
        );

        let record_body = json!({
            "source_search_job_id": job_id,
            "workspace_id": workspace_id,
            "output_type": output_type
        });
        let record_resp = ctx.http_call(
            "PATCH",
            &format!("{api_url}/tdata/CurationQueries('{query_id}')"),
            &headers,
            &record_body.to_string(),
        )?;
        if !(200..300).contains(&record_resp.status) {
            return Err(format!(
                "Failed to record source_search job '{job_id}' on CurationQuery '{query_id}': HTTP {}: {}",
                record_resp.status,
                &record_resp.body[..record_resp.body.len().min(500)]
            ));
        }

        set_success_result(
            "",
            &json!({
                "status": "ok",
                "source_search_job_id": job_id,
                "query_id": query_id,
                "workspace_id": workspace_id,
            }),
        );
        Ok(())
    })();

    if let Err(e) = result {
        set_error_result(&e);
    }
    0
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

fn urlenc(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace('&', "%26")
        .replace('=', "%3D")
        .replace('?', "%3F")
        .replace('#', "%23")
        .replace('\'', "%27")
}

fn normalize_output_type(raw: &str) -> Option<String> {
    let normalized = raw.trim().to_ascii_lowercase().replace('-', "_");
    match normalized.as_str() {
        "auto" => Some("auto".to_string()),
        "palette" | "palettes" | "palettesystem" | "palettesystems" | "palette_system"
        | "palette_systems" | "color" | "colors" | "colour" | "colours" => {
            Some("palette".to_string())
        }
        "art" | "artstyle" | "artstyles" | "art_style" | "art_styles" | "image_style"
        | "visual_style" => Some("art_style".to_string()),
        "language" | "languages" | "designlanguage" | "designlanguages" | "design_language"
        | "design_languages" | "design-system" | "design_system" => {
            Some("design_language".to_string())
        }
        "" => None,
        _ => None,
    }
}

fn infer_output_type(query_text: &str) -> String {
    let q = query_text.to_ascii_lowercase();
    let palette_markers = [
        "palette",
        "palettes",
        "pallet",
        "pallets",
        "color system",
        "color palette",
        "colour palette",
        "colors",
        "colours",
        "ramps",
        "swatches",
    ];
    if palette_markers.iter().any(|marker| q.contains(marker)) {
        return "palette".to_string();
    }

    let art_style_markers = [
        "art style",
        "art styles",
        "image style",
        "visual style",
        "illustration style",
        "rendering style",
        "style transfer",
        "prompt template",
    ];
    if art_style_markers.iter().any(|marker| q.contains(marker)) {
        return "art_style".to_string();
    }

    "design_language".to_string()
}

#[cfg(test)]
mod tests {
    use super::{infer_output_type, normalize_output_type};

    #[test]
    fn infers_palette_queries_even_with_common_typo() {
        assert_eq!(infer_output_type("palettes trending in 2026"), "palette");
        assert_eq!(infer_output_type("pallets trending in 2026"), "palette");
    }

    #[test]
    fn infers_art_style_and_design_language_queries() {
        assert_eq!(
            infer_output_type("art styles for editorial product shots"),
            "art_style"
        );
        assert_eq!(
            infer_output_type("new fintech dashboard design language"),
            "design_language"
        );
    }

    #[test]
    fn normalizes_configured_output_types() {
        assert_eq!(
            normalize_output_type("PaletteSystems").as_deref(),
            Some("palette")
        );
        assert_eq!(
            normalize_output_type("art-style").as_deref(),
            Some("art_style")
        );
        assert_eq!(
            normalize_output_type("design_language").as_deref(),
            Some("design_language")
        );
    }
}
