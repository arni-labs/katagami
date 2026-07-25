use serde_json::Value;
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
        || !bool_field(&review, "model_agnostic")
        || !bool_field(&review, "style_name_independent")
    {
        return Err(art_error(
            owner_id,
            "art_style_prompt_review_invalid",
            "prompt_review",
            format!(
                "ArtStyle '{owner_id}' prompt_review must attest the exact prompt as reference-, subject-, model-, and catalog-name-independent"
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
        let Some(start) = normalized_prompt.find(&normalized_evidence) else {
            return Err(art_error(
                owner_id,
                "art_style_prompt_dimension_unproven",
                "prompt_review",
                format!(
                    "ArtStyle '{owner_id}' prompt review does not quote prompt evidence for '{dimension}'"
                ),
            ));
        };
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
        evidence_spans.push((start, end, dimension));
        evidence_phrases.push((normalized_evidence, dimension));
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
        total += score;
    }
    Ok(total / DIMENSIONS.len() as f64)
}

pub(super) fn verify_portability_report(
    owner_id: &str,
    fields: &Value,
    prompt: &str,
    proof_ids: &[String],
) -> Result<Value, VerificationError> {
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
        .filter(|items| items.len() >= 2)
        .ok_or_else(|| {
            art_error(
                owner_id,
                "art_style_portability_models_missing",
                "portability_report",
                format!("ArtStyle '{owner_id}' portability report needs at least two image models"),
            )
        })?;

    let proof_set: BTreeSet<&str> = proof_ids.iter().map(String::as_str).collect();
    let mut tested_models = BTreeSet::new();
    let mut source_media = BTreeSet::new();
    let mut used_files = BTreeSet::new();
    let mut edit_models = 0usize;
    let mut expected_edit_matrix: Option<BTreeSet<(String, String)>> = None;
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
        tested_models.insert(model_key);
        let cases = model
            .get("cases")
            .and_then(Value::as_array)
            .filter(|items| items.len() >= 3)
            .ok_or_else(|| {
                art_error(
                    owner_id,
                    "art_style_portability_cases_missing",
                    "portability_report",
                    format!("ArtStyle '{owner_id}' needs at least three cases per image model"),
                )
            })?;
        let mut subjects = BTreeSet::new();
        let mut edit_matrix = BTreeSet::new();
        let mut model_total = 0.0;
        let mut has_edit = false;
        for case in cases {
            if text(case, "prompt") != prompt.trim() || bool_field(case, "style_reference_used") {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_prompt_changed",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability cases must use the exact canonical prompt and no style reference"
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
            let seed = text(case, "seed");
            let mode = text(case, "mode");
            if subject.is_empty()
                || seed.is_empty()
                || !matches!(mode, "text_to_image" | "image_edit")
            {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_case_invalid",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' portability cases need subject, seed, and a valid mode"
                    ),
                ));
            }
            subjects.insert(normalized_words(subject));
            if mode == "image_edit" {
                has_edit = true;
                let medium = normalized_words(text(case, "source_medium"));
                if medium.is_empty() || medium == "none" {
                    return Err(art_error(
                        owner_id,
                        "art_style_portability_source_medium_missing",
                        "portability_report",
                        format!(
                            "ArtStyle '{owner_id}' image-edit case is missing its source medium"
                        ),
                    ));
                }
                source_media.insert(medium.clone());
                edit_matrix.insert((normalized_words(subject), medium));
            }
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
        }
        if subjects.len() < 3 || model_total / (cases.len() as f64) < 1.5 {
            return Err(art_error(
                owner_id,
                "art_style_portability_model_below_threshold",
                "portability_report",
                format!("ArtStyle '{owner_id}' failed the per-model subject/score threshold"),
            ));
        }
        if has_edit {
            if edit_matrix.len() < 3 {
                return Err(art_error(
                    owner_id,
                    "art_style_portability_edit_matrix_incomplete",
                    "portability_report",
                    format!(
                        "ArtStyle '{owner_id}' needs three distinct subject/source-medium edits on every image model"
                    ),
                ));
            }
            if let Some(expected) = &expected_edit_matrix {
                if expected != &edit_matrix {
                    return Err(art_error(
                        owner_id,
                        "art_style_portability_matrix_mismatch",
                        "portability_report",
                        format!(
                            "ArtStyle '{owner_id}' must test the same subject/source-medium edit matrix on every image model"
                        ),
                    ));
                }
            } else {
                expected_edit_matrix = Some(edit_matrix);
            }
            edit_models += 1;
        }
    }

    if tested_models.len() < 2
        || edit_models < 2
        || source_media.len() < 3
        || used_files.len() != proof_set.len()
    {
        return Err(art_error(
            owner_id,
            "art_style_portability_matrix_incomplete",
            "portability_report",
            format!(
                "ArtStyle '{owner_id}' needs two distinct edit-capable models, at least three source media, and a score for every attached proof"
            ),
        ));
    }
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_fields() -> Value {
        let prompt = "Render the supplied subject as a two-ink relief print on fibrous matte paper. Use blunt carved contours and visibly broken edges. Build volume with sparse directional hatching and broad unprinted highlights. Reserve deep indigo for structural masses and vermilion for small focal accents. Keep a centered, compressed composition with generous bare paper. Add slight ink spread and irregular hand pressure. Avoid photorealistic skin, glossy surfaces, gradients, and smooth vector geometry.";
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
        let mut models = Vec::new();
        for (provider, model) in [("fal", "flux-kontext"), ("google", "gemini-image")] {
            let mut cases = Vec::new();
            for (index, medium) in ["watercolor", "photograph", "line drawing"]
                .iter()
                .enumerate()
            {
                let file_id = format!("{model}-{index}");
                proof_ids.push(file_id.clone());
                cases.push(json!({
                    "file_id": file_id,
                    "subject": format!("subject {index}"),
                    "source_medium": medium,
                    "mode": "image_edit",
                    "seed": format!("{index}"),
                    "prompt": prompt,
                    "style_reference_used": false,
                    "scores": {
                        "medium_material": 2, "marks_edges": 2, "tonal_shading": 1,
                        "color_roles": 2, "composition": 1, "signature_details": 2,
                        "exclusions": 1
                    }
                }));
            }
            models.push(json!({"provider": provider, "model": model, "cases": cases}));
        }
        json!({
            "name": "Archive Ember",
            "prompt_template": prompt,
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
                "schema_version": "1", "verdict": "pass", "prompt": prompt,
                "reviewer": {"provider": "anthropic", "model": "reviewer"},
                "reference_independent": true, "subject_independent": true,
                "model_agnostic": true, "style_name_independent": true,
                "contradictions": [], "revision_count": 1,
                "observable_dimensions": dims
            },
            "portability_report": {
                "schema_version": "1", "verdict": "pass", "prompt": prompt,
                "blind_evaluation": true,
                "evaluator": {"provider": "openai", "model": "vision-reviewer"},
                "models": models
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
    fn every_attached_proof_must_be_scored() {
        let mut fields = valid_fields();
        fields["proof_ids"]
            .as_array_mut()
            .unwrap()
            .push(json!("unscored-proof"));
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
    fn models_must_run_the_same_edit_matrix() {
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
        assert_eq!(err.code, "art_style_portability_matrix_mismatch");
    }
}
