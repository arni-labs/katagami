use std::collections::BTreeSet;

use serde::{Deserialize, Deserializer};
use url::Url;

/// An optional field that must be absent or a string. `Option<String>` alone
/// would read JSON `null` as absent, which the TypeScript contract rejects.
fn present_string<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<String>, D::Error> {
    String::deserialize(deserializer).map(Some)
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct CellDocument {
    version: u32,
    name: String,
    description: String,
    provenance: Provenance,
    maps: Vec<MapMembership>,
    broader: Vec<Broader>,
    relations: Vec<Relation>,
    questions: Vec<String>,
    pub(crate) sources: Vec<Source>,
    manifestations: Vec<Manifestation>,
    studies: Vec<Study>,
}

/// Where the cell's own account comes from. `cited` needs a source a reader
/// can follow; `recollected` means the model wrote it from training data and
/// nothing external was located, which the note must say.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Provenance {
    basis: String,
    #[serde(default, deserialize_with = "present_string")]
    note: Option<String>,
}

/// Why this cell sits on a map. A bare map name would let a cell be dragged
/// across media by its name alone; a membership is cited like every other link.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MapMembership {
    map: String,
    explanation: String,
    source_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Broader {
    cell_id: String,
    explanation: String,
    source_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Relation {
    cell_id: String,
    label: String,
    explanation: String,
    source_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Source {
    pub(crate) id: String,
    title: String,
    url: String,
    #[serde(default, deserialize_with = "present_string", rename = "verifiedBy")]
    verified_by: Option<String>,
    #[serde(default, deserialize_with = "present_string", rename = "verifiedOn")]
    verified_on: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifestation {
    entity_set: EntitySet,
    entity_id: String,
    explanation: String,
    source_ids: Vec<String>,
}

#[derive(Deserialize, PartialEq, Eq, PartialOrd, Ord)]
enum EntitySet {
    DesignLanguages,
    ArtStyles,
    WritingStyles,
    PaletteSystems,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Study {
    id: String,
    title: String,
    kind: String,
    description: String,
    #[serde(default, deserialize_with = "present_string")]
    generated_by: Option<String>,
    representations: Vec<Representation>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Rights {
    basis: String,
    evidence_url: String,
    jurisdiction: String,
    uses: Vec<String>,
    attribution: String,
    restrictions: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Color {
    name: String,
    value: String,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
enum Representation {
    Image {
        id: String,
        #[serde(rename = "sourceId")]
        source_id: String,
        rights: Rights,
        url: String,
        alt: String,
    },
    Text {
        id: String,
        #[serde(rename = "sourceId")]
        source_id: String,
        rights: Rights,
        text: String,
        language: String,
        edition: String,
    },
    Palette {
        id: String,
        #[serde(rename = "sourceId")]
        source_id: String,
        rights: Rights,
        colors: Vec<Color>,
        construction: String,
    },
}

impl Representation {
    fn common(&self) -> (&str, &str, &Rights) {
        match self {
            Self::Image {
                id,
                source_id,
                rights,
                ..
            }
            | Self::Text {
                id,
                source_id,
                rights,
                ..
            }
            | Self::Palette {
                id,
                source_id,
                rights,
                ..
            } => (id, source_id, rights),
        }
    }

    fn validate(&self, sources: &BTreeSet<&str>) -> Result<(), String> {
        let (id, source_id, rights) = self.common();
        identifier(id)?;
        check_sources(&[source_id], sources)?;
        one_of(
            &rights.basis,
            &[
                "public-domain",
                "cc0",
                "open-license",
                "permission",
                "original",
            ],
            "rights basis",
        )?;
        https_url(&rights.evidence_url)?;
        text(&rights.jurisdiction)?;
        text(&rights.attribution)?;
        nonempty(&rights.uses, "permitted uses")?;
        if !rights.uses.iter().any(|usage| usage == "display") {
            return Err("display permission must be recorded".into());
        }
        for usage in &rights.uses {
            one_of(usage, &["display", "adapt", "download"], "permitted use")?;
        }
        for restriction in &rights.restrictions {
            text(restriction)?;
        }
        match self {
            Self::Image { url, alt, .. } => {
                https_url(url)?;
                text(alt)?;
            }
            Self::Text {
                text: content,
                language,
                edition,
                ..
            } => {
                text(content)?;
                text(language)?;
                text(edition)?;
            }
            Self::Palette {
                colors,
                construction,
                ..
            } => {
                nonempty(colors, "palette colors")?;
                text(construction)?;
                for color in colors {
                    text(&color.name)?;
                    if color.value.len() != 7
                        || !color.value.starts_with('#')
                        || !color.value.as_bytes()[1..]
                            .iter()
                            .all(u8::is_ascii_hexdigit)
                    {
                        return Err(format!("invalid sRGB hex color: {}", color.value));
                    }
                }
            }
        }
        Ok(())
    }
}

pub(crate) fn parse(raw: &str) -> Result<CellDocument, String> {
    if raw.len() > 2_000_000 {
        return Err("cell document exceeds 2 MB; link large representations instead".into());
    }
    let cell: CellDocument = serde_json::from_str(raw).map_err(|error| error.to_string())?;
    if cell.version != 3 {
        return Err("unsupported cell document version".into());
    }
    text(&cell.name)?;
    if !cell.description.is_empty() {
        text(&cell.description)?;
    }
    one_of(
        &cell.provenance.basis,
        &["cited", "recollected"],
        "provenance basis",
    )?;
    match (cell.provenance.basis.as_str(), &cell.provenance.note) {
        ("cited", _) if cell.sources.is_empty() => {
            return Err("a cited cell must carry at least one source".into());
        }
        ("recollected", _) if !cell.sources.is_empty() => {
            return Err("a cell with a source is cited, not recollected".into());
        }
        // The note opens with the fixed sentence, so a reader sees the same
        // words on every recollected cell and nothing can precede them to
        // negate it. What follows — why no source was found — is free text.
        ("recollected", note)
            if !note.as_deref().is_some_and(|n| {
                n.strip_prefix(
                    "Written from model training data; no external reference was located",
                )
                // The same explicit set as the TypeScript schema: \b and Unicode
                // alphanumerics disagree on "_" and accented letters.
                .is_some_and(|rest| {
                    rest.chars()
                        .next()
                        .is_none_or(|c| " \t\n.,;:!?)-".contains(c))
                })
            }) =>
        {
            return Err(
                "a recollected cell's note must begin \"Written from model training data; no external reference was located\"".into(),
            );
        }
        (_, Some(note)) => text(note)?,
        _ => {}
    }
    nonempty(&cell.maps, "maps")?;
    unique(cell.maps.iter().map(|m| m.map.as_str()), "maps")?;
    for membership in &cell.maps {
        one_of(
            &membership.map,
            &["art", "writing", "palettes", "design"],
            "map",
        )?;
        text(&membership.explanation)?;
    }
    let sources = unique(
        cell.sources.iter().map(|source| source.id.as_str()),
        "source identifiers",
    )?;
    for source in &cell.sources {
        identifier(&source.id)?;
        text(&source.title)?;
        https_url(&source.url)?;
        match (&source.verified_by, &source.verified_on) {
            (None, None) => {}
            (Some(by), Some(on)) => {
                text(by)?;
                if !calendar_date(on) {
                    return Err("verifiedOn must be a real YYYY-MM-DD calendar date".into());
                }
            }
            _ => return Err("verifiedBy and verifiedOn go together".into()),
        }
    }
    for membership in &cell.maps {
        // A cited cell's map membership is a claim and cites like every other
        // link; on a recollected cell placement is recollected too.
        if cell.provenance.basis == "cited" && membership.source_ids.is_empty() {
            return Err("a cited cell's map membership must cite a source".into());
        }
        // One id at a time on purpose: check_sources refuses an empty list, and a
        // recollected cell's membership is legitimately `[]`.
        for source_id in &membership.source_ids {
            check_sources(&[source_id.as_str()], &sources)?;
        }
    }
    unique(
        cell.broader.iter().map(|link| link.cell_id.as_str()),
        "broader cells",
    )?;
    for link in &cell.broader {
        identifier(&link.cell_id)?;
        text(&link.explanation)?;
        check_sources(
            &link
                .source_ids
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            &sources,
        )?;
    }
    for link in &cell.relations {
        identifier(&link.cell_id)?;
        text(&link.label)?;
        text(&link.explanation)?;
        check_sources(
            &link
                .source_ids
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            &sources,
        )?;
    }
    for question in &cell.questions {
        text(question)?;
    }
    let mut manifestations = BTreeSet::new();
    for entry in &cell.manifestations {
        identifier(&entry.entity_id)?;
        text(&entry.explanation)?;
        if !manifestations.insert((&entry.entity_set, &entry.entity_id)) {
            return Err("duplicate manifestation reference".into());
        }
        check_sources(
            &entry
                .source_ids
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>(),
            &sources,
        )?;
    }
    unique(
        cell.studies.iter().map(|example| example.id.as_str()),
        "example identifiers",
    )?;
    for example in &cell.studies {
        identifier(&example.id)?;
        text(&example.title)?;
        text(&example.description)?;
        one_of(
            &example.kind,
            &["historical", "original", "generated"],
            "example provenance",
        )?;
        match (example.kind.as_str(), &example.generated_by) {
            ("generated", None) => {
                return Err(
                    "a generated study must name the model or tool that produced it".into(),
                );
            }
            ("generated", Some(generator)) => text(generator)?,
            (_, Some(_)) => return Err("only a generated study names a generator".into()),
            _ => {}
        }
        nonempty(&example.representations, "representations")?;
        unique(
            example
                .representations
                .iter()
                .map(|representation| representation.common().0),
            "representation identifiers",
        )?;
        for representation in &example.representations {
            representation.validate(&sources)?;
        }
    }
    Ok(cell)
}

/// One explicit definition of blank, shared with the TypeScript schema:
/// JavaScript's trim() and Rust's trim() disagree on U+0085 and U+FEFF.
fn is_blank_char(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n'
            | '\u{0B}'
            | '\u{0C}'
            | '\r'
            | ' '
            | '\u{85}'
            | '\u{A0}'
            | '\u{1680}'
            | '\u{2000}'
            ..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
    )
}

fn calendar_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }
    let num = |s: &str| s.parse::<u32>().ok();
    let (Some(y), Some(m), Some(d)) = (num(&value[0..4]), num(&value[5..7]), num(&value[8..10]))
    else {
        return false;
    };
    let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let days = match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    // Years below 1000 are refused on both sides, matching the TypeScript schema.
    y >= 1000 && (1..=days).contains(&d)
}

pub(crate) fn text(value: &str) -> Result<(), String> {
    if value.chars().all(is_blank_char) || value.chars().count() > 100_000 {
        return Err("text must be nonblank and at most 100,000 characters".into());
    }
    Ok(())
}

fn identifier(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 160
        || !value.as_bytes()[0].is_ascii_alphanumeric()
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
    {
        return Err(format!("invalid identifier: {value}"));
    }
    Ok(())
}

fn https_url(value: &str) -> Result<(), String> {
    let url = Url::parse(value).map_err(|error| format!("invalid URL: {error}"))?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("use an HTTPS URL without credentials".into());
    }
    Ok(())
}

fn nonempty<T>(values: &[T], field: &str) -> Result<(), String> {
    if values.is_empty() {
        return Err(format!("{field} must not be empty"));
    }
    Ok(())
}

fn one_of(value: &str, allowed: &[&str], field: &str) -> Result<(), String> {
    if !allowed.contains(&value) {
        return Err(format!("unknown {field}: {value}"));
    }
    Ok(())
}

fn unique<'a>(
    values: impl Iterator<Item = &'a str>,
    field: &str,
) -> Result<BTreeSet<&'a str>, String> {
    let mut seen = BTreeSet::new();
    for value in values {
        if !seen.insert(value) {
            return Err(format!("duplicate {field}: {value}"));
        }
    }
    Ok(seen)
}

fn check_sources(ids: &[&str], known: &BTreeSet<&str>) -> Result<(), String> {
    nonempty(ids, "source references")?;
    for source_id in ids {
        if !known.contains(source_id) {
            return Err(format!("unknown source: {source_id}"));
        }
    }
    Ok(())
}
