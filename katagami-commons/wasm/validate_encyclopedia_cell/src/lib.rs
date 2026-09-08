mod document;

use std::collections::BTreeSet;

use serde::Deserialize;
use sha2::{Digest, Sha256};

pub fn validate_document(raw: &str) -> Result<String, String> {
    document::parse(raw)?;
    Ok(format!("{:x}", Sha256::digest(raw.as_bytes())))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Review {
    document_hash: String,
    reviewer: String,
    evidence_source_ids: Vec<String>,
    findings: String,
    limitations: Vec<String>,
    rights_reviewed: bool,
    relationships_reviewed: bool,
    examples_reviewed: bool,
    living_creator_imitation_excluded: bool,
}

pub fn validate_review(raw_document: &str, raw_review: &str) -> Result<String, String> {
    let cell = document::parse(raw_document)?;
    let document_hash = format!("{:x}", Sha256::digest(raw_document.as_bytes()));
    let review: Review = serde_json::from_str(raw_review).map_err(|error| error.to_string())?;
    if review.document_hash != document_hash {
        return Err("review does not identify the current document hash".into());
    }
    document::text(&review.reviewer)?;
    document::text(&review.findings)?;
    for limitation in &review.limitations {
        document::text(limitation)?;
    }
    if !review.rights_reviewed
        || !review.relationships_reviewed
        || !review.examples_reviewed
        || !review.living_creator_imitation_excluded
    {
        return Err(
            "review must address rights, relationships, examples, and living-creator imitation"
                .into(),
        );
    }
    let reviewed: BTreeSet<_> = review
        .evidence_source_ids
        .iter()
        .map(String::as_str)
        .collect();
    let sources: BTreeSet<_> = cell
        .sources
        .iter()
        .map(|source| source.id.as_str())
        .collect();
    if reviewed != sources {
        return Err("review evidence must cover the document's source identifiers".into());
    }
    Ok(document_hash)
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use temper_wasm_sdk::prelude::*;

    fn read_string(ctx: &Context, field_name: &str) -> Result<String, String> {
        let field = &ctx.entity_state["fields"][field_name];
        let raw = ctx.read_field_string(field_name)?;
        if field.get("__temper_blob_ref").is_some() {
            // Deferred blobs retain the JSON encoding of the original field;
            // the host returns those bytes, unlike an inlined string field.
            if field.get("__temper_blob_encoding").and_then(Value::as_str) != Some("json") {
                return Err(format!("unsupported blob encoding for '{field_name}'"));
            }
            serde_json::from_str(&raw)
                .map_err(|_| format!("blob field '{field_name}' must contain a JSON string"))
        } else if field.is_string() {
            Ok(raw)
        } else {
            Err(format!("field '{field_name}' must be a string"))
        }
    }

    temper_module! {
        fn run(ctx: Context) -> Result<Value> {
            let raw_document = read_string(&ctx, "document")?;
            match ctx.config.get("phase").map(String::as_str) {
                Some("document") => {
                    let document_hash = super::validate_document(&raw_document)?;
                    Ok(json!({"document_hash": document_hash, "error": ""}))
                }
                Some("review") => {
                    if ctx.trigger_params.get("review").is_none_or(Value::is_null) {
                        return Err("RecordReview requires a new review in this request".into());
                    }
                    let raw_review = read_string(&ctx, "review")?;
                    let review_document_hash = super::validate_review(&raw_document, &raw_review)?;
                    Ok(json!({"review_document_hash": review_document_hash, "error": ""}))
                }
                _ => Err("unknown validation phase".into()),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{validate_document, validate_review};
    use serde::Deserialize;
    use serde_json::Value;

    const FIXTURE: &str = include_str!("../../../fixtures/encyclopedia-cell.json");
    const INVALID: &str = include_str!("../../../fixtures/encyclopedia-invalid.json");

    #[derive(Deserialize)]
    struct Change {
        name: String,
        path: Vec<Value>,
        #[serde(default)]
        value: Value,
        #[serde(default)]
        remove: bool,
    }

    #[test]
    fn accepts_multiple_representations_and_six_colors() {
        assert_eq!(validate_document(FIXTURE).expect("valid fixture").len(), 64);
    }

    #[test]
    fn accepts_name_and_scope_before_enrichment() {
        let mut input = serde_json::json!({
            "version": 1, "name": "Synthetic draft", "description": "Approved scope",
            "maps": ["art"], "broader": [], "relations": [], "questions": [],
            "sources": [], "manifestations": [], "studies": []
        });
        assert!(validate_document(&input.to_string()).is_ok());
        input["description"] = serde_json::json!("");
        assert!(validate_document(&input.to_string()).is_ok());
        input["description"] = serde_json::json!("  ");
        assert!(validate_document(&input.to_string()).is_err());
    }

    #[test]
    fn rejects_duplicate_manifestations() {
        let mut input: Value = serde_json::from_str(FIXTURE).expect("fixture");
        let duplicate = input["manifestations"][0].clone();
        input["manifestations"]
            .as_array_mut()
            .expect("array")
            .push(duplicate);
        assert!(validate_document(&input.to_string()).is_err());
    }

    #[test]
    fn counts_code_points_for_text_and_bytes_for_documents() {
        let mut input: Value = serde_json::from_str(FIXTURE).expect("fixture");
        let description = "\u{10348}".repeat(100_000);
        input["description"] = Value::String(description.clone());
        assert!(validate_document(&input.to_string()).is_ok());
        input["description"] = Value::String(format!("{description}x"));
        assert!(validate_document(&input.to_string()).is_err());
        input["description"] = Value::String("Synthetic capacity test".into());
        input["questions"] = serde_json::json!(vec!["\u{6f22}".repeat(100_000); 7]);
        assert!(validate_document(&input.to_string()).is_err());
    }

    #[test]
    fn rejects_shared_invalid_fixtures() {
        let changes: Vec<Change> = serde_json::from_str(INVALID).expect("fixture changes");
        for change in changes {
            let mut input: Value = serde_json::from_str(FIXTURE).expect("fixture");
            let mut parent = &mut input;
            for segment in &change.path[..change.path.len() - 1] {
                parent = match segment {
                    Value::String(key) => parent.get_mut(key).expect("fixture key"),
                    Value::Number(index) => &mut parent[index.as_u64().expect("index") as usize],
                    _ => panic!("invalid fixture path"),
                };
            }
            match change.path.last().expect("nonempty path") {
                Value::String(key) => {
                    let object = parent.as_object_mut().expect("object parent");
                    if change.remove {
                        object.remove(key);
                    } else {
                        object.insert(key.clone(), change.value);
                    }
                }
                Value::Number(index) => {
                    parent[index.as_u64().expect("index") as usize] = change.value
                }
                _ => panic!("invalid fixture key"),
            }
            assert!(
                validate_document(&input.to_string()).is_err(),
                "{}",
                change.name
            );
        }
    }

    #[test]
    fn review_is_bound_to_the_document_and_its_sources() {
        let mut review = serde_json::json!({
            "documentHash": validate_document(FIXTURE).expect("document hash"),
            "reviewer": "Test reviewer",
            "evidenceSourceIds": ["fixture"],
            "findings": "Synthetic test review only.",
            "limitations": [],
            "rightsReviewed": true,
            "relationshipsReviewed": true,
            "examplesReviewed": true,
            "livingCreatorImitationExcluded": true
        });
        assert!(validate_review(FIXTURE, &review.to_string()).is_ok());
        assert!(validate_review(
            &FIXTURE.replace("Spectrum studies", "Other studies"),
            &review.to_string()
        )
        .is_err());
        review["evidenceSourceIds"] = serde_json::json!([]);
        assert!(validate_review(FIXTURE, &review.to_string()).is_err());
    }
}
