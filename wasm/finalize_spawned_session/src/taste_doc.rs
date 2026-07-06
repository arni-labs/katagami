// Canonical taste-document builders for the four Katagami lanes — the Rust port
// of ui/src/lib/embeddings.ts (buildEmbeddingDocument / buildPaletteEmbeddingDocument
// / buildArtStyleEmbeddingDocument / buildWritingStyleEmbeddingDocument). The
// finalizer builds a document from a just-published entity's fields, POSTs it to
// the taste embed service, and stores the returned vector via AttachTasteVector.
//
// These MUST match the TypeScript builders byte-for-byte on the same inputs: the
// backfill (ui/scripts/backfill-taste-vectors.mjs) sends raw fields to the same
// embed service, so a Rust doc that diverges from the TS doc would put
// finalizer- and backfill-computed vectors in different spaces. The shared
// contract vectors live in ui/scripts/taste-doc.test.mjs (run against the real
// TS builders) and in this module's `tests` — keep both in lockstep, exactly as
// facets.mjs / facets.test.mjs / facets.rs do for the gallery facets.
//
// Fields arrive as stored: subfields like tags/tokens/mood/signature/neutrals are
// JSON strings (the OData shape). `parse_json_flex` mirrors the TS `parseJson`
// helper — parse a string, pass a native array/object through, null otherwise.
use serde_json::Value;

/// The single embedding space every stored taste_vector must belong to. Mirrors
/// the TS constants; used to sanity-check the embed service response.
pub const TASTE_EMBEDDING_MODEL: &str = "Xenova/all-MiniLM-L6-v2";
pub const TASTE_EMBEDDING_DIM: usize = 384;

/// Mirror of the TS `parseJson`: a JSON string is parsed (null on failure), an
/// already-native array/object passes through, anything else is null.
fn parse_json_flex(value: Option<&Value>) -> Value {
    match value {
        Some(Value::String(s)) => serde_json::from_str(s).unwrap_or(Value::Null),
        Some(other) => other.clone(),
        None => Value::Null,
    }
}

fn non_empty_str<'a>(fields: &'a Value, key: &str) -> Option<&'a str> {
    fields
        .get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
}

/// Parsed `tags`, with the internal "specimen" tag dropped (it is a pipeline
/// marker, not a quality). Non-string elements are ignored.
fn tags(fields: &Value) -> Vec<String> {
    parse_json_flex(fields.get("tags"))
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|t| t.as_str())
                .filter(|t| *t != "specimen")
                .map(String::from)
                .collect()
        })
        .unwrap_or_default()
}

/// Trimmed, non-empty string elements of a JSON array (drops non-strings and
/// whitespace-only entries). Mirrors the TS `clean` helper.
fn trimmed_strings(value: &Value) -> Vec<String> {
    value
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect()
        })
        .unwrap_or_default()
}

