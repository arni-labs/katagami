use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{BTreeSet, HashMap};

use super::{lane_json_value, VerificationError};

const DIMENSIONS: [&str; 7] = [
    "medium_material",
    "marks_edges",
    "tonal_shading",
    "color_roles",
    "composition",
    "signature_details",
    "exclusions",
];

const PROOF_CATEGORIES: [&str; 4] = [
    "human_portrait",
    "nonhuman_living",
    "still_life_object",
    "landscape_environment",
];

const SOURCE_MEDIA: [&str; 4] = [
    "documentary photograph",
    "black-ink line drawing",
    "neutral synthetic 3d render",
    "flat vector illustration",
];

const SOURCE_ENDPOINT: &str = "fal-ai/flux/schnell";
const EDIT_ENDPOINTS: [&str; 2] = [
    "openai/gpt-image-2/edit",
    "fal-ai/nano-banana-2/edit",
];

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(super) struct VerifiedProofReceipt {
    pub category: String,
    pub subject: String,
    pub composition: String,
    pub source_medium: String,
    pub source_file_id: String,
    pub source_sha256: String,
    pub source_endpoint: String,
    pub source_request_id: String,
    pub source_prompt_sha256: String,
    pub output_file_id: String,
    pub output_sha256: String,
    pub output_endpoint: String,
    pub output_request_id: String,
    pub output_prompt_sha256: String,
    pub seed: String,
}

#[derive(Debug)]
pub(super) struct VerifiedPortabilityReport {
    pub report: Value,
    pub proof_receipts: Vec<VerifiedProofReceipt>,
}

fn art_error(
    owner_id: &str,
    code: &'static str,
    field: &'static str,
    message: impl Into<String>,
) -> VerificationError {
    VerificationError::new(code, message)
        .entity("ArtStyle", owner_id)
        .field(field)
}

fn text<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("").trim()
}

fn bool_field(value: &Value, key: &str) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn number(value: &Value, key: &str) -> Option<f64> {
    value.get(key).and_then(Value::as_f64)
}

fn version_is_one(value: &Value) -> bool {
    value
        .get("schema_version")
        .map(|version| version == "1" || version == 1)
        .unwrap_or(false)
}

