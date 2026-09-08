mod document;

use sha2::{Digest, Sha256};

pub fn validate_document(raw: &str) -> Result<String, String> {
    document::parse(raw)?;
    Ok(format!("{:x}", Sha256::digest(raw.as_bytes())))
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
                _ => Err("unknown validation phase".into()),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::validate_document;
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
            "version": 2, "name": "Synthetic draft", "description": "Approved scope",
            "provenance": {"basis": "recollected", "note": "Written from model training data; no external reference was located."},
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
    fn a_cell_either_cites_a_source_or_says_it_was_recollected() {
        let mut bare: Value = serde_json::from_str(FIXTURE).expect("fixture");
        for field in [
            "broader",
            "relations",
            "sources",
            "manifestations",
            "studies",
            "questions",
        ] {
            bare[field] = serde_json::json!([]);
        }
        bare["provenance"] = serde_json::json!({"basis": "cited"});
        assert!(validate_document(&bare.to_string()).is_err());
        bare["provenance"] = serde_json::json!({"basis": "recollected"});
        assert!(validate_document(&bare.to_string()).is_err());
        for ok in [
            "Written from model training data; no external reference was located.",
            "Written from model training data; no external reference was located",
        ] {
            bare["provenance"] = serde_json::json!({"basis": "recollected", "note": ok});
            assert!(validate_document(&bare.to_string()).is_ok(), "{ok}");
        }
        // The note must open with the fixed sentence; nothing may precede or bend it.
        for bad in [
            "banana",
            "This was not written from model training data.",
            "Written from model training datasets",
            "Written from model training data.",
            "Written from model training data; no external reference was located_yet",
            "Written from model training data; no external reference was located\u{E9}",
        ] {
            bare["provenance"] = serde_json::json!({"basis": "recollected", "note": bad});
            assert!(validate_document(&bare.to_string()).is_err(), "{bad}");
        }
        // A source makes a cell cited; recollected with sources is a contradiction.
        let mut sourced: Value = serde_json::from_str(FIXTURE).expect("fixture");
        sourced["provenance"] = serde_json::json!({"basis": "recollected", "note": "Written from model training data; no external reference was located."});
        assert!(validate_document(&sourced.to_string()).is_err());
        // JSON null is neither absent nor a string; TypeScript rejects it, so this must too.
        let mut null_note: Value = serde_json::from_str(FIXTURE).expect("fixture");
        null_note["provenance"] = serde_json::json!({"basis": "cited", "note": null});
        assert!(validate_document(&null_note.to_string()).is_err());
        let mut null_generator: Value = serde_json::from_str(FIXTURE).expect("fixture");
        null_generator["studies"][0]["generatedBy"] = serde_json::json!(null);
        assert!(validate_document(&null_generator.to_string()).is_err());
        // The shape the 20 production cells held before migration.
        let mut v1: Value = serde_json::from_str(FIXTURE).expect("fixture");
        v1["version"] = serde_json::json!(1);
        v1.as_object_mut().expect("object").remove("provenance");
        assert!(validate_document(&v1.to_string()).is_err());
    }

    #[test]
    fn a_generated_study_names_its_generator_and_a_historical_one_does_not() {
        let mut input: Value = serde_json::from_str(FIXTURE).expect("fixture");
        input["studies"][0]["kind"] = serde_json::json!("generated");
        assert!(validate_document(&input.to_string()).is_err());
        input["studies"][0]["generatedBy"] = serde_json::json!("gpt-image-1 via Codex");
        assert!(validate_document(&input.to_string()).is_ok());
        input["studies"][0]["kind"] = serde_json::json!("historical");
        assert!(validate_document(&input.to_string()).is_err());
    }

    #[test]
    fn a_source_is_unverified_until_a_named_human_opened_it_on_a_date() {
        let mut input: Value = serde_json::from_str(FIXTURE).expect("fixture");
        input["sources"][0]["verifiedBy"] = serde_json::json!("Rita");
        assert!(validate_document(&input.to_string()).is_err());
        input["sources"][0]["verifiedOn"] = serde_json::json!("yesterday");
        assert!(validate_document(&input.to_string()).is_err());
        input["sources"][0]["verifiedOn"] = serde_json::json!("2026-09-08");
        assert!(validate_document(&input.to_string()).is_ok());
        input["sources"][0]["verifiedOn"] = serde_json::json!("1000-01-01");
        assert!(validate_document(&input.to_string()).is_ok());
        for bad in ["0000-00-00", "2026-02-30", "2026-13-01", "0099-12-31"] {
            input["sources"][0]["verifiedOn"] = serde_json::json!(bad);
            assert!(validate_document(&input.to_string()).is_err(), "{bad}");
        }
    }

    #[test]
    fn blank_means_the_same_thing_to_both_validators() {
        for blank in ["", " ", "\u{85}", "\u{FEFF}", "\u{3000}\n"] {
            let mut input: Value = serde_json::from_str(FIXTURE).expect("fixture");
            input["name"] = serde_json::json!(blank);
            assert!(validate_document(&input.to_string()).is_err(), "{blank:?}");
        }
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
}
