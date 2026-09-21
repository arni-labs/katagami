use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

use super::{art_style_generation::validate_execution, lane_json_value, VerificationError};

fn object_has_keys(value: &Value, keys: &[&str]) -> bool {
    value.as_object().is_some_and(|object| {
        object.len() == keys.len() && keys.iter().all(|key| object.contains_key(*key))
    })
}

fn text(value: &Value) -> &str {
    value.as_str().unwrap_or("")
}

fn hash(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}

fn is_hash(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

/// Validate the complete gallery before any file verification or publication.
/// The caller supplies the existing immutable file-content verifier.
pub(super) fn verify_gallery(
    owner_id: &str,
    fields: &Value,
    canonical_prompt: &str,
    reference_ids: &[String],
    _thumbnail_id: &str,
    mut verify_file: impl FnMut(&str, &str) -> Result<(), VerificationError>,
) -> Result<(), VerificationError> {
    let invalid = || {
        VerificationError::new(
        "art_style_gallery_invalid",
        format!("ArtStyle '{owner_id}' requires optional gallery images to have unique, ordered references and complete prompt-bound provenance"),
    ).entity("ArtStyle", owner_id).field("reference_manifest")
    };
    let manifest = match lane_json_value(fields, "reference_manifest") {
        Some(manifest) => manifest,
        None if reference_ids.is_empty() && fields.get("reference_manifest").is_none_or(|v| v.is_null() || v == "") => return Ok(()),
        None => return Err(invalid()),
    };
    if !object_has_keys(&manifest, &["schema_version", "items"])
        || manifest["schema_version"] != "3"
    {
        return Err(invalid());
    }
    let items = manifest["items"].as_array().ok_or_else(invalid)?;
    if items.len() != reference_ids.len() {
        return Err(invalid());
    }
    let slug = text(&fields["slug"]);
    if slug.is_empty() {
        return Err(invalid());
    }
    let canonical_hash = hash(canonical_prompt);
    let mut ids = BTreeSet::new();
    let mut hashes = BTreeSet::new();
    for (index, item) in items.iter().enumerate() {
        if !object_has_keys(item, &["file_id", "subject", "model", "generation_record"])
            || !object_has_keys(&item["model"], &["provider", "model"])
        {
            return Err(invalid());
        }
        let file_id = text(&item["file_id"]);
        let subject = text(&item["subject"]);
        if file_id.is_empty()
            || subject.trim().is_empty()
            || subject != subject.trim()
            || file_id != reference_ids[index]
            || !ids.insert(file_id)
        {
            return Err(invalid());
        }
        validate_execution(&item["model"], &item["generation_record"]).map_err(|_| invalid())?;
        let record = &item["generation_record"];
        let output = &record["output"];
        if !object_has_keys(
            record,
            &[
                "schema_version",
                "kind",
                "style_slug",
                "prompt",
                "canonical_prompt_sha256",
                "output",
                "mode",
                "input_image_file_ids",
                "execution",
            ],
        ) || !object_has_keys(output, &["file_id", "sha256", "prompt_sha256"])
        {
            return Err(invalid());
        }
        let prompt = format!("{canonical_prompt}\n\nSubject and scene:\n{subject}");
        let output_hash = text(&output["sha256"]);
        if record["schema_version"] != "2"
            || record["kind"] != "art_style_gallery"
            || text(&record["style_slug"]) != slug
            || text(&record["prompt"]) != prompt
            || text(&record["canonical_prompt_sha256"]) != canonical_hash
            || text(&output["file_id"]) != file_id
            || !is_hash(output_hash)
            || !hashes.insert(output_hash)
            || text(&output["prompt_sha256"]) != hash(&prompt)
        {
            return Err(invalid());
        }
    }
    for item in items {
        verify_file(
            text(&item["file_id"]),
            text(&item["generation_record"]["output"]["sha256"]),
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const PROMPT: &str = "Soft ink and dimensional faces.";
    fn fixture() -> (Value, Vec<String>) {
        let items: Vec<Value> = (0..6).map(|i| {
            let subject = format!("Scene {i}");
            let prompt = format!("{PROMPT}\n\nSubject and scene:\n{subject}");
            let (provider, model) = match i {
                0 | 2 => ("OpenAI", "openai/gpt-image-2.5/sunburst/text-to-image"),
                1 | 3 => ("OpenAI", "openai/gpt-image-2.5/flare/text-to-image"),
                4 => ("xAI", "xai/grok-imagine-image/v2.0/text-to-image"),
                _ => ("Google", "fal-ai/nano-banana-pro"),
            };
            json!({"file_id":format!("file-{i}"), "subject":subject,
                "model":{"provider":provider,"model":model},
                "generation_record":{"schema_version":"2","kind":"art_style_gallery",
                    "mode":"text_to_image","input_image_file_ids":[],
                    "execution":{"route":"provider","harness":"codex","tool":"fal",
                        "receipt":format!("request-{i}"),"requested_model":if i<4 {"GPT Image 2.5"} else if i==4 {"Grok Image"} else {"Nano Banana"},
                        "provider_request_id":format!("request-{i}")},
                    "style_slug":"morrow-ink","prompt":prompt,"canonical_prompt_sha256":hash(PROMPT),
                    "output":{"file_id":format!("file-{i}"),"sha256":hash(&format!("image-{i}")),
                        "prompt_sha256":hash(&prompt)}}})
        }).collect();
        (
            json!({"slug":"morrow-ink","reference_manifest":{"schema_version":"3","items":items}}),
            (0..6).map(|i| format!("file-{i}")).collect(),
        )
    }

    #[test]
    fn no_extras_and_arbitrary_single_extra_are_valid() {
        verify_gallery("style", &json!({"slug":"morrow-ink"}), PROMPT, &[], "proof-0", |_, _| panic!()).unwrap();
        verify_gallery("style", &json!({"slug":"morrow-ink","reference_manifest":{"schema_version":"3","items":[]}}), PROMPT, &[], "proof-0", |_, _| panic!()).unwrap();
        let (mut fields, mut ids) = fixture();
        fields["reference_manifest"]["items"].as_array_mut().unwrap().truncate(1);
        ids.truncate(1);
        fields["reference_manifest"]["items"][0]["model"] = json!({"provider":"Independent provider","model":"actual-v7"});
        let mut checked = 0;
        verify_gallery("style", &fields, PROMPT, &ids, "proof-0", |_, _| { checked += 1; Ok(()) }).unwrap();
        assert_eq!(checked, 1);
        fields["reference_manifest"]["items"][0]["generation_record"]["prompt"] = json!("tampered");
        assert!(verify_gallery("style", &fields, PROMPT, &ids, "proof-0", |_, _| panic!()).is_err());
    }

    #[test]
    fn six_gallery_records_verify_every_exact_file_and_hash() {
        let (mut fields, ids) = fixture();
        // Actual persisted manifests are JSON strings, while parsed objects also work.
        fields["reference_manifest"] = Value::String(fields["reference_manifest"].to_string());
        let mut verified = Vec::new();
        verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |id, digest| {
            verified.push((id.to_string(), digest.to_string()));
            Ok(())
        })
        .unwrap();
        assert_eq!(
            verified,
            (0..6)
                .map(|i| (format!("file-{i}"), hash(&format!("image-{i}"))))
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn invalid_gallery_cannot_reach_file_verification() {
        let mutations: &[fn(&mut Value)] = &[
            |f| {
                f["reference_manifest"]["items"]
                    .as_array_mut()
                    .unwrap()
                    .pop();
            },
            |f| f["reference_manifest"]["schema_version"] = json!("1"),
            |f| f["reference_manifest"]["extra"] = json!(true),
            |f| f["reference_manifest"]["items"][0]["extra"] = json!(true),
            |f| f["reference_manifest"]["items"][0]["model"]["provider"] = json!(""),
            |f| f["reference_manifest"]["items"][1]["file_id"] = json!("file-0"),
            |f| {
                f["reference_manifest"]["items"][1]["generation_record"]["output"]["sha256"] =
                    hash("image-0").into()
            },
            |f| {
                f["reference_manifest"]["items"][0]["generation_record"]["output"]["sha256"] =
                    "A".repeat(64).into()
            },
            |f| {
                f["reference_manifest"]["items"][0]["generation_record"]["output"]["file_id"] =
                    json!("wrong")
            },
            |f| {
                f["reference_manifest"]["items"][0]["generation_record"]["execution"]
                    ["provider_request_id"] = json!("")
            },
            |f| {
                f["reference_manifest"]["items"][0]["generation_record"]["style_slug"] =
                    json!("wrong")
            },
            |f| f["reference_manifest"]["items"][0]["generation_record"]["prompt"] = json!("wrong"),
            |f| {
                f["reference_manifest"]["items"][0]["generation_record"]
                    ["canonical_prompt_sha256"] = hash("wrong").into()
            },
            |f| {
                f["reference_manifest"]["items"][0]["generation_record"]["output"]
                    ["prompt_sha256"] = hash("wrong").into()
            },
        ];
        for (index, mutate) in mutations.iter().enumerate() {
            let (mut fields, ids) = fixture();
            mutate(&mut fields);
            assert!(
                verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |_, _| panic!(
                    "invalid record reached file verifier"
                ))
                .is_err(),
                "mutation {index}"
            );
        }
        let (fields, mut ids) = fixture();
        ids.swap(1, 2);
        assert!(verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |_, _| panic!()).is_err());
    }

    #[test]
    fn file_verification_failure_is_fatal() {
        let (fields, ids) = fixture();
        assert!(
            verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |_, _| {
                Err(VerificationError::new(
                    "art_style_proof_file_hash_mismatch",
                    "changed bytes",
                ))
            })
            .is_err()
        );
    }

    #[test]
    fn production_boundary_checks_locked_gallery_before_review_or_publication() {
        let source = include_str!("lib.rs");
        let function = source
            .split("fn verify_synthesized_art_styles(")
            .nth(1)
            .unwrap()
            .split("fn ")
            .next()
            .unwrap();
        let validation = function.find("art_style_gallery::verify_gallery(").unwrap();
        assert!(validation < function.find("\"AttachArtStyleReview\"").unwrap());
        assert!(validation < function.find("publish_lane_file_artifact(").unwrap());
        let verifier = &function[validation..function.find("for file_id in &proof_ids").unwrap()];
        assert!(verifier.contains("verify_art_style_proof_file("));
        assert!(verifier.contains("sha256, true, \"gallery_image\""));
    }
    #[test]
    fn builtin_gallery_preserves_unexposed_versions_and_real_receipts() {
        let (mut fields, ids) = fixture();
        for index in 0..5 {
            let item = &mut fields["reference_manifest"]["items"][index];
            item["model"]["model"] = Value::Null;
            let execution = &mut item["generation_record"]["execution"];
            execution["route"] = json!("builtin");
            execution["harness"] = json!(if index < 4 { "codex" } else { "grok" });
            execution["tool"] = json!("native-image-generation");
            execution["provider_request_id"] = Value::Null;
        }
        let mut verified = Vec::new();
        verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |id, _| {
            verified.push(id.to_string());
            Ok(())
        })
        .unwrap();
        assert_eq!(verified, ids);
        fields["reference_manifest"]["items"][0]["generation_record"]["execution"]["receipt"] =
            json!("");
        assert!(
            verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |_, _| panic!(
                "invalid builtin reached file verifier"
            ))
            .is_err()
        );
    }

    #[test]
    fn input_images_and_missing_provider_receipts_fail_before_file_verification() {
        for field in ["input_image_file_ids", "provider_request_id", "receipt"] {
            let (mut fields, ids) = fixture();
            let record = &mut fields["reference_manifest"]["items"][0]["generation_record"];
            if field == "input_image_file_ids" {
                record[field] = json!(["reference-image"]);
            } else {
                record["execution"][field] = Value::Null;
            }
            assert!(
                verify_gallery("style", &fields, PROMPT, &ids, &ids[0], |_, _| panic!(
                    "invalid provenance reached file verifier"
                ))
                .is_err(),
                "accepted {field}"
            );
        }
    }
}
