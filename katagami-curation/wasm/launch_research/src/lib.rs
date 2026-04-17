use temper_wasm_sdk::prelude::*;

/// On CurationQuery.Submit: creates a source_search CurationJob,
/// configures it with the query text, and submits it to start the
/// automated pipeline. The query_id field links the job back to
/// this CurationQuery for reaction-based state tracking.
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
            "query_id": query_id
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

        // --- Configure the job ---
        let configure_body = json!({
            "job_type": "source_search",
            "workspace_id": workspace_id,
            "input": input.to_string(),
            "query_id": query_id
        });

        let configure_resp = ctx.http_call(
            "POST",
            &format!(
                "{api_url}/tdata/CurationJobs('{job_id}')/Katagami.Curation.Configure"
            ),
            &headers,
            &configure_body.to_string(),
        )?;
        if !(200..300).contains(&configure_resp.status) {
            return Err(format!(
                "Failed to configure CurationJob '{job_id}': HTTP {}: {}",
                configure_resp.status,
                &configure_resp.body[..configure_resp.body.len().min(500)]
            ));
        }

        // --- Submit to trigger build_session_message ---
        let submit_resp = ctx.http_call(
            "POST",
            &format!(
                "{api_url}/tdata/CurationJobs('{job_id}')/Katagami.Curation.Submit"
            ),
            &headers,
            "{}",
        )?;
        if !(200..300).contains(&submit_resp.status) {
            return Err(format!(
                "Failed to submit CurationJob '{job_id}': HTTP {}: {}",
                submit_resp.status,
                &submit_resp.body[..submit_resp.body.len().min(500)]
            ));
        }

        ctx.log(
            "info",
            &format!("launch_research: submitted source_search job '{job_id}' for query '{query_id}'"),
        );

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
