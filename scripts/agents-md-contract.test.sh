#!/usr/bin/env bash
# Leftovers 4 and 5, locked to QA's exact replay ranges (f346383), not a guess.
# Also asserts leftovers 1–3 are still present so a docs-only pass cannot drop them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS="$ROOT/AGENTS.md"
BSM="$ROOT/katagami-curation/wasm/build_session_message/src/lib.rs"
FIN="$ROOT/katagami-curation/wasm/finalize_spawned_session/src/lib.rs"
SKILL="$ROOT/katagami-curation/agents/curator/skills/synthesize-language/SKILL.md"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok  $*" ; }
slice() { sed -n "$1p" "$2"; }

[ -f "$AGENTS" ] || fail "AGENTS.md missing"

# --- Leftover 4: QA curl ranges ---
# build_session_message lib.rs 382-410, 495-520
bsm_spawn="$(slice '382,410' "$BSM")"
printf '%s\n' "$bsm_spawn" | grep -q 'Dispatch SessionSpawned' \
  || fail "QA range BSM:382-410 must POST SessionSpawned"
printf '%s\n' "$bsm_spawn" | grep -q 'Katagami.Curation.SessionSpawned' \
  || fail "QA range BSM:382-410 must hit Katagami.Curation.SessionSpawned"
printf '%s\n' "$bsm_spawn" | grep -q 'dispatch_curation_job_failure' \
  || fail "QA range BSM:409 must call dispatch_curation_job_failure"

bsm_fail="$(slice '495,516' "$BSM")"
printf '%s\n' "$bsm_fail" | grep -q 'fn dispatch_curation_job_failure' \
  || fail "QA range BSM:495 must define dispatch_curation_job_failure"
printf '%s\n' "$bsm_fail" | grep -q 'Katagami.Curation.Fail' \
  || fail "QA range BSM:495-516 must POST Katagami.Curation.Fail"

# finalize_spawned_session lib.rs 315-476, 5940-5960
fin_repair="$(slice '315,476' "$FIN")"
printf '%s\n' "$fin_repair" | grep -q 'fn maybe_spawn_repair_job' \
  || fail "QA range FIN:315 must define maybe_spawn_repair_job"
printf '%s\n' "$fin_repair" | grep -q 'Create → Configure → Submit' \
  || fail "QA range FIN:408 must create then Configure + Submit"
printf '%s\n' "$fin_repair" | grep -q '"Configure"' \
  || fail "QA range FIN:447 must dispatch Configure"
printf '%s\n' "$fin_repair" | grep -q '"Submit"' \
  || fail "QA range FIN:448 must dispatch Submit"

fin_dispatch="$(slice '5940,5960' "$FIN")"
printf '%s\n' "$fin_dispatch" | grep -q 'fn dispatch_action' \
  || fail "QA range FIN:5940 must define dispatch_action"
printf '%s\n' "$fin_dispatch" | grep -q 'Temper.{action}' \
  || fail "QA range FIN:5952 must POST Temper.{action}"

if grep -nE 'never dispatches transitions itself' "$AGENTS"; then
  fail "AGENTS.md still claims WASM never dispatches (leftover 4)"
fi
grep -q 'SessionSpawned' "$AGENTS" || fail "AGENTS.md must name SessionSpawned (BSM:382)"
grep -q 'Fail' "$AGENTS" || fail "AGENTS.md must name Fail (BSM:495)"
grep -q 'SubmitForReview' "$AGENTS" || fail "AGENTS.md must name SubmitForReview (QA leftover 4)"
grep -q 'Publish' "$AGENTS" || fail "AGENTS.md must name Publish (QA leftover 4)"
grep -q 'maybe_spawn_repair_job' "$AGENTS" || fail "AGENTS.md must name maybe_spawn_repair_job (FIN:315)"
grep -q 'dispatch_action' "$AGENTS" || fail "AGENTS.md must name dispatch_action (FIN:5940)"
pass "leftover 4: QA curl ranges still dispatch; AGENTS.md names them"

# --- Leftover 5: QA lib.rs:989 + SKILL.md:22 ---
bsm_rules="$(slice '986,1036' "$BSM")"
printf '%s\n' "$bsm_rules" | grep -q 'TasteRules ENTITIES are outdated and must not be' \
  || fail "QA range BSM:989 must refuse TasteRule entities"
printf '%s\n' "$bsm_rules" | grep -q 'include_str!("../../../knowledge/rules/design-language.md")' \
  || fail "QA range BSM:992 must inline design-language.md"
