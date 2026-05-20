from pathlib import Path
import unittest


class BuildSessionStepMetricsTests(unittest.TestCase):
    def test_curation_build_session_message_emits_step_metrics(self):
        root = Path(__file__).resolve().parents[1]
        builder = (root / "wasm" / "build_session_message" / "src" / "lib.rs").read_text()

        self.assertIn(
            "katagami_curation_build_session_message_step_duration_ms",
            builder,
        )
        self.assertIn("emit_build_session_step_duration", builder)
        self.assertIn("Context::get_time_millis", builder)

        for needle in [
            '"prompt_assets"',
            '"ensure_workspace"',
            '"create_session"',
            '"configure_session"',
            '"session_spawned"',
            '"create_session_link"',
            '"configure_session_link"',
            '"total"',
            '"result": result',
        ]:
            with self.subTest(needle=needle):
                self.assertIn(needle, builder)


if __name__ == "__main__":
    unittest.main()
