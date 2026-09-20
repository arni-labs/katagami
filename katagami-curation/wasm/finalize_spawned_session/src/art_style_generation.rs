use serde_json::Value;

fn nonempty(value: &Value) -> bool {
    value.as_str().is_some_and(|s| !s.trim().is_empty())
}

/// Validate recorded invocation facts without inventing provider metadata for
/// native harness tools. Unknown versions identify only one model per provider.
pub(super) fn validate_execution(model: &Value, record: &Value) -> Result<String, ()> {
    let execution = &record["execution"];
    let model_object = model.as_object().ok_or(())?;
    if model_object.len() != 2
        || !model_object.contains_key("provider")
        || !model_object.contains_key("model")
        || !nonempty(&model["provider"])
        || record["mode"] != "text_to_image"
        || !record["input_image_file_ids"]
            .as_array()
            .is_some_and(Vec::is_empty)
    {
        return Err(());
    }
    let expected = [
        "route",
        "harness",
        "tool",
        "receipt",
        "requested_model",
        "provider_request_id",
    ];
    let fields = execution.as_object().ok_or(())?;
    if fields.len() != expected.len()
        || expected.iter().any(|key| !fields.contains_key(*key))
        || ["harness", "tool", "receipt", "requested_model"]
            .iter()
            .any(|key| !nonempty(&execution[*key]))
    {
        return Err(());
    }
    let provider = model["provider"].as_str().ok_or(())?;
    match execution["route"].as_str() {
        Some("builtin") => {
            if !matches!(
                (execution["harness"].as_str(), provider),
                (Some("codex"), "OpenAI") | (Some("grok"), "xAI")
            ) || !(model["model"].is_null() || nonempty(&model["model"]))
                || !(execution["provider_request_id"].is_null()
                    || nonempty(&execution["provider_request_id"]))
            {
                return Err(());
            }
        }
        Some("provider") => {
            if !nonempty(&model["model"]) || !nonempty(&execution["provider_request_id"]) {
                return Err(());
            }
        }
        _ => return Err(()),
    }
    Ok(format!(
        "{}:{}",
        provider.trim().to_lowercase(),
        model["model"]
            .as_str()
            .unwrap_or("unexposed")
            .trim()
            .to_lowercase()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn builtin_unknown_is_honest_but_not_two_model_identities() {
        let m = json!({"provider":"OpenAI","model":null});
        let mut r = json!({"mode":"text_to_image","input_image_file_ids":[],"execution":{
            "route":"builtin","harness":"codex","tool":"image_gen.imagegen",
            "receipt":"tool-call-actual","requested_model":"GPT Image 2.5","provider_request_id":null}});
        assert_eq!(validate_execution(&m, &r).unwrap(), "openai:unexposed");
        r["input_image_file_ids"] = json!(["file-source"]);
        assert!(validate_execution(&m, &r).is_err());
        r["input_image_file_ids"] = json!([]);
        r["execution"]["route"] = json!("provider");
        assert!(validate_execution(&m, &r).is_err());
    }
}