fn normalized_words(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn contains_ci(haystack: &str, needle: &str) -> bool {
    haystack.to_lowercase().contains(&needle.to_lowercase())
}

fn has_substantive_evidence(value: &str) -> bool {
    const GENERIC_WORDS: [&str; 31] = [
        "the",
        "and",
        "with",
        "from",
        "into",
        "onto",
        "over",
        "under",
        "for",
        "not",
        "use",
        "using",
        "make",
        "render",
        "subject",
        "supplied",
        "image",
        "style",
        "look",
        "visual",
        "composition",
        "detail",
        "details",
        "form",
        "forms",
        "add",
        "keep",
        "build",
        "map",
        "show",
        "avoid",
    ];
    let normalized = normalized_words(value);
    if normalized.len() < 10 {
        return false;
    }
    normalized
        .split_whitespace()
        .filter(|word| word.len() >= 3 && !GENERIC_WORDS.contains(word))
        .collect::<BTreeSet<_>>()
        .len()
        >= 2
}

fn contains_word_sequence(haystack: &str, needle: &str) -> bool {
    let haystack_words = haystack.split_whitespace().collect::<Vec<_>>();
    let needle_words = needle.split_whitespace().collect::<Vec<_>>();
    !needle_words.is_empty()
        && needle_words.len() <= haystack_words.len()
        && haystack_words
            .windows(needle_words.len())
            .any(|window| window == needle_words)
}

fn nonempty_model(value: &Value) -> Option<(String, String)> {
    let provider = text(value, "provider").to_lowercase();
    let model = text(value, "model").to_lowercase();
    if provider.is_empty() || model.is_empty() {
        None
    } else {
        Some((provider, model))
    }
}

fn prompt_author(fields: &Value) -> Option<(String, String)> {
    let provenance = lane_json_value(fields, "model_provenance")?;
    let style = provenance.get("style")?;
    nonempty_model(style)
}

fn collect_manifest_credits(value: &Value, output: &mut Vec<Value>) {
    match value {
        Value::Object(object) => {
            for (key, child) in object {
                if key == "credits" {
                    if let Some(items) = child.as_array() {
                        output.extend(items.iter().cloned());
                    }
                } else {
                    collect_manifest_credits(child, output);
                }
            }
        }
        Value::Array(items) => {
            for item in items {
                collect_manifest_credits(item, output);
            }
        }
        _ => {}
    }
}

pub(super) fn verify_portable_prompt(
    owner_id: &str,
    style_name: &str,
    prompt: &str,
) -> Result<(), VerificationError> {
    let trimmed = prompt.trim();
    if trimmed.is_empty() {
        return Err(art_error(
            owner_id,
            "art_style_prompt_empty",
            "prompt_template",
            format!("ArtStyle '{owner_id}' has an empty portable prompt"),
        ));
    }

    let lower = trimmed.to_lowercase();
    for forbidden in [
        "in the style of",
        "match the reference",
        "match this reference",
        "as shown in the reference",
        "style reference image",
    ] {
        if lower.contains(forbidden) {
            return Err(art_error(
                owner_id,
                "art_style_prompt_nonportable_phrase",
                "prompt_template",
                format!(
                    "ArtStyle '{owner_id}' portable prompt contains reference- or name-dependent phrase '{forbidden}'"
                ),
            ));
        }
    }

    if trimmed.contains('{') || trimmed.contains('}') {
        return Err(art_error(
            owner_id,
            "art_style_prompt_unresolved_placeholder",
            "prompt_template",
            format!(
                "ArtStyle '{owner_id}' portable prompt contains an unresolved placeholder; it must be paste-ready prose"
            ),
        ));
    }

    let normalized_name = normalized_words(style_name);
    let normalized_prompt = normalized_words(trimmed);
    if normalized_name.len() >= 4 && normalized_prompt.contains(&normalized_name) {
        return Err(art_error(
            owner_id,
            "art_style_prompt_leaks_catalog_name",
            "prompt_template",
            format!(
                "ArtStyle '{owner_id}' portable prompt repeats its catalog name '{style_name}' instead of observable aesthetic facts"
            ),
        ));
    }

    Ok(())
}

pub(super) fn verify_source_basis(
    owner_id: &str,
    fields: &Value,
    prompt: &str,
) -> Result<Value, VerificationError> {
    let basis = lane_json_value(fields, "source_basis").ok_or_else(|| {
        art_error(
            owner_id,
            "art_style_source_basis_missing",
            "source_basis",
            format!("ArtStyle '{owner_id}' is missing its source-basis review"),
        )
    })?;
    if !basis.is_object()
        || !version_is_one(&basis)
        || text(&basis, "verdict") != "pass"
        || !bool_field(&basis, "all_named_people_checked")
    {
        return Err(art_error(
            owner_id,
            "art_style_source_basis_invalid",
            "source_basis",
            format!(
                "ArtStyle '{owner_id}' source_basis must use schema v1, verdict=pass, and all_named_people_checked=true"
            ),
        ));
    }
    if nonempty_model(basis.get("reviewer").unwrap_or(&Value::Null)).is_none() {
        return Err(art_error(
            owner_id,
            "art_style_source_reviewer_missing",
            "source_basis",
            format!("ArtStyle '{owner_id}' source_basis is missing reviewer provider/model"),
        ));
    }

    let sources = basis
        .get("sources")
        .and_then(Value::as_array)
        .filter(|items| !items.is_empty())
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_source_basis_empty",
                "source_basis",
                format!("ArtStyle '{owner_id}' source_basis has no sources"),
            )
        })?;

    let allowed = [
        "tradition",
        "movement",
        "public_domain_artist",
        "licensed_artist",
        "licensed_source",
        "original_synthesis",
    ];
    let mut eligible_by_name: HashMap<String, String> = HashMap::new();
    for source in sources {
        let name = text(source, "name");
        let kind = text(source, "kind");
        let evidence_url = text(source, "evidence_url");
        if name.is_empty() || !allowed.contains(&kind) {
            return Err(art_error(
                owner_id,
                "art_style_source_entry_invalid",
                "source_basis",
                format!(
                    "ArtStyle '{owner_id}' source entries need a name and an allowed basis kind"
                ),
            ));
        }
        if kind != "original_synthesis" && evidence_url.is_empty() {
            return Err(art_error(
                owner_id,
                "art_style_source_evidence_missing",
                "source_basis",
                format!("ArtStyle '{owner_id}' source '{name}' has no evidence_url"),
            ));
        }
        if bool_field(source, "living") && !matches!(kind, "licensed_artist" | "licensed_source") {
            return Err(art_error(
                owner_id,
                "art_style_living_source_unlicensed",
                "source_basis",
                format!(
                    "ArtStyle '{owner_id}' names living source '{name}' without an opt-in license"
                ),
            ));
        }
        if kind == "public_domain_artist"
            && (number(source, "death_year").is_none()
                || text(source, "public_domain_basis").is_empty())
        {
            return Err(art_error(
                owner_id,
                "art_style_public_domain_basis_missing",
                "source_basis",
                format!(
                    "ArtStyle '{owner_id}' public-domain artist '{name}' needs death_year and public_domain_basis"
                ),
            ));
        }
        if matches!(kind, "licensed_artist" | "licensed_source")
            && text(source, "license_url").is_empty()
            && text(source, "permission").is_empty()
        {
            return Err(art_error(
                owner_id,
                "art_style_license_evidence_missing",
                "source_basis",
                format!(
                    "ArtStyle '{owner_id}' licensed source '{name}' needs license_url or permission evidence"
                ),
            ));
        }
        if kind.ends_with("_artist") && contains_ci(prompt, name) {
            return Err(art_error(
                owner_id,
                "art_style_prompt_names_artist",
                "prompt_template",
                format!(
                    "ArtStyle '{owner_id}' prompt names artist '{name}'; encode the observable tradition instead"
                ),
            ));
        }
        eligible_by_name.insert(normalized_words(name), kind.to_string());
    }

    let mut credits = lane_json_value(fields, "credits")
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default();
    for manifest_field in ["reference_manifest", "proof_shots_manifest"] {
        if let Some(manifest) = lane_json_value(fields, manifest_field) {
            collect_manifest_credits(&manifest, &mut credits);
        }
    }
    for credit in credits {
        let name = text(&credit, "name");
        let credit_kind = text(&credit, "kind");
        let Some(basis_kind) = eligible_by_name.get(&normalized_words(name)) else {
            return Err(art_error(
                owner_id,
                "art_style_credit_without_source_basis",
                "source_basis",
                format!("ArtStyle '{owner_id}' credit '{name}' has no matching source-basis entry"),
            ));
        };
        if credit_kind == "artist"
            && !matches!(
                basis_kind.as_str(),
                "public_domain_artist" | "licensed_artist"
            )
        {
            return Err(art_error(
                owner_id,
                "art_style_artist_credit_ineligible",
                "source_basis",
                format!(
                    "ArtStyle '{owner_id}' artist credit '{name}' is neither public-domain nor licensed"
                ),
            ));
        }
    }
    Ok(basis)
}

