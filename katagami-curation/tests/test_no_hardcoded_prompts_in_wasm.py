import unittest
from pathlib import Path


class NoHardcodedPromptsInWasmTests(unittest.TestCase):
    def test_domain_prompt_fragments_live_outside_wasm(self):
        root = Path(__file__).resolve().parents[1]
        wasm_source = (root / "wasm" / "build_session_message" / "src" / "lib.rs").read_text()

        banned_fragments = [
            "Review Boundary",
            "Regeneration Mode",
            "Self-Contained HTML + Visual Verification Required",
            "If ANY section fails validation",
            "Do NOT repair the spec inside this quality_review job",
        ]
        for fragment in banned_fragments:
            self.assertNotIn(fragment, wasm_source)


if __name__ == "__main__":
    unittest.main()
