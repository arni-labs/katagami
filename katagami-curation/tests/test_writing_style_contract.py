import unittest
from pathlib import Path
import tomllib

COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"


class WritingStyleContractTests(unittest.TestCase):
    """RFC-0002 §6.1: the WritingStyle commons entity is a compiled voice
    contract, not soft guidance. The two gates that make the lane VERIFIED —
    consent_attested and bands_self_consistent — are verifier-owned internal
    actions, required by the Publish guard, and asserted as Published
    invariants from day one (no legacy backfill exists for a brand-new lane)."""

    def setUp(self):
        self.spec = tomllib.loads(
            (COMMONS / "specs" / "writing_style.ioa.toml").read_text()
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

    def test_lifecycle_states(self):
        automaton = self.spec["automaton"]
        self.assertEqual(automaton["name"], "WritingStyle")
        self.assertEqual(
            automaton["states"], ["Draft", "UnderReview", "Published", "Archived"]
        )
        self.assertEqual(automaton["initial"], "Draft")

    def test_verifier_owned_gates_are_internal_actions(self):
        actions = self._by_name(self.spec, "action")
        for name, var in [
            ("AttestConsent", "consent_attested"),
            ("MarkBandsSelfConsistent", "bands_self_consistent"),
            ("MarkQualityPassed", "quality_review_passed"),
        ]:
            self.assertIn(name, actions)
            self.assertEqual(actions[name]["kind"], "internal")
            self.assertIn(
                {"type": "set_bool", "var": var, "value": "true"},
                actions[name]["effect"],
            )

    def test_contributor_hot_path_never_sets_verifier_owned_gates(self):
        actions = self._by_name(self.spec, "action")
        effects = actions["SubmitWritingStyle"]["effect"]
        set_vars = {e["var"] for e in effects}
        self.assertNotIn("consent_attested", set_vars)
        self.assertNotIn("bands_self_consistent", set_vars)
        self.assertNotIn("quality_review_passed", set_vars)
        # It does set every authoring guard var.
        for var in [
            "has_corpus",
            "has_voice_layer",
            "has_mechanical_bands",
            "has_exemplars",
            "has_voice_md",
            "has_thumbnail",
            "has_credits",
            "has_model_provenance",
        ]:
            self.assertIn(var, set_vars)

    def test_bands_and_corpus_changes_invalidate_verifier_gates(self):
        actions = self._by_name(self.spec, "action")
        self.assertIn(
            {"type": "set_bool", "var": "bands_self_consistent", "value": "false"},
            actions["SetMechanicalBands"]["effect"],
        )
        self.assertIn(
            {"type": "set_bool", "var": "bands_self_consistent", "value": "false"},
            actions["SetExemplars"]["effect"],
        )
        corpus_effects = actions["AttachCorpus"]["effect"]
        self.assertIn(
            {"type": "set_bool", "var": "consent_attested", "value": "false"},
            corpus_effects,
        )
        self.assertIn(
            {"type": "set_bool", "var": "bands_self_consistent", "value": "false"},
            corpus_effects,
        )

    def test_publish_requires_full_contract(self):
        actions = self._by_name(self.spec, "action")
        publish = actions["Publish"]["guard"]
        for var in [
            "has_corpus",
            "consent_attested",
            "has_voice_layer",
            "has_mechanical_bands",
            "has_exemplars",
            "bands_self_consistent",
            "has_voice_md",
            "has_thumbnail",
            "has_credits",
            "has_model_provenance",
            "quality_review_passed",
            "has_published_assets",
        ]:
            self.assertIn({"type": "is_true", "var": var}, publish)
        for field in ["corpus_file_ids", "voice_md_file_id", "thumbnail_file_id"]:
            self.assertIn(self._file_guard(field), publish)

    def test_submit_for_review_gates_on_ready_files(self):
        actions = self._by_name(self.spec, "action")
        submit = actions["SubmitForReview"]["guard"]
        for field in ["corpus_file_ids", "voice_md_file_id", "thumbnail_file_id"]:
            self.assertIn(self._file_guard(field), submit)

    def test_published_invariants_cover_the_contract(self):
        invariants = self._by_name(self.spec, "invariant")
        for name in [
            "PublishedRequiresCorpus",
            "PublishedRequiresAttestedConsent",
            "PublishedRequiresVoiceLayer",
            "PublishedRequiresMechanicalBands",
            "PublishedRequiresExemplars",
            "PublishedRequiresBandsSelfConsistency",
            "PublishedRequiresVoiceMd",
            "PublishedRequiresThumbnail",
            "PublishedRequiresCredits",
            "PublishedRequiresModelProvenance",
            "PublishedRequiresPublicAssets",
            "PublishedRequiresQualityReview",
        ]:
            self.assertIn(name, invariants)
            self.assertEqual(invariants[name]["when"], ["Published"])

    def test_entity_registered_in_csdl_and_policies(self):
        csdl = (COMMONS / "specs" / "model.csdl.xml").read_text()
        self.assertIn('<EntityType Name="WritingStyle">', csdl)
        self.assertIn(
            '<EntitySet Name="WritingStyles" EntityType="Katagami.WritingStyle" />',
            csdl,
        )
        for prop in [
            "MechanicalBands",
            "ConsentAttested",
            "BandsSelfConsistent",
            "VoiceMdFileId",
            "DesignLanguageId",
        ]:
            self.assertIn(f'<Property Name="{prop}"', csdl)
        policy = (COMMONS / "specs" / "policies" / "writing_style.cedar").read_text()
        self.assertIn("resource is WritingStyle", policy)


if __name__ == "__main__":
    unittest.main()
