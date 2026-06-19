import unittest
from pathlib import Path
import tomllib
import xml.etree.ElementTree as ET


class QualityReviewFinalizeContractTests(unittest.TestCase):
    def setUp(self):
        app_root = Path(__file__).resolve().parents[1]
        if (app_root / "app.toml").exists():
            self.curation_root = app_root
        else:
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
        self.assertIn("let mut finalizing_fields =", source)
        self.assertIn(
            'load_entity(&ctx, &api_url, &headers, "CurationJobs", &job_id)',
            source,
        )
        self.assertIn("merge_trigger_params_into_fields(&mut finalizing_fields", source)
        self.assertIn("&finalizing_fields", source)

    def test_session_link_completion_reenters_typed_finalizer(self):
        builder = (
            self.curation_root
            / "wasm"
            / "build_session_message"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('"OnCompletedAction": "ChildSessionCompleted"', builder)
        self.assertIn('"OnFailureAction": "Fail"', builder)

    def test_finalize_reattaches_design_md_after_revise_reset(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('entity_bool_any(&fresh, "has_design_md")', source)
        self.assertIn('"AttachDesignMd"', source)
        self.assertIn(
            "Revise resets has_design_md but leaves design_md_file_id intact",
            source,
        )

    def test_finalize_verifies_design_md_without_generating_projections(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        verify_design_md = source.split("fn verify_design_md", 1)[1].split(
            "fn refresh_design_md_projection", 1
        )[0]
        self.assertIn("has no design_md_file_id", verify_design_md)
        self.assertIn("verify_design_md_lint_result(language_id, &fields)?", verify_design_md)
        self.assertNotIn("refresh_design_md_projection(", verify_design_md)

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
        self.assertIn("publish_rejected_because_already_published", source)
        self.assertIn("remained in state", source)
        self.assertIn("after quality finalizer Publish", source)
        finalizer = source.index("fn verify_quality_reviewed_languages")
        ensure_under_review = source.index(
            "ensure_language_under_review(ctx, api_url, headers, language_id, &status)?",
            finalizer,
        )
        mark_quality = source.index('"MarkQualityPassed"', finalizer)
        ensure_published = source.index(
            "ensure_language_published(ctx, api_url, headers, language_id)?",
            finalizer,
        )
        self.assertLess(
            ensure_under_review,
            mark_quality,
            "quality finalization must submit Draft languages before marking quality passed",
        )
        self.assertLess(
            mark_quality,
            ensure_published,
            "quality finalization must mark quality before publishing",
        )

    def test_finalizer_verifies_agent_compositions_without_generation(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        verify_compositions = source.split("fn verify_compositions", 1)[1].split(
            "fn refresh_composition_projections", 1
        )[0]
        self.assertIn("has no landing_file_id", verify_compositions)
        self.assertIn("has no dashboard_file_id", verify_compositions)
        self.assertIn('"AttachCompositions"', verify_compositions)
        self.assertIn('"VerifyCompositions"', verify_compositions)
        self.assertNotIn("refresh_composition_projections(", verify_compositions)

        finalizer = source.index("fn verify_quality_reviewed_languages")
        verify_call = source.index(
            "match verify_compositions(ctx, api_url, headers, workspace_id, language_id, &language)",
            finalizer,
        )
        ensure_under_review = source.index(
            "ensure_language_under_review(ctx, api_url, headers, language_id, &status)?",
            finalizer,
        )
        self.assertLess(
            verify_call,
            ensure_under_review,
            "quality finalization must verify compositions before Draft review transition",
        )

    def test_finalizer_pawfs_writes_use_direct_keys(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn pawfs_directory_id", source)
        self.assertIn("fn pawfs_file_id", source)
        self.assertIn('"Directories", &directory_id', source)
        self.assertIn('"Files", &file_id', source)
        self.assertNotIn("Path eq '{}' and WorkspaceId eq '{}'", source)

    def test_regeneration_typed_fallback_continues_pipeline(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn('"regenerate_embodiment" | "evolve_language"', source)
        self.assertIn("created_quality_review_job_after_embodiment_repair", source)
        self.assertIn("submitted_next_queued_regeneration", source)
        self.assertIn("active_quality_review_job_exists_for_languages", source)
        self.assertIn("fn design_md_workspace_id", source)
        self.assertIn("os-app-docs", source)
        self.assertIn("katagami_artifact_workspace_id", source)

    def test_quality_review_artifact_defects_use_repair_pending_not_fatal_errors(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        quality_start = source.index("fn verify_quality_reviewed_languages")
        quality_end = source.index("fn ensure_language_under_review", quality_start)
        quality = source[quality_start:quality_end]

        for step in [
            "verify_compositions(",
            "verify_design_md(",
            "verify_shadcn_export(",
            "verify_shadcn_component_spec(",
            "verify_shadcn_preview_shots(",
            "verify_forced_agent_shadsync_refresh(",
            "verify_and_mark_thumbnail(",
        ]:
            self.assertIn(step, quality)
            self.assertIn("push_repairable_language_defect(", quality)

        repairable = source.split("fn is_repairable_language_artifact_error", 1)[1].split(
            "fn push_repairable_language_defect", 1
        )[0]
        for needle in [
            "has no design_md_file_id",
            "has no shadcn_export_file_id",
            "forced shadsync refresh",
        ]:
            self.assertIn(needle, repairable)

    def test_quality_review_repair_blocks_organization_until_validated(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("queue_artifact_repair_job", source)
        self.assertIn("active_regeneration_job_exists_for_language", source)
        self.assertIn("repair_pending", source)
        self.assertIn("skipped_organization_pending_artifact_repair", source)
        self.assertIn("artifact_repair_attempt", source)
        self.assertIn("is_repairable_language_artifact_error", source)
        self.assertLess(
            source.index("verify_and_mark_thumbnail(ctx, api_url, headers, language_id, &language)"),
            source.index("publish_public_assets(ctx, api_url, headers, language_id, &language)?"),
            "thumbnail validation or repair must happen before public publish",
        )

    def test_failed_quality_review_can_queue_repair_before_query_failure(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("recover_failed_quality_review_job", source)
        self.assertIn("repair_submitted_after_failed_quality_review", source)
        self.assertIn("deeply empty", source)
        self.assertIn("missing required native katagami spec sections", source)
        self.assertLess(
            source.index("recover_failed_quality_review_job"),
            source.index("propagate_failed_job(&ctx"),
            "repairable quality_review failures must queue repair before failing the parent query",
        )

    def test_failed_provider_streams_retry_without_failing_query(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("is_transient_provider_failure", source)
        self.assertIn("auto_retry_failed_job", source)
        self.assertIn("const MAX_TRANSIENT_PROVIDER_RETRIES: i64 = 4", source)
        self.assertIn("OpenAI stream ended early", source)
        self.assertIn('"auto_retry_submitted"', source)
        self.assertIn("propagate_failed_job", source)
        self.assertLess(
            source.index("auto_retry_failed_job"),
            source.index("propagate_failed_job"),
            "transient provider failures must retry before non-repairable failure propagation",
        )

    def test_concurrent_completion_dispatches_are_idempotent(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn dispatch_action_or_already_in_state", source)
        self.assertIn("fn action_rejected_for_current_state", source)
        self.assertIn(
            "synthesis_direction_and_query_advancement_deferred_to_validated_internal_action",
            source,
        )
        self.assertIn(
            "research_query_advancement_deferred_to_validated_internal_action",
            source,
        )
        self.assertIn("PublishSynthesisCompletion", source)

    def test_source_search_fallback_does_not_duplicate_queued_synthesis(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        fallback_start = source.index("fn run_typed_completion_fallback")
        source_search_start = source.index('"source_search" => {', fallback_start)
        synthesize_start = source.index('"synthesize" => {', source_search_start)
        fallback = source[source_search_start:synthesize_start]

        self.assertIn("direction_status", fallback)
        self.assertIn("synthesis_job_ids_for_direction", fallback)
        self.assertIn("skipped_synthesis_job_direction_already_queued", fallback)
        self.assertIn("skipped_synthesis_job_direction_failed", fallback)
        self.assertIn("skipped_synthesis_job_existing_job", fallback)
        self.assertIn("created_and_queued_synthesis_job", fallback)
        self.assertIn("collected_synthesis_jobs", fallback)
        self.assertIn("synthesis_job_ids_for_directions", fallback)
        self.assertIn("could not create or find any synthesize jobs", fallback)
        self.assertIn('"QueueSynthesis"', fallback)
        self.assertNotIn('!= "Discovered"', fallback)
        self.assertIn(
            "create_configure_submit_job",
            fallback,
            "source_search fallback must create synthesize jobs inside the validated finalizer so ResearchComplete receives exact job IDs",
        )

    def test_source_search_job_lookup_uses_filtered_queries(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        self.assertIn("fn list_curation_jobs_filtered", source)
        self.assertIn("fn curation_job_filter", source)
        self.assertIn("query_id eq", source)
        self.assertIn("direction_id eq", source)
        self.assertIn("synthesis_job_ids_for_direction", source)

    def test_typed_attempt_validates_durable_partials_before_unfinished_tool_text(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        verify_start = source.index("fn verify_typed_completion")
        verify_end = source.index("fn verify_source_search_completion", verify_start)
        verify_body = source[verify_start:verify_end]

        match_index = verify_body.index("match job_type")
        pre_match = verify_body[:match_index]
        self.assertNotIn(
            "typed_completion_output_is_unfinished_tool_call",
            pre_match,
            "CompleteAttempt validation must inspect durable job/entity state before treating raw unfinished tool-call text as the primary defect",
        )
        self.assertIn("verify_synthesized_languages", verify_body)
        self.assertIn("partial_design_language_contract_defects", source)
        self.assertIn("design_language_ids_for_contract_validation", source)

    def test_synthesis_finalizer_verifies_agent_artifacts_without_generation(self):
        source = (
            self.curation_root
            / "wasm"
            / "finalize_spawned_session"
            / "src"
            / "lib.rs"
        ).read_text()

        synth_start = source.index("fn verify_synthesized_languages")
        synth_end = source.index("fn verify_generated_language_identity", synth_start)
        synth = source[synth_start:synth_end]

        self.assertIn("verify_synthesis_finalizer_owned_artifacts", synth)
        self.assertIn("repair_missing_core_artifacts_when_spec_ready(", synth)
        self.assertNotIn("repair_synthesis_partial_language(", synth)
        self.assertLess(
            synth.index("repair_missing_core_artifacts_when_spec_ready("),
            synth.index("partial_design_language_contract_defects("),
            "mechanical core-artifact backstop must run before returning agent repair defects",
        )
        self.assertLess(
            synth.index("partial_design_language_contract_defects("),
            synth.index('"SubmitForReview"'),
            "synthesis must return agent-repairable defects before advancing to review",
        )

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
            source.index("Failed to finalize Session"),
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

    def test_finalizer_design_md_writer_bypasses_workspace_filesystem_actions(self):
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
        self.assertIn('/tdata/Directories', source)
        self.assertIn('/tdata/Files', source)
        self.assertIn("Files('{file_id}')/$value", source)


if __name__ == "__main__":
    unittest.main()
