import unittest
from pathlib import Path
import json
import tomllib

ROOT = Path(__file__).resolve().parents[1]
COMMONS = Path(__file__).resolve().parents[2] / "katagami-commons"
FINALIZER_SRC = (
    ROOT / "wasm" / "finalize_spawned_session" / "src" / "lib.rs"
).read_text()
ART_REVIEW_SRC = (
    ROOT / "wasm" / "finalize_spawned_session" / "src" / "art_style_review.rs"
).read_text()
FINALIZER_WASM = (
    ROOT / "wasm" / "finalize_spawned_session" / "finalize_spawned_session.wasm"
).read_bytes()
ART_SKILL = (
    ROOT / "agents" / "curator" / "skills" / "synthesize-art-style" / "SKILL.md"
).read_text()
ART_POLICY = (COMMONS / "policies" / "art_style.cedar").read_text()
MCP_TOOLS = (Path(__file__).resolve().parents[2] / "mcp" / "src" / "tools.ts").read_text()
PROOF_GENERATOR = (
    Path(__file__).resolve().parents[2] / "mcp" / "src" / "art-style-proofs.ts"
).read_text()
FIXTURE_ROOT = ROOT / "fixtures" / "art-style-portability"
AUDIT_MATRIX = json.loads((FIXTURE_ROOT / "audit-matrix.json").read_text())
CURATION_JOB_SPEC = (ROOT / "specs" / "curation_job.ioa.toml").read_text()


