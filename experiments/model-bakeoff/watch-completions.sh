#!/usr/bin/env bash
# Wait until the NEXT model in a round finishes (a timing.json not yet in .reported),
# print which finished, mark it, and exit. Re-launch to catch the following one.
#   bash watch-completions.sh <round-slug> [total]
HERE="$(cd "$(dirname "$0")" && pwd)"
RUNS="$HERE/runs/${1:?slug}"
TOTAL="${2:-12}"
rep="$RUNS/.reported"; touch "$rep"
new=""
for i in $(seq 1 400); do
  new=""
  for t in "$RUNS"/*.timing.json; do
    [ -f "$t" ] || continue
    n=$(basename "$t" .timing.json)
    grep -qxF "$n" "$rep" 2>/dev/null || new="$new $n"
  done
  [ -n "$new" ] && break
  [ "$(ls "$RUNS"/*.timing.json 2>/dev/null | wc -l | tr -d ' ')" -ge "$TOTAL" ] && break
  sleep 12
done
for n in $new; do
  python3 -c "import json;d=json.load(open('$RUNS/$n.timing.json'));print('DONE %-12s exit=%s wall=%dm%02ds'%(d['name'],d['exit'],d['wall_seconds']//60,d['wall_seconds']%60))" 2>/dev/null
  echo "$n" >> "$rep"
done
echo "progress: $(ls "$RUNS"/*.timing.json 2>/dev/null | wc -l | tr -d ' ')/$TOTAL"
