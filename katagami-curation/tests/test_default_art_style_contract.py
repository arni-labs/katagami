"""DesignLanguage publish requires a paired ArtStyle (ARN-384)."""

from __future__ import annotations

import tomllib
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
COMMONS = ROOT / "katagami-commons"
CURATION = ROOT / "katagami-curation"


def _actions(spec: dict) -> dict:
    return {action["name"]: action for action in spec["action"]}


class DefaultArtStyleContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.spec = tomllib.loads(
            (COMMONS / "specs" / "design_language.ioa.toml").read_text()
        )
        cls.actions = _actions(cls.spec)
        cls.finalizer = (
            CURATION / "wasm" / "finalize_spawned_session" / "src" / "lib.rs"
        ).read_text()

    def test_submit_and_publish_require_paired_art_style(self) -> None:
        submit = self.actions["SubmitForReview"]["guard"]
        publish = self.actions["Publish"]["guard"]
        required = {"type": "is_true", "var": "has_default_art_style"}
        self.assertIn(required, submit)
        self.assertIn(required, publish)
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "ArtStyle",
                "entity_id_source": "default_art_style_id",
                "required_status": ["UnderReview", "Published"],
            },
            submit,
        )
        self.assertIn(
            {
                "type": "cross_entity_state",
                "entity_type": "ArtStyle",
                "entity_id_source": "default_art_style_id",
                "required_status": ["Published"],
            },
            publish,
        )

    def test_no_published_invariant_so_existing_unpaired_stay_live(self) -> None:
        names = {inv["name"] for inv in self.spec["invariant"]}
        self.assertNotIn("PublishedRequiresDefaultArtStyle", names)
        self.assertNotIn("PublishedRequiresArtStyle", names)

    def test_submit_design_language_sets_the_pairing(self) -> None:
        action = self.actions["SubmitDesignLanguage"]
        self.assertIn("default_art_style_id", action["params"])
        self.assertIn(
            {
                "type": "set_bool",
                "var": "has_default_art_style",
                "value": "true",
            },
            action["effect"],
        )

    def test_csdl_exposes_pairing_fields(self) -> None:
        tree = ET.parse(COMMONS / "specs" / "model.csdl.xml")
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        entity = tree.find(".//edm:EntityType[@Name='DesignLanguage']", ns)
        props = {prop.attrib["Name"] for prop in entity.findall("edm:Property", ns)}
        self.assertIn("DefaultArtStyleId", props)
        self.assertIn("HasDefaultArtStyle", props)

    def test_finalizer_pairs_before_submit_and_publish(self) -> None:
        self.assertIn("fn ensure_language_art_style_paired", self.finalizer)
        self.assertIn('"has_default_art_style"', self.finalizer)
        self.assertIn('"default_art_style_id"', self.finalizer)
        self.assertIn('"SetDefaultArtStyle"', self.finalizer)
        self.assertLess(
            self.finalizer.index("fn ensure_language_art_style_paired"),
            self.finalizer.index("fn ensure_language_under_review"),
        )
        self.assertLess(
            self.finalizer.index("fn ensure_language_art_style_paired"),
            self.finalizer.index("fn ensure_language_published"),
        )
        submit_idx = self.finalizer.index("fn ensure_language_under_review")
        publish_idx = self.finalizer.index("fn ensure_language_published")
        self.assertIn(
            "ensure_language_art_style_paired",
            self.finalizer[submit_idx:publish_idx],
        )
        self.assertIn(
            "ensure_language_art_style_paired",
            self.finalizer[publish_idx : publish_idx + 1200],
        )


if __name__ == "__main__":
    unittest.main()
