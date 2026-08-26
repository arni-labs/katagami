#!/usr/bin/env bash
# Run the full Katagami multi-lane remix stack locally (no deploy).
#
#   bash scripts/run-local.sh
#
# Prereqs:
#   - `temper` on PATH (~/.cargo/bin is added automatically). Build it from a
#     temper checkout:  cargo build -p temper-cli  and symlink
#     target/debug/temper into ~/.cargo/bin.
#   - A temper checkout containing os-apps/temper-fs (default: a sibling
#     directory of this repo named `temper`; override with
#     TEMPER_REPO=/path/to/temper). The commons specs' ADR-0015 file-ready
#     guards cross-check File entities, so the temper-fs specs must be
#     registered alongside katagami-commons.
#
# Starts a local Temper server on :$PORT (default 3467), registers the temper-fs + commons
# specs at runtime (entity sets only register via POST /api/specs/load-dir —
# the `temper serve --specs-dir/--app` flags verify specs but do NOT expose
# their OData entity sets; the second load passes "merge":true because
# load-dir REPLACES the tenant registry by default), waits out the L0–L3
# verification cascade (several minutes on a debug build — creates return 423
# VerificationRequired until it finishes), seeds sample
# palettes/art-styles/languages, and starts the Next.js dev server on :$UI_PORT
# (default 3000). Open http://localhost:$UI_PORT/.
#
# Both ports are overridable so two stacks (or a verification run alongside
# someone's session) never fight over a port or kill each other's servers:
#   PORT=3499 UI_PORT=3500 bash scripts/run-local.sh
# The db and log paths key off $PORT, and --stop only ever touches the two
# ports it was given.
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
TEMPER_REPO="${TEMPER_REPO:-$ROOT/../temper}"
FS_SPECS="$TEMPER_REPO/os-apps/temper-fs/specs"
PORT="${PORT:-3467}"
UI_PORT="${UI_PORT:-3000}"
DB="/tmp/katagami-remix-local-$PORT.db"
TENANT=default
KEY=test-local-key
TEMPER_LOG="/tmp/katagami-temper-$PORT.log"
UI_LOG="/tmp/katagami-ui-$UI_PORT.log"
LAUNCH="/tmp/katagami-launch-$PORT.py"

stop() {
  echo "==> stopping anything on :$PORT and :$UI_PORT"
  kill "$(lsof -ti :"$PORT" 2>/dev/null)" 2>/dev/null || true
  kill "$(lsof -ti :"$UI_PORT" 2>/dev/null)" 2>/dev/null || true
  pkill -f "temper serve --port $PORT" 2>/dev/null || true
}

if [ "${1:-}" = "--stop" ]; then
  stop
  echo "==> stopped."
  exit 0
fi

if ! command -v temper >/dev/null; then
  echo "error: 'temper' not found on PATH." >&2
  echo "       Build it from a temper checkout:  cargo build -p temper-cli" >&2
  echo "       then:  ln -sf <temper>/target/debug/temper ~/.cargo/bin/temper" >&2
  exit 1
fi
if [ ! -d "$FS_SPECS" ]; then
  echo "error: temper-fs specs not found at $FS_SPECS" >&2
  echo "       The File entity set is required by the commons file-ready guards." >&2
  echo "       Point TEMPER_REPO at your temper checkout:  TEMPER_REPO=/path/to/temper bash scripts/run-local.sh" >&2
  exit 1
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

# load-dir runs the verification cascade synchronously-ish; give it a generous
# budget (minutes on a debug build) instead of aborting a load that will succeed.
load_specs() {
  local dir="$1" merge="$2"
  curl --max-time 1800 -s -X POST "http://localhost:$PORT/api/specs/load-dir" \
    -H "Content-Type: application/json" -H "x-tenant-id: $TENANT" -H "Authorization: Bearer $KEY" \
    -d "{\"specs_dir\":\"$dir\",\"tenant\":\"$TENANT\",\"merge\":$merge}" \
    | grep -o '"all_passed":[a-z]*' | tail -1
}

echo "==> registering temper-fs specs (File entities for the file-ready guards)"
load_specs "$FS_SPECS" false
echo "==> registering commons specs (merged into the tenant registry)"
load_specs "$ROOT/katagami-commons/specs" true

echo "==> seeding sample data (retries while the verification cascade finishes)"
seeded=0
for i in $(seq 1 90); do
  OUT="$(TEMPER_URL="http://localhost:$PORT" TENANT="$TENANT" KEY="$KEY" \
        node "$ROOT/scripts/seed-local-remix.mjs" 2>&1)" || true
  if echo "$OUT" | grep -q "=== Seed complete ==="; then
    echo "$OUT" | tail -5
    seeded=1
    break
  fi
  if echo "$OUT" | grep -q "VerificationRequired"; then
    echo "    attempt $i: verification cascade still running — retrying in 20s"
    sleep 20
    continue
  fi
  echo "$OUT" | tail -8
  echo "==> seed failed (see above)"
  exit 1
done
if [ "$seeded" != 1 ]; then
  echo "==> gave up waiting for the verification cascade (30 min)"
  exit 1
fi

echo "==> writing ui/.env.local"
cat > "$ROOT/ui/.env.local" <<EOF
NEXT_PUBLIC_TEMPER_API_URL=http://localhost:$PORT
NEXT_PUBLIC_TEMPER_TENANT=$TENANT
TEMPER_API_KEY=$KEY
EOF

if [ ! -e "$ROOT/ui/node_modules" ]; then
  echo "    (no ui/node_modules — run 'npm install' in ui/ first)"
fi

echo "==> starting UI dev server on :$UI_PORT (detached)"
( cd "$ROOT/ui" && python3 "$LAUNCH" "$UI_LOG" npm run dev -- --port "$UI_PORT" ) &
echo "    ui log: $UI_LOG"

echo "==> waiting for UI to accept connections"
curl --retry 60 --retry-delay 1 --retry-connrefused -sf "http://localhost:$UI_PORT/" >/dev/null \
  && echo "    UI up" || echo "    UI not responding yet — check $UI_LOG"

echo
echo "==> ready"
echo "    Gallery     http://localhost:$UI_PORT/"
echo "    Palettes    http://localhost:$UI_PORT/palettes"
echo "    Art Styles  http://localhost:$UI_PORT/art-styles"
echo "    Studio      http://localhost:$UI_PORT/studio"
echo "    (first hit on each route compiles for a few seconds)"
echo "    stop with:  PORT=$PORT UI_PORT=$UI_PORT bash scripts/run-local.sh --stop"
