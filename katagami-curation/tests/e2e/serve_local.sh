#!/usr/bin/env bash
# Boot a disposable local Temper with paw-fs + katagami-commons + katagami-curation
# merged into ONE tenant (mirroring the production install), ready for
# e2e_lane_verification.py.
#
# Requirements:
#   TEMPER_BIN      path to a `temper` binary built from nerdsane/temper main
#                   (cargo build -p temper-cli). REQUIRED.
#   PAW_FS_SPECS    paw-fs specs dir (default ~/Development/temperpaw/os-apps/paw-fs/specs)
#   E2E_PORT        server port (default 3901)
#   E2E_STATE_DIR   throwaway state dir (default ./.e2e-state; HOME is pointed here
#                   so the server's turso db + registry never touch real state)
#
# Specs load into tenant `default`. A permit-all Cedar policy is added —
# this harness is for a disposable local tenant only.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURATION_SPECS="$SCRIPT_DIR/../../specs"
COMMONS_SPECS="$SCRIPT_DIR/../../../katagami-commons/specs"
PAW_FS_SPECS="${PAW_FS_SPECS:-$HOME/Development/temperpaw/os-apps/paw-fs/specs}"
E2E_PORT="${E2E_PORT:-3901}"
E2E_STATE_DIR="${E2E_STATE_DIR:-$SCRIPT_DIR/.e2e-state}"

: "${TEMPER_BIN:?set TEMPER_BIN to a temper binary built from nerdsane/temper main}"

MERGED="$E2E_STATE_DIR/merged-specs"
rm -rf "$E2E_STATE_DIR"
mkdir -p "$MERGED/policies" "$E2E_STATE_DIR/home"

cp "$PAW_FS_SPECS"/*.ioa.toml "$COMMONS_SPECS"/*.ioa.toml "$CURATION_SPECS"/*.ioa.toml "$MERGED/"
cp "$COMMONS_SPECS"/policies/*.cedar "$CURATION_SPECS"/policies/*.cedar "$MERGED/policies/" 2>/dev/null || true
printf '// disposable local e2e tenant — permit everything\npermit(principal, action, resource);\n' \
  > "$MERGED/policies/zz_e2e_permit_all.cedar"

python3 - "$MERGED" "$PAW_FS_SPECS" "$COMMONS_SPECS" "$CURATION_SPECS" <<'PY'
import re, sys
merged, *spec_dirs = sys.argv[1:]
schemas = []
for d in spec_dirs:
    text = open(d + "/model.csdl.xml").read()
    found = re.findall(r"<Schema\b.*?</Schema>", text, re.S)
    assert found, d
    schemas.extend(found)
doc = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">\n'
    "  <edmx:DataServices>\n" + "\n".join(schemas) + "\n  </edmx:DataServices>\n</edmx:Edmx>\n"
)
open(merged + "/model.csdl.xml", "w").write(doc)
print(f"merged {len(schemas)} schemas into one tenant model")
PY

echo "starting blob sink on :3910 and temper on :$E2E_PORT (state in $E2E_STATE_DIR)"
python3 "$SCRIPT_DIR/blob_sink.py" &
BLOB_PID=$!
trap 'kill $BLOB_PID 2>/dev/null || true' EXIT

# Identity comes from a tenant credential only (ADR-0157): Temper strips
# caller-declared x-temper-* headers, so the driver presents TEMPER_API_KEY as a
# bearer. The kernel bootstraps that key as an operator credential in tenant
# `default` only, which is why the app loads there (also the production tenant
# name).
#
# Two registration steps, both needed: `--app` runs the verification cascade and
# loads the tenant's Cedar policies (including this harness's permit-all), while
# only POST /api/specs/load-dir exposes the entity sets over OData. Same split as
# scripts/run-local.sh.
export TEMPER_API_KEY="${E2E_API_KEY:-e2e-local-operator-key}"
E2E_TENANT="${E2E_TENANT:-default}"

HOME="$E2E_STATE_DIR/home" "$TEMPER_BIN" serve \
  --port "$E2E_PORT" --tenant "$E2E_TENANT" --no-observe \
  --app "$E2E_TENANT=$MERGED" &
TEMPER_PID=$!
trap 'kill $BLOB_PID $TEMPER_PID 2>/dev/null || true' EXIT

curl --retry 120 --retry-delay 1 --retry-connrefused -sf \
  -H "X-Tenant-Id: $E2E_TENANT" -H "Authorization: Bearer $TEMPER_API_KEY" \
  "http://127.0.0.1:$E2E_PORT/tdata" >/dev/null

echo "registering merged specs over OData (verification cascade; minutes on a debug build)"
LOAD_RESPONSE="$(curl --max-time 1800 -s -X POST "http://127.0.0.1:$E2E_PORT/api/specs/load-dir" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $E2E_TENANT" \
  -H "Authorization: Bearer $TEMPER_API_KEY" \
  -d "{\"specs_dir\":\"$MERGED\",\"tenant\":\"$E2E_TENANT\",\"merge\":true}")"
if ! grep -q '"all_passed":true' <<<"$LOAD_RESPONSE"; then
  echo "spec load failed: ${LOAD_RESPONSE:0:2000}" >&2
  exit 1
fi
echo "==> ready on :$E2E_PORT (tenant $E2E_TENANT)"
wait $TEMPER_PID
