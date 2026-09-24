//! Two checks that a language's tokens say one thing everywhere they are read.
//!
//! On 2026-09-24, 7 of 301 Published languages had token values that leaned on
//! a variable no token defines (Bisque's shadows are `var(--hi)`, which exists
//! only inside its own reference page), so every export dropped them. And 27
//! had a DESIGN.md whose colours contradicted the tokens under the same name
//! (Shizuku's DESIGN.md `accent` is mint, its `accent` token is lychee pink;
//! Bluet's DESIGN.md is a different palette altogether). The native tokens are
//! the source of truth and DESIGN.md is their portable export, so both are
//! caught here, before a language can be submitted.

use regex_lite::Regex;
use serde_json::Value;

const GROUPS: [(&str, &str); 5] = [
    ("colors", "color"),
    ("radii", "radius"),
    ("spacing", "space"),
    ("shadows", "shadow"),
    ("motion", "motion"),
];

/// One naming for token keys: `accent_2`, `accent 2` and `Accent2` agree.
fn token_name(key: &str) -> String {
    let mut out = String::new();
    let mut prev_lower = false;
    for c in key.trim().chars() {
        if c.is_ascii_uppercase() && prev_lower {
            out.push('-');
        }
        prev_lower = c.is_ascii_lowercase() || c.is_ascii_digit();
        out.push(if c == '_' || c == ' ' { '-' } else { c.to_ascii_lowercase() });
    }
    out
}

fn string_values(value: &Value) -> Vec<String> {
    match value {
        Value::String(s) => vec![s.clone()],
        Value::Array(items) => items.iter().filter_map(|v| v.as_str().map(str::to_string)).collect(),
        _ => Vec::new(),
    }
}

/// Every `var(--x)` without a fallback in a token value must name a token:
/// by its short name (`--border`, as the language's own pages write it) or by
/// the exported name (`--color-border`). Returns "group.key -> --x" for each
/// one that does not.
pub(crate) fn undefined_token_references(tokens: &Value) -> Vec<String> {
    let mut defined = std::collections::HashSet::new();
    for (group, prefix) in GROUPS {
        if let Some(map) = tokens.get(group).and_then(Value::as_object) {
            for (key, value) in map {
                let name = token_name(key);
                defined.insert(format!("--{name}"));
                defined.insert(format!("--{prefix}-{name}"));
                if let Value::Array(items) = value {
                    for i in 1..=items.len() {
                        defined.insert(format!("--{prefix}-{i}"));
                        defined.insert(format!("--{prefix}-{name}-{i}"));
                    }
                }
            }
        }
    }
    if let Some(ramps) = tokens.get("ramps").and_then(Value::as_object) {
        for (ramp, steps) in ramps {
            for step in steps.as_object().map(|m| m.keys().cloned().collect::<Vec<_>>()).unwrap_or_default() {
                defined.insert(format!("--ramp-{}-{}", token_name(ramp), token_name(&step)));
            }
        }
    }
    let reference = Regex::new(r"var\(\s*(--[\w-]+)\s*(,[^)]*)?\)").expect("static regex");
    let mut missing = Vec::new();
    let mut check = |path: String, text: &str| {
        for cap in reference.captures_iter(text) {
            let name = cap.get(1).map(|m| m.as_str().to_ascii_lowercase()).unwrap_or_default();
            if cap.get(2).is_none() && !defined.contains(&name) {
                missing.push(format!("{path} -> {name}"));
            }
        }
    };
    for (group, _) in GROUPS {
        if let Some(map) = tokens.get(group).and_then(Value::as_object) {
            for (key, value) in map {
                for text in string_values(value) {
                    check(format!("{group}.{key}"), &text);
                }
            }
        }
    }
    if let Some(ramps) = tokens.get("ramps").and_then(Value::as_object) {
        for (ramp, steps) in ramps {
            if let Some(steps) = steps.as_object() {
                for (step, value) in steps {
                    for text in string_values(value) {
                        check(format!("ramps.{ramp}.{step}"), &text);
                    }
                }
            }
        }
    }
    missing
}

