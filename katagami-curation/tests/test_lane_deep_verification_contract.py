import unittest
from pathlib import Path
import tomllib

ROOT = Path(__file__).resolve().parents[1]
COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"
FINALIZER_SRC = (
    ROOT / "wasm" / "finalize_spawned_session" / "src" / "lib.rs"
).read_text()
ART_SKILL = (
    ROOT / "agents" / "curator" / "skills" / "synthesize-art-style" / "SKILL.md"
).read_text()


class LaneDeepVerificationContractTests(unittest.TestCase):
    """ARN-148 / RFC-0002 §7: art styles and palettes never publish on a rubber
    stamp. The finalizer must verify artifact evidence (image bodies, prompt
    holes, manifests, credits, palette color data) before any MarkQualityPassed,
    and the ArtStyle Publish guard must require credits + model provenance."""

    def setUp(self):
        self.art = tomllib.loads((COMMONS / "specs" / "art_style.ioa.toml").read_text())

    @staticmethod
    def _by_name(spec, key):
        return {item["name"]: item for item in spec[key]}

    # --- spec: credits + provenance are publish requirements ---

    def test_art_style_publish_requires_credits_and_model_provenance(self):
        actions = self._by_name(self.art, "action")
        publish = actions["Publish"]["guard"]
        self.assertIn({"type": "is_true", "var": "has_credits"}, publish)
        self.assertIn({"type": "is_true", "var": "has_model_provenance"}, publish)

    def test_submit_art_style_sets_credit_guard_vars(self):
        actions = self._by_name(self.art, "action")
        effects = actions["SubmitArtStyle"]["effect"]
        self.assertIn(
            {"type": "set_bool", "var": "has_credits", "value": "true"}, effects
        )
        self.assertIn(
            {"type": "set_bool", "var": "has_model_provenance", "value": "true"},
            effects,
        )

    def test_published_requires_credits_invariants(self):
        # Landed after the 2026-07-04 backfill: all 155 published styles
        # carry credits + model provenance, so the reactive invariants are
        # safe (ARN-148 scope item 2 complete).
        invariants = self._by_name(self.art, "invariant")
        for name, var in [
            ("PublishedRequiresCredits", "has_credits"),
            ("PublishedRequiresModelProvenance", "has_model_provenance"),
        ]:
            self.assertIn(name, invariants)
            self.assertEqual(invariants[name]["when"], ["Published"])
            self.assertEqual(invariants[name]["assert"], var)

    # --- finalizer: deep evidence checks precede the stamp ---

    def test_finalizer_verifies_art_style_evidence(self):
        for marker in [
            "fn verify_prompt_template_holes",
            'require_lane_json_array(id, "ArtStyle", &lane_fields, "credits")',
            'require_lane_json_object(id, "ArtStyle", &lane_fields, "model_provenance")',
            'require_lane_json_object(id, "ArtStyle", &lane_fields, "slot_recipes")',
            '"reference_manifest"',
            '"proof_shots_manifest"',
            "fn verify_lane_image_file",
            "fn lane_payload_plausible_image",
            "fn verify_lane_manifest_files",
        ]:
            self.assertIn(marker, FINALIZER_SRC)

    def test_finalizer_checks_template_holes(self):
        self.assertIn('"{subject}"', FINALIZER_SRC)
        self.assertIn('"{palette}"', FINALIZER_SRC)

    def test_finalizer_verifies_palette_evidence(self):
        for marker in [
            "fn verify_palette_signature",
            "fn verify_palette_role_map",
            "fn verify_palette_tokens_export",
            'verify_palette_role_map(id, &lane_fields, "neutrals")',
            'verify_palette_role_map(id, &lane_fields, "semantic")',
        ]:
            self.assertIn(marker, FINALIZER_SRC)

    def test_deep_checks_run_before_walk_in_both_lanes(self):
        # In each lane verifier the deep evidence checks must appear before
        # the MarkQualityPassed walk. Source order is the contract: the walk
        # is the last step of each loop body.
        art = FINALIZER_SRC.index("fn verify_synthesized_art_styles")
        art_end = FINALIZER_SRC.index("fn walk_lane_entity_to_published")
        art_body = FINALIZER_SRC[art:art_end]
        self.assertLess(
            art_body.index("verify_lane_image_file"),
            art_body.index("walk_lane_entity_to_published("),
        )
        pal = FINALIZER_SRC.index("fn verify_synthesized_palettes")
        pal_body = FINALIZER_SRC[
            pal : FINALIZER_SRC.index("fn verify_synthesized_art_styles")
        ]
        self.assertLess(
            pal_body.index("verify_palette_tokens_export"),
            pal_body.index("walk_lane_entity_to_published("),
        )

    def test_image_rejection_covers_text_markup_and_base64(self):
        # The image plausibility gate must reject the known fake-image
        # payload shapes seen in production: base64 text, HTML/SVG markup,
        # JSON error bodies, and YAML front matter.
        gate = FINALIZER_SRC[
            FINALIZER_SRC.index("fn lane_payload_plausible_image") :
        ]
        gate = gate[: gate.index("\nfn ")]
        for marker in [
            "thumbnail_payload_looks_text_encoded_image",
            '"<html"',
            '"<svg"',
            "image/svg+xml",
        ]:
            self.assertIn(marker, gate)

    # --- skill: pipeline styles set credits + provenance ---

    def test_synthesize_art_style_skill_sets_credits_and_provenance(self):
        self.assertIn("SetCredits", ART_SKILL)
        self.assertIn("SetModelProvenance", ART_SKILL)


if __name__ == "__main__":
    unittest.main()