class LaneDeepVerificationContractTests(unittest.TestCase):
    """Art styles and palettes never publish on a rubber stamp. ArtStyle
    publication requires one portable prompt plus prompt/source/behavioral
    evidence, and the Rust finalizer must verify it before quality is marked."""

    def setUp(self):
        self.art = tomllib.loads((COMMONS / "specs" / "art_style.ioa.toml").read_text())

    @staticmethod
    def _by_name(spec, key):
        return {item["name"]: item for item in spec[key]}

    # --- spec: credits + provenance are publish requirements ---

    def test_art_style_publish_requires_provenance_and_review_attestations(self):
        actions = self._by_name(self.art, "action")
        publish = actions["Publish"]["guard"]
        for var in [
            "has_credits",
            "has_model_provenance",
            "has_source_basis_review",
            "has_prompt_review",
            "has_portability_evidence",
        ]:
            self.assertIn({"type": "is_true", "var": var}, publish)

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
            "art_style_review::verify_portable_prompt",
            "art_style_review::verify_source_basis",
            "art_style_review::verify_prompt_review",
            "art_style_review::verify_portability_report",
            '"AttachArtStyleReview"',
            'require_lane_json_array(id, "ArtStyle", &lane_fields, "credits")',
            'require_lane_json_object(id, "ArtStyle", &lane_fields, "model_provenance")',
            'require_lane_json_object(id, "ArtStyle", &lane_fields, "slot_recipes")',
            '"reference_manifest"',
            '"proof_shots_manifest"',
            "fn verify_lane_image_file",
            "fn read_lane_image_prefix",
            "temper_wasm_sdk::http_stream::streaming_call",
            "IMAGE_SNIFF_BYTES",
            "fn lane_payload_plausible_image",
            "fn lane_payload_has_supported_raster_magic",
            "fn verify_lane_manifest_files",
        ]:
            self.assertIn(marker, FINALIZER_SRC)

        image_verifier = FINALIZER_SRC[
            FINALIZER_SRC.index("fn verify_lane_image_file") :
            FINALIZER_SRC.index("fn read_lane_image_prefix")
        ]
        self.assertIn("read_lane_image_prefix", image_verifier)
        self.assertNotIn("read_lane_file_value(", image_verifier)

    def test_prompt_is_one_paste_ready_model_agnostic_field(self):
        actions = self._by_name(self.art, "action")
        self.assertEqual(actions["SetPromptTemplate"]["params"], ["prompt_template"])
        submit_params = actions["SubmitArtStyle"]["params"]
        self.assertNotIn("negative_prompt", submit_params)
        self.assertNotIn("engine_hints", submit_params)
        self.assertIn("prompt_review", submit_params)
        self.assertIn("portability_report", submit_params)
        self.assertIn('"source_medium_independent"', ART_REVIEW_SRC)

    def test_committed_wasm_imports_the_bounded_streaming_host_abi(self):
        # The live local E2E executes this committed module. These binary-level
        # assertions additionally keep CI from accepting a stale WASM artifact
        # rebuilt before the streaming verifier was introduced.
        for symbol in [
            b"host_http_stream_begin_outbound",
            b"host_http_stream_response_head",
            b"host_http_stream_read",
            b"host_http_stream_close",
        ]:
            self.assertIn(symbol, FINALIZER_WASM)

    def test_mcp_uses_the_same_prompt_first_contract(self):
        submit = MCP_TOOLS[MCP_TOOLS.index('"submit_art_style"') :]
        submit = submit[: submit.index('"submit_palette_system"')]
        self.assertNotIn("negative_prompt", submit)
        self.assertNotIn("engine_hints", submit)
        self.assertIn("source_basis", submit)
        self.assertIn("prompt_review", submit)
        self.assertIn("portability_report", submit)
        self.assertIn(".length(8)", submit)
        self.assertIn("generate_art_style_proof_matrix", MCP_TOOLS)
        self.assertNotIn('action(id, set, entityId, "SubmitForReview"', submit)

    def test_reference_images_are_optional_but_proof_is_required(self):
        actions = self._by_name(self.art, "action")
        for action_name in ["SubmitForReview", "Publish"]:
            guard = actions[action_name]["guard"]
            self.assertNotIn(
                {"type": "is_true", "var": "has_reference_images"}, guard
            )
            self.assertIn({"type": "is_true", "var": "has_proof_shots"}, guard)

    def test_private_validation_inputs_cannot_become_catalog_proofs(self):
        for marker in [
            "generation_receipt",
            "art_style_proof_receipt_signature_invalid",
            "content_preserved",
            "source_medium_replaced",
            "art_style_portability_source_medium_preserved",
            "Hmac::<Sha256>",
            "source_file_id",
            "output_file_id",
        ]:
            self.assertIn(marker, ART_REVIEW_SRC)
        for marker in [
            "fn verify_art_style_proof_receipt_files",
            "fn read_art_style_receipt_file_sha256",
            "expected immutable Locked file",
            "Sha256::new()",
            "art_style_proof_receipt_file_hash_mismatch",
        ]:
            self.assertIn(marker, FINALIZER_SRC)
        self.assertIn("private or user-supplied", ART_SKILL)
        attach_hint = self._by_name(self.art, "action")["AttachProofShots"]["hint"]
        self.assertIn("generator-issued receipt", attach_hint)
        self.assertIn("no user/external image URL", attach_hint)
        generator_tool = MCP_TOOLS[
            MCP_TOOLS.index('"generate_art_style_proof_matrix"') :
            MCP_TOOLS.index('"submit_art_style"')
        ]
        self.assertNotIn("image_url:", generator_tool)
        self.assertNotIn("reference_url", generator_tool)
        self.assertIn("generation_receipt", MCP_TOOLS)
        self.assertIn("createHmac", PROOF_GENERATOR)
        self.assertIn("ART_STYLE_PROOF_RECEIPT_KEY", PROOF_GENERATOR)
        self.assertIn("image_urls: [sourceUrl]", PROOF_GENERATOR)
        self.assertEqual(
            PROOF_GENERATOR.count("await lockGeneratedFile(id, image.fileId);"),
            2,
        )
        self.assertIn("`${config.galleryUrl}/api/file/${source.fileId}`", PROOF_GENERATOR)
        self.assertIn('image_size: "auto"', PROOF_GENERATOR)
        self.assertIn('aspect_ratio: "auto"', PROOF_GENERATOR)
        self.assertNotIn("rights_evidence", MCP_TOOLS)
        self.assertIn("artStyleProofInput", MCP_TOOLS)
        self.assertIn(
            "thumbnail_file_id must identify one of the eight governed proof shots",
            MCP_TOOLS,
        )
        self.assertIn(
            'art_style_proof_receipt_key = "{secret:art_style_proof_receipt_key}"',
            CURATION_JOB_SPEC,
        )

    def test_audit_matrix_balances_roles_media_and_style_specific_subjects(self):
        self.assertEqual(AUDIT_MATRIX["schema_version"], "2")
        self.assertEqual(len(AUDIT_MATRIX["styles"]), 8)
        expected_categories = {
            "human_portrait",
            "nonhuman_living",
            "still_life_object",
            "landscape_environment",
        }
        expected_media = {
            "documentary photograph",
            "black-ink line drawing",
            "neutral synthetic 3d render",
            "flat vector illustration",
        }
        seen_subject_compositions = set()
        assignments = set()
        for style in AUDIT_MATRIX["styles"]:
            self.assertEqual(len(style["cases"]), 4)
            self.assertEqual(
                {case["category"] for case in style["cases"]},
                expected_categories,
            )
            self.assertEqual(
                {case["source_medium"] for case in style["cases"]},
                expected_media,
            )
            assignment = tuple(
                (case["category"], case["source_medium"]) for case in style["cases"]
            )
            assignments.add(assignment)
            for case in style["cases"]:
                key = (case["subject"], case["composition"])
                self.assertNotIn(key, seen_subject_compositions)
                seen_subject_compositions.add(key)
        self.assertGreaterEqual(len(assignments), 4)
        self.assertFalse(AUDIT_MATRIX["rules"]["user_media_allowed"])
        self.assertFalse(AUDIT_MATRIX["rules"]["style_references_allowed"])

    def test_evidence_inputs_invalidate_the_attestations_they_can_change(self):
        actions = self._by_name(self.art, "action")
        expected = {
            "SubmitArtStyle": [
                "has_source_basis_review",
                "has_prompt_review",
                "has_portability_evidence",
            ],
            "AttachReferenceImages": ["has_source_basis_review"],
            "AttachProofShots": [
                "has_source_basis_review",
                "has_portability_evidence",
            ],
            "SetModelProvenance": [
                "has_prompt_review",
                "has_portability_evidence",
            ],
            "SetReviewEvidence": [
                "has_source_basis_review",
                "has_prompt_review",
                "has_portability_evidence",
            ],
        }
        for action_name, vars_ in expected.items():
            effects = actions[action_name]["effect"]
            for var in vars_:
                self.assertIn(
                    {"type": "set_bool", "var": var, "value": "false"},
                    effects,
                    f"{action_name} must invalidate {var}",
                )
        self.assertEqual(
            actions["SetModelProvenance"]["from"], ["Draft", "UnderReview"]
        )

    def _art_policy_blocks(self):
        """(finalizer-and-curator block, contributor block) of art_style.cedar."""
        service_start = ART_POLICY.index("// The finalizer calls these OData actions")
        contributor_start = ART_POLICY.index("// Contributor boundary")
        return ART_POLICY[service_start:contributor_start], ART_POLICY[contributor_start:]

    def test_finalizer_callbacks_are_dispatchable_and_attestation_locked(self):
        actions = self._by_name(self.art, "action")
        # Every finalizer callback must be dispatchable over OData.
        dispatchable = [
            "AttachArtStyleReview",
            "AttachPublishedAssets",
            "SubmitForReview",
            "MarkQualityPassed",
            "Publish",
            "AttachComputedFacets",
        ]
        for action_name in dispatchable:
            self.assertEqual(
                actions[action_name]["kind"],
                "input",
                f"{action_name} must be reachable by the WASM finalizer over OData",
            )
        # Attestation and publication stay locked to the finalizer
        # (Agent::"system"); contributors never reach them. SubmitForReview is
        # in this list on purpose: for art styles ONLY, advancing a draft is a
        # finalizer step, not the submitting agent's (905aa864 "lock art style
        # attestations to finalizer", paired with f9054e31, which stops
        # submit_art_style at Draft so a curator independently verifies the
        # prompt, rights basis, and proof matrix first). The other three lanes
        # let the agent advance its own draft — do not "harmonize" this one.
        attestation_actions = [
            "AttachArtStyleReview",
            "AttachPublishedAssets",
            "SubmitForReview",
            "MarkQualityPassed",
            "Publish",
            "AttachComputedFacets",
        ]
        service_only, contributor_block = self._art_policy_blocks()
        self.assertIn('principal != Agent::"system"', service_only)
        for action_name in attestation_actions:
            self.assertIn(
                f'Action::"{action_name}"',
                service_only,
                f"{action_name} must be denied to every non-system, non-curator principal",
            )
            self.assertIn(
                f'Action::"{action_name}"',
                contributor_block,
                f"{action_name} must remain denied to contributor principals",
            )

    def test_finalizer_lock_is_not_exempted_for_self_declared_admins(self):
        # An `!(principal is Admin)` exemption was tried here and REVERTED:
        # `x-temper-principal-kind: admin` is a self-declared request header the
        # kernel does not validate (only `system` is header-blocked), so the
        # exemption let any caller unlock Publish / MarkQualityPassed / Attach*
        # by sending one header. Nothing in this repo invokes those actions as
        # Admin — the under-review curator surface only calls ReturnToDraft —
        # so the exemption widened the attestation surface for no consumer.
        # If human curators ever need these actions, the fix is a validated
        # principal, not a hole in the forbid.
        service_only, _ = self._art_policy_blocks()
        self.assertNotIn(
            "!(principal is Admin)",
            service_only,
            "the finalizer lock must not be exempted on a self-declared Admin header",
        )

    def test_only_art_styles_reserve_submit_for_review_to_the_finalizer(self):
        # ARN-285 was filed as "ArtStyle wrongly forbids SubmitForReview" after
        # production denials, and the forbid was briefly removed. That was the
        # wrong read: the asymmetry is deliberate (905aa864). The denials came
        # from a contributor skill instructing agents to call it on art styles.
        # This pins the shape both ways so neither side drifts again.
        art = (COMMONS / "policies" / "art_style.cedar").read_text()
        self.assertIn(
            'Action::"SubmitForReview"',
            art,
            "art_style.cedar must keep SubmitForReview finalizer-locked",
        )
        for policy_name in ["design_language", "palette_system", "writing_style"]:
            policy = (COMMONS / "policies" / f"{policy_name}.cedar").read_text()
            for forbid_block in policy.split("forbid(")[1:]:
                self.assertNotIn(
                    'Action::"SubmitForReview"',
                    forbid_block,
                    f"{policy_name}.cedar must let the agent advance its own draft",
                )

    def test_loaded_and_serve_policy_copies_stay_identical(self):
        # policies/ is what the installed app loads (find_cedar_policies);
        # specs/policies/ is what `temper serve` and the e2e harness load.
        # A change to one that misses the other ships a policy that only
        # holds in one of the two runtimes.
        for policy in sorted((COMMONS / "policies").glob("*.cedar")):
            mirror = COMMONS / "specs" / "policies" / policy.name
            self.assertTrue(mirror.exists(), f"specs/policies/{policy.name} is missing")
            self.assertEqual(
                policy.read_text(),
                mirror.read_text(),
                f"{policy.name} differs between policies/ and specs/policies/",
            )

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
        self.assertIn('"credits": json.dumps(credits', ART_SKILL)
        self.assertIn('"model_provenance": json.dumps(model_provenance', ART_SKILL)
        self.assertIn("source_basis", ART_SKILL)
        self.assertIn("prompt_review", ART_SKILL)
        self.assertIn("portability_report", ART_SKILL)
        self.assertIn("same aesthetic prompt", ART_SKILL)
        self.assertNotIn("MUST contain the literal substrings `{subject}`", ART_SKILL)


if __name__ == "__main__":
    unittest.main()