pub(super) fn verify_prompt_review(
    owner_id: &str,
    fields: &Value,
    prompt: &str,
) -> Result<Value, VerificationError> {
    let review = lane_json_value(fields, "prompt_review").ok_or_else(|| {
        art_error(
            owner_id,
            "art_style_prompt_review_missing",
            "prompt_review",
            format!("ArtStyle '{owner_id}' has no structured prompt review"),
        )
    })?;
    if !review.is_object()
        || !version_is_one(&review)
        || text(&review, "verdict") != "pass"
        || text(&review, "prompt") != prompt.trim()
        || !bool_field(&review, "reference_independent")
        || !bool_field(&review, "subject_independent")
        || !bool_field(&review, "source_medium_independent")
        || !bool_field(&review, "model_agnostic")
        || !bool_field(&review, "style_name_independent")
    {
        return Err(art_error(
            owner_id,
            "art_style_prompt_review_invalid",
            "prompt_review",
            format!(
                "ArtStyle '{owner_id}' prompt_review must attest the exact prompt as reference-, subject-, source-medium-, model-, and catalog-name-independent"
            ),
        ));
    }
    if review
        .get("contradictions")
        .and_then(Value::as_array)
        .map(|items| !items.is_empty())
        .unwrap_or(true)
    {
        return Err(art_error(
            owner_id,
            "art_style_prompt_contradiction",
            "prompt_review",
            format!("ArtStyle '{owner_id}' prompt review contains unresolved contradictions"),
        ));
    }
    let revision_count = review
        .get("revision_count")
        .and_then(Value::as_u64)
        .unwrap_or(u64::MAX);
    if revision_count > 1 {
        return Err(art_error(
            owner_id,
            "art_style_prompt_review_loop_invalid",
            "prompt_review",
            format!("ArtStyle '{owner_id}' prompt review must converge in at most one revision"),
        ));
    }

    let reviewer =
        nonempty_model(review.get("reviewer").unwrap_or(&Value::Null)).ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_prompt_reviewer_missing",
                "prompt_review",
                format!("ArtStyle '{owner_id}' prompt review is missing reviewer provider/model"),
            )
        })?;
    if prompt_author(fields)
        .map(|author| author == reviewer)
        .unwrap_or(false)
    {
        return Err(art_error(
            owner_id,
            "art_style_prompt_review_not_independent",
            "prompt_review",
            format!("ArtStyle '{owner_id}' prompt reviewer must differ from the prompt author"),
        ));
    }

    let dimensions = review
        .get("observable_dimensions")
        .and_then(Value::as_object)
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_prompt_dimensions_missing",
                "prompt_review",
                format!(
                    "ArtStyle '{owner_id}' prompt review has no observable-dimensions evidence"
                ),
            )
        })?;
    let normalized_prompt = normalized_words(prompt);
    let mut evidence_spans: Vec<(usize, usize, &str)> = Vec::new();
    let mut evidence_phrases: Vec<(String, &str)> = Vec::new();
    let mut last_evidence_end = 0;
    let mut covered_words = 0;
    for dimension in DIMENSIONS {
        let evidence = dimensions
            .get(dimension)
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim();
        if !has_substantive_evidence(evidence) || !contains_ci(prompt, evidence) {
            return Err(art_error(
                owner_id,
                "art_style_prompt_dimension_unproven",
                "prompt_review",
                format!(
                    "ArtStyle '{owner_id}' prompt review does not quote prompt evidence for '{dimension}'"
                ),
            ));
        }
        let normalized_evidence = normalized_words(evidence);
        if let Some((_, prior_dimension)) = evidence_phrases.iter().find(|(prior, _)| {
            contains_word_sequence(prior, &normalized_evidence)
                || contains_word_sequence(&normalized_evidence, prior)
        }) {
            return Err(art_error(
                owner_id,
                "art_style_prompt_dimension_evidence_reused",
                "prompt_review",
                format!(
                    "ArtStyle '{owner_id}' reuses nested prompt evidence for '{prior_dimension}' and '{dimension}'"
                ),
            ));
        }
        let Some(relative_start) = normalized_prompt
            .get(last_evidence_end..)
            .and_then(|remaining| remaining.find(&normalized_evidence))
        else {
            return Err(art_error(
                owner_id,
                "art_style_prompt_dimension_evidence_out_of_order",
                "prompt_review",
                format!(
                    "ArtStyle '{owner_id}' prompt review has no evidence for '{dimension}' after the preceding canonical dimension"
                ),
            ));
        };
        let start = last_evidence_end + relative_start;
        let end = start + normalized_evidence.len();
        if let Some((_, _, prior_dimension)) = evidence_spans
            .iter()
            .find(|(prior_start, prior_end, _)| start < *prior_end && *prior_start < end)
        {
            return Err(art_error(
                owner_id,
                "art_style_prompt_dimension_evidence_reused",
                "prompt_review",
                format!(
                    "ArtStyle '{owner_id}' reuses overlapping prompt evidence for '{prior_dimension}' and '{dimension}'"
                ),
            ));
        }
        last_evidence_end = end;
        covered_words += normalized_evidence.split_whitespace().count();
        evidence_spans.push((start, end, dimension));
        evidence_phrases.push((normalized_evidence, dimension));
    }
    let prompt_words = normalized_prompt.split_whitespace().count();
    if prompt_words == 0 || covered_words * 100 < prompt_words * 45 {
        return Err(art_error(
            owner_id,
            "art_style_prompt_dimension_evidence_too_thin",
            "prompt_review",
            format!(
                "ArtStyle '{owner_id}' prompt review must bind the seven semantic dimensions to substantial prompt clauses, not isolated fragments"
            ),
        ));
    }
    Ok(review)
}

fn score_case(owner_id: &str, scores: &Value) -> Result<f64, VerificationError> {
    let mut total = 0.0;
    for dimension in DIMENSIONS {
        let score = number(scores, dimension).unwrap_or(-1.0);
        if !(1.0..=2.0).contains(&score) {
            return Err(art_error(
                owner_id,
                "art_style_portability_dimension_failed",
                "portability_report",
                format!(
                    "ArtStyle '{owner_id}' portability case scored below 1/2 or omitted '{dimension}'"
                ),
            ));
        }
        if dimension == "medium_material" && score < 2.0 {
            return Err(art_error(
                owner_id,
                "art_style_portability_source_medium_preserved",
                "portability_report",
                format!(
                    "ArtStyle '{owner_id}' portability case did not fully replace the source medium with the target material"
                ),
            ));
        }
        total += score;
    }
    Ok(total / DIMENSIONS.len() as f64)
}

fn exact_object_keys(value: &Value, keys: &[&str]) -> bool {
    value
        .as_object()
        .map(|object| {
            object.len() == keys.len() && keys.iter().all(|key| object.contains_key(*key))
        })
        .unwrap_or(false)
}

fn sha256_hex(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}

fn decode_hex_32(value: &str) -> Option<[u8; 32]> {
    if value.len() != 64 {
        return None;
    }
    let mut output = [0_u8; 32];
    for (index, pair) in value.as_bytes().chunks_exact(2).enumerate() {
        let pair = std::str::from_utf8(pair).ok()?;
        output[index] = u8::from_str_radix(pair, 16).ok()?;
    }
    Some(output)
}

