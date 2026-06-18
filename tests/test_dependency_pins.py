import unittest
from pathlib import Path
import tomllib


class DependencyPinTests(unittest.TestCase):
    def test_genesis_dependencies_preserve_session_entry_hotfix(self):
        root = Path(__file__).resolve().parents[1]
        app = tomllib.loads((root / "app.toml").read_text())

        dependencies = set(app["dependencies"])

        self.assertIn(
            "temperpaw/paw-agent@c2e99e5e5bae0dbfc667fee929100cef32ecebc6",
            dependencies,
            "katagami-curation installs must not downgrade the paw-agent SessionEntry hotfix",
        )
        self.assertIn(
            "temperpaw/paw-fs@8cc9c1a0c3959ba0555a6eac5446db76de747817",
            dependencies,
        )
        self.assertIn(
            "katagami/katagami-commons@1cc425ef14205e9d63bdec5f8289bb110e4d4b3f",
            dependencies,
        )


if __name__ == "__main__":
    unittest.main()
