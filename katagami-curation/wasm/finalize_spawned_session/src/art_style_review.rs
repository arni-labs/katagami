use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{BTreeSet, HashMap};

use super::{lane_json_value, VerificationError};

const DIMENSIONS: [&str; 8] = [
    "medium_material",
    "marks_edges",
    "depiction_grammar",
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

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(super) struct VerifiedProofRecord {
    pub category: String,
    pub subject: String,
    pub composition: String,
    pub source_medium: String,
    pub source_file_id: String,
    pub source_sha256: String,
    pub output_file_id: String,
    pub output_sha256: String,
    pub output_prompt_sha256: String,
    pub provider_request_id: String,
}

#[derive(Debug)]
pub(super) struct VerifiedPortabilityReport {
    pub report: Value,
    pub proof_records: Vec<VerifiedProofRecord>,
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
        || !bool_field(&basis, "no_living_artist_target")
        || !bool_field(&basis, "tradition_level_description")
    {
        return Err(art_error(
            owner_id,
            "art_style_source_basis_invalid",
            "source_basis",
            format!(
                "ArtStyle '{owner_id}' source_basis must use schema v1, verdict=pass, check every named person, reject any living-artist target, and attest a tradition-level description"
            ),
        ));
    }
    let reviewer =
        nonempty_model(basis.get("reviewer").unwrap_or(&Value::Null)).ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_source_reviewer_missing",
                "source_basis",
                format!("ArtStyle '{owner_id}' source_basis is missing reviewer provider/model"),
            )
        })?;
    if prompt_author(fields)
        .map(|author| author == reviewer)
        .unwrap_or(false)
    {
        return Err(art_error(
            owner_id,
            "art_style_source_review_not_independent",
            "source_basis",
            format!(
                "ArtStyle '{owner_id}' source-basis reviewer must differ from the prompt author"
            ),
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
                "ArtStyle '{owner_id}' prompt review must bind the eight semantic dimensions to substantial prompt clauses, not isolated fragments"
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
        if dimension == "depiction_grammar" && score < 2.0 {
            return Err(art_error(
                owner_id,
                "art_style_portability_depiction_grammar_weak",
                "portability_report",
                format!(
                    "ArtStyle '{owner_id}' portability case retained the image model's default subject construction instead of fully applying the target depiction grammar"
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

fn is_sha256(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn generation_record(
    owner_id: &str,
    value: &Value,
    field: &'static str,
    style_slug: &str,
    prompt: &str,
) -> Result<VerifiedProofRecord, VerificationError> {
    let record = value
        .get("generation_record")
        .unwrap_or(&Value::Null);
    let source = record.get("source").unwrap_or(&Value::Null);
    let output = record.get("output").unwrap_or(&Value::Null);
    let output_has_expected_keys = output
        .as_object()
        .map(|object| {
            (object.len() == 3 || object.len() == 4)
                && ["file_id", "sha256", "prompt_sha256"]
                    .iter()
                    .all(|key| object.contains_key(*key))
                && object
                    .keys()
                    .all(|key| {
                        ["file_id", "sha256", "prompt_sha256", "provider_request_id"]
                            .contains(&key.as_str())
                    })
        })
        .unwrap_or(false);
    if !exact_object_keys(
        record,
        &[
            "schema_version",
            "kind",
            "style_slug",
            "source",
            "output",
        ],
    ) || !exact_object_keys(
        source,
        &["file_id", "sha256"],
    ) {
        return Err(art_error(
            owner_id,
            "art_style_proof_record_invalid",
            field,
            format!(
                "ArtStyle '{owner_id}' proof generation record has an invalid shape"
            ),
        ));
    }
    if !output_has_expected_keys {
        return Err(art_error(
            owner_id,
            "art_style_proof_record_invalid",
            field,
            format!("ArtStyle '{owner_id}' proof output record has an invalid shape"),
        ));
    }
    let category = text(value, "category");
    let subject = text(value, "subject");
    let composition = text(value, "composition");
    let source_medium = text(value, "source_medium");
    let source_file_id = text(source, "file_id");
    let source_sha256 = text(source, "sha256");
    let output_file_id = text(output, "file_id");
    let output_sha256 = text(output, "sha256");
    let output_prompt_sha256 = text(output, "prompt_sha256");
    let provider_request_id = text(output, "provider_request_id");

    if text(record, "schema_version") != "1"
        || text(record, "kind") != "art_style_proof"
        || text(record, "style_slug") != style_slug
        || !PROOF_CATEGORIES.contains(&category)
        || subject.is_empty()
        || composition.is_empty()
        || !SOURCE_MEDIA.contains(&source_medium)
        || text(value, "file_id") != output_file_id
        || text(value, "mode") != "image_edit"
        || bool_field(value, "style_reference_used")
        || output_prompt_sha256 != sha256_hex(prompt.trim())
        || source_file_id.is_empty()
        || output_file_id.is_empty()
        || subject.contains(['\n', '\r'])
        || composition.contains(['\n', '\r'])
        || !is_sha256(source_sha256)
        || !is_sha256(output_sha256)
        || !is_sha256(output_prompt_sha256)
    {
        return Err(art_error(
            owner_id,
            "art_style_proof_record_mismatch",
            field,
            format!(
                "ArtStyle '{owner_id}' proof record does not bind the exact style, source, prompt, and output file"
            ),
        ));
    }
    Ok(VerifiedProofRecord {
        category: category.to_string(),
        subject: subject.to_string(),
        composition: composition.to_string(),
        source_medium: source_medium.to_string(),
        source_file_id: source_file_id.to_string(),
        source_sha256: source_sha256.to_string(),
        output_file_id: output_file_id.to_string(),
        output_sha256: output_sha256.to_string(),
        output_prompt_sha256: output_prompt_sha256.to_string(),
        provider_request_id: provider_request_id.to_string(),
    })
}

pub(super) fn verify_portability_report(
    owner_id: &str,
    fields: &Value,
    prompt: &str,
    proof_ids: &[String],
) -> Result<VerifiedPortabilityReport, VerificationError> {
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
    if text(&proof_manifest, "schema_version") != "3" {
        return Err(art_error(
            owner_id,
            "art_style_proof_manifest_invalid",
            "proof_shots_manifest",
            format!("ArtStyle '{owner_id}' proof-shot manifest must use schema v3"),
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
    let mut manifest_records: HashMap<String, ((String, String), VerifiedProofRecord)> =
        HashMap::new();
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
                "style_reference_used",
                "model",
                "generation_record",
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
            || manifest_records.contains_key(file_id)
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
        let record = generation_record(
            owner_id,
            item,
            "proof_shots_manifest",
            style_slug,
            prompt,
        )?;
        manifest_records.insert(file_id.to_string(), (model, record));
    }

    let mut tested_models = BTreeSet::new();
    let mut used_files = BTreeSet::new();
    let mut verified_records = Vec::new();
    let mut expected_source_matrix: Option<
        BTreeSet<(
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
                    "prompt",
                    "style_reference_used",
                    "content_preserved",
                    "source_medium_replaced",
                    "generation_record",
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
            if subject.is_empty()
                || composition.is_empty()
                || text(case, "mode") != "image_edit"
                || !PROOF_CATEGORIES.contains(&category)
                || !SOURCE_MEDIA.contains(&source_medium)
            {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_case_invalid",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability cases need a valid semantic role, subject, composition, source medium, and image-edit mode"
                    ),
                ));
            }
            categories.insert(category.to_string());
            source_media.insert(source_medium.to_string());
            let record = generation_record(
                owner_id,
                case,
                "portability_report",
                style_slug,
                prompt,
            )?;
            if manifest_records.get(file_id) != Some(&(model_key.clone(), record.clone())) {
                return Err(art_error(
                    owner_id,
                    "art_style_proof_record_mismatch",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' proof '{file_id}' generation record differs between its manifest and portability report"
                    ),
                ));
            }
            source_matrix.insert((
                record.category.clone(),
                record.subject.clone(),
                record.composition.clone(),
                record.source_medium.clone(),
                record.source_file_id.clone(),
                record.source_sha256.clone(),
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
            verified_records.push(record);
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

    if tested_models.len() != 2 || used_files.len() != 8 || verified_records.len() != 8 {
        return Err(art_error(
            owner_id,
            "art_style_portability_matrix_incomplete",
            "portability_report",
            format!(
                "ArtStyle '{owner_id}' needs two distinct image models by four roles and a score for every attached proof"
            ),
        ));
    }

    let presentation = proof_manifest
        .get("presentation")
        .filter(|value| value.is_object() && version_is_one(value))
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_presentation_missing",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' proof manifest needs a schema-v1 public presentation"
                ),
            )
        })?;
    let thumbnail_file_id = text(fields, "thumbnail_file_id");
    let hero_file_id = text(presentation, "hero_file_id");
    let presentation_items = presentation
        .get("items")
        .and_then(Value::as_array)
        .filter(|items| items.len() == PROOF_CATEGORIES.len())
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_presentation_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' public presentation needs exactly one manifestation per semantic role"
                ),
            )
        })?;
    if hero_file_id.is_empty() || hero_file_id != thumbnail_file_id {
        return Err(art_error(
            owner_id,
            "art_style_presentation_hero_invalid",
            "proof_shots_manifest",
            format!(
                "ArtStyle '{owner_id}' presentation hero must equal thumbnail_file_id"
            ),
        ));
    }
    let mut presentation_files = BTreeSet::new();
    let mut presentation_categories = BTreeSet::new();
    for item in presentation_items {
        if !exact_object_keys(item, &["file_id", "category", "selection_reason"]) {
            return Err(art_error(
                owner_id,
                "art_style_presentation_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' presentation items must contain only file_id, category, and selection_reason"
                ),
            ));
        }
        let file_id = text(item, "file_id");
        let category = text(item, "category");
        let selection_reason = text(item, "selection_reason");
        let Some((_, proof)) = manifest_records.get(file_id) else {
            return Err(art_error(
                owner_id,
                "art_style_presentation_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' public manifestation '{file_id}' is not a verified proof"
                ),
            ));
        };
        if proof.category != category
            || !PROOF_CATEGORIES.contains(&category)
            || selection_reason.split_whitespace().count() < 4
            || !presentation_files.insert(file_id)
            || !presentation_categories.insert(category)
        {
            return Err(art_error(
                owner_id,
                "art_style_presentation_invalid",
                "proof_shots_manifest",
                format!(
                    "ArtStyle '{owner_id}' public presentation has a mismatched/duplicate role, duplicate file, or non-substantive selection reason"
                ),
            ));
        }
    }
    if !presentation_files.contains(hero_file_id)
        || presentation_categories.len() != PROOF_CATEGORIES.len()
        || !PROOF_CATEGORIES
            .iter()
            .all(|category| presentation_categories.contains(category))
    {
        return Err(art_error(
            owner_id,
            "art_style_presentation_invalid",
            "proof_shots_manifest",
            format!(
                "ArtStyle '{owner_id}' presentation must cover all four roles and include its hero"
            ),
        ));
    }

    Ok(VerifiedPortabilityReport {
        report,
        proof_records: verified_records,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const STYLE_SLUG: &str = "archive-ember";
    const TEST_MODELS: [(&str, &str); 2] = [
        ("fal", "openai/gpt-image-2/edit"),
        ("other-provider", "independent-image-edit"),
    ];
    const PROMPT: &str = "Render the supplied subject as a two-ink relief print on fibrous matte paper. Use blunt carved contours and visibly broken edges. Reconstruct people, animals, objects, and environments as simplified interlocking carved masses with compressed proportions and deliberately omitted incidental anatomy. Build volume with sparse directional hatching and broad unprinted highlights. Reserve deep indigo for structural masses and vermilion for small focal accents. Keep a centered, compressed composition with generous bare paper. Add slight ink spread and irregular hand pressure. Avoid photorealistic skin, glossy surfaces, gradients, and smooth vector geometry.";

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

    fn proof_record(provider: &str, model: &str, index: usize, output_file_id: &str) -> Value {
        json!({
            "schema_version": "1",
            "kind": "art_style_proof",
            "style_slug": STYLE_SLUG,
            "source": {
                "file_id": format!("source-file-{index}"),
                "sha256": sha256_hex(&format!("source-bytes-{index}")),
            },
            "output": {
                "file_id": output_file_id,
                "sha256": sha256_hex(&format!("output-bytes-{provider}-{model}-{index}")),
                "prompt_sha256": sha256_hex(PROMPT),
                "provider_request_id": format!("request-{provider}-{model}-{index}"),
            }
        })
    }

    fn valid_fields() -> Value {
        let dims = json!({
            "medium_material": "two-ink relief print on fibrous matte paper",
            "marks_edges": "blunt carved contours and visibly broken edges",
            "depiction_grammar": "simplified interlocking carved masses with compressed proportions and deliberately omitted incidental anatomy",
            "tonal_shading": "sparse directional hatching and broad unprinted highlights",
            "color_roles": "deep indigo for structural masses and vermilion for small focal accents",
            "composition": "centered, compressed composition with generous bare paper",
            "signature_details": "slight ink spread and irregular hand pressure",
            "exclusions": "Avoid photorealistic skin, glossy surfaces, gradients, and smooth vector geometry"
        });
        let mut proof_ids = Vec::new();
        let mut proof_manifest = Vec::new();
        let mut models = Vec::new();
        for (provider, model) in TEST_MODELS {
            let mut cases = Vec::new();
            for index in 0..4 {
                let file_id = format!("proof-{provider}-{model}-{index}");
                let record = proof_record(provider, model, index, &file_id);
                proof_ids.push(file_id.clone());
                proof_manifest.push(json!({
                    "file_id": file_id.clone(),
                    "category": PROOF_CATEGORIES[index],
                    "subject": SUBJECTS[index],
                    "composition": COMPOSITIONS[index],
                    "source_medium": SOURCE_MEDIA[index],
                    "mode": "image_edit",
                    "style_reference_used": false,
                    "model": {"provider": provider, "model": model},
                    "generation_record": record.clone()
                }));
                cases.push(json!({
                    "file_id": file_id,
                    "category": PROOF_CATEGORIES[index],
                    "subject": SUBJECTS[index],
                    "composition": COMPOSITIONS[index],
                    "source_medium": SOURCE_MEDIA[index],
                    "mode": "image_edit",
                    "prompt": PROMPT,
                    "style_reference_used": false,
                    "content_preserved": true,
                    "source_medium_replaced": true,
                    "generation_record": record,
                    "scores": {
                        "medium_material": 2, "marks_edges": 2, "depiction_grammar": 2,
                        "tonal_shading": 1,
                        "color_roles": 2, "composition": 1, "signature_details": 2,
                        "exclusions": 1
                    }
                }));
            }
            models.push(json!({"provider": provider, "model": model, "cases": cases}));
        }
        json!({
            "name": "Archive Ember",
            "slug": STYLE_SLUG,
            "prompt_template": PROMPT,
            "model_provenance": {"style": {"provider": "openai", "model": "gpt-author"}},
            "credits": [{"name": "European relief print tradition", "kind": "tradition"}],
            "source_basis": {
                "schema_version": "1", "verdict": "pass", "all_named_people_checked": true,
                "no_living_artist_target": true, "tradition_level_description": true,
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
            "thumbnail_file_id": "proof-fal-openai/gpt-image-2/edit-0",
            "proof_shots_manifest": {
                "schema_version": "3",
                "items": proof_manifest,
                "presentation": {
                    "schema_version": "1",
                    "hero_file_id": "proof-fal-openai/gpt-image-2/edit-0",
                    "items": [
                        {
                            "file_id": "proof-fal-openai/gpt-image-2/edit-0",
                            "category": "human_portrait",
                            "selection_reason": "Carved facial planes remain immediately legible"
                        },
                        {
                            "file_id": "proof-fal-openai/gpt-image-2/edit-1",
                            "category": "nonhuman_living",
                            "selection_reason": "Feather structure exposes the broken carved edges"
                        },
                        {
                            "file_id": "proof-fal-openai/gpt-image-2/edit-2",
                            "category": "still_life_object",
                            "selection_reason": "Hard surfaces demonstrate the compressed tonal masses"
                        },
                        {
                            "file_id": "proof-fal-openai/gpt-image-2/edit-3",
                            "category": "landscape_environment",
                            "selection_reason": "Layered depth shows the limited ink separation"
                        }
                    ]
                }
            },
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
        assert!(verify_portability_report("as-1", &fields, prompt, &proof_ids).is_ok());
    }

    #[test]
    fn public_presentation_is_required_and_must_bind_the_thumbnail() {
        let mut fields = valid_fields();
        fields["proof_shots_manifest"]
            .as_object_mut()
            .unwrap()
            .remove("presentation");
        let prompt = text(&fields, "prompt_template").to_string();
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err =
            verify_portability_report("as-1", &fields, &prompt, &proof_ids).unwrap_err();
        assert_eq!(err.code, "art_style_presentation_missing");

        let mut fields = valid_fields();
        fields["thumbnail_file_id"] = json!("proof-fal-openai/gpt-image-2/edit-1");
        let prompt = text(&fields, "prompt_template").to_string();
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        let err =
            verify_portability_report("as-1", &fields, &prompt, &proof_ids).unwrap_err();
        assert_eq!(err.code, "art_style_presentation_hero_invalid");
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
    fn source_review_must_reject_a_living_artist_target() {
        let mut fields = valid_fields();
        fields["source_basis"]["no_living_artist_target"] = json!(false);
        let prompt = text(&fields, "prompt_template");
        let err = verify_source_basis("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_source_basis_invalid");
    }

    #[test]
    fn source_review_must_be_independent_from_prompt_author() {
        let mut fields = valid_fields();
        fields["source_basis"]["reviewer"] = fields["model_provenance"]["style"].clone();
        let prompt = text(&fields, "prompt_template");
        let err = verify_source_basis("as-1", &fields, prompt).unwrap_err();
        assert_eq!(err.code, "art_style_source_review_not_independent");
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
            "depiction_grammar": "compressed proportions and deliberately omitted incidental anatomy",
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_dimension_failed");
    }

    #[test]
    fn every_case_must_fully_apply_depiction_grammar() {
        let mut fields = valid_fields();
        fields["portability_report"]["models"][0]["cases"][0]["scores"]
            ["depiction_grammar"] = json!(1);
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_depiction_grammar_weak");
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_case_invalid");
    }

    #[test]
    fn manifest_and_report_generation_records_must_match() {
        let mut fields = valid_fields();
        fields["proof_shots_manifest"]["items"][0]["generation_record"]["output"]
            ["provider_request_id"] = json!("different-request");
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_proof_record_mismatch");
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_case_invalid");
    }

    #[test]
    fn both_models_must_receive_the_identical_four_sources() {
        let mut fields = valid_fields();
        let manifest_index = 4;
        let mut record =
            fields["proof_shots_manifest"]["items"][manifest_index]["generation_record"].clone();
        record["source"]["file_id"] = json!("different-generated-source");
        record["source"]["sha256"] = json!(sha256_hex("different-source-bytes"));
        fields["proof_shots_manifest"]["items"][manifest_index]["generation_record"] =
            record.clone();
        fields["portability_report"]["models"][1]["cases"][0]["generation_record"] = record;
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_matrix_mismatch");
    }

    #[test]
    fn every_model_needs_all_four_roles_and_all_four_media() {
        let mut fields = valid_fields();
        fields["proof_shots_manifest"]["items"][1]["category"] = json!(PROOF_CATEGORIES[0]);
        fields["portability_report"]["models"][0]["cases"][1]["category"] =
            json!(PROOF_CATEGORIES[0]);
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
        )
        .unwrap_err();
        assert_eq!(err.code, "art_style_portability_model_below_threshold");
    }

    #[test]
    fn models_are_not_hardcoded_to_one_provider() {
        let mut fields = valid_fields();
        fields["portability_report"]["models"][1]["provider"] = json!("second-provider");
        fields["proof_shots_manifest"]["items"][4]["model"]["provider"] =
            json!("second-provider");
        fields["proof_shots_manifest"]["items"][5]["model"]["provider"] =
            json!("second-provider");
        fields["proof_shots_manifest"]["items"][6]["model"]["provider"] =
            json!("second-provider");
        fields["proof_shots_manifest"]["items"][7]["model"]["provider"] =
            json!("second-provider");
        let proof_ids = fields["proof_ids"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_string)
            .collect::<Vec<_>>();
        assert!(
            verify_portability_report(
                "as-1",
                &fields,
                text(&fields, "prompt_template"),
                &proof_ids,
            )
            .is_ok()
        );
    }
}
