import unittest
from pathlib import Path
import tomllib


class LaneFileReadyGuardsContractTests(unittest.TestCase):
    """PR-5: PaletteSystem and ArtStyle publish/review readiness is engine-enforced
    via cross_entity_state File Ready/Locked guards, replacing the WASM-trusted
    *_verified copy-booleans, their Verify* actions, and PublishedRequiresVerified*
    invariants."""

    def setUp(self):
        commons = Path(__file__).resolve().parents[2] / "katagami-commons"
        self.palette = tomllib.loads(
            (commons / "specs" / "palette_system.ioa.toml").read_text()
        )
        self.art = tomllib.loads(
            (commons / "specs" / "art_style.ioa.toml").read_text()
        )

    @staticmethod
    def _by_name(spec, key):
        return {item["name"]: item for item in spec[key]}

    @staticmethod
    def _file_guard(field):
        return {
            "type": "cross_entity_state",
            "entity_type": "File",
            "entity_id_source": field,
            "required_status": ["Ready", "Locked"],
        }

    # --- PaletteSystem ---

    def test_palette_verified_glue_is_deleted(self):
        states = {s["name"] for s in self.palette["state"]}
        actions = self._by_name(self.palette, "action")
        invariants = self._by_name(self.palette, "invariant")
        for var in ["tokens_export_verified", "thumbnail_verified"]:
            self.assertNotIn(var, states)
        for action in ["VerifyTokensExport", "VerifyThumbnail"]:
            self.assertNotIn(action, actions)
        for inv in [
            "PublishedRequiresVerifiedTokensExport",
            "PublishedRequiresVerifiedThumbnail",
        ]:
            self.assertNotIn(inv, invariants)
        # Genuine-local presence bools and non-verified invariants are kept.
        for var in ["has_tokens_export", "has_thumbnail"]:
            self.assertIn(var, states)
        for inv in ["PublishedRequiresTokensExport", "PublishedRequiresThumbnail"]:
            self.assertIn(inv, invariants)

    def test_palette_publish_gates_on_ready_files(self):
        actions = self._by_name(self.palette, "action")
        submit = actions["SubmitForReview"]["guard"]
        publish = actions["Publish"]["guard"]
        # SubmitForReview guards the thumbnail File; proof_scenes is inline JSON
        # (not a File) and is intentionally NOT guarded.
        self.assertIn(self._file_guard("thumbnail_file_id"), submit)
        self.assertNotIn({"type": "is_true", "var": "thumbnail_verified"}, submit)
        # Publish guards both the token-export and thumbnail Files.
        self.assertIn(self._file_guard("tokens_export_file_id"), publish)
        self.assertIn(self._file_guard("thumbnail_file_id"), publish)
        for var in ["tokens_export_verified", "thumbnail_verified"]:
            self.assertNotIn({"type": "is_true", "var": var}, publish)

    # --- ArtStyle ---

    def test_art_style_verified_glue_is_deleted(self):
        states = {s["name"] for s in self.art["state"]}
        actions = self._by_name(self.art, "action")
        invariants = self._by_name(self.art, "invariant")
        for var in [
            "reference_images_verified",
            "proof_shots_verified",
            "thumbnail_verified",
        ]:
            self.assertNotIn(var, states)
        for action in [
            "VerifyReferenceImages",
            "VerifyProofShots",
            "VerifyThumbnail",
        ]:
            self.assertNotIn(action, actions)
        for inv in [
            "PublishedRequiresVerifiedReferenceImages",
            "PublishedRequiresVerifiedProofShots",
            "PublishedRequiresVerifiedThumbnail",
        ]:
            self.assertNotIn(inv, invariants)
        for var in ["has_reference_images", "has_proof_shots", "has_thumbnail"]:
            self.assertIn(var, states)
        for inv in [
            "PublishedRequiresReferenceImages",
            "PublishedRequiresProofShots",
            "PublishedRequiresThumbnail",
        ]:
            self.assertIn(inv, invariants)

    def test_art_style_publish_gates_on_ready_files_including_list_refs(self):
        actions = self._by_name(self.art, "action")
        submit = actions["SubmitForReview"]["guard"]
        publish = actions["Publish"]["guard"]
        # reference_image_file_ids and proof_shots_file_ids are LIST File-ref
        # fields; the resolver resolves the guard per element.
        self.assertIn(self._file_guard("reference_image_file_ids"), submit)
        self.assertIn(self._file_guard("thumbnail_file_id"), submit)
        self.assertIn(self._file_guard("reference_image_file_ids"), publish)
        self.assertIn(self._file_guard("proof_shots_file_ids"), publish)
        self.assertIn(self._file_guard("thumbnail_file_id"), publish)
        for var in [
            "reference_images_verified",
            "proof_shots_verified",
            "thumbnail_verified",
        ]:
            self.assertNotIn({"type": "is_true", "var": var}, submit)
            self.assertNotIn({"type": "is_true", "var": var}, publish)


if __name__ == "__main__":
    unittest.main()
