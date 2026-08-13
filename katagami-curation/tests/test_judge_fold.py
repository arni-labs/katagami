"""Fold of the two study arms (ARN-291)."""

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "trajectory" / "judge_both_arms.py"


class JudgeFoldTest(unittest.TestCase):
    def _run(self, prose, machine):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / "prose.json").write_text(json.dumps(prose))
            (p / "machine.json").write_text(json.dumps(machine))
            out = subprocess.check_output(
                ["python3", str(SCRIPT), "--prose", str(p / "prose.json"),
                 "--machine", str(p / "machine.json")],
                text=True,
            )
            return json.loads(out)

    def test_any_false_folds_false(self):
        report = self._run(
            {"meta_behaviors": [
                {"name": "Look", "occurrences": [{"verdict": "true"}]},
                {"name": "Hand over", "occurrences": [{"verdict": "false"}]},
            ]},
            {"units": [
                {"name": "SubmitDesignLanguage", "occurrences": [{"verdict": "true"}]},
            ]},
        )
        self.assertEqual(report["prose"]["fold"], "false")
        self.assertEqual(report["prose"]["score"], 0.0)
        self.assertEqual(report["machine"]["fold"], "true")

    def test_exempted_items_do_not_enter_the_prose_score(self):
        report = self._run(
            {"meta_behaviors": [
                {"name": "C17 capture identity", "occurrences": [{"verdict": "false"}]},
                {"name": "Look at the render", "occurrences": [{"verdict": "true"}]},
            ]},
            {"units": []},
        )
        self.assertEqual(report["prose"]["fold"], "true")
        self.assertIn("C17 capture identity", report["prose"]["exempted"])
