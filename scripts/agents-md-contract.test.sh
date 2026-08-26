#!/usr/bin/env bash
# Lock leftovers 4 and 5: AGENTS.md must describe the two declared WASM
# modules and the inlined taste rulebook, not the stale never-dispatch /
# TasteRule-at-gen-time sentences that landed with #251.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS="$ROOT/AGENTS.md"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok  $*" ; }

[ -f "$AGENTS" ] || fail "AGENTS.md missing"

# Leftover 4: do not claim a transition-fired module never dispatches.
if grep -nE 'never dispatches transitions itself' "$AGENTS"; then
  fail "AGENTS.md still claims WASM never dispatches (leftover 4)"
fi
grep -q 'SessionSpawned' "$AGENTS" || fail "AGENTS.md must name build_session_message SessionSpawned"
grep -q 'maybe_spawn_repair_job' "$AGENTS" || fail "AGENTS.md must name finalize repair-job spawn"
grep -q 'SubmitForReview' "$AGENTS" || fail "AGENTS.md must name finalize SubmitForReview"
pass "leftover 4: AGENTS.md describes the two modules' dispatches"

# Leftover 5: do not claim curator skills read TasteRule entities at gen time.
if grep -nE 'curator skills read them at generation time|read them at generation time' "$AGENTS"; then
  fail "AGENTS.md still says skills read TasteRule entities at gen time (leftover 5)"
fi
if grep -nE 'Canonical taste rules live in the deployed Katagami app' "$AGENTS"; then
  fail "AGENTS.md still names TasteRule entities as the generation source of truth"
fi
grep -q 'knowledge/rules/design-language.md' "$AGENTS" || fail "AGENTS.md must name the inlined rulebook"
grep -q 'must not load' "$AGENTS" || fail "AGENTS.md must say TasteRule entities are not loaded for generation"
grep -q 'synthesize-language' "$AGENTS" || fail "AGENTS.md must name synthesize-language"
pass "leftover 5: AGENTS.md names the inlined rulebook, not TasteRule-at-gen-time"

# CLAUDE.md is the symlink #251 introduced; it must keep tracking AGENTS.md.
if [ ! -L "$ROOT/CLAUDE.md" ]; then
  fail "CLAUDE.md must remain a symlink to AGENTS.md"
fi
pass "CLAUDE.md still symlinks to AGENTS.md"

echo "ALL PASSED"