printf '%s\n' "$bsm_rules" | grep -q 'fn render_taste_rules_block' \
  || fail "QA range BSM:998 must define render_taste_rules_block"

skill22="$(slice '22,23' "$SKILL")"
printf '%s\n' "$skill22" | grep -q 'taste rulebook inlined in this prompt' \
  || fail "QA SKILL.md:22 must obey the inlined rulebook"

PALETTE="$ROOT/katagami-curation/agents/curator/skills/synthesize-palette/SKILL.md"
ART="$ROOT/katagami-curation/agents/curator/skills/synthesize-art-style/SKILL.md"
REVIEW="$ROOT/katagami-curation/agents/curator/skills/review-quality/SKILL.md"
# QA replay of the three leftover skills: list('TasteRules') / Accepted TasteRules
# must not appear. "Do not list(...)" still matches that grep.
for f in "$PALETTE" "$ART" "$REVIEW"; do
  if grep -nE "list\('TasteRules'\)|Accepted TasteRules" "$f"; then
    fail "$f still lists TasteRules at gen time"
  fi
  grep -q 'taste rulebook inlined in this prompt' "$f" \
    || fail "$f must obey the inlined rulebook"
done
grep -q 'taste rulebook inlined in this prompt' "$SKILL" \
  || fail "synthesize-language/SKILL.md:22 must still obey the inlined rulebook"
pass "leftover 5 extra: palette / art-style / review-quality do not list TasteRules"

if grep -nE 'curator skills read them at generation time|read them at generation time' "$AGENTS"; then
  fail "AGENTS.md still says skills read TasteRule entities at gen time (leftover 5)"
fi
if grep -nE 'Canonical taste rules live in the deployed Katagami app' "$AGENTS"; then
  fail "AGENTS.md still names TasteRule entities as the generation source of truth"
fi
grep -q 'lib.rs:989' "$AGENTS" || fail "AGENTS.md must cite build_session_message lib.rs:989"
grep -q 'SKILL.md:22' "$AGENTS" || fail "AGENTS.md must cite synthesize-language/SKILL.md:22"
grep -q 'synthesize-palette/SKILL.md' "$AGENTS" || fail "AGENTS.md must name synthesize-palette"
grep -q 'synthesize-art-style/SKILL.md' "$AGENTS" || fail "AGENTS.md must name synthesize-art-style"
grep -q 'review-quality/SKILL.md' "$AGENTS" || fail "AGENTS.md must name review-quality"
grep -q 'knowledge/rules/design-language.md' "$AGENTS" || fail "AGENTS.md must name the inlined rulebook"
pass "leftover 5: QA lib.rs:989 + SKILL.md:22; AGENTS.md names all four gen/review skills"

if [ ! -L "$ROOT/CLAUDE.md" ]; then
  fail "CLAUDE.md must remain a symlink to AGENTS.md"
fi
pass "CLAUDE.md still symlinks to AGENTS.md"

# --- Leftovers 1–3 must not be dropped ---
grep -q 'known_submit_break' "$ROOT/scripts/run-local.sh" \
  || fail "leftover 1 dropped: run-local.sh must treat the Draft 409 as known_submit_break"
grep -q 'classify_seed_output' "$ROOT/scripts/lib/run-local-lib.sh" \
  || fail "leftover 1 dropped: classify_seed_output missing"
if grep -nE 'pkill( |$)' "$ROOT/scripts/run-local.sh" "$ROOT/scripts/lib/run-local-lib.sh"; then
  fail "leftover 3 dropped: pkill returned"
fi
grep -q 'ui_stack_env_file' "$ROOT/scripts/lib/run-local-lib.sh" \
  || fail "leftover 2 dropped: per-PORT env helper missing"
grep -q 'maybe_write_shared_ui_env' "$ROOT/scripts/lib/run-local-lib.sh" \
  || fail "leftover 2 dropped: shared .env.local guard missing"
pass "leftovers 1–3 still present"

# Leftover 6: do not Ev-strip every SubmitForReview -> 409.
if grep -nE 'grep -Ev.*SubmitForReview -> 409' "$ROOT/scripts/lib/run-local-lib.sh"; then
  fail "leftover 6: Ev-strip of every SubmitForReview -> 409 returned"
fi
grep -q 'is_known_draft_409_event' "$ROOT/scripts/lib/run-local-lib.sh" \
  || fail "leftover 6 dropped: each SubmitForReview 409 is classified on its own"
pass "leftover 6: classifier does not Ev-strip every 409"

echo "ALL PASSED"