fn hex6(value: &str) -> Option<String> {
    let v = value.trim().trim_matches('"').trim_matches('\'').to_ascii_lowercase();
    let digits = v.strip_prefix('#')?;
    if !digits.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    match digits.len() {
        3 | 4 => Some(format!("#{}", digits.chars().flat_map(|c| [c, c]).collect::<String>())),
        6 | 8 => Some(format!("#{digits}")),
        _ => None,
    }
}

/// The `colors:` map in a DESIGN.md's front matter, name -> hex.
fn design_md_colors(design_md: &str) -> Vec<(String, String)> {
    let text = design_md.replace("\r\n", "\n");
    let Some(rest) = text.strip_prefix("---\n") else { return Vec::new() };
    let front = rest.split("\n---").next().unwrap_or("");
    let mut out = Vec::new();
    let mut inside = false;
    for line in front.lines() {
        if line.trim_end() == "colors:" {
            inside = true;
            continue;
        }
        if inside {
            // Entries sit two spaces in; anything less ends the map, anything
            // more belongs to an entry.
            if !line.starts_with("  ") {
                break;
            }
            if line.starts_with("   ") {
                continue;
            }
            if let Some((name, value)) = line.trim().split_once(':') {
                if let Some(hex) = hex6(value) {
                    out.push((token_name(name), hex));
                }
            }
        }
    }
    out
}

/// A DESIGN.md colour whose name is also one of the language's colour tokens
/// must have that token's value. A DESIGN.md may add names (`primary` beside
/// the language's `accent`), never contradict one.
pub(crate) fn design_md_colour_conflicts(design_md: &str, tokens: &Value) -> Vec<String> {
    let native: std::collections::HashMap<String, String> = tokens
        .get("colors")
        .and_then(Value::as_object)
        .map(|m| {
            m.iter()
                .filter_map(|(k, v)| v.as_str().and_then(hex6).map(|hex| (token_name(k), hex)))
                .collect()
        })
        .unwrap_or_default();
    let alias = |name: &str| match name {
        "background" => Some("bg"),
        "bg" => Some("background"),
        _ => None,
    };
    design_md_colors(design_md)
        .into_iter()
        .filter_map(|(name, hex)| {
            let token = native.get(&name).or_else(|| alias(&name).and_then(|a| native.get(a)))?;
            (token != &hex).then(|| format!("{name}: DESIGN.md {hex}, tokens {token}"))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn own_short_names_resolve_and_page_only_variables_do_not() {
        let tokens = json!({
            "colors": { "border": "#333", "accent_2": "#C8442A" },
            "spacing": { "scale": [4, 8] },
            "shadows": {
                "ring": "0 0 0 1px var(--border)",
                "glow": "0 0 8px var(--color-accent-2)",
                "step": "0 var(--space-2) 0 #000",
                "sm": "-4px -4px 9px var(--hi), 4px 4px 11px var(--lo-soft)",
                "safe": "0 0 1px var(--x, #000)"
            }
        });
        assert_eq!(
            undefined_token_references(&tokens),
            vec!["shadows.sm -> --hi".to_string(), "shadows.sm -> --lo-soft".to_string()]
        );
    }

    #[test]
    fn a_design_md_may_add_colour_names_but_not_contradict_one() {
        let tokens = json!({ "colors": { "bg": "#FBF8F1", "accent": "#C2667A", "mint": "#C9E4D2" } });
        let shizuku = "---\nversion: \"alpha\"\nname: \"Shizuku\"\ncolors:\n  background: \"#FBF8F1\"\n  primary: \"#C2667A\"\n  accent: \"#C9E4D2\"\ntypography:\n  body:\n    fontFamily: \"Sarabun\"\n---\n\n# Shizuku\n";
        assert_eq!(
            design_md_colour_conflicts(shizuku, &tokens),
            vec!["accent: DESIGN.md #c9e4d2, tokens #c2667a".to_string()]
        );
        let fixed = shizuku.replace("accent: \"#C9E4D2\"", "accent: \"#C2667A\"\n  mint: \"#C9E4D2\"");
        assert!(design_md_colour_conflicts(&fixed, &tokens).is_empty());
        let short = "---\ncolors:\n  bg: \"#fbf8f1\"\n---\n";
        assert!(design_md_colour_conflicts(short, &tokens).is_empty(), "3- and 6-digit and case agree");
        assert!(design_md_colour_conflicts("# no front matter", &tokens).is_empty());
    }
}

