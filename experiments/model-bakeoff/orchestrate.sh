#!/usr/bin/env bash
# Orchestrate one bake-off WAVE across all harnesses, headless, in parallel.
#
# Every agent runs IN ~/Development/katagami, writes ONLY into its own <dir>_<ts> folder
# there, is wall-clock timed (launch->exit), gets a per-model IMAGE tool instruction, and a
# per-model prompt file. Concurrency capped at MAXJOBS.
#
#   bash orchestrate.sh <round-slug>           # e.g. kodomo-no-hi-9
#   $PROMPT_MAIN        = immersive prompt (wave 1, the 12 models)
#   prompt-fusion.txt = Fusion's cheaper no-immersive prompt (wave 2)
#
# Image routing (per Rita): GPT-5.5 -> built-in OpenAI image; grok-build -> grok `imagine`;
# everyone else -> fal.ai. Low-poly is scoped to the immersive page only (see $PROMPT_MAIN).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
KATAGAMI="$HOME/Development/katagami"
SLUG="${1:?usage: orchestrate.sh <round-slug>}"
[ -d "$KATAGAMI" ] || { echo "missing katagami checkout: $KATAGAMI"; exit 1; }
TS="$(date +%Y-%m-%d_%H%M)"
LOGS="$HERE/runs/$SLUG"; mkdir -p "$LOGS"; : >"$LOGS/pids.txt"
MAXJOBS="${MAXJOBS:-12}"
SKIP="${SKIP:-}"   # space-separated launch names to skip, e.g. SKIP="gpt grok-build"
PROMPT_MAIN="${PROMPT_MAIN:-prompt.txt}"   # main prompt for the whole wave; e.g. PROMPT_MAIN=prompt-norules.txt for round 10
echo "round=$SLUG  ts=$TS  cwd=ISOLATED(per-model)  cap=$MAXJOBS  skip='$SKIP'  logs=$LOGS"

running_count(){ local n=0 pid; for pid in $(awk '{print $2}' "$LOGS/pids.txt" 2>/dev/null); do kill -0 "$pid" 2>/dev/null && n=$((n+1)); done; echo "$n"; }
throttle(){ while [ "$(running_count)" -ge "$MAXJOBS" ]; do sleep 3; done; }

launch(){                          # launch <name> <dir> <promptfile> <media> <cmd...>
  local name="$1" dir="$2" pf="$3" media="$4"; shift 4
  case " $SKIP " in *" $name "*) echo "[$name] SKIPPED (kept from prior run)"; return;; esac
  [ -f "$HERE/$pf" ] || { echo "[$name] MISSING prompt file $pf — skipped"; return; }
  throttle
  # ISOLATED clean room per model — NO repo, NO prior examples, NO sibling outputs.
  local iso="$LOGS/iso/$name"; rm -rf "$iso"; mkdir -p "$iso"
  # rules round only: seed ONLY the rulebook, at the exact path the prompt reads.
  if grep -q 'design-language.md' "$HERE/$pf"; then
    mkdir -p "$iso/katagami-curation/knowledge/rules"
    cp "$KATAGAMI/katagami-curation/knowledge/rules/design-language.md" "$iso/katagami-curation/knowledge/rules/" 2>/dev/null \
      || echo "[$name] WARN: rules file not found to seed"
  fi
  local out="$iso/${dir}_${TS}"; mkdir -p "$out"
  local prompt; prompt="$(cat "$HERE/$pf")"
  local p="$prompt

[OUTPUT] Write ALL deliverables ONLY inside this folder: $out/
Work ONLY within your current directory; do not read, browse, or reference any path outside it.

[$media]"
  echo "[$name] -> iso/$name/${dir}_${TS}"
  (
    cd "$iso" || exit 9
    s=$(date +%s)
    "$@" "$p" </dev/null >"$LOGS/$name.log" 2>&1
    rc=$?; e=$(date +%s)
    printf '{"name":"%s","dir":"%s","outdir":"%s","exit":%d,"start_epoch":%d,"end_epoch":%d,"wall_seconds":%d,"started":"%s","ended":"%s"}\n' \
      "$name" "$dir" "$out" "$rc" "$s" "$e" "$((e-s))" "$(date -r "$s" +%H:%M:%S)" "$(date -r "$e" +%H:%M:%S)" \
      > "$LOGS/$name.timing.json"
    echo "[$name] EXIT $rc in $((e-s))s" >>"$LOGS/$name.log"
  ) &
  echo "$name $!" >>"$LOGS/pids.txt"
}

FAL="IMAGE GENERATION: use the fal-ai MCP with the model 'xai/grok-imagine-image' (xAI Grok Imagine) for ALL hero/feature imagery. Use ONLY that fal model — do NOT substitute flux, nano-banana, recraft, or any other model, and do NOT use Higgsfield."
OPENAI="IMAGE GENERATION: use your built-in OpenAI image generation (gpt-image) for ALL hero/feature imagery."
IMAGINE="IMAGE GENERATION: use your built-in grok 'imagine' tool for ALL hero/feature imagery. Do NOT use Higgsfield."

# ===== WAVE 1 — all 12 except Fusion ============================================
launch opus        opus-4.8     $PROMPT_MAIN "$FAL"     claude -p --dangerously-skip-permissions --model opus
launch gpt         gpt-5        $PROMPT_MAIN "$OPENAI"  lapdog codex exec --dangerously-bypass-approvals-and-sandbox
launch grok-build  grok-4.3     $PROMPT_MAIN "$IMAGINE" grok --always-approve --max-turns 1000 -m grok-build -p
launch composer    composer     $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m grok-composer-2.5-fast -p
launch glm         glm-5.2      $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m glm52 -p
launch qwen36-or   qwen3.6-35b  $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m qwen36-or -p
launch deepseek    deepseek-v4  $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m deepseek-v4 -p
launch minimax     minimax-m3   $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m minimax-m3 -p
launch kimi        kimi-k2.7    $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m kimi-k27 -p
launch qwen37      qwen3.7-max  $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m qwen37 -p
launch fugu        fugu         $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m fugu -p
launch fugu-ultra  fugu-ultra   $PROMPT_MAIN "$FAL"     grok --always-approve --max-turns 1000 -m fugu-ultra -p
# ===== WAVE 2 (run separately): Fusion, reduced prompt =========================
# launch fusion    fusion       prompt-fusion.txt "$FAL"  grok --always-approve --max-turns 1000 -m fusion -p

echo "launched $(wc -l <"$LOGS/pids.txt" | tr -d ' ') runs (cap $MAXJOBS). watch: lapdog | tail -f $LOGS/*.log"
wait
echo "==== WAVE COMPLETE ($SLUG, ts=$TS) — wall-clock per model: ===="
for t in "$LOGS"/*.timing.json; do cat "$t"; echo; done
echo "next: node consolidate.mjs $SLUG $TS"
