import re
import unittest
from pathlib import Path
import hashlib
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
MCP_CONFIG = (Path(__file__).resolve().parents[2] / "mcp" / "src" / "config.ts").read_text()
FIXTURE_ROOT = ROOT / "fixtures" / "art-style-portability"
AUDIT_MATRIX = json.loads((FIXTURE_ROOT / "audit-matrix.json").read_text())
AUDIT_REPORT = json.loads((FIXTURE_ROOT / "audit-report.json").read_text())
CURATION_JOB_SPEC = (ROOT / "specs" / "curation_job.ioa.toml").read_text()
CONTRIBUTOR_SKILL = (
    Path(__file__).resolve().parents[2]
    / "mcp"
    / "skills"
    / "katagami-contributor"
    / "SKILL.md"
).read_text()


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

    def test_external_contributor_skill_uses_the_governed_art_style_boundary(self):
        normalized_skill = " ".join(CONTRIBUTOR_SKILL.split())
        for marker in [
            "Use the authenticated Katagami MCP as the contribution boundary",
            "VerificationQueued",
            "Katagami does not generate or edit images for outside contributors",
            "`depiction_grammar=2`",
            "One model cannot hide behind the other model's average",
            "Do not call `SubmitForReview`",
        ]:
            self.assertIn(marker, normalized_skill)
        self.assertNotIn("Cedar is open-permit", CONTRIBUTOR_SKILL)
        self.assertNotIn("POST /tdata/ArtStyles", CONTRIBUTOR_SKILL)

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
        self.assertNotIn("generate_art_style_proof_matrix", MCP_TOOLS)
        self.assertIn("import_art_style_proof_image", MCP_TOOLS)
        self.assertIn("image_base64", MCP_TOOLS)
        self.assertIn("ingestImageBytesWithDigest", MCP_TOOLS)
        self.assertIn("generation_record", submit)
        self.assertIn("depiction grammar", submit)
        images = submit[submit.index("images:") :]
        images = images[: images.index("credits:")]
        self.assertIn(".array(", images)
        self.assertIn(".length(2)", images)
        self.assertNotIn('action(id, set, entityId, "SubmitForReview"', submit)
        self.assertIn('createEntity(id, "CurationJobs")', submit)
        self.assertIn('"CompleteArtStyleSynthesis"', submit)
        self.assertIn('"VerificationQueued"', submit)

    def test_reference_images_are_optional_but_proof_is_required(self):
        actions = self._by_name(self.art, "action")
        for action_name in ["SubmitForReview", "Publish"]:
            guard = actions[action_name]["guard"]
            self.assertNotIn(
                {"type": "is_true", "var": "has_reference_images"}, guard
            )
            self.assertIn({"type": "is_true", "var": "has_proof_shots"}, guard)

    def test_contributor_proofs_are_verified_without_katagami_generation(self):
        for marker in [
            "generation_record",
            "content_preserved",
            "source_medium_replaced",
            "no_living_artist_target",
            "tradition_level_description",
            "art_style_source_review_not_independent",
            "art_style_portability_source_medium_preserved",
            "source_file_id",
            "output_file_id",
        ]:
            self.assertIn(marker, ART_REVIEW_SRC)
        self.assertNotIn("Hmac::<Sha256>", ART_REVIEW_SRC)
        self.assertNotIn('"katagami-mcp"', ART_REVIEW_SRC)
        self.assertNotIn("EDIT_ENDPOINTS", ART_REVIEW_SRC)
        for marker in [
            "fn verify_art_style_proof_record_files",
            "fn read_art_style_proof_file_sha256",
            "expected immutable Locked file",
            "Sha256::new()",
            "art_style_proof_file_hash_mismatch",
        ]:
            self.assertIn(marker, FINALIZER_SRC)
        self.assertIn("contributor-supplied", ART_SKILL)
        self.assertIn("PawMedia", ART_SKILL)
        attach_hint = self._by_name(self.art, "action")["AttachProofShots"]["hint"]
        self.assertIn("contributor-supplied", attach_hint)
        self.assertIn("generation record", attach_hint)
        self.assertIn("generation_record", MCP_TOOLS)
        self.assertNotIn("createHmac", MCP_TOOLS)
        self.assertNotIn("FAL_KEY", MCP_CONFIG)
        self.assertNotIn("ART_STYLE_PROOF_RECEIPT_KEY", MCP_CONFIG)
        self.assertNotIn("rights_evidence", MCP_TOOLS)
        self.assertIn("artStyleProofInput", MCP_TOOLS)
        self.assertIn(
            "thumbnail_file_id must identify one of the eight verified proof shots",
            MCP_TOOLS,
        )
        self.assertNotIn("art_style_proof_receipt_key", CURATION_JOB_SPEC)

    def test_audit_matrix_balances_roles_media_and_style_specific_subjects(self):
        self.assertEqual(AUDIT_MATRIX["schema_version"], "3")
        self.assertEqual(len(AUDIT_MATRIX["styles"]), 8)
        self.assertIn(
            "Contributor-created outside Katagami",
            AUDIT_MATRIX["rules"]["source_fixture_policy"],
        )
        self.assertIn(
            "does not invoke or pay",
            AUDIT_MATRIX["rules"]["source_fixture_policy"],
        )
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
        seen_prompts = set()
        seen_source_files = set()
        assignments = set()
        for style in AUDIT_MATRIX["styles"]:
            prompt = style["canonical_prompt"]
            self.assertNotIn(prompt, seen_prompts)
            seen_prompts.add(prompt)
            prompt_lower = prompt.lower()
            self.assertNotRegex(prompt_lower, r"\{[^}]+\}|in the style of")
            self.assertRegex(prompt_lower, r"\b(source|input|supplied)\b")
            self.assertRegex(
                prompt_lower,
                r"\b(construct|redraw|rebuild|repaint|replace|transform)\b",
            )
            self.assertRegex(
                prompt_lower,
                r"\b(filter|trace|retain|source-medium)\w*\b",
            )
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
                source_file = FIXTURE_ROOT / case["source_file"]
                self.assertTrue(source_file.is_file(), source_file)
                self.assertEqual(source_file.suffix, ".webp")
                self.assertNotIn(source_file, seen_source_files)
                seen_source_files.add(source_file)
                source_bytes = source_file.read_bytes()
                self.assertEqual(source_bytes[:4], b"RIFF")
                self.assertEqual(source_bytes[8:12], b"WEBP")
                self.assertEqual(
                    hashlib.sha256(source_bytes).hexdigest(),
                    case["source_sha256"],
                )
                self.assertNotRegex(
                    case["source_file"].lower(),
                    r"photo[-_ ]?[123]|user|upload|painting",
                )
        self.assertGreaterEqual(len(assignments), 4)
        self.assertEqual(len(seen_source_files), 32)
        self.assertEqual(
            seen_source_files,
            set((FIXTURE_ROOT / "sources").rglob("*.webp")),
        )
        self.assertFalse(AUDIT_MATRIX["rules"]["user_media_allowed"])
        self.assertFalse(AUDIT_MATRIX["rules"]["style_references_allowed"])

    def test_audit_report_is_bound_to_the_exact_prompts_and_universal_gate(self):
        self.assertEqual(AUDIT_REPORT["schema_version"], "1")
        self.assertEqual(
            {
                (item["provider"], item["model"])
                for item in AUDIT_REPORT["image_models"]
            },
            {
                ("fal", "openai/gpt-image-2/edit"),
                ("fal", "fal-ai/nano-banana-2/edit"),
            },
        )
        self.assertTrue(AUDIT_REPORT["evaluator"]["blind"])
        acceptance = AUDIT_REPORT["acceptance"]
        self.assertEqual(acceptance["roles_per_style"], 4)
        self.assertEqual(acceptance["source_media_per_style"], 4)
        self.assertEqual(acceptance["outputs_per_style"], 8)
        self.assertTrue(acceptance["content_preserved_required"])
        self.assertTrue(acceptance["source_medium_replaced_required"])
        self.assertEqual(acceptance["medium_material_score_required"], 2)
        self.assertEqual(acceptance["depiction_grammar_score_required"], 2)
        self.assertEqual(acceptance["minimum_case_average"], 1.5)
        self.assertFalse(acceptance["style_reference_used"])
        self.assertEqual(acceptance["maximum_prompt_revisions"], 1)

        report_by_slug = {item["slug"]: item for item in AUDIT_REPORT["styles"]}
        matrix_by_slug = {item["slug"]: item for item in AUDIT_MATRIX["styles"]}
        self.assertEqual(report_by_slug.keys(), matrix_by_slug.keys())
        self.assertEqual(len(report_by_slug), 8)
        for slug, report in report_by_slug.items():
            prompt = matrix_by_slug[slug]["canonical_prompt"]
            self.assertEqual(
                report["prompt_sha256"],
                hashlib.sha256(prompt.encode()).hexdigest(),
            )
            self.assertEqual(report["output_count"], 8)
            self.assertIn(report["verdict"], {"pass", "fail"})
            self.assertLessEqual(report["revision_count"], 1)
            self.assertEqual(report["verdict"] == "pass", report["failure_count"] == 0)

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
        # Pinning the one spelling `!(principal is Admin)` is not enough: the
        # identical hole reappears as `unless { principal is Admin }` — or any
        # other phrasing — with the assertion still green. Forbid the concept.
        service_only, _ = self._art_policy_blocks()
        self.assertNotIn(
            "Admin",
            service_only,
            "the finalizer lock must not reference Admin in any form — "
            "x-temper-principal-kind: admin is caller-supplied and unvalidated",
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
            # Cedar allows whitespace before the paren, so splitting on the
            # literal "forbid(" yields NO blocks for a policy written
            # `forbid (` — the loop then asserts nothing and passes while the
            # invariant is violated. Match the keyword, and require a hit.
            forbid_blocks = re.split(r"forbid\s*\(", policy)[1:]
            self.assertTrue(
                forbid_blocks,
                f"{policy_name}.cedar has no forbid blocks — this check would "
                "be vacuous",
            )
            for forbid_block in forbid_blocks:
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
        loaded = COMMONS / "policies"
        served = COMMONS / "specs" / "policies"

        # Compare the SETS first. Globbing only policies/ walks one direction,
        # so a .cedar that exists solely in specs/policies/ — the copy `temper
        # serve` and the e2e harness load — would never be noticed.
        self.assertEqual(
            sorted(p.name for p in loaded.glob("*.cedar")),
            sorted(p.name for p in served.glob("*.cedar")),
            "policies/ and specs/policies/ hold different .cedar files",
        )

        for policy in sorted(loaded.glob("*.cedar")):
            self.assertEqual(
                policy.read_text(),
                (served / policy.name).read_text(),
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
