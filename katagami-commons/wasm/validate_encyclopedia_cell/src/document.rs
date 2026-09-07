use std::collections::BTreeSet;

use serde::Deserialize;
use url::Url;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct CellDocument {
    version: u32,
    name: String,
    description: String,
    maps: Vec<String>,
    broader: Vec<Broader>,
    relations: Vec<Relation>,
    questions: Vec<String>,
    pub(crate) sources: Vec<Source>,
    manifestations: Vec<Manifestation>,
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
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Manifestation {
    id: String,
    title: String,
    kind: String,
    description: String,
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
    Katagami {
        id: String,
        #[serde(rename = "sourceId")]
        source_id: String,
        rights: Rights,
        #[serde(rename = "entitySet")]
        entity_set: String,
        #[serde(rename = "entityId")]
        entity_id: String,
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
            }
            | Self::Katagami {
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
            Self::Katagami {
                entity_set,
                entity_id,
                ..
            } => {
                one_of(
                    entity_set,
                    &[
                        "DesignLanguages",
                        "ArtStyles",
                        "WritingStyles",
                        "PaletteSystems",
                    ],
                    "linked record type",
                )?;
                identifier(entity_id)?;
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
    if cell.version != 1 {
        return Err("unsupported cell document version".into());
    }
    text(&cell.name)?;
    text(&cell.description)?;
    nonempty(&cell.maps, "maps")?;
    unique(cell.maps.iter().map(String::as_str), "maps")?;
    for map in &cell.maps {
        one_of(map, &["art", "writing", "palettes", "design"], "map")?;
    }
    nonempty(&cell.sources, "sources")?;
    let sources = unique(
        cell.sources.iter().map(|source| source.id.as_str()),
        "source identifiers",
    )?;
    for source in &cell.sources {
        identifier(&source.id)?;
        text(&source.title)?;
        https_url(&source.url)?;
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
    unique(
        cell.manifestations
            .iter()
            .map(|example| example.id.as_str()),
        "example identifiers",
    )?;
    for example in &cell.manifestations {
        identifier(&example.id)?;
        text(&example.title)?;
        text(&example.description)?;
        one_of(
            &example.kind,
            &["historical", "original", "generated"],
            "example provenance",
        )?;
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

pub(crate) fn text(value: &str) -> Result<(), String> {
    if value.trim().is_empty() || value.chars().count() > 100_000 {
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
