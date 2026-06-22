import unittest
from dataclasses import dataclass, field


REQUIRED_ARTIFACTS = ("spec", "embodiment", "thumbnail", "design_md", "shadcn")


class HarnessContractError(AssertionError):
    pass


class PublishBlocked(HarnessContractError):
    pass


@dataclass
class FileArtifact:
    file_id: str
    status: str = "Ready"
    body: bytes | None = b"ready artifact body"
    path: str = ""
    name: str = ""
    mime_type: str = "application/octet-stream"


@dataclass
class DesignLanguage:
    language_id: str
    artifacts: dict[str, str]
    status: str = "UnderReview"


@dataclass
class CurationJob:
    job_id: str
    query_id: str
    phase: str
    direction_id: str = ""
    status: str = "Running"


@dataclass
class CurationQuery:
    query_id: str
    status: str = "Submitted"
    output_type: str = "design_language"
    direction_ids: list[str] = field(default_factory=list)
    completed_direction_ids: set[str] = field(default_factory=set)
    design_language_ids: list[str] = field(default_factory=list)
    quality_review_job_id: str = ""
    organize_job_id: str = ""
    # ARN-88 fan-out barrier counters, mirroring the CurationQuery spec.
    # directions_pending is widened (+1) when a direction queues its synthesize
    # job and narrowed (-1) on every terminal direction edge (Complete*/Fail);
    # directions_total is monotonic. The barrier opens (SynthesisComplete fires)
    # exactly once, when directions_pending == 0 AND directions_total >= 1.
    directions_pending: int = 0
    directions_total: int = 0
    synthesize_job_ids: list[str] = field(default_factory=list)
    barrier_opened: int = 0


