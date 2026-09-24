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

/// Groups whose values are checked for references.
const GROUPS: [&str; 5] = ["colors", "radii", "spacing", "shadows", "motion"];

/// Groups a value may refer to, with the prefix the exports give them. The
/// same list as `referableNames` in ui/src/lib/design-tokens.mjs, so a name
/// accepted here is one both exports resolve. Motion is not referable.
const REFERABLE: [(&str, &str); 4] = [
    ("colors", "color"),
    ("radii", "radius"),
    ("spacing", "space"),
    ("shadows", "shadow"),
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

fn clean(value: &Value) -> bool {
    match value {
        Value::String(s) => !s.trim().is_empty() && !s.contains("var("),
        Value::Number(_) => true,
        _ => false,
    }
}

/// Every `var(--x)` without a fallback in a token value must name a token the
/// exports can resolve: a clean scalar colour, radius, spacing or shadow by its
/// short name (`--border`, as the language's own pages write it) or exported
/// name (`--color-border`), a step of a list (`--space-2` for `spacing.scale`,
/// `--space-steps-2` otherwise), or a ramp step. Returns "group.key -> --x"
/// for each one that does not.
pub(crate) fn undefined_token_references(tokens: &Value) -> Vec<String> {
    let mut defined = std::collections::HashSet::new();
    for (group, prefix) in REFERABLE {
        if let Some(map) = tokens.get(group).and_then(Value::as_object) {
            for (key, value) in map {
                let name = token_name(key);
                if let Value::Array(items) = value {
                    for (i, step) in items.iter().enumerate() {
                        if clean(step) {
                            defined.insert(if key == "scale" {
                                format!("--{prefix}-{}", i + 1)
                            } else {
                                format!("--{prefix}-{name}-{}", i + 1)
                            });
                        }
                    }
                } else if clean(value) {
                    defined.insert(format!("--{name}"));
                    defined.insert(format!("--{prefix}-{name}"));
                }
            }
        }
    }
    if let Some(ramps) = tokens.get("ramps").and_then(Value::as_object) {
        for (ramp, steps) in ramps {
            if let Some(steps) = steps.as_object() {
                for (step, value) in steps {
                    if clean(value) {
                        defined.insert(format!("--ramp-{}-{}", token_name(ramp), token_name(step)));
                    }
                }
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
    for group in GROUPS {
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

/// The `colors:` map in a DESIGN.md's front matter, name -> hex. Entries are
/// the lines indented under `colors:` at the first entry's depth, whatever
/// that depth is; blank lines and comments are skipped, deeper lines belong
/// to an entry, and the first line back at `colors:`'s depth ends the map.
fn design_md_colors(design_md: &str) -> Vec<(String, String)> {
    let text = design_md.replace("\r\n", "\n");
    let Some(rest) = text.trim_start_matches('\u{feff}').strip_prefix("---\n") else { return Vec::new() };
    let front = rest.split("\n---").next().unwrap_or("");
    let indent = |line: &str| line.len() - line.trim_start().len();
    let mut out = Vec::new();
    let mut key_depth: Option<usize> = None;
    let mut entry_depth: Option<usize> = None;
    for line in front.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        match key_depth {
            None => {
                if trimmed == "colors:" {
                    key_depth = Some(indent(line));
                }
            }
            Some(depth) => {
                let here = indent(line);
                if here <= depth {
                    break;
                }
                let entry = *entry_depth.get_or_insert(here);
                if here != entry {
                    continue;
                }
                if let Some((name, value)) = trimmed.split_once(':') {
                    let value = value.split(" #").next().unwrap_or(value);
                    if let Some(hex) = hex6(value) {
                        out.push((token_name(name.trim().trim_matches('"').trim_matches('\'')), hex));
                    }
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
        let four = "---\ncolors:\n\n    bg: \"#FBF8F1\"\n    # a comment\n    accent: '#C9E4D2' # mint\ntypography: {}\n---\n";
        assert_eq!(
            design_md_colour_conflicts(four, &tokens),
            vec!["accent: DESIGN.md #c9e4d2, tokens #c2667a".to_string()],
            "any indentation, blank lines, comments and quotes"
        );
    }

    #[test]
    fn only_names_the_exports_resolve_are_accepted() {
        let tokens = json!({
            "spacing": { "pad": 8, "scale": [4, 8] },
            "motion": { "easing": "ease-out" },
            "colors": { "ink": "var(--hi)" },
            "shadows": {
                "ok": "0 var(--pad) var(--space-2) #000",
                "motion": "0 0 1px var(--easing)",
                "scale_name": "0 0 var(--space-scale-2) #000",
                "chain": "0 0 1px var(--ink)"
            }
        });
        assert_eq!(
            undefined_token_references(&tokens),
            vec![
                "colors.ink -> --hi".to_string(),
                "shadows.motion -> --easing".to_string(),
                "shadows.scale_name -> --space-scale-2".to_string(),
                "shadows.chain -> --ink".to_string(),
            ]
        );
    }
}

