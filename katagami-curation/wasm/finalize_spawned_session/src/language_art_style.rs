//! A published language's imagery recipe must come from a published paired style.
use super::{entity_fields, entity_status_value, string_field_any, VerificationError};
use serde_json::Value;

pub(super) fn verify_published_art_style_pair(
    language_id: &str,
    slug: &str,
    art: &Value,
) -> Result<(), VerificationError> {
    if entity_status_value(art) != "Published" {
        return Err(VerificationError::new(
            "paired_art_style_not_published",
            format!(
                "DesignLanguage '{language_id}' pairs with '{slug}', which must be Published first"
            ),
        )
        .entity("DesignLanguage", language_id)
        .field("default_art_style_id")
        .repairable(true));
    }
    if string_field_any(&entity_fields(art), "slug", "") != slug {
        return Err(VerificationError::new(
            "paired_art_style_slug_mismatch",
            format!("DesignLanguage '{language_id}' default_art_style_id disagrees with imagery_direction.pairs_with '{slug}'"),
        ).entity("DesignLanguage", language_id).field("imagery_direction").repairable(true));
    }
    Ok(())
}

pub(super) fn select_published_art_style_pair(
    slug: &str,
    rows: &[Value],
    more_rows: bool,
) -> Result<Option<String>, VerificationError> {
    if more_rows {
        return Err(VerificationError::new(
            "art_style_pair_lookup_incomplete",
            format!(
                "ArtStyle lookup for '{slug}' has more results; disambiguate the pair explicitly"
            ),
        )
        .field("default_art_style_id")
        .repairable(true));
    }
    let mut selected = None;
    for row in rows {
        if entity_status_value(row) != "Published"
            || string_field_any(&entity_fields(row), "slug", "") != slug
        {
            continue;
        }
        let id = row
            .get("entity_id")
            .or_else(|| row.get("Id"))
            .and_then(Value::as_str)
            .filter(|id| !id.is_empty())
            .ok_or_else(|| {
                VerificationError::new(
                    "art_style_pair_id_missing",
                    format!("Published ArtStyle '{slug}' has no returned identifier"),
                )
            })?;
        if selected.is_some() {
            return Err(VerificationError::new("art_style_pair_ambiguous", format!("More than one Published ArtStyle has slug '{slug}'; choose its exact default_art_style_id"))
                .field("default_art_style_id").repairable(true));
        }
        selected = Some(id.to_owned());
    }
    Ok(selected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn art(id: &str, status: &str, slug: &str) -> Value {
        json!({"entity_id":id,"status":status,"fields":{"slug":slug}})
    }
    #[test]
    fn existing_pair_must_be_published_and_agree_with_the_exported_slug() {
        for status in ["Draft", "UnderReview", "Archived", "Deleted", ""] {
            assert!(
                verify_published_art_style_pair("language", "ink", &art("a", status, "ink"))
                    .is_err()
            );
        }
        assert!(verify_published_art_style_pair(
            "language",
            "ink",
            &art("a", "Published", "other")
        )
        .is_err());
        assert!(
            verify_published_art_style_pair("language", "ink", &art("a", "Published", "ink"))
                .is_ok()
        );
    }
    #[test]
    fn slug_lookup_skips_unpublished_duplicates_and_rejects_ambiguous_published_ones() {
        let archived = art("old", "Archived", "ink");
        let published = art("current", "Published", "ink");
        assert_eq!(
            select_published_art_style_pair("ink", &[archived.clone()], false).unwrap(),
            None
        );
        assert_eq!(
            select_published_art_style_pair("ink", &[archived, published.clone()], false).unwrap(),
            Some("current".into())
        );
        assert!(select_published_art_style_pair(
            "ink",
            &[published, art("other", "Published", "ink")],
            false
        )
        .is_err());
        assert!(select_published_art_style_pair("ink", &[], true).is_err());
    }
}