class DeterministicCurationHarness:
    """Small local model for the Stream 1b curation lifecycle contracts."""

    def __init__(self):
        self.queries: dict[str, CurationQuery] = {}
        self.jobs: dict[str, CurationJob] = {}
        self.files: dict[str, FileArtifact] = {}
        self.languages: dict[str, DesignLanguage] = {}
        self.job_keys: set[tuple[str, str, str]] = set()
        self._next_job = 1
        self._next_query = 1
        self._next_file = 1
        self._next_language = 1

    def seed_query(self, output_type: str = "design_language") -> str:
        query_id = f"query-{self._next_query}"
        self._next_query += 1
        self.queries[query_id] = CurationQuery(query_id=query_id, output_type=output_type)
        return query_id

    def submit(self, query_id: str, directions: list[str]) -> None:
        query = self.queries[query_id]
        self._require_state(query.status, "Submitted")
        query.status = "Researching"
        source_job = self._spawn_job(query_id, "source_search")
        self._complete_job(source_job.job_id)

        # ResearchComplete: query enters Synthesizing with the discovered
        # directions. Empty fan-out fails fast (empty_fanout_fails_query).
        query.direction_ids = [f"direction-{index + 1}" for index, _ in enumerate(directions)]
        if not query.direction_ids:
            query.status = "Failed"
            return
        query.status = "Synthesizing"
        # QueueSynthesis on each direction: spawn the per-direction synthesize job
        # AND widen the parent barrier by one (queue_synthesis_widens_query_barrier
        # -> IncrementDirectionsPending, which bumps both counters).
        for direction_id in query.direction_ids:
            self._spawn_job(query_id, "synthesize", direction_id)
            self._increment_directions_pending(query)

    def _increment_directions_pending(self, query: CurationQuery) -> None:
        # IncrementDirectionsPending is from=[Researching, Synthesizing]; a late
        # increment after the query left those states is from-state-rejected.
        if query.status not in ("Researching", "Synthesizing"):
            return
        query.directions_pending += 1
        query.directions_total += 1

    def _decrement_directions_pending(self, query: CurationQuery, direction_id: str) -> None:
        # DecrementDirectionsPending is from=[Synthesizing]; from-state gating means
        # a terminal direction edge that lands after the barrier already opened (query
        # in Organizing/Completed/Failed) is rejected and cannot underflow or re-open.
        if query.status != "Synthesizing":
            return
        # DecrementCounter saturates at 0 in the kernel; mirror that here.
        query.directions_pending = max(0, query.directions_pending - 1)
        query.synthesize_job_ids.append(direction_id)
        # The decrement re-evaluates the barrier-open advance via a same_id
        # self-reaction (decrement_reevaluates_barrier_open -> SynthesisComplete).
        self._maybe_open_barrier(query)

    def _maybe_open_barrier(self, query: CurationQuery) -> None:
        # SynthesisComplete guard: max_count(directions_pending, max=1) i.e. == 0,
        # AND min_count(directions_total, min=1). One-shot: from=[Synthesizing].
        # The decrement self-reaction (decrement_reevaluates_barrier_open) is
        # trigger-guarded to the design_language lane, so palette/art_style queries
        # never advance to Organizing nor spawn a quality_review job.
        if query.status != "Synthesizing":
            return
        if query.output_type != "design_language":
            return
        if query.directions_pending == 0 and query.directions_total >= 1:
            query.status = "Organizing"
            query.barrier_opened += 1
            quality_job = self._spawn_job(query_id=query.query_id, phase="quality_review")
            query.quality_review_job_id = quality_job.job_id

    def complete_synthesis(self, query_id: str, direction_id: str, artifacts: dict[str, str]) -> str:
        query = self.queries[query_id]
        self._require_state(query.status, "Synthesizing")
        job = self._job_for(query_id, "synthesize", direction_id)
        self._complete_job(job.job_id)

        language_id = f"language-{self._next_language}"
        self._next_language += 1
        language = DesignLanguage(language_id=language_id, artifacts=artifacts)
        self._assert_complete_ready_artifacts(language)
        self.languages[language_id] = language
        query.design_language_ids.append(language_id)
        query.completed_direction_ids.add(direction_id)

        # CurationDirection.Complete drains the fan-out barrier by one.
        self._decrement_directions_pending(query, direction_id)
        return language_id

    def fail_synthesis(self, query_id: str, direction_id: str) -> None:
        """A per-direction synthesize job fails: the direction reaches Fail, which
        drains the barrier (direction_fail_narrows_query_barrier). The query is NOT
        failed directly (job_failure_fails_query is guarded to direction_id=="")."""
        query = self.queries[query_id]
        self._require_state(query.status, "Synthesizing")
        job = self._job_for(query_id, "synthesize", direction_id)
        self.jobs[job.job_id].status = "Failed"
        self._decrement_directions_pending(query, direction_id)

    def complete_quality_review(self, query_id: str) -> None:
        query = self.queries[query_id]
        self._require_state(query.status, "Organizing")
        self._complete_job(query.quality_review_job_id)
        for language_id in query.design_language_ids:
            self.publish_language(language_id)
        organize_job = self._spawn_job(query_id, "organize_taxonomy")
        query.organize_job_id = organize_job.job_id

    def complete_organization(self, query_id: str) -> None:
        query = self.queries[query_id]
        self._require_state(query.status, "Organizing")
        self._complete_job(query.organize_job_id)
        query.status = "Completed"

    def complete_file_set(self) -> dict[str, str]:
        return {kind: self.create_file(kind=kind).file_id for kind in REQUIRED_ARTIFACTS}

    def create_file(
        self,
        kind: str,
        *,
        status: str = "Ready",
        body: bytes | None = b"ready artifact body",
    ) -> FileArtifact:
        file_id = f"file-{self._next_file}"
        self._next_file += 1
        artifact = FileArtifact(
            file_id=file_id,
            status=status,
            body=body,
            path=f"/artifacts/{file_id}",
            name=f"{kind}.artifact",
        )
        self.files[file_id] = artifact
        return artifact

    def publish_language(self, language_id: str) -> None:
        language = self.languages[language_id]
        self._assert_complete_ready_artifacts(language)
        language.status = "Published"

    def job_contract_keys(self) -> set[tuple[str, str, str]]:
        return {
            (job.query_id, job.phase, job.direction_id)
            for job in self.jobs.values()
        }

    def _spawn_job(self, query_id: str, phase: str, direction_id: str = "") -> CurationJob:
        key = (query_id, phase, direction_id)
        if key in self.job_keys:
            raise HarnessContractError(f"duplicate job for {key}")
        self.job_keys.add(key)
        job_id = f"job-{self._next_job}"
        self._next_job += 1
        job = CurationJob(
            job_id=job_id,
            query_id=query_id,
            phase=phase,
            direction_id=direction_id,
        )
        self.jobs[job_id] = job
        return job

    def _job_for(self, query_id: str, phase: str, direction_id: str = "") -> CurationJob:
        key = (query_id, phase, direction_id)
        matches = [
            job
            for job in self.jobs.values()
            if (job.query_id, job.phase, job.direction_id) == key
        ]
        if len(matches) != 1:
            raise HarnessContractError(f"expected exactly one job for {key}, found {len(matches)}")
        return matches[0]

    def _complete_job(self, job_id: str) -> None:
        self.jobs[job_id].status = "Completed"

    def _assert_complete_ready_artifacts(self, language: DesignLanguage) -> None:
        missing = [kind for kind in REQUIRED_ARTIFACTS if not language.artifacts.get(kind)]
        if missing:
            raise PublishBlocked(f"missing artifacts: {', '.join(missing)}")

        for kind in REQUIRED_ARTIFACTS:
            file_id = language.artifacts[kind]
            artifact = self.files.get(file_id)
            if artifact is None:
                raise PublishBlocked(f"{kind} file {file_id} returned 404")
            if artifact.status != "Ready":
                raise PublishBlocked(f"{kind} file {file_id} is {artifact.status}, expected Ready")
            if artifact.body is None:
                raise PublishBlocked(f"{kind} file {file_id} returned 404 for $value")
            if len(artifact.body) == 0:
                raise PublishBlocked(f"{kind} file {file_id} is zero-byte")
            for field_name in ("path", "name", "mime_type"):
                if not getattr(artifact, field_name):
                    raise PublishBlocked(f"{kind} file {file_id} missing {field_name}")

    @staticmethod
    def _require_state(actual: str, expected: str) -> None:
        if actual != expected:
            raise HarnessContractError(f"expected {expected}, got {actual}")