/// Canonical text a design language is embedded from (taste-doc-v1).
pub fn build_language_doc(fields: &Value) -> String {
    let mut lines: Vec<String> = Vec::new();
    if let Some(name) = non_empty_str(fields, "name") {
        lines.push(format!("design language: {name}"));
    }
    let tags = tags(fields);
    if !tags.is_empty() {
        lines.push(format!("movements and qualities: {}", tags.join(", ")));
    }
    let philosophy = parse_json_flex(fields.get("philosophy"));
    let summary = philosophy.get("summary").and_then(|v| v.as_str()).unwrap_or("");
    if !summary.is_empty() {
        lines.push(summary.trim().to_string());
    }
    let tokens = parse_json_flex(fields.get("tokens"));
    let typography = tokens.get("typography");
    let heading = typography
        .and_then(|t| t.get("heading_font"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let body = typography
        .and_then(|t| t.get("body_font"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let mut type_bits: Vec<String> = Vec::new();
    if !heading.is_empty() {
        type_bits.push(format!("headings in {heading}"));
    }
    if !body.is_empty() {
        type_bits.push(format!("body in {body}"));
    }
    if !type_bits.is_empty() {
        lines.push(format!("typography: {}", type_bits.join(", ")));
    }
    let colors = tokens.get("colors");
    let palette: Vec<String> = ["primary", "secondary", "accent", "background", "text"]
        .iter()
        .filter_map(|role| {
            colors
                .and_then(|c| c.get(role))
                .and_then(|v| v.as_str())
                .filter(|hex| !hex.is_empty())
                .map(|hex| format!("{role} {hex}"))
        })
        .collect();
    if !palette.is_empty() {
        lines.push(format!("palette: {}", palette.join(", ")));
    }
    lines.join("\n")
}

/// Canonical text a palette system is embedded from (taste-doc-v1).
///
/// Signature entries are read raw (as the embed service does for the backfill):
/// a string swatch is used as-is, an object swatch becomes "name hex" (each part
/// dropped when empty). A non-array `signature` (e.g. the named-color object
/// shape) yields no signature line — the TS embed service throws on that shape
/// and stores nothing, so there is no vector to be incomparable with.
pub fn build_palette_doc(fields: &Value) -> String {
    let mut lines: Vec<String> = Vec::new();
    if let Some(name) = non_empty_str(fields, "name") {
        lines.push(format!("palette system: {name}"));
    }
    let tags = tags(fields);
    if !tags.is_empty() {
        lines.push(format!("qualities: {}", tags.join(", ")));
    }
    let mood = parse_json_flex(fields.get("mood"));
    let summary = mood.get("summary").and_then(|v| v.as_str()).unwrap_or("");
    if !summary.is_empty() {
        lines.push(summary.trim().to_string());
    }
    let mood_bits: Vec<&str> = ["temperature", "key_hue"]
        .iter()
        .filter_map(|k| mood.get(k).and_then(|v| v.as_str()))
        .filter(|s| !s.is_empty())
        .collect();
    if !mood_bits.is_empty() {
        lines.push(format!("mood: {}", mood_bits.join(", ")));
    }
    let signature: Vec<String> = parse_json_flex(fields.get("signature"))
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|s| {
                    if let Some(text) = s.as_str() {
                        (!text.is_empty()).then(|| text.to_string())
                    } else if s.is_object() {
                        let bits: Vec<&str> = ["name", "hex"]
                            .iter()
                            .filter_map(|k| s.get(k).and_then(|v| v.as_str()))
                            .filter(|v| !v.is_empty())
                            .collect();
                        (!bits.is_empty()).then(|| bits.join(" "))
                    } else {
                        None
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    if !signature.is_empty() {
        lines.push(format!("signature colors: {}", signature.join(", ")));
    }
    let neutrals: Vec<String> = parse_json_flex(fields.get("neutrals"))
        .as_object()
        .map(|obj| {
            obj.iter()
                // Drop non-string/empty values instead of coercing to "role " —
                // the TS builder does the same, and the docs must stay identical.
                .filter_map(|(role, hex)| {
                    hex.as_str()
                        .filter(|v| !v.is_empty())
                        .map(|v| format!("{role} {v}"))
                })
                .collect()
        })
        .unwrap_or_default();
    if !neutrals.is_empty() {
        lines.push(format!("neutrals: {}", neutrals.join(", ")));
    }
    lines.join("\n")
}

/// Canonical text an art style is embedded from (taste-doc-v1).
pub fn build_art_style_doc(fields: &Value) -> String {
    let mut lines: Vec<String> = Vec::new();
    if let Some(name) = non_empty_str(fields, "name") {
        lines.push(format!("art style: {name}"));
    }
    let tags = tags(fields);
    if !tags.is_empty() {
        lines.push(format!("qualities: {}", tags.join(", ")));
    }
    if let Some(medium) = non_empty_str(fields, "medium") {
        lines.push(format!("medium: {medium}"));
    }
    let prompt = fields.get("prompt_template").and_then(|v| v.as_str()).unwrap_or("");
    if !prompt.is_empty() {
        lines.push(format!("recipe: {}", prompt.trim()));
    }
    lines.join("\n")
}

/// Canonical text a writing style is embedded from (taste-doc-v1). Built from the
/// text-bearing voice layer (persona, refusals, moves, per-channel register,
/// use/ban vocabulary); tone_scales is excluded (numeric, low embedding signal).
/// `register` iterates in object insertion order — matched to the TS builder by
/// serde_json's preserve_order feature.
pub fn build_writing_style_doc(fields: &Value) -> String {
    let mut lines: Vec<String> = Vec::new();
    if let Some(name) = non_empty_str(fields, "name") {
        lines.push(format!("writing style: {name}"));
    }
    let tags = tags(fields);
    if !tags.is_empty() {
        lines.push(format!("qualities: {}", tags.join(", ")));
    }
    let persona = fields.get("persona").and_then(|v| v.as_str()).unwrap_or("");
    if !persona.is_empty() {
        lines.push(format!("persona: {}", persona.trim()));
    }
    let refusals = trimmed_strings(&parse_json_flex(fields.get("refusals")));
    if !refusals.is_empty() {
        lines.push(format!("refusals: {}", refusals.join("; ")));
    }
    let moves = trimmed_strings(&parse_json_flex(fields.get("moves")));
    if !moves.is_empty() {
        lines.push(format!("moves: {}", moves.join("; ")));
    }
    let register: Vec<String> = parse_json_flex(fields.get("register"))
        .as_object()
        .map(|obj| {
            obj.iter()
                .filter_map(|(channel, v)| {
                    v.as_str()
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                        .map(|s| format!("{channel}: {s}"))
                })
                .collect()
        })
        .unwrap_or_default();
    if !register.is_empty() {
        lines.push(format!("register: {}", register.join("; ")));
    }
    let vocabulary = parse_json_flex(fields.get("vocabulary"));
    let use_words = trimmed_strings(vocabulary.get("use").unwrap_or(&Value::Null));
    if !use_words.is_empty() {
        lines.push(format!("prefers: {}", use_words.join(", ")));
    }
    let ban_words = trimmed_strings(vocabulary.get("ban").unwrap_or(&Value::Null));
    if !ban_words.is_empty() {
        lines.push(format!("avoids: {}", ban_words.join(", ")));
    }
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // Shared contract vectors — identical fixtures + expected documents to
    // ui/scripts/taste-doc.test.mjs (which runs the real TS builders). Subfields
    // are JSON strings, the shape the finalizer actually receives from OData.

    #[test]
    fn language_docs() {
        let full = json!({
            "name": "Cadence",
            "tags": r#"["Editorial","Grid","specimen"]"#,
            "philosophy": r#"{"summary":"  A Bold System.  "}"#,
            "tokens": json!({
                "typography": {"heading_font": "GT Sectra", "body_font": "Inter"},
                "colors": {"primary": "#ff0000", "secondary": "#00ff00", "accent": "#0000ff", "background": "#ffffff", "text": "#111111"}
            }).to_string(),
        });
        assert_eq!(
            build_language_doc(&full),
            "design language: Cadence\n\
             movements and qualities: Editorial, Grid\n\
             A Bold System.\n\
             typography: headings in GT Sectra, body in Inter\n\
             palette: primary #ff0000, secondary #00ff00, accent #0000ff, background #ffffff, text #111111"
        );

        let minimal = json!({ "name": "Solo" });
        assert_eq!(build_language_doc(&minimal), "design language: Solo");

        let partial = json!({
            "name": "Warm",
            "tags": r#"["warm"]"#,
            "tokens": json!({
                "typography": {"heading_font": "Times"},
                "colors": {"accent": "#0000ff", "text": "#000000"}
            }).to_string(),
        });
        assert_eq!(
            build_language_doc(&partial),
            "design language: Warm\n\
             movements and qualities: warm\n\
             typography: headings in Times\n\
             palette: accent #0000ff, text #000000"
        );
    }

    #[test]
    fn palette_malformed_neutrals_are_dropped() {
        // Contract vector shared with taste-doc.test.mjs: empty-string and
        // non-string neutral values are dropped, not coerced to "role ".
        let fields = json!({
            "name": "Patchy",
            "neutrals": json!({"bg": "", "ink": "#000000", "paper": 7}).to_string(),
        });
        assert_eq!(
            build_palette_doc(&fields),
            "palette system: Patchy\nneutrals: ink #000000"
        );
    }

    #[test]
    fn palette_docs() {
        // Hex values contain the `"#` sequence, which closes an `r#"…"#` raw
        // string early — so JSON subfields are built via json!().to_string().
        let full = json!({
            "name": "Ember",
            "tags": json!(["warm", "specimen"]).to_string(),
            "mood": json!({"temperature": "warm", "key_hue": "red", "summary": "  Cozy heat  "}).to_string(),
            "signature": json!([{"name": "Coral", "hex": "#ff5a3c"}, {"hex": "#ffb703"}, "#123456"]).to_string(),
            "neutrals": json!({"background": "#ffffff", "ink": "#0a0a0a"}).to_string(),
        });
        assert_eq!(
            build_palette_doc(&full),
            "palette system: Ember\n\
             qualities: warm\n\
             Cozy heat\n\
             mood: warm, red\n\
             signature colors: Coral #ff5a3c, #ffb703, #123456\n\
             neutrals: background #ffffff, ink #0a0a0a"
        );

        let no_mood_summary = json!({
            "name": "Cool",
            "mood": json!({"temperature": "cool"}).to_string(),
            "signature": json!([{"name": "Sky", "hex": "#0ea5e9"}]).to_string(),
            "neutrals": "{}",
        });
        assert_eq!(
            build_palette_doc(&no_mood_summary),
            "palette system: Cool\n\
             mood: cool\n\
             signature colors: Sky #0ea5e9"
        );

        let no_signature = json!({
            "name": "Bare",
            "tags": "[]",
            "mood": "{}",
            "signature": "[]",
            "neutrals": json!({"muted": "#eeeeee"}).to_string(),
        });
        assert_eq!(
            build_palette_doc(&no_signature),
            "palette system: Bare\nneutrals: muted #eeeeee"
        );
    }

    #[test]
    fn palette_object_signature_degrades_without_panicking() {
        // The named-color object shape: the TS embed service throws on it (stores
        // nothing); the finalizer must not panic — it simply emits no signature
        // line, so the rest of the document (and its vector) still lands.
        let object_sig = json!({
            "name": "Named",
            "signature": json!({"primary": {"name": "P", "hex": "#111111"}, "accent": {"hex": "#222222"}}).to_string(),
            "neutrals": json!({"bg": "#ffffff"}).to_string(),
        });
        assert_eq!(
            build_palette_doc(&object_sig),
            "palette system: Named\nneutrals: bg #ffffff"
        );
    }

    #[test]
    fn art_style_docs() {
        let full = json!({
            "name": "Risograph Ember",
            "tags": r#"["riso","print","specimen"]"#,
            "medium": "risograph",
            "prompt_template": "  two-color riso print, coarse grain  ",
        });
        assert_eq!(
            build_art_style_doc(&full),
            "art style: Risograph Ember\n\
             qualities: riso, print\n\
             medium: risograph\n\
             recipe: two-color riso print, coarse grain"
        );

        let minimal = json!({ "name": "Ink" });
        assert_eq!(build_art_style_doc(&minimal), "art style: Ink");

        let no_prompt = json!({ "name": "Wash", "tags": r#"["ink"]"#, "medium": "watercolor" });
        assert_eq!(
            build_art_style_doc(&no_prompt),
            "art style: Wash\nqualities: ink\nmedium: watercolor"
        );
    }

    #[test]
    fn writing_style_docs() {
        let full = json!({
            "name": "Marlowe",
            "tags": r#"["noir","terse","specimen"]"#,
            "persona": "  A hard-boiled detective voice.  ",
            "refusals": r#"["  never use emoji  ","no exclamation points","  "]"#,
            "moves": r#"["opens cold","  argues in short bursts  "]"#,
            "register": r#"{"email":"  clipped and dry  ","chat":"wry","memo":42}"#,
            "vocabulary": r#"{"use":["gumshoe","  dame  "],"ban":["synergy","  "]}"#,
        });
        assert_eq!(
            build_writing_style_doc(&full),
            "writing style: Marlowe\n\
             qualities: noir, terse\n\
             persona: A hard-boiled detective voice.\n\
             refusals: never use emoji; no exclamation points\n\
             moves: opens cold; argues in short bursts\n\
             register: email: clipped and dry; chat: wry\n\
             prefers: gumshoe, dame\n\
             avoids: synergy"
        );

        let minimal = json!({ "name": "Quill" });
        assert_eq!(build_writing_style_doc(&minimal), "writing style: Quill");

        let no_persona = json!({
            "name": "Terse",
            "tags": r#"["short"]"#,
            "refusals": r#"["no filler"]"#,
            "vocabulary": r#"{"ban":["very"]}"#,
        });
        assert_eq!(
            build_writing_style_doc(&no_persona),
            "writing style: Terse\nqualities: short\nrefusals: no filler\navoids: very"
        );
    }

    #[test]
    fn native_and_string_subfields_are_equivalent() {
        // parse_json_flex must treat a native array/object identically to its
        // JSON-string form (the OData backend returns either shape).
        let string_shape = json!({ "name": "X", "tags": r#"["a","b"]"# });
        let native_shape = json!({ "name": "X", "tags": ["a", "b"] });
        assert_eq!(
            build_language_doc(&string_shape),
            build_language_doc(&native_shape)
        );
    }
}
