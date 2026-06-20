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
    direction_ids: list[str] = field(default_factory=list)
    completed_direction_ids: set[str] = field(default_factory=set)
    design_language_ids: list[str] = field(default_factory=list)
    quality_review_job_id: str = ""
    organize_job_id: str = ""


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

    def seed_query(self) -> str:
        query_id = f"query-{self._next_query}"
        self._next_query += 1
        self.queries[query_id] = CurationQuery(query_id=query_id)
        return query_id

    def submit(self, query_id: str, directions: list[str]) -> None:
        query = self.queries[query_id]
        self._require_state(query.status, "Submitted")
        query.status = "Researching"
        source_job = self._spawn_job(query_id, "source_search")
        self._complete_job(source_job.job_id)

        query.status = "Synthesizing"
        query.direction_ids = [f"direction-{index + 1}" for index, _ in enumerate(directions)]
        for direction_id in query.direction_ids:
            self._spawn_job(query_id, "synthesize", direction_id)

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

        if set(query.direction_ids) == query.completed_direction_ids:
            query.status = "Organizing"
            quality_job = self._spawn_job(query_id, "quality_review")
            query.quality_review_job_id = quality_job.job_id
        return language_id

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
        self.assertIn((query_id, "quality_review", ""), harness.job_contract_keys())

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
