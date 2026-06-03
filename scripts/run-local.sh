#!/usr/bin/env bash
# Run the full Katagami multi-lane remix stack locally (no deploy).
#
#   bash scripts/run-local.sh
#
# Starts a local Temper server on :3467, registers the commons specs at runtime
# (entity sets only register via POST /api/specs/load-dir — the `temper serve
# --specs-dir/--app` flags verify specs but do NOT expose their OData entity
# sets), seeds sample palettes/art-styles/languages, and starts the Next.js dev
# server on :3000. Open http://localhost:3000/studio.
#
# Re-run any time; uses a fresh in-memory-ish turso file so it's reproducible.
set -euo pipefail

export PATH="$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3467
DB="/tmp/katagami-remix-local.db"
TENANT=default
KEY=test-local-key

echo "==> stopping anything on :$PORT and :3000"
kill "$(lsof -ti :$PORT 2>/dev/null)" 2>/dev/null || true
kill "$(lsof -ti :3000 2>/dev/null)" 2>/dev/null || true
rm -f "$DB" "$DB"-* 2>/dev/null || true

echo "==> starting temper serve on :$PORT"
( cd "$ROOT" && TURSO_URL="file:$DB" temper serve --port "$PORT" --tenant "$TENANT" --no-observe ) \
  >/tmp/katagami-temper.log 2>&1 &
echo "    temper log: /tmp/katagami-temper.log"

echo "==> waiting for Temper API"
curl --retry 30 --retry-delay 1 --retry-connrefused -sf \
  -H "X-Tenant-Id: $TENANT" -H "Authorization: Bearer $KEY" \
  "http://localhost:$PORT/tdata" >/dev/null

echo "==> registering commons specs (runtime load-dir)"
curl --max-time 180 -s -X POST "http://localhost:$PORT/api/specs/load-dir" \
  -H "Content-Type: application/json" -H "x-tenant-id: $TENANT" -H "Authorization: Bearer $KEY" \
  -d "{\"specs_dir\":\"$ROOT/katagami-commons/specs\",\"tenant\":\"$TENANT\"}" \
  | grep -o '"all_passed":[a-z]*' | tail -1

echo "==> seeding sample data"
TEMPER_URL="http://localhost:$PORT" TENANT="$TENANT" KEY="$KEY" node "$ROOT/scripts/seed-local-remix.mjs"

echo "==> starting UI dev server on :3000"
if [ ! -e "$ROOT/ui/node_modules" ]; then
  echo "    (no ui/node_modules — run 'npm install' in ui/, or symlink the main checkout's node_modules)"
fi
cat > "$ROOT/ui/.env.local" <<EOF
NEXT_PUBLIC_TEMPER_API_URL=http://localhost:$PORT
NEXT_PUBLIC_TEMPER_TENANT=$TENANT
TEMPER_API_KEY=$KEY
EOF
( cd "$ROOT/ui" && npm run dev ) >/tmp/katagami-ui.log 2>&1 &
echo "    ui log: /tmp/katagami-ui.log"

echo
echo "==> ready: http://localhost:3000/studio"
echo "    (give Next a few seconds to compile the first request)"