fn generation_receipt(
    owner_id: &str,
    value: &Value,
    field: &'static str,
    style_slug: &str,
    prompt: &str,
    model: &(String, String),
    receipt_key: &str,
) -> Result<VerifiedProofReceipt, VerificationError> {
    let receipt = value
        .get("generation_receipt")
        .unwrap_or(&Value::Null);
    let source = receipt.get("source").unwrap_or(&Value::Null);
    let output = receipt.get("output").unwrap_or(&Value::Null);
    if !exact_object_keys(
        receipt,
        &[
            "schema_version",
            "issuer",
            "kind",
            "style_slug",
            "category",
            "subject",
            "composition",
            "source_medium",
            "source",
            "output",
            "signature",
        ],
    ) || !exact_object_keys(
        source,
        &[
            "file_id",
            "sha256",
            "endpoint",
            "request_id",
            "prompt_sha256",
        ],
    ) || !exact_object_keys(
        output,
        &[
            "file_id",
            "sha256",
            "endpoint",
            "request_id",
            "prompt_sha256",
            "seed",
        ],
    ) {
        return Err(art_error(
            owner_id,
            "art_style_proof_receipt_invalid",
            field,
            format!(
                "ArtStyle '{owner_id}' proof generation receipt has an invalid shape"
            ),
        ));
    }
    let category = text(receipt, "category");
    let subject = text(receipt, "subject");
    let composition = text(receipt, "composition");
    let source_medium = text(receipt, "source_medium");
    let source_file_id = text(source, "file_id");
    let source_sha256 = text(source, "sha256");
    let source_endpoint = text(source, "endpoint");
    let source_request_id = text(source, "request_id");
    let source_prompt_sha256 = text(source, "prompt_sha256");
    let output_file_id = text(output, "file_id");
    let output_sha256 = text(output, "sha256");
    let output_endpoint = text(output, "endpoint");
    let output_request_id = text(output, "request_id");
    let output_prompt_sha256 = text(output, "prompt_sha256");
    let seed = text(output, "seed");
    let signature = text(receipt, "signature");

    if text(receipt, "schema_version") != "1"
        || text(receipt, "issuer") != "katagami-mcp"
        || text(receipt, "kind") != "art_style_proof"
        || text(receipt, "style_slug") != style_slug
        || !PROOF_CATEGORIES.contains(&category)
        || subject.is_empty()
        || composition.is_empty()
        || !SOURCE_MEDIA.contains(&source_medium)
        || source_endpoint != SOURCE_ENDPOINT
        || !EDIT_ENDPOINTS.contains(&output_endpoint)
        || model.0 != "fal"
        || model.1 != output_endpoint
        || text(value, "category") != category
        || text(value, "subject") != subject
        || text(value, "composition") != composition
        || text(value, "source_medium") != source_medium
        || text(value, "file_id") != output_file_id
        || text(value, "seed") != seed
        || text(value, "mode") != "image_edit"
        || bool_field(value, "style_reference_used")
        || output_prompt_sha256 != sha256_hex(prompt.trim())
        || source_file_id.is_empty()
        || source_request_id.is_empty()
        || output_file_id.is_empty()
        || output_request_id.is_empty()
        || seed.is_empty()
        || subject.contains(['\n', '\r'])
        || composition.contains(['\n', '\r'])
        || decode_hex_32(source_sha256).is_none()
        || decode_hex_32(source_prompt_sha256).is_none()
        || decode_hex_32(output_sha256).is_none()
        || decode_hex_32(output_prompt_sha256).is_none()
    {
        return Err(art_error(
            owner_id,
            "art_style_proof_receipt_mismatch",
            field,
            format!(
                "ArtStyle '{owner_id}' proof receipt does not bind the exact style, role, source, prompt, model, seed, and output file"
            ),
        ));
    }
    let message = [
        "1",
        "katagami-mcp",
        "art_style_proof",
        style_slug,
        category,
        subject,
        composition,
        source_medium,
        source_file_id,
        source_sha256,
        source_endpoint,
        source_request_id,
        source_prompt_sha256,
        output_file_id,
        output_sha256,
        output_endpoint,
        output_request_id,
        output_prompt_sha256,
        seed,
    ]
    .join("\n");
    let signature_bytes = decode_hex_32(signature).ok_or_else(|| {
        art_error(
            owner_id,
            "art_style_proof_receipt_signature_invalid",
            field,
            format!("ArtStyle '{owner_id}' proof receipt signature is not valid hex"),
        )
    })?;
    let mut mac = Hmac::<Sha256>::new_from_slice(receipt_key.as_bytes()).map_err(|_| {
        art_error(
            owner_id,
            "art_style_proof_receipt_key_invalid",
            field,
            format!("ArtStyle '{owner_id}' proof receipt verifier key is invalid"),
        )
    })?;
    mac.update(message.as_bytes());
    mac.verify_slice(&signature_bytes).map_err(|_| {
        art_error(
            owner_id,
            "art_style_proof_receipt_signature_invalid",
            field,
            format!(
                "ArtStyle '{owner_id}' proof receipt was not issued by the governed generation service"
            ),
        )
    })?;
    Ok(VerifiedProofReceipt {
        category: category.to_string(),
        subject: subject.to_string(),
        composition: composition.to_string(),
        source_medium: source_medium.to_string(),
        source_file_id: source_file_id.to_string(),
        source_sha256: source_sha256.to_string(),
        source_endpoint: source_endpoint.to_string(),
        source_request_id: source_request_id.to_string(),
        source_prompt_sha256: source_prompt_sha256.to_string(),
        output_file_id: output_file_id.to_string(),
        output_sha256: output_sha256.to_string(),
        output_endpoint: output_endpoint.to_string(),
        output_request_id: output_request_id.to_string(),
        output_prompt_sha256: output_prompt_sha256.to_string(),
        seed: seed.to_string(),
    })
}

