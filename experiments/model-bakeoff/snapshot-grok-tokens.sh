#!/usr/bin/env bash
# Grok's ~/.grok/logs/unified.jsonl is a ~5-minute ROLLING buffer — per-turn token rows rotate
# out fast. This daemon continuously drains its token-bearing rows into a DURABLE, deduped
# accumulator so nothing is lost. Each row carries `sid`, which maps exactly to round+model via
# the isolated cwd session dir — so consolidate can attribute per-round even across concurrency.
#
#   bash snapshot-grok-tokens.sh [minutes]      # default 90; writes runs/_grok-tokens-all.jsonl
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MINS="${1:-90}"
OUT="$HERE/runs/_grok-tokens-all.jsonl"
U="$HOME/.grok/logs/unified.jsonl"
mkdir -p "$HERE/runs"; : >>"$OUT"
echo "draining $U -> $OUT for ${MINS}m (every 45s)"
for i in $(seq 1 $((MINS*60/45))); do
  python3 - "$U" "$OUT" <<'PY'
import json,sys
U,OUT=sys.argv[1],sys.argv[2]
seen=set()
try:
    for ln in open(OUT):
        try:r=json.loads(ln)
        except:continue
        seen.add((r.get('ts'),r.get('sid'),(r.get('ctx') or {}).get('loop_index')))
except FileNotFoundError:pass
new=0
try:
    with open(OUT,'a') as out:
        for ln in open(U):
            try:r=json.loads(ln)
            except:continue
            ctx=r.get('ctx') or {}
            if 'prompt_tokens' not in ctx:continue
            k=(r.get('ts'),r.get('sid'),ctx.get('loop_index'))
            if k in seen:continue
            seen.add(k); out.write(ln if ln.endswith('\n') else ln+'\n'); new+=1
except FileNotFoundError:pass
print(f"+{new}")
PY
  sleep 45
done