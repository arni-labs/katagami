import unittest
from pathlib import Path


def iter_legacy_reaction_files():
    root = Path(__file__).resolve().parents[1]
    yield root / "reactions" / "reactions.toml"
    yield root / "specs" / "reactions.toml"


class ReactionResolverTypeTests(unittest.TestCase):
    def test_legacy_reaction_files_remain_removed(self):
        for path in iter_legacy_reaction_files():
            self.assertFalse(
                path.exists(),
                f"{path} should stay deleted after the inline trigger hard cut",
            )


if __name__ == "__main__":
    unittest.main()