pub(super) fn verify_portability_report(
    owner_id: &str,
    fields: &Value,
    prompt: &str,
    proof_ids: &[String],
    receipt_key: &str,
) -> Result<VerifiedPortabilityReport, VerificationError> {
    if receipt_key.is_empty() || receipt_key.contains("{secret:") {
        return Err(art_error(
            owner_id,
            "art_style_proof_receipt_key_missing",
            "portability_report",
            format!(
                "ArtStyle '{owner_id}' cannot be verified without the governed proof-receipt key"
            ),
        ));
    }
    let style_slug = text(fields, "slug");
    if style_slug.is_empty() {
        return Err(art_error(
            owner_id,
            "art_style_slug_missing",
            "slug",
            format!("ArtStyle '{owner_id}' is missing its slug"),
        ));
    }
    let report = lane_json_value(fields, "portability_report").ok_or_else(|| {
        art_error(
            owner_id,
            "art_style_portability_report_missing",
            "portability_report",
            format!("ArtStyle '{owner_id}' has no cross-model portability report"),
        )
    })?;
    if !report.is_object()
        || !version_is_one(&report)
        || text(&report, "verdict") != "pass"
        || text(&report, "prompt") != prompt.trim()
        || !bool_field(&report, "blind_evaluation")
    {
        return Err(art_error(
            owner_id,
            "art_style_portability_report_invalid",
            "portability_report",
            format!(
                "ArtStyle '{owner_id}' portability_report must attest the exact prompt with schema v1, verdict=pass, and blind_evaluation=true"
            ),
        ));
    }
    let evaluator =
        nonempty_model(report.get("evaluator").unwrap_or(&Value::Null)).ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_portability_evaluator_missing",
                "portability_report",
                format!("ArtStyle '{owner_id}' portability report has no evaluator provider/model"),
            )
        })?;
    let models = report
        .get("models")
        .and_then(Value::as_array)
        .filter(|items| items.len() == 2)
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_portability_models_missing",
                "portability_report",
                format!("ArtStyle '{owner_id}' portability report needs exactly two image models"),
            )
        })?;

    let proof_set: BTreeSet<&str> = proof_ids.iter().map(String::as_str).collect();
    if proof_ids.len() != 8 || proof_set.len() != 8 {
        return Err(art_error(
            owner_id,
            "art_style_portability_matrix_incomplete",
            "proof_shots_file_ids",
            format!(
                "ArtStyle '{owner_id}' needs exactly eight unique proofs: two models by four semantic roles"
            ),
        ));
    }
    let proof_manifest = lane_json_value(fields, "proof_shots_manifest").ok_or_else(|| {
        art_error(
            owner_id,
            "art_style_proof_manifest_missing",
            "proof_shots_manifest",
            format!("ArtStyle '{owner_id}' has no proof-shot manifest"),
        )
    })?;
    if text(&proof_manifest, "schema_version") != "2" {
        return Err(art_error(
            owner_id,
            "art_style_proof_manifest_invalid",
            "proof_shots_manifest",
            format!("ArtStyle '{owner_id}' proof-shot manifest must use schema v2"),
        ));
    }
    let manifest_items = proof_manifest
        .get("items")
        .and_then(Value::as_array)
        .filter(|items| items.len() == 8)
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_proof_manifest_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' proof-shot manifest must describe every attached proof"
                ),
            )
        })?;
    let mut manifest_receipts: HashMap<String, VerifiedProofReceipt> = HashMap::new();
    for item in manifest_items {
        if !exact_object_keys(
            item,
            &[
                "file_id",
                "category",
                "subject",
                "composition",
                "source_medium",
                "mode",
                "seed",
                "style_reference_used",
                "model",
                "generation_receipt",
            ],
        ) {
            return Err(art_error(
                owner_id,
                "art_style_proof_manifest_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' proof manifest items must contain only the governed proof fields"
                ),
            ));
        }
        let file_id = text(item, "file_id");
        let model = nonempty_model(item.get("model").unwrap_or(&Value::Null)).ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_portability_model_invalid",
                "proof_shots_manifest",
                format!("ArtStyle '{owner_id}' proof manifest item has no image model"),
            )
        })?;
        if !proof_set.contains(file_id)
            || manifest_receipts.contains_key(file_id)
            || bool_field(item, "style_reference_used")
            || text(item, "mode") != "image_edit"
        {
            return Err(art_error(
                owner_id,
                "art_style_proof_manifest_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' proof manifest has an absent/duplicate file, invalid mode, or style-reference dependency"
                ),
            ));
        }
        let receipt = generation_receipt(
            owner_id,
            item,
            "proof_shots_manifest",
            style_slug,
            prompt,
            &model,
            receipt_key,
        )?;
        manifest_receipts.insert(file_id.to_string(), receipt);
    }

    let mut tested_models = BTreeSet::new();
    let mut used_files = BTreeSet::new();
    let mut verified_receipts = Vec::new();
    let mut expected_source_matrix: Option<
        BTreeSet<(
            String,
            String,
            String,
            String,
            String,
            String,
            String,
            String,
            String,
        )>,
    > = None;
    for model in models {
        let model_key = nonempty_model(model).ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_portability_model_invalid",
                "portability_report",
                format!("ArtStyle '{owner_id}' portability model lacks provider/model"),
            )
        })?;
        if model_key.0 != "fal" || !EDIT_ENDPOINTS.contains(&model_key.1.as_str()) {
            return Err(art_error(
                owner_id,
                "art_style_portability_model_invalid",
                "portability_report",
                format!(
                    "ArtStyle '{owner_id}' portability proofs must come from the two governed edit endpoints"
                ),
            ));
        }
        if model_key == evaluator {
            return Err(art_error(
                owner_id,
                "art_style_portability_evaluator_not_blind",
                "portability_report",
                format!("ArtStyle '{owner_id}' evaluator must differ from every image model"),
            ));
        }
        if !tested_models.insert(model_key.clone()) {
            return Err(art_error(
                owner_id,
                "art_style_portability_model_invalid",
                "portability_report",
                format!("ArtStyle '{owner_id}' repeats the same image model"),
            ));
        }
        let cases = model
            .get("cases")
            .and_then(Value::as_array)
            .filter(|items| items.len() == 4)
            .ok_or_else(|| {
                art_error(
                    owner_id,
                    "art_style_portability_cases_missing",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' needs exactly four semantic-role cases per image model"
                    ),
                )
            })?;
        let mut categories = BTreeSet::new();
        let mut source_media = BTreeSet::new();
        let mut source_matrix = BTreeSet::new();
        let mut model_total = 0.0;
        for case in cases {
            if !exact_object_keys(
                case,
                &[
                    "file_id",
                    "category",
                    "subject",
                    "composition",
                    "source_medium",
                    "mode",
                    "seed",
                    "prompt",
                    "style_reference_used",
                    "content_preserved",
                    "source_medium_replaced",
                    "generation_receipt",
                    "scores",
                ],
            ) {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_case_invalid",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability cases must contain only the governed evidence fields"
                    ),
                ));
            }
            if text(case, "prompt") != prompt.trim()
                || bool_field(case, "style_reference_used")
                || !bool_field(case, "content_preserved")
                || !bool_field(case, "source_medium_replaced")
            {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_prompt_changed",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability cases must use the exact canonical prompt, preserve subject content, fully replace source medium, and use no style reference"
                    ),
                ));
            }
            let file_id = text(case, "file_id");
            if !proof_set.contains(file_id) || !used_files.insert(file_id.to_string()) {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_proof_file_invalid",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability case file '{file_id}' is absent from or duplicated in proof shots"
                    ),
                ));
            }
            let subject = text(case, "subject");
            let composition = text(case, "composition");
            let category = text(case, "category");
            let source_medium = text(case, "source_medium");
            let seed = text(case, "seed");
            if subject.is_empty()
                || composition.is_empty()
                || seed.is_empty()
                || text(case, "mode") != "image_edit"
                || !PROOF_CATEGORIES.contains(&category)
                || !SOURCE_MEDIA.contains(&source_medium)
            {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_case_invalid",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability cases need a valid semantic role, subject, composition, source medium, seed, and image-edit mode"
                    ),
                ));
            }
            categories.insert(category.to_string());
            source_media.insert(source_medium.to_string());
            let receipt = generation_receipt(
                owner_id,
                case,
                "portability_report",
                style_slug,
                prompt,
                &model_key,
                receipt_key,
            )?;
            if manifest_receipts.get(file_id) != Some(&receipt) {
                return Err(art_error(
                    owner_id,
                    "art_style_proof_receipt_mismatch",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' proof '{file_id}' receipt differs between its manifest and portability report"
                    ),
                ));
            }
            source_matrix.insert((
                receipt.category.clone(),
                receipt.subject.clone(),
                receipt.composition.clone(),
                receipt.source_medium.clone(),
                receipt.source_file_id.clone(),
                receipt.source_sha256.clone(),
                receipt.source_endpoint.clone(),
                receipt.source_request_id.clone(),
                receipt.source_prompt_sha256.clone(),
            ));
            let average = score_case(owner_id, case.get("scores").unwrap_or(&Value::Null))?;
            if average < 1.5 {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_case_below_threshold",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability case averaged {average:.2}, below 1.5/2"
                    ),
                ));
            }
            model_total += average;
            verified_receipts.push(receipt);
        }
        let expected_categories = PROOF_CATEGORIES
            .iter()
            .map(|value| value.to_string())
            .collect::<BTreeSet<_>>();
        let expected_media = SOURCE_MEDIA
            .iter()
            .map(|value| value.to_string())
            .collect::<BTreeSet<_>>();
        if categories != expected_categories
            || source_media != expected_media
            || source_matrix.len() != 4
            || model_total / 4.0 < 1.5
        {
            return Err(art_error(
                owner_id,
                "art_style_portability_model_below_threshold",
                "portability_report",
                format!(
                    "ArtStyle '{owner_id}' failed the per-model four-role, four-medium, source, or score threshold"
                ),
            ));
        }
        if let Some(expected) = &expected_source_matrix {
            if expected != &source_matrix {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_matrix_mismatch",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' must test the exact same four generated sources on both image models"
                    ),
                ));
            }
        } else {
            expected_source_matrix = Some(source_matrix);
        }
    }

    let expected_models = EDIT_ENDPOINTS
        .iter()
        .map(|endpoint| ("fal".to_string(), endpoint.to_string()))
        .collect::<BTreeSet<_>>();
    if tested_models != expected_models
        || used_files.len() != 8
        || verified_receipts.len() != 8
    {
        return Err(art_error(
            owner_id,
            "art_style_portability_matrix_incomplete",
            "portability_report",
            format!(
                "ArtStyle '{owner_id}' needs the governed two-model by four-role matrix and a score for every attached proof"
            ),
        ));
    }
    Ok(VerifiedPortabilityReport {
        report,
        proof_receipts: verified_receipts,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use hmac::{Hmac, Mac};
    use serde_json::json;

    const RECEIPT_KEY: &str = "katagami-test-proof-receipt-key";
    const STYLE_SLUG: &str = "archive-ember";
    const PROMPT: &str = "Render the supplied subject as a two-ink relief print on fibrous matte paper. Use blunt carved contours and visibly broken edges. Build volume with sparse directional hatching and broad unprinted highlights. Reserve deep indigo for structural masses and vermilion for small focal accents. Keep a centered, compressed composition with generous bare paper. Add slight ink spread and irregular hand pressure. Avoid photorealistic skin, glossy surfaces, gradients, and smooth vector geometry.";

    const SUBJECTS: [&str; 4] = [
        "a night-shift printer beside a blank paper stack",
        "an urban pigeon lifting into flight",
        "a cassette player with headphones and tape cases",
        "a hillside neighborhood with stairs and water tanks",
    ];
    const COMPOSITIONS: [&str; 4] = [
        "waist-up three-quarter portrait with an open side",
        "diagonal wings-spread view with clear negative space",
        "overhead product grouping with deliberate gaps",
        "wide cityscape rising diagonally across the frame",
    ];

    fn receipt_message(receipt: &Value) -> String {
        let source = &receipt["source"];
        let output = &receipt["output"];
        [
            text(receipt, "schema_version"),
            text(receipt, "issuer"),
            text(receipt, "kind"),
            text(receipt, "style_slug"),
            text(receipt, "category"),
            text(receipt, "subject"),
            text(receipt, "composition"),
            text(receipt, "source_medium"),
            text(source, "file_id"),
            text(source, "sha256"),
            text(source, "endpoint"),
            text(source, "request_id"),
            text(source, "prompt_sha256"),
            text(output, "file_id"),
            text(output, "sha256"),
            text(output, "endpoint"),
            text(output, "request_id"),
            text(output, "prompt_sha256"),
            text(output, "seed"),
        ]
        .join("\n")
    }

    fn sign_receipt(receipt: &mut Value) {
        let message = receipt_message(receipt);
        let mut mac = Hmac::<Sha256>::new_from_slice(RECEIPT_KEY.as_bytes()).unwrap();
        mac.update(message.as_bytes());
        receipt["signature"] = json!(format!("{:x}", mac.finalize().into_bytes()));
    }

    fn proof_receipt(model: &str, index: usize, output_file_id: &str) -> Value {
        let mut receipt = json!({
            "schema_version": "1",
            "issuer": "katagami-mcp",
            "kind": "art_style_proof",
            "style_slug": STYLE_SLUG,
            "category": PROOF_CATEGORIES[index],
            "subject": SUBJECTS[index],
            "composition": COMPOSITIONS[index],
            "source_medium": SOURCE_MEDIA[index],
            "source": {
                "file_id": format!("source-file-{index}"),
                "sha256": sha256_hex(&format!("source-bytes-{index}")),
                "endpoint": SOURCE_ENDPOINT,
                "request_id": format!("source-request-{index}"),
                "prompt_sha256": sha256_hex(&format!("neutral-source-prompt-{index}"))
            },
            "output": {
                "file_id": output_file_id,
                "sha256": sha256_hex(&format!("output-bytes-{model}-{index}")),
                "endpoint": model,
                "request_id": format!("output-request-{model}-{index}"),
                "prompt_sha256": sha256_hex(PROMPT),
                "seed": format!("{model}-{index}")
            },
            "signature": ""
        });
        sign_receipt(&mut receipt);
        receipt
    }

    fn valid_fields() -> Value {
        let dims = json!({
            "medium_material": "two-ink relief print on fibrous matte paper",
            "marks_edges": "blunt carved contours and visibly broken edges",
            "tonal_shading": "sparse directional hatching and broad unprinted highlights",
            "color_roles": "deep indigo for structural masses and vermilion for small focal accents",
            "composition": "centered, compressed composition with generous bare paper",
            "signature_details": "slight ink spread and irregular hand pressure",
            "exclusions": "Avoid photorealistic skin, glossy surfaces, gradients, and smooth vector geometry"
        });
        let mut proof_ids = Vec::new();
        let mut proof_manifest = Vec::new();
        let mut models = Vec::new();
        for model in EDIT_ENDPOINTS {
            let mut cases = Vec::new();
            for index in 0..4 {
                let file_id = format!("proof-{model}-{index}");
                let receipt = proof_receipt(model, index, &file_id);
                let seed = text(&receipt["output"], "seed").to_string();
                proof_ids.push(file_id.clone());
                proof_manifest.push(json!({
                    "file_id": file_id.clone(),
                    "category": PROOF_CATEGORIES[index],
                    "subject": SUBJECTS[index],
                    "composition": COMPOSITIONS[index],
                    "source_medium": SOURCE_MEDIA[index],
                    "mode": "image_edit",
                    "seed": seed,
                    "style_reference_used": false,
                    "model": {"provider": "fal", "model": model},
                    "generation_receipt": receipt.clone()
                }));
                cases.push(json!({
                    "file_id": file_id,
                    "category": PROOF_CATEGORIES[index],
                    "subject": SUBJECTS[index],
                    "composition": COMPOSITIONS[index],
                    "source_medium": SOURCE_MEDIA[index],
                    "mode": "image_edit",
                    "seed": seed,
                    "prompt": PROMPT,
                    "style_reference_used": false,
                    "content_preserved": true,
                    "source_medium_replaced": true,
                    "generation_receipt": receipt,
                    "scores": {
                        "medium_material": 2, "marks_edges": 2, "tonal_shading": 1,
                        "color_roles": 2, "composition": 1, "signature_details": 2,
                        "exclusions": 1
                    }
                }));
            }
            models.push(json!({"provider": "fal", "model": model, "cases": cases}));
        }
        json!({
            "name": "Archive Ember",
            "slug": STYLE_SLUG,
            "prompt_template": PROMPT,
            "model_provenance": {"style": {"provider": "openai", "model": "gpt-author"}},
            "credits": [{"name": "European relief print tradition", "kind": "tradition"}],
            "source_basis": {
                "schema_version": "1", "verdict": "pass", "all_named_people_checked": true,
                "reviewer": {"provider": "anthropic", "model": "reviewer"},
                "sources": [{
                    "name": "European relief print tradition", "kind": "tradition",
                    "evidence_url": "https://example.test/relief"
                }]
            },
            "prompt_review": {
                "schema_version": "1", "verdict": "pass", "prompt": PROMPT,
                "reviewer": {"provider": "anthropic", "model": "reviewer"},
                "reference_independent": true, "subject_independent": true,
                "source_medium_independent": true,
                "model_agnostic": true, "style_name_independent": true,
                "contradictions": [], "revision_count": 1,
                "observable_dimensions": dims
            },
            "portability_report": {
                "schema_version": "1", "verdict": "pass", "prompt": PROMPT,
                "blind_evaluation": true,
                "evaluator": {"provider": "openai", "model": "vision-reviewer"},
                "models": models
            },
            "proof_shots_manifest": {"schema_version": "2", "items": proof_manifest},
            "proof_ids": proof_ids
        })
    }

    #[test]
    fn complete_review_contract_passes() {
        let fields = valid_fields();
        let prompt = text(&fields, "prompt_template");
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        assert!(verify_portable_prompt("as-1", text(&fields, "name"), prompt).is_ok());
        assert!(verify_source_basis("as-1", &fields, prompt).is_ok());
        assert!(verify_prompt_review("as-1", &fields, prompt).is_ok());
        assert!(
            verify_portability_report("as-1", &fields, prompt, &proof_ids, RECEIPT_KEY).is_ok()
        );
    }

    #[test]
    fn prompt_review_must_attest_source_medium_independence() {
        let mut fields = valid_fields();
        fields["prompt_review"]["source_medium_independent"] = json!(false);
        let prompt = text(&fields, "prompt_template");
        let err = verify_prompt_review("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_prompt_review_invalid");
    }

    #[test]
    fn catalog_name_placeholders_and_reference_dependency_fail() {
        for prompt in [
            "Archive Ember treatment for a subject",
            "{subject}, carved ink, {palette}",
            "Match the reference image exactly",
            "A cat in the style of Somebody",
        ] {
            assert!(verify_portable_prompt("as-1", "Archive Ember", prompt).is_err());
        }
    }

    #[test]
    fn generic_prompt_dimension_evidence_fails() {
        let mut fields = valid_fields();
        fields["prompt_review"]["observable_dimensions"]["marks_edges"] =
            json!("the supplied subject");
        let prompt = text(&fields, "prompt_template");
        let err = verify_prompt_review("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_prompt_dimension_unproven");
    }

    #[test]
    fn prompt_dimensions_need_distinct_non_overlapping_evidence() {
        let mut fields = valid_fields();
        fields["prompt_review"]["observable_dimensions"]["marks_edges"] =
            fields["prompt_review"]["observable_dimensions"]["medium_material"].clone();
        let prompt = text(&fields, "prompt_template");
        let err = verify_prompt_review("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_prompt_dimension_evidence_reused");
    }

    #[test]
    fn nested_evidence_fails_when_a_phrase_occurs_more_than_once() {
        let mut fields = valid_fields();
        let prompt = format!(
            "Fibrous matte paper surrounds the subject. {}",
            text(&fields, "prompt_template")
        );
        fields["prompt_template"] = json!(prompt);
        fields["prompt_review"]["prompt"] = fields["prompt_template"].clone();
        fields["prompt_review"]["observable_dimensions"]["marks_edges"] =
            json!("fibrous matte paper");
        let prompt = text(&fields, "prompt_template");
        let err = verify_prompt_review("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_prompt_dimension_evidence_reused");
    }

    #[test]
    fn unique_excerpts_cannot_be_assigned_to_wrong_dimensions() {
        let mut fields = valid_fields();
        let medium = fields["prompt_review"]["observable_dimensions"]["medium_material"].clone();
        fields["prompt_review"]["observable_dimensions"]["medium_material"] =
            fields["prompt_review"]["observable_dimensions"]["marks_edges"].clone();
        fields["prompt_review"]["observable_dimensions"]["marks_edges"] = medium;
        let prompt = text(&fields, "prompt_template");
        let err = verify_prompt_review("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_prompt_dimension_evidence_out_of_order");
    }

    #[test]
    fn later_evidence_can_repeat_words_from_an_earlier_preamble() {
        let mut fields = valid_fields();
        let prompt = format!(
            "Generous bare paper frames this recipe. {}",
            text(&fields, "prompt_template")
        );
        fields["prompt_template"] = json!(prompt);
        fields["prompt_review"]["prompt"] = fields["prompt_template"].clone();
        let prompt = text(&fields, "prompt_template");
        assert!(verify_prompt_review("as-1", &fields, prompt).is_ok());
    }

    #[test]
    fn isolated_fragments_do_not_establish_semantic_coverage() {
        let mut fields = valid_fields();
        fields["prompt_review"]["observable_dimensions"] = json!({
            "medium_material": "fibrous matte paper",
            "marks_edges": "visibly broken edges",
            "tonal_shading": "broad unprinted highlights",
            "color_roles": "vermilion for small focal accents",
            "composition": "generous bare paper",
            "signature_details": "irregular hand pressure",
            "exclusions": "smooth vector geometry"
        });
        let prompt = text(&fields, "prompt_template");
        let err = verify_prompt_review("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_prompt_dimension_evidence_too_thin");
    }

    #[test]
    fn living_unlicensed_artist_fails() {
        let mut fields = valid_fields();
        fields["credits"] = json!([{"name": "Living Artist", "kind": "artist"}]);
        fields["source_basis"]["sources"] = json!([{
            "name": "Living Artist", "kind": "public_domain_artist", "living": true,
            "death_year": 2020, "public_domain_basis": "claimed",
            "evidence_url": "https://example.test/artist"
        }]);
        let err =
            verify_source_basis("as-1", &fields, text(&fields, "prompt_template")).unwrap_err();
        assert_eq!(err.code, "art_style_living_source_unlicensed");
    }

    #[test]
    fn hidden_manifest_artist_must_have_eligible_source_basis() {
        let mut fields = valid_fields();
        fields["proof_shots_manifest"] = json!({
            "items": [{
                "generator": {
                    "nested": {
                        "credits": [{"name": "Hidden Living Artist", "kind": "artist"}]
                    }
                }
            }]
        });
        let err =
            verify_source_basis("as-1", &fields, text(&fields, "prompt_template")).unwrap_err();
        assert_eq!(err.code, "art_style_credit_without_source_basis");
    }

    #[test]
    fn one_model_cannot_hide_behind_an_average() {
        let mut fields = valid_fields();
        fields["portability_report"]["models"][1]["cases"][0]["scores"]["marks_edges"] = json!(0);
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_dimension_failed");
    }

    #[test]
    fn preserving_subject_does_not_allow_preserving_source_medium() {
        let mut fields = valid_fields();
        fields["portability_report"]["models"][0]["cases"][0]["source_medium_replaced"] =
            json!(false);
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_prompt_changed");
    }

    #[test]
    fn every_attached_proof_must_be_scored() {
        let mut fields = valid_fields();
        fields["proof_ids"]
            .as_array_mut()
            .unwrap()
            .push(json!("unscored-proof"));
        fields["proof_shots_manifest"]["items"]
            .as_array_mut()
            .unwrap()
            .push(json!({"file_id": "unscored-proof"}));
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_matrix_incomplete");
    }

    #[test]
    fn signed_source_medium_cannot_be_relabelled() {
        let mut fields = valid_fields();
        fields["portability_report"]["models"][1]["cases"][2]["source_medium"] =
            json!("oil painting");
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_case_invalid");
    }

    #[test]
    fn caller_authored_or_forged_receipt_fails() {
        let mut fields = valid_fields();
        fields["proof_shots_manifest"]["items"][0]["generation_receipt"]["signature"] =
            json!("00".repeat(32));
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_proof_receipt_signature_invalid");
    }

    #[test]
    fn text_to_image_is_not_a_portability_proof() {
        let mut fields = valid_fields();
        fields["portability_report"]["models"][0]["cases"][0]["mode"] = json!("text_to_image");
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_case_invalid");
    }

    #[test]
    fn both_models_must_receive_the_identical_four_sources() {
        let mut fields = valid_fields();
        let manifest_index = 4;
        let mut receipt =
            fields["proof_shots_manifest"]["items"][manifest_index]["generation_receipt"].clone();
        receipt["source"]["file_id"] = json!("different-generated-source");
        sign_receipt(&mut receipt);
        fields["proof_shots_manifest"]["items"][manifest_index]["generation_receipt"] =
            receipt.clone();
        fields["portability_report"]["models"][1]["cases"][0]["generation_receipt"] = receipt;
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_matrix_mismatch");
    }

    #[test]
    fn every_model_needs_all_four_roles_and_all_four_media() {
        let mut fields = valid_fields();
        let mut receipt =
            fields["proof_shots_manifest"]["items"][1]["generation_receipt"].clone();
        receipt["category"] = json!(PROOF_CATEGORIES[0]);
        sign_receipt(&mut receipt);
        fields["proof_shots_manifest"]["items"][1]["category"] = json!(PROOF_CATEGORIES[0]);
        fields["proof_shots_manifest"]["items"][1]["generation_receipt"] = receipt.clone();
        fields["portability_report"]["models"][0]["cases"][1]["category"] =
            json!(PROOF_CATEGORIES[0]);
        fields["portability_report"]["models"][0]["cases"][1]["generation_receipt"] = receipt;
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            RECEIPT_KEY,
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_model_below_threshold");
    }

    #[test]
    fn verifier_fails_closed_without_receipt_key() {
        let fields = valid_fields();
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err = verify_portability_report(
            "as-1",
            &fields,
            text(&fields, "prompt_template"),
            &proof_ids,
            "",
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_proof_receipt_key_missing");
    }
}
