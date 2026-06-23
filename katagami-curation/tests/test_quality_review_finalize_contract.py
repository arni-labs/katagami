import unittest
from pathlib import Path
import tomllib
import xml.etree.ElementTree as ET


class QualityReviewFinalizeContractTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2]
        self.curation_root = root / "katagami-curation"

    def test_curation_job_defaults_to_typed_completion_contract(self):
        spec = tomllib.loads(
            (self.curation_root / "specs" / "curation_job.ioa.toml").read_text()
        )
        states = {state["name"]: state for state in spec["state"]}

        self.assertEqual(
            states["completion_contract"]["initial"],
            "typed-v1",
            "new CurationJobs must use the typed finalize path by default",
        )

        tree = ET.parse(self.curation_root / "specs" / "model.csdl.xml")
        ns = {"edm": "http://docs.oasis-open.org/odata/ns/edm"}
        job = tree.find(".//edm:EntityType[@Name='CurationJob']", ns)
        self.assertIsNotNone(job)
        completion_contract = job.find("edm:Property[@Name='CompletionContract']", ns)
        self.assertIsNotNone(completion_contract)
        self.assertEqual(
            completion_contract.attrib["DefaultValue"],
            "typed-v1",
            "OData metadata must match the IOA completion_contract default",
        )

    def test_finalize_defaults_missing_contract_to_typed_path(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('.unwrap_or("typed-v1")', source)
        self.assertIn("let finalizing_fields =", source)
        self.assertIn(
            'load_entity(ctx, &api_url, &headers, "CurationJobs", &job_id)',
            source,
        )
        self.assertIn("&finalizing_fields", source)

    def test_finalizer_returns_structured_verification_errors(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('ERROR_CONTRACT: &str = "katagami.finalizer.verification.v1"', source)
        self.assertIn("struct VerificationError", source)
        self.assertIn('"contract": ERROR_CONTRACT', source)
        self.assertIn('"repairable": self.repairable', source)
        self.assertIn('set_success_result("Fail"', source)
        self.assertIn('"error_message": payload.to_string()', source)

    def test_finalizer_does_not_spawn_or_repair_side_work(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        for removed in [
            "run_typed_completion_fallback",
            "spawn_synth_followup",
            "spawn_quality_review_followup",
            "spawn_organize_followup",
            "create_configure_submit_job",
            "submit_next_queued_regeneration",
            "refresh_design_md_projection",
            "render_shadcn_export_projection",
            "write_workspace_file",
            "AttachVerifiedThumbnail",
        ]:
            self.assertNotIn(removed, source)

        self.assertIn("Follow-up job creation", source)
        self.assertIn("file projection", source)
        self.assertIn("repair work belong to IOA triggers", source)

    def test_quality_finalizer_verifies_publish_reached_terminal_state(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn ensure_language_published", source)
        self.assertIn("fn ensure_language_under_review", source)
        self.assertIn("remained in state", source)
        self.assertIn("after Publish", source)
        finalizer = source.index("fn verify_quality_reviewed_languages")
        verify_artifacts = source.index("verify_complete_language_artifacts(", finalizer)
        publish_assets = source.index("publish_public_assets(", finalizer)
        mark_quality = source.index('"MarkQualityPassed"', finalizer)
        ensure_published = source.index(
            "ensure_language_published(ctx, api_url, headers, language_id)?",
            finalizer,
        )
        self.assertLess(
            verify_artifacts,
            publish_assets,
            "quality finalization must verify attached artifacts before publishing public assets",
        )
        self.assertLess(
            publish_assets,
            mark_quality,
            "public assets must be attached before quality can pass",
        )
        self.assertLess(
            mark_quality,
            ensure_published,
            "quality finalization must mark quality before publishing",
        )

    def test_regeneration_typed_fallback_continues_pipeline(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('"regenerate_embodiment" | "evolve_language"', source)
        self.assertIn("verify_synthesized_languages(ctx, api_url, headers, fields, job_type)", source)
        self.assertNotIn("created_quality_review_job_after_embodiment_repair", source)
        self.assertNotIn("submitted_next_queued_regeneration", source)
        self.assertNotIn("active_quality_review_job_exists_for_languages", source)

    def test_record_result_terminal_race_is_non_fatal(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("record_result_rejected_because_session_terminal", source)
        self.assertIn("session became terminal before record", source)
        self.assertIn("state 'failed'", source)
        self.assertLess(
            source.index("record_result_rejected_because_session_terminal(&resp.body)"),
            source.index("Failed to record Session"),
            "terminal Session state races should not fail typed CurationJob finalization",
        )

    def test_quality_review_can_repair_missing_embodiment_artifact(self):
        skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()

        self.assertIn("If `embodiment_file_id` is present", skill)
        self.assertIn("do not fail solely for that reason", skill)
        self.assertIn("creating and attaching a new embodiment and thumbnail", skill)
        self.assertIn("Fast path for already-reviewed languages", skill)
        self.assertIn("bool_state(lang, 'quality_review_passed')` is true", skill)
        self.assertIn("Do not call `temper.read`", skill)
        self.assertIn("verify the existing files by file ID", skill)
        self.assertIn("`temper.get(...)` returns a nested entity", skill)
        self.assertIn("def entity_fields(entity):", skill)
        self.assertIn("def bool_state(entity, name):", skill)
        self.assertIn("fields.get(''.join(part.capitalize() for part in name.split('_')))", skill)
        self.assertIn("field(lang, 'embodiment_file_id')", skill)
        self.assertIn("json_field(...)", skill)
        self.assertIn("do **not** take the fast path", skill)
        self.assertIn("missing `tokens.typography.heading_font`", skill)
        self.assertIn("Repair partial native spec drift in place", skill)
        self.assertIn("Use `SetTokens` for token-only repairs", skill)
        self.assertIn("first call `temper.action('DesignLanguages', lang_id, 'Revise'", skill)
        self.assertIn("Published artifact review path", skill)
        self.assertIn("A published language must not call `AttachDesignMd`", skill)
        self.assertIn("If the language is `Published`, do not execute this step", skill)
        self.assertIn("do not re-attach DESIGN.md", skill)
        self.assertIn("Artifact handoff path for partially completed retries", skill)
        self.assertIn("`quality_review_passed` is false", skill)
        self.assertIn("has all three artifact fields", skill)
        self.assertIn("valid browser artifact before taking the handoff", skill)
        self.assertIn("SVG recovery placeholders", skill)
        self.assertIn("file body lacks `<html` or `<!doctype`", skill)
        self.assertIn("read its actual `Path` with its `WorkspaceId`", skill)
        self.assertIn("do not regenerate the embodiment, thumbnail, or DESIGN.md", skill)
        self.assertIn("Do not run silent long commands", skill)
        self.assertIn("Do not run monolithic review tool calls", skill)
        self.assertIn("tool execution made no progress", skill)
        self.assertIn("echo '[katagami] installing browser dependencies'", skill)
        self.assertIn("Keep the provider-facing final response tiny", skill)
        self.assertIn("Do not include regenerated HTML", skill)
        self.assertIn("do not archive", skill)
        self.assertIn("Never call `Archive` on a `DesignLanguage`", skill)
        self.assertIn("fail the job with a concrete", skill)

    def test_review_skill_reviews_published_artifacts_without_reattaching_design_md(self):
        skill = (
            self.curation_root
            / "agents"
            / "curator"
            / "skills"
            / "review-quality"
            / "SKILL.md"
        ).read_text()

        self.assertIn("Published artifact review path", skill)
        self.assertIn("A published language must not call `AttachDesignMd`", skill)
        self.assertIn("If the language is `Published`, do not execute this step", skill)
        self.assertIn("do not re-attach DESIGN.md", skill)
        self.assertIn("fields.get(''.join(part.capitalize() for part in name.split('_')))", skill)

    def test_finalizer_verifies_design_md_without_writing_projection_files(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertNotIn("Temper.MkDir", source)
        self.assertNotIn("Temper.CreateFile", source)
        self.assertNotIn("Temper.ResolvePath", source)
        self.assertNotIn("Temper.IncrementFileCount", source)
        self.assertNotIn('/tdata/Directories', source)
        self.assertNotIn("write_workspace_file", source)
        self.assertIn("verify_design_md_metadata", source)
        # PR-5 removed the WASM-trusted VerifyDesignMd dispatch; the byte-level
        # lint-metadata + $value checks stay the finalizer's runtime gate.
        self.assertNotIn('"VerifyDesignMd"', source)
        self.assertIn('/tdata/Files', source)
        self.assertIn("Files('{file_id}')/$value", source)

    def test_finalizer_preflights_review_ready_state_before_submit_for_review(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn verify_review_ready_state", source)
        self.assertIn('"review_prerequisites_missing"', source)
        self.assertIn('"has_design_md"', source)
        self.assertIn('"has_shadcn_export"', source)
        self.assertIn('"shadcn_preview_shots_file_id"', source)
        self.assertIn("let verified_language = verify_complete_language_artifacts", source)
        self.assertIn("&verified_language", source)
        self.assertLess(
            source.index("verify_review_ready_state(language_id, language)?"),
            source.index('"SubmitForReview"'),
            "finalizer must prove review prerequisites before dispatching SubmitForReview",
        )

    def test_finalizer_byte_checks_artifacts_before_review_preflight(self):
        # PR-5 deleted the WASM-trusted Verify* dispatches and the
        # dispatch_verifier_action helper; artifact readiness is now
        # engine-enforced by the spec's cross_entity_state File guards. The
        # finalizer keeps the byte-level content verification before driving
        # SubmitForReview, and no longer references the deleted glue.
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertNotIn("fn dispatch_verifier_action", source)
        self.assertNotIn('"verifier_action_effect_not_visible"', source)
        self.assertIn('"action_response_parse_failed"', source)
        self.assertNotIn('"VerifyDesignMd"', source)
        self.assertNotIn("design_md_verified", source)
        self.assertNotIn('"VerifyShadcnPreviewShots"', source)
        self.assertNotIn("shadcn_preview_shots_verified", source)
        self.assertLess(
            source.index("let verified_language = verify_complete_language_artifacts"),
            source.index("verify_review_ready_state(language_id, language)?"),
        )

    def test_design_md_lint_command_failure_is_blocking(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('"design_md_lint_command_failed"', source)
        self.assertIn('normalized.contains("exit code")', source)
        self.assertIn('normalized.contains("command not found")', source)
        self.assertIn('normalized.contains("stderr:")', source)


if __name__ == "__main__":
    unittest.main()