class LocalIntegrationHarnessTests(unittest.TestCase):
    def test_clean_query_run_completes_with_complete_artifacts(self):
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query()

        harness.submit(query_id, ["quiet-grid", "ritual-paper"])
        for direction_id in list(harness.queries[query_id].direction_ids):
            harness.complete_synthesis(query_id, direction_id, harness.complete_file_set())
        harness.complete_quality_review(query_id)
        harness.complete_organization(query_id)

        query = harness.queries[query_id]
        self.assertEqual(query.status, "Completed")
        self.assertEqual(
            {harness.languages[language_id].status for language_id in query.design_language_ids},
            {"Published"},
        )

    def test_one_job_per_query_phase_direction(self):
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query()

        harness.submit(query_id, ["quiet-grid", "ritual-paper"])

        self.assertEqual(
            harness.job_contract_keys(),
            {
                (query_id, "source_search", ""),
                (query_id, "synthesize", "direction-1"),
                (query_id, "synthesize", "direction-2"),
            },
        )
        with self.assertRaisesRegex(HarnessContractError, "duplicate job"):
            harness._spawn_job(query_id, "synthesize", "direction-1")

    def test_fan_out_barrier_holds_until_all_directions_complete(self):
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query()
        harness.submit(query_id, ["quiet-grid", "ritual-paper"])

        harness.complete_synthesis(query_id, "direction-1", harness.complete_file_set())

        query = harness.queries[query_id]
        self.assertEqual(query.status, "Synthesizing")
        self.assertEqual(query.quality_review_job_id, "")
        self.assertNotIn((query_id, "quality_review", ""), harness.job_contract_keys())

        harness.complete_synthesis(query_id, "direction-2", harness.complete_file_set())

        self.assertEqual(query.status, "Organizing")
        self.assertEqual(query.directions_pending, 0)
        self.assertEqual(query.directions_total, 2)
        self.assertEqual(query.barrier_opened, 1)
        self.assertIn((query_id, "quality_review", ""), harness.job_contract_keys())

    def test_barrier_opens_once_with_mixed_complete_and_fail(self):
        # ARN-88 core proof: N=4 directions, mixed Complete/Fail. The barrier must
        # open EXACTLY ONCE and advance to Organizing; a failed direction drains the
        # barrier (does not stall) and does NOT fail the parent query.
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query()
        harness.submit(query_id, ["a", "b", "c", "d"])
        query = harness.queries[query_id]

        self.assertEqual(query.directions_pending, 4)
        self.assertEqual(query.directions_total, 4)

        # direction-1 completes; barrier still held (3 pending).
        harness.complete_synthesis(query_id, "direction-1", harness.complete_file_set())
        self.assertEqual(query.status, "Synthesizing")
        self.assertEqual(query.directions_pending, 3)

        # direction-2 FAILS; barrier drains by one, query stays alive.
        harness.fail_synthesis(query_id, "direction-2")
        self.assertEqual(query.status, "Synthesizing")
        self.assertEqual(query.directions_pending, 2)

        # direction-3 completes (2 -> 1 pending), still held.
        harness.complete_synthesis(query_id, "direction-3", harness.complete_file_set())
        self.assertEqual(query.status, "Synthesizing")
        self.assertEqual(query.directions_pending, 1)

        # direction-4 FAILS, last outstanding direction: barrier opens.
        harness.fail_synthesis(query_id, "direction-4")
        self.assertEqual(query.status, "Organizing")
        self.assertEqual(query.directions_pending, 0)
        self.assertEqual(query.directions_total, 4)
        self.assertEqual(query.barrier_opened, 1, "barrier must open exactly once")
        self.assertIn((query_id, "quality_review", ""), harness.job_contract_keys())

        # The query never went to Failed despite two failed directions, and only
        # one quality_review job was ever created.
        self.assertNotEqual(query.status, "Failed")
        quality_jobs = [
            key for key in harness.job_contract_keys() if key[1] == "quality_review"
        ]
        self.assertEqual(len(quality_jobs), 1)

        # Drive to completion to confirm the full pipeline still terminates.
        harness.complete_quality_review(query_id)
        harness.complete_organization(query_id)
        self.assertEqual(query.status, "Completed")

    def test_single_direction_barrier_opens(self):
        # N=1 boundary: one direction, one completion, barrier opens once.
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query()
        harness.submit(query_id, ["solo"])
        query = harness.queries[query_id]
        self.assertEqual(query.directions_total, 1)

        harness.complete_synthesis(query_id, "direction-1", harness.complete_file_set())
        self.assertEqual(query.status, "Organizing")
        self.assertEqual(query.barrier_opened, 1)

    def test_empty_fan_out_fails_fast(self):
        # ARN-88: 0 directions. directions_total stays 0, the min_count(>=1) floor
        # makes SynthesisComplete unreachable, and empty_fanout_fails_query fails the
        # query immediately instead of hanging until the Synthesizing timeout.
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query()
        harness.submit(query_id, [])
        query = harness.queries[query_id]

        self.assertEqual(query.status, "Failed")
        self.assertEqual(query.directions_total, 0)
        self.assertEqual(query.directions_pending, 0)
        self.assertEqual(query.barrier_opened, 0)
        self.assertNotIn((query_id, "quality_review", ""), harness.job_contract_keys())

    def test_palette_lane_drains_barrier_but_does_not_advance_to_organizing(self):
        # ARN-88 scoping: palette/art_style share the direction fan-out (so the
        # counters still widen and drain), but the barrier-open self-reaction is
        # guarded to the design_language lane. These terminal lanes must NOT
        # advance to Organizing nor spawn a quality_review job.
        harness = DeterministicCurationHarness()
        query_id = harness.seed_query(output_type="palette")
        harness.submit(query_id, ["warm", "cool"])
        query = harness.queries[query_id]
        self.assertEqual(query.directions_total, 2)

        harness.complete_synthesis(query_id, "direction-1", harness.complete_file_set())
        harness.complete_synthesis(query_id, "direction-2", harness.complete_file_set())

        # Counters drained, but the query stayed in Synthesizing (no barrier open).
        self.assertEqual(query.directions_pending, 0)
        self.assertEqual(query.barrier_opened, 0)
        self.assertEqual(query.status, "Synthesizing")
        self.assertNotIn((query_id, "quality_review", ""), harness.job_contract_keys())

    def test_404_and_zero_byte_files_block_publish(self):
        harness = DeterministicCurationHarness()
        missing = harness.complete_file_set()
        missing["thumbnail"] = "file-does-not-exist"
        missing_language = DesignLanguage("missing-language", missing)

        with self.assertRaisesRegex(PublishBlocked, "returned 404"):
            harness._assert_complete_ready_artifacts(missing_language)

        zero_byte = harness.complete_file_set()
        zero_byte["design_md"] = harness.create_file(kind="design_md", body=b"").file_id
        zero_byte_language = DesignLanguage("zero-byte-language", zero_byte)

        with self.assertRaisesRegex(PublishBlocked, "zero-byte"):
            harness._assert_complete_ready_artifacts(zero_byte_language)

    def test_not_ready_and_missing_metadata_files_block_publish(self):
        harness = DeterministicCurationHarness()
        not_ready = harness.complete_file_set()
        not_ready["embodiment"] = harness.create_file(
            kind="embodiment",
            status="Created",
        ).file_id
        not_ready_language = DesignLanguage("not-ready-language", not_ready)

        with self.assertRaisesRegex(PublishBlocked, "expected Ready"):
            harness._assert_complete_ready_artifacts(not_ready_language)

        missing_metadata = harness.complete_file_set()
        thumbnail = harness.create_file(kind="thumbnail")
        thumbnail.mime_type = ""
        missing_metadata["thumbnail"] = thumbnail.file_id
        missing_metadata_language = DesignLanguage(
            "missing-metadata-language",
            missing_metadata,
        )

        with self.assertRaisesRegex(PublishBlocked, "missing mime_type"):
            harness._assert_complete_ready_artifacts(missing_metadata_language)


if __name__ == "__main__":
    unittest.main()
