#!/usr/bin/env bash
# Run the full Katagami multi-lane remix stack locally (no deploy).
#
#   bash scripts/run-local.sh
#
# Starts a local Temper server on :3467, registers the commons specs at runtime
# (entity sets only register via POST /api/specs/load-dir — the `temper serve
# --specs-dir/--app` flags verify specs but do NOT expose their OData entity
# sets), seeds sample palettes/art-styles/languages, and starts the Next.js dev
# server on :3000. Open http://localhost:3000/.
#
# Both servers are launched FULLY DETACHED (own session via a setsid launcher),
# so they keep running after this script exits — they survive the terminal/agent
# that started them. Re-run any time; it stops the old servers, uses a fresh
# turso file, and reseeds, so a single command always gives a clean, seeded stack.
#
# Stop everything later with:  bash scripts/run-local.sh --stop
set -euo pipefail

export PATH="$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3467
DB="/tmp/katagami-remix-local.db"
TENANT=default
KEY=test-local-key
TEMPER_LOG=/tmp/katagami-temper.log
UI_LOG=/tmp/katagami-ui.log
LAUNCH=/tmp/katagami-launch.py

stop() {
  echo "==> stopping anything on :$PORT and :3000"
  kill "$(lsof -ti :"$PORT" 2>/dev/null)" 2>/dev/null || true
  kill "$(lsof -ti :3000 2>/dev/null)" 2>/dev/null || true
  pkill -f "temper serve --port $PORT" 2>/dev/null || true
}

if [ "${1:-}" = "--stop" ]; then
  stop
  echo "==> stopped."
  exit 0
fi

# A tiny launcher that detaches a process into its own session (macOS has no
# `setsid`), redirects its output to a log, and replaces itself with the target
# command. Anything started through this survives the parent shell exiting.
cat > "$LAUNCH" <<'PY'
import os, sys
log = sys.argv[1]
os.setsid()                                   # new session: not reaped with the parent
fd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
os.dup2(fd, 1); os.dup2(fd, 2)
dn = os.open(os.devnull, os.O_RDONLY); os.dup2(dn, 0)
os.execvp(sys.argv[2], sys.argv[2:])          # become the target command
PY

stop
sleep 1
rm -f "$DB" "$DB"-* 2>/dev/null || true

echo "==> starting temper serve on :$PORT (detached)"
( cd "$ROOT" && TURSO_URL="file:$DB" python3 "$LAUNCH" "$TEMPER_LOG" \
    temper serve --port "$PORT" --tenant "$TENANT" --no-observe ) &
echo "    temper log: $TEMPER_LOG"

echo "==> waiting for Temper API"
curl --retry 40 --retry-delay 1 --retry-connrefused -sf \
  -H "X-Tenant-Id: $TENANT" -H "Authorization: Bearer $KEY" \
  "http://localhost:$PORT/tdata" >/dev/null

echo "==> registering commons specs (runtime load-dir)"
curl --max-time 180 -s -X POST "http://localhost:$PORT/api/specs/load-dir" \
  -H "Content-Type: application/json" -H "x-tenant-id: $TENANT" -H "Authorization: Bearer $KEY" \
  -d "{\"specs_dir\":\"$ROOT/katagami-commons/specs\",\"tenant\":\"$TENANT\"}" \
  | grep -o '"all_passed":[a-z]*' | tail -1

echo "==> seeding sample data"
TEMPER_URL="http://localhost:$PORT" TENANT="$TENANT" KEY="$KEY" node "$ROOT/scripts/seed-local-remix.mjs" | tail -4

echo "==> writing ui/.env.local"
cat > "$ROOT/ui/.env.local" <<EOF
NEXT_PUBLIC_TEMPER_API_URL=http://localhost:$PORT
NEXT_PUBLIC_TEMPER_TENANT=$TENANT
TEMPER_API_KEY=$KEY
EOF

if [ ! -e "$ROOT/ui/node_modules" ]; then
  echo "    (no ui/node_modules — run 'npm install' in ui/ first)"
fi

echo "==> starting UI dev server on :3000 (detached)"
( cd "$ROOT/ui" && python3 "$LAUNCH" "$UI_LOG" npm run dev ) &
echo "    ui log: $UI_LOG"

echo "==> waiting for UI to accept connections"
curl --retry 60 --retry-delay 1 --retry-connrefused -sf "http://localhost:3000/" >/dev/null \
  && echo "    UI up" || echo "    UI not responding yet — check $UI_LOG"

echo
echo "==> ready"
echo "    Gallery     http://localhost:3000/"
echo "    Palettes    http://localhost:3000/palettes"
echo "    Art Styles  http://localhost:3000/art-styles"
echo "    Studio      http://localhost:3000/studio"
echo "    (first hit on each route compiles for a few seconds)"
echo "    stop with:  bash scripts/run-local.sh --stop"
