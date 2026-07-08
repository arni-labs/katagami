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




class WritingLaneWiringContractTests(unittest.TestCase):
    """Phase 1 lane wiring: the writing_style output type flows query ->
    direction -> synthesize_writing_style job -> finalizer, mirroring the
    art-style lane, and the finalizer owns the two evidence gates."""

    CURATION = Path(__file__).resolve().parents[1]
    FINALIZER = (CURATION / "wasm" / "finalize_spawned_session" / "src" / "lib.rs").read_text()

    def _spec(self, name):
        return tomllib.loads((self.CURATION / "specs" / name).read_text())

    @staticmethod
    def _action(spec, name):
        return next(a for a in spec["action"] if a["name"] == name)

    def test_job_lane_action_and_triggers(self):
        spec = self._spec("curation_job.ioa.toml")
        states = {s["name"] for s in spec["state"]}
        self.assertIn("writing_style_ids", states)
        action = self._action(spec, "CompleteWritingStyleSynthesis")
        self.assertEqual(action["from"], ["Running"])
        self.assertEqual(action["to"], "Finalizing")
        trigger_names = {t["name"] for t in action.get("triggers", [])}
        self.assertIn("finalize_spawned_session", trigger_names)
        self.assertIn("writing_style_synthesis_completes_direction", trigger_names)

    def test_direction_and_query_lane_actions(self):
        direction = self._spec("curation_direction.ioa.toml")
        self.assertIn("writing_style_ids", {s["name"] for s in direction["state"]})
        complete = self._action(direction, "CompleteWritingStyle")
        self.assertEqual(complete["to"], "Completed")
        self.assertIn(
            "direction_complete_writing_style_narrows_query_barrier",
            {t["name"] for t in complete.get("triggers", [])},
        )
        query = self._spec("curation_query.ioa.toml")
        self.assertIn("writing_style_ids", {s["name"] for s in query["state"]})
        done = self._action(query, "WritingStyleSynthesisComplete")
        self.assertEqual(done["from"], ["Synthesizing"])
        self.assertEqual(done["to"], "Completed")

    def test_research_direction_routes_writing_style(self):
        skill = (self.CURATION / "agents" / "curator" / "skills" / "research-direction" / "SKILL.md").read_text()
        self.assertIn("'writing_style': 'synthesize_writing_style'", skill)
        self.assertIn("`writing_style`", skill)

    def test_synthesize_skill_is_consent_first(self):
        skill = (self.CURATION / "agents" / "curator" / "skills" / "synthesize-writing-style" / "SKILL.md").read_text()
        for marker in [
            "synthesize_writing_style",
            "Never a living",
            "public_domain",
            "Verify actual PD status",
            "multi-author period blends",
            "reference document, not a clone",
            "katagami:voice-bands/v1",
            "DERIVED, not invented",
            "CompleteWritingStyleSynthesis",
            "SubmitWritingStyle",
        ]:
            self.assertIn(marker, skill)

    def test_finalizer_owns_the_evidence_gates(self):
        for marker in [
            "fn verify_synthesized_writing_styles",
            '"synthesize_writing_style" => verify_synthesized_writing_styles',
            "fn check_voice_bands",
            "fn verify_voice_consent",
            "fn verify_voice_md_body",
            '"AttestConsent"',
            '"MarkBandsSelfConsistent"',
            "katagami:voice-bands/v1",
            "min_words_to_evaluate",
            "no evaluable evidence",
            "CURATOR GATE",
            "missing_replication",
            "replication_missing_model",
            '"MarkReplicationVerified"',
            '"RecordVerification"',
            "katagami:voice-verification/v2",
            "check_voice_bands_against",
            "pos_trigram_distribution",
            "replica_quotes_corpus",
            "attribution_for_next_revision",
            '"imitation_evidence"',
            "run_conformance_check",
            "distinctive_topic_controlled",
            "style_similarity_scores",
            "burrows-delta",
            '"report_only": true',
            '"auto_publish": false',
            "char_trigrams",
            "sentence_openers",
            "connectives_per_1000_words",
            "hapax_ratio",
        ]:
            self.assertIn(marker, self.FINALIZER)

    def test_replication_contract_in_spec(self):
        spec = (COMMONS / "specs" / "writing_style.ioa.toml").read_text()
        self.assertIn('name = "AttachReplication"', spec)
        self.assertIn('name = "MarkReplicationVerified"', spec)
        self.assertIn('name = "RecordVerification"', spec)
        self.assertIn('{ type = "is_true", var = "replication_verified" }', spec)
        self.assertIn('name = "PublishedRequiresReplication"', spec)

    def test_replication_properties_in_csdl(self):
        csdl = (COMMONS / "specs" / "model.csdl.xml").read_text()
        for prop in ["ReplicationSampleFileIds", "ReplicationManifest", "ReplicationVerified", "VerificationReport"]:
            self.assertIn(prop, csdl)

    def test_writing_styles_never_auto_publish(self):
        src = self.FINALIZER
        start = src.index("fn verify_synthesized_writing_styles")
        end = src.index("fn verify_voice_consent")
        body = src[start:end]
        self.assertNotIn("walk_lane_entity_to_published", body)
        self.assertIn('"MarkQualityPassed"', body)
        self.assertNotIn('"Publish"', body.replace("AttachPublishedAssets", ""))

    def test_assets_worker_serves_writing_styles(self):
        worker = (self.CURATION.parent / "infra" / "cloudflare" / "katagami-assets-worker" / "src" / "index.js").read_text()
        self.assertIn('"katagami/writing-styles/"', worker)


if __name__ == "__main__":
    unittest.main()
