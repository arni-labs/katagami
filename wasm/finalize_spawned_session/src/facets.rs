// Facet derivations for the design-language gallery, in lockstep with the JS
// backfill (ui/scripts/facets.mjs). Pure functions so pipeline + backfill produce
// identical stored scalars. The finalizer computes these at publish and hands
// them to Temper via AttachComputedFacets (Temper governs the write).
use serde_json::Value;
use std::collections::HashMap;

/// HSL hue bucket of the primary token color. Normalized: only 3- or 6-digit hex
/// are real colors; anything else (malformed/alpha/missing/grayscale/low-sat) →
/// "neutral". One of neutral|red|orange|yellow|green|teal|blue|violet|pink.
pub fn hue_bucket(tokens_str: &str) -> String {
    let tokens: Value = serde_json::from_str(tokens_str).unwrap_or(Value::Null);
    let hex = tokens
        .get("colors")
        .and_then(|c| c.get("primary").or_else(|| c.get("accent")))
        .and_then(|v| v.as_str());
    let hex = match hex {
        Some(h) => h,
        None => return "neutral".into(),
    };
    let m = hex.trim_start_matches('#').to_lowercase();
    if !m.chars().all(|c| c.is_ascii_hexdigit()) || (m.len() != 3 && m.len() != 6) {
        return "neutral".into();
    }
    let v: Vec<f64> = if m.len() == 3 {
        m.chars()
            .map(|c| i64::from_str_radix(&format!("{c}{c}"), 16).unwrap_or(0) as f64 / 255.0)
            .collect()
    } else {
        [0usize, 2, 4]
            .iter()
            .map(|&i| i64::from_str_radix(&m[i..i + 2], 16).unwrap_or(0) as f64 / 255.0)
            .collect()
    };
    let (r, g, b) = (v[0], v[1], v[2]);
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    if max == min {
        return "neutral".into();
    }
    let l = (max + min) / 2.0;
    let d = max - min;
    let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
    if s < 0.14 {
        return "neutral".into();
    }
    let h = if max == r {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) * 60.0
    } else if max == g {
        ((b - r) / d + 2.0) * 60.0
    } else {
        ((r - g) / d + 4.0) * 60.0
    };
    if h >= 345.0 || h < 15.0 {
        "red"
    } else if h < 45.0 {
        "orange"
    } else if h < 75.0 {
        "yellow"
    } else if h < 160.0 {
        "green"
    } else if h < 200.0 {
        "teal"
    } else if h < 260.0 {
        "blue"
    } else if h < 300.0 {
        "violet"
    } else {
        "pink"
    }
    .to_string()
}

/// Lowercased search text: name + tags + philosophy summary, whitespace-collapsed.
pub fn search_blob(fields: &Value) -> String {
    let mut parts: Vec<String> = Vec::new();
    if let Some(name) = fields.get("name").and_then(|v| v.as_str()) {
        parts.push(name.to_string());
    }
    if let Some(tags) = fields
        .get("tags")
        .and_then(|v| v.as_str())
        .and_then(|s| serde_json::from_str::<Vec<Value>>(s).ok())
    {
        for t in tags {
            if let Some(s) = t.as_str() {
                parts.push(s.to_string());
            }
        }
    }
    if let Some(summary) = fields
        .get("philosophy")
        .and_then(|v| v.as_str())
        .and_then(|s| serde_json::from_str::<Value>(s).ok())
        .as_ref()
        .and_then(|p| p.get("summary").and_then(|v| v.as_str()).map(String::from))
    {
        parts.push(summary);
    }
    parts.join(" ").to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Root taxonomy family: first taxonomy id present in the tree, walked up
/// parent_id to its highest present ancestor. "" for orphans / no taxonomy.
pub fn family_id(taxonomy_ids_str: &str, tax_parents: &HashMap<String, String>) -> String {
    let ids: Vec<Value> = serde_json::from_str(taxonomy_ids_str).unwrap_or_default();
    let leaf = ids
        .iter()
        .filter_map(|v| v.as_str())
        .find(|id| tax_parents.contains_key(*id));
    let mut cur = match leaf {
        Some(l) => l.to_string(),
        None => return String::new(),
    };
    for _ in 0..64 {
        match tax_parents.get(&cur) {
            Some(parent) if !parent.is_empty() && tax_parents.contains_key(parent) => {
                cur = parent.clone();
            }
            _ => break,
        }
    }
    cur
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn tokens(hex: &str) -> String {
        json!({ "colors": { "primary": hex } }).to_string()
    }

    #[test]
    fn hue_buckets() {
        assert_eq!(hue_bucket(&tokens("#ff0000")), "red");
        assert_eq!(hue_bucket(&tokens("#00ff00")), "green");
        assert_eq!(hue_bucket(&tokens("#0000ff")), "blue");
        assert_eq!(hue_bucket(&tokens("#00ced1")), "teal");
        assert_eq!(hue_bucket(&tokens("#8a2be2")), "violet");
        assert_eq!(hue_bucket(&tokens("#ff69b4")), "pink");
        assert_eq!(hue_bucket(&tokens("#888888")), "neutral");
        assert_eq!(hue_bucket(&tokens("#fff")), "neutral");
        assert_eq!(hue_bucket(&tokens("#f00")), "red");
        assert_eq!(hue_bucket(&json!({"colors":{"accent":"#0000ff"}}).to_string()), "blue");
        assert_eq!(hue_bucket("not json"), "neutral");
        assert_eq!(hue_bucket(&tokens("#ff000")), "neutral"); // 5-digit → neutral
        assert_eq!(hue_bucket(&tokens("#ff0000aa")), "neutral"); // 8-digit → neutral
        assert_eq!(hue_bucket(&tokens("rgb(255,0,0)")), "neutral");
    }

    #[test]
    fn search_blobs() {
        let f = json!({ "name": "Cadence", "tags": "[\"Editorial\",\"Grid\"]", "philosophy": "{\"summary\":\"A Bold System\"}" });
        assert_eq!(search_blob(&f), "cadence editorial grid a bold system");
        let g = json!({ "name": "X", "tags": "[]" });
        assert_eq!(search_blob(&g), "x");
    }

    #[test]
    fn families() {
        let mut m = HashMap::new();
        m.insert("leaf".into(), "mid".to_string());
        m.insert("mid".into(), "root".to_string());
        m.insert("root".into(), "".to_string());
        m.insert("orphan".into(), "ghost".to_string());
        assert_eq!(family_id("[\"leaf\"]", &m), "root");
        assert_eq!(family_id("[\"mid\"]", &m), "root");
        assert_eq!(family_id("[\"root\"]", &m), "root");
        assert_eq!(family_id("[\"orphan\"]", &m), "orphan");
        assert_eq!(family_id("[\"unknown\",\"leaf\"]", &m), "root");
        assert_eq!(family_id("[]", &m), "");
    }
}
