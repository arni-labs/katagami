#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
GENESIS_BASE="${GENESIS_BASE:-https://genesis-production-164d.up.railway.app}"
TENANT="${TENANT:-default}"
WORK_DIR="${WORK_DIR:-${TMPDIR:-/tmp}/katagami-genesis-sync}"
MODE="${1:-pull}"

COMMONS_URL="${GENESIS_BASE}/katagami/katagami-commons.git"
CURATION_URL="${GENESIS_BASE}/katagami/katagami-curation.git"

app_id_for() {
  local name="$1"
  printf 'app-katagami-%s' "$name"
}

configure_git_http_headers() {
  local repo="$1"
  local key="http.${GENESIS_BASE}/.extraHeader"

  git -C "$repo" config --unset-all "$key" >/dev/null 2>&1 || true
  git -C "$repo" config --add "$key" "X-Tenant-Id: ${TENANT}"
  if [[ -n "${GENESIS_API_KEY:-}" ]]; then
    git -C "$repo" config --add "$key" "Authorization: Bearer ${GENESIS_API_KEY}"
  fi
  git -C "$repo" config protocol.version 0
}

curl_header_args() {
  CURL_HEADERS=(-H "X-Tenant-Id: ${TENANT}")
  if [[ -n "${GENESIS_API_KEY:-}" ]]; then
    CURL_HEADERS+=(-H "Authorization: Bearer ${GENESIS_API_KEY}")
  fi
}

clean_generated_files() {
  local dir="$1"

  find "$dir" -type d \( -name '__pycache__' -o -name '.pytest_cache' \) -prune -exec rm -rf {} +
  find "$dir" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete
}

json_string() {
  python3 -c 'import json, sys; print(json.dumps(sys.argv[1]))' "$1"
}

genesis_get() {
  local path="$1"
  local headers=()

  curl_header_args
  headers=("${CURL_HEADERS[@]}")
  curl -fsS "${headers[@]}" "${GENESIS_BASE}${path}"
}

latest_hash_for() {
  local name="$1"
  local app_id

  app_id="$(app_id_for "$name")"
  genesis_get "/tdata/Apps('${app_id}')" \
    | python3 -c 'import json, sys; d=json.load(sys.stdin); print(d.get("LatestVersionHash") or d.get("fields", {}).get("LatestVersionHash", ""))'
}

publish_latest() {
  local name="$1"
  local hash="$2"
  local app_id latest body response
  local headers=()

  app_id="$(app_id_for "$name")"
  latest="$(latest_hash_for "$name")"
  if [[ "$latest" == "$hash" ]]; then
    echo "${name}: Genesis latest already ${hash}"
    return 0
  fi

  body="$(printf '{"NewHash":%s,"RefName":"main"}' "$(json_string "$hash")")"
  curl_header_args
  headers=("${CURL_HEADERS[@]}")
  headers+=("-H" "Content-Type: application/json")

  echo "${name}: promoting Genesis latest to ${hash} via Temper.Git.PublishNewVersion"
  if ! response="$(
    curl -fsS -X POST "${headers[@]}" \
      "${GENESIS_BASE}/tdata/Apps('${app_id}')/Temper.Git.PublishNewVersion?await_integration=true" \
      --data "$body" 2>&1
  )"; then
    latest="$(latest_hash_for "$name" || true)"
    if [[ "$latest" == "$hash" ]]; then
      echo "${name}: publish returned an error, but Genesis latest verified as ${hash}"
      return 0
    fi
    echo "${name}: failed to publish Genesis latest for ${hash}" >&2
    echo "$response" >&2
    return 1
  fi

  latest="$(latest_hash_for "$name")"
  if [[ "$latest" != "$hash" ]]; then
    echo "${name}: publish completed but LatestVersionHash is ${latest:-<empty>} not ${hash}" >&2
    echo "$response" >&2
    return 1
  fi

  echo "${name}: verified LatestVersionHash=${hash}"
}

clone_app() {
  local url="$1"
  local dest="$2"

  rm -rf "$dest"
  git \
    -c "http.${GENESIS_BASE}/.extraHeader=X-Tenant-Id: ${TENANT}" \
    -c protocol.version=0 \
    clone "$url" "$dest"
  configure_git_http_headers "$dest"
}

sync_app() {
  local source="$1"
  local dest="$2"

  rsync -a --delete \
    --exclude='.git' \
    --exclude='__pycache__/' \
    --exclude='*.py[co]' \
    --exclude='.pytest_cache/' \
    "${source}/" "${ROOT}/${dest}/"
  clean_generated_files "${ROOT}/${dest}"
}

push_app() {
  local name="$1"
  local source="$2"
  local repo="$3"

  rsync -a --delete \
    --exclude='.git' \
    --exclude='__pycache__/' \
    --exclude='*.py[co]' \
    --exclude='.pytest_cache/' \
    "${ROOT}/${source}/" "${repo}/"
  clean_generated_files "$repo"
  git -C "$repo" add -A

  if git -C "$repo" diff --cached --quiet; then
    echo "${name}: Genesis already matches ${source}/"
  else
    git -C "$repo" commit -m "Sync ${name} from katagami monorepo"
    git -C "$repo" push origin main
  fi

  publish_latest "$name" "$(git -C "$repo" rev-parse HEAD)"
}

usage() {
  cat <<'USAGE'
Usage: scripts/sync-genesis-katagami.sh [pull|push]

  pull  Refresh katagami-commons/ and katagami-curation/ from Genesis and stage them.
  push  Commit the current folder states back to the two Genesis app repos,
        publish/promote the pushed hashes, and verify Genesis latest.

Genesis is the source of truth for these two app folders. The script uses clean
temporary clones with Git protocol v0 because direct non-empty fetches from the
current Genesis smart-HTTP service can fail during pack negotiation. Set
GENESIS_API_KEY when the target Genesis deployment requires a bearer token.
USAGE
}

case "$MODE" in
  pull|push) ;;
  -h|--help|help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

mkdir -p "$WORK_DIR"

configure_git_http_headers "$ROOT"

if ! git -C "$ROOT" remote get-url katagami-commons >/dev/null 2>&1; then
  git -C "$ROOT" remote add katagami-commons "$COMMONS_URL"
else
  git -C "$ROOT" remote set-url katagami-commons "$COMMONS_URL"
fi

if ! git -C "$ROOT" remote get-url katagami-curation >/dev/null 2>&1; then
  git -C "$ROOT" remote add katagami-curation "$CURATION_URL"
else
  git -C "$ROOT" remote set-url katagami-curation "$CURATION_URL"
fi

clone_app "$COMMONS_URL" "${WORK_DIR}/katagami-commons"
clone_app "$CURATION_URL" "${WORK_DIR}/katagami-curation"

if [[ "$MODE" == "pull" ]]; then
  sync_app "${WORK_DIR}/katagami-commons" "katagami-commons"
  sync_app "${WORK_DIR}/katagami-curation" "katagami-curation"

  git -C "$ROOT" add -A katagami-commons katagami-curation
  git -C "$ROOT" add -f katagami-curation/wasm/*/Cargo.lock

  echo "Synced Genesis source-of-truth apps into katagami-commons/ and katagami-curation/."
  echo "Review with: git diff --cached --stat"
else
  push_app "katagami-commons" "katagami-commons" "${WORK_DIR}/katagami-commons"
  push_app "katagami-curation" "katagami-curation" "${WORK_DIR}/katagami-curation"
fi
