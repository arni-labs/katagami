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
  find "$dir" -type d -name 'target' -prune -exec rm -rf {} +
  find "$dir" -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete
}

json_string() {
  python3 -c 'import json, sys; print(json.dumps(sys.argv[1]))' "$1"
}

# --- base tracking: the Genesis commit each app folder was last synced at.
# Push uses it to rebase ONLY the local delta onto Genesis HEAD, so a stale
# snapshot can never silently revert work someone else pushed in between. ---
BASE_DIR="${ROOT}/.genesis-sync"

base_file_for() {
  printf '%s/%s.base' "$BASE_DIR" "$1"
}

record_base() {
  local name="$1" hash="$2"
  mkdir -p "$BASE_DIR"
  printf '%s\n' "$hash" > "$(base_file_for "$name")"
}

read_base() {
  local f
  f="$(base_file_for "$1")"
  [[ -f "$f" ]] && tr -d '[:space:]' < "$f" || true
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
    --exclude='target/' \
    "${source}/" "${ROOT}/${dest}/"
  clean_generated_files "${ROOT}/${dest}"
}

apply_snapshot() {
  # rsync the local app folder over the clone's working tree + stage it
  local source="$1" repo="$2"
  rsync -a --delete \
    --exclude='.git' \
    --exclude='__pycache__/' \
    --exclude='*.py[co]' \
    --exclude='.pytest_cache/' \
    --exclude='target/' \
    "${ROOT}/${source}/" "${repo}/"
  clean_generated_files "$repo"
  git -C "$repo" add -A
}

push_app() {
  local name="$1"
  local source="$2"
  local repo="$3"
  local remote_head base

  remote_head="$(git -C "$repo" rev-parse HEAD)"
  base="$(read_base "$name")"

  if [[ -z "$base" ]]; then
    echo "${name}: no recorded sync base (.genesis-sync/${name}.base missing)." >&2
    echo "${name}: a blind snapshot push can silently revert concurrent Genesis work." >&2
    echo "${name}: run 'scripts/sync-genesis-katagami.sh pull' first, re-apply your" >&2
    echo "${name}: changes, then push — or set FORCE_SNAPSHOT=1 if you are CERTAIN" >&2
    echo "${name}: this folder reflects Genesis HEAD plus only your changes." >&2
    if [[ "${FORCE_SNAPSHOT:-0}" != "1" ]]; then
      return 1
    fi
    echo "${name}: FORCE_SNAPSHOT=1 — proceeding with a snapshot replace of HEAD."
    base="$remote_head"
  fi

  if ! git -C "$repo" cat-file -e "${base}^{commit}" 2>/dev/null; then
    echo "${name}: recorded base ${base} is not in the Genesis history — run pull, re-apply, retry." >&2
    return 1
  fi

  if [[ "$base" == "$remote_head" ]]; then
    # fast path: nobody pushed since our pull — commit the snapshot on HEAD
    apply_snapshot "$source" "$repo"
    if git -C "$repo" diff --cached --quiet; then
      echo "${name}: Genesis already matches ${source}/"
    else
      git -C "$repo" commit -m "Sync ${name} from katagami monorepo"
      git -C "$repo" push origin main
    fi
  else
    # Genesis moved since our pull: commit the snapshot against the BASE so the
    # commit holds ONLY our delta, then rebase that delta onto Genesis HEAD.
    echo "${name}: Genesis moved (base ${base:0:12} -> head ${remote_head:0:12}); rebasing only the local delta."
    git -C "$repo" checkout -q -b local-snapshot "$base"
    apply_snapshot "$source" "$repo"
    if git -C "$repo" diff --cached --quiet; then
      echo "${name}: no local changes vs the sync base — adopting Genesis HEAD."
      git -C "$repo" checkout -q main
    else
      git -C "$repo" commit -q -m "Sync ${name} from katagami monorepo"
      if ! git -C "$repo" rebase main; then
        git -C "$repo" rebase --abort || true
        echo "${name}: rebase conflict — your changes overlap work pushed to Genesis since your pull." >&2
        echo "${name}: run 'scripts/sync-genesis-katagami.sh pull', re-apply your changes on top, retry." >&2
        return 1
      fi
      git -C "$repo" checkout -q main
      git -C "$repo" merge -q --ff-only local-snapshot
      git -C "$repo" push origin main
      echo "${name}: pushed the rebased delta:"
      git -C "$repo" show --stat --oneline HEAD | head -20
    fi
  fi

  record_base "$name" "$(git -C "$repo" rev-parse HEAD)"
  publish_latest "$name" "$(git -C "$repo" rev-parse HEAD)"
}

usage() {
  cat <<'USAGE'
Usage: scripts/sync-genesis-katagami.sh [pull|push]

  pull  Refresh katagami-commons/ and katagami-curation/ from Genesis and stage them.
  push  Push the local folder states back to the two Genesis app repos as a
        REBASED DELTA against the recorded sync base (.genesis-sync/<app>.base,
        written by pull) — concurrent Genesis pushes are preserved, and an
        overlapping edit aborts with instructions instead of clobbering.
        Publishes/promotes the pushed hashes and verifies Genesis latest.
        FORCE_SNAPSHOT=1 restores the old snapshot-replace behaviour (dangerous).

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

  record_base "katagami-commons" "$(git -C "${WORK_DIR}/katagami-commons" rev-parse HEAD)"
  record_base "katagami-curation" "$(git -C "${WORK_DIR}/katagami-curation" rev-parse HEAD)"

  git -C "$ROOT" add -A katagami-commons katagami-curation
  git -C "$ROOT" add -f katagami-curation/wasm/*/Cargo.lock

  echo "Synced Genesis source-of-truth apps into katagami-commons/ and katagami-curation/."
  echo "Review with: git diff --cached --stat"
else
  push_app "katagami-commons" "katagami-commons" "${WORK_DIR}/katagami-commons"
  push_app "katagami-curation" "katagami-curation" "${WORK_DIR}/katagami-curation"
fi
