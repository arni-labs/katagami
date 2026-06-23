"""WASM source-parity guard (RFC Stage D: prod never silently diverges from git).

The committed ``.wasm`` for each curation module MUST match a fresh release build
of its current ``src/``. A stale blob deploys code the reviewed source does not
produce — exactly the failure mode that shipped a removed-but-still-present
verifier-dispatch path. Skips when the wasm toolchain is unavailable (e.g. a
docs-only CI lane), so it never blocks unrelated work, but fails loudly on drift
wherever the toolchain exists.
"""

import hashlib
import os
import shutil
import subprocess
import unittest

WASM_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "wasm"))
MODULES = ("build_session_message", "finalize_spawned_session")


def _toolchain_available() -> bool:
    if not shutil.which("cargo"):
        return False
    try:
        out = subprocess.run(
            ["rustc", "--print", "target-list"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception:
        return False
    return out.returncode == 0 and "wasm32-unknown-unknown" in out.stdout


def _sha256(path: str) -> str:
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


class WasmSourceParityTests(unittest.TestCase):
    @unittest.skipUnless(
        _toolchain_available(), "requires cargo + the wasm32-unknown-unknown target"
    )
    def test_committed_wasm_matches_a_fresh_build(self) -> None:
        for module in MODULES:
            with self.subTest(module=module):
                mod_dir = os.path.join(WASM_DIR, module)
                committed = os.path.join(mod_dir, f"{module}.wasm")
                self.assertTrue(
                    os.path.exists(committed), f"{module}.wasm is not committed"
                )
                # Touch the crate root so cargo recompiles from current source
                # rather than reusing a possibly-stale cached artifact.
                os.utime(os.path.join(mod_dir, "src", "lib.rs"), None)
                subprocess.run(
                    ["cargo", "build", "--release", "--target", "wasm32-unknown-unknown"],
                    cwd=mod_dir,
                    check=True,
                    capture_output=True,
                    text=True,
                )
                built = os.path.join(
                    mod_dir,
                    "target",
                    "wasm32-unknown-unknown",
                    "release",
                    f"{module}.wasm",
                )
                self.assertEqual(
                    _sha256(built),
                    _sha256(committed),
                    f"\n{module}.wasm is STALE relative to its source. Rebuild + commit:\n"
                    f"  cd katagami-curation/wasm/{module} && "
                    f"cargo build --release --target wasm32-unknown-unknown && "
                    f"cp target/wasm32-unknown-unknown/release/{module}.wasm {module}.wasm",
                )


if __name__ == "__main__":
    unittest.main()
