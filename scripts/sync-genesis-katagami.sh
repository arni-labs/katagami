#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
GENESIS_BASE="${GENESIS_BASE:-https://genesis-production-164d.up.railway.app}"
TENANT="${TENANT:-default}"
WORK_DIR="${WORK_DIR:-${TMPDIR:-/tmp}/katagami-genesis-sync}"
MODE="${1:-pull}"

COMMONS_URL="${GENESIS_BASE}/katagami/katagami-commons.git"
CURATION_URL="${GENESIS_BASE}/katagami/katagami-curation.git"

clone_app() {
  local url="$1"
  local dest="$2"

  rm -rf "$dest"
  git \
    -c "http.${GENESIS_BASE}/.extraHeader=X-Tenant-Id: ${TENANT}" \
    -c protocol.version=0 \
    clone "$url" "$dest"
}

sync_app() {
  local source="$1"
  local dest="$2"

  rsync -a --delete --exclude='.git' "${source}/" "${ROOT}/${dest}/"
}

push_app() {
  local name="$1"
  local source="$2"
  local repo="$3"

  rsync -a --delete --exclude='.git' "${ROOT}/${source}/" "${repo}/"
  git -C "$repo" add -A

  if git -C "$repo" diff --cached --quiet; then
    echo "${name}: Genesis already matches ${source}/"
    return
  fi

  git -C "$repo" commit -m "Sync ${name} from katagami monorepo"
  git -C "$repo" push origin main
}

usage() {
  cat <<'USAGE'
Usage: scripts/sync-genesis-katagami.sh [pull|push]

  pull  Refresh katagami-commons/ and katagami-curation/ from Genesis and stage them.
  push  Commit the current folder states back to the two Genesis app repos.

Genesis is the source of truth for these two app folders. The script uses clean
temporary clones with Git protocol v0 because direct non-empty fetches from the
current Genesis smart-HTTP service can fail during pack negotiation.
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

git -C "$ROOT" config --local "http.${GENESIS_BASE}/.extraHeader" "X-Tenant-Id: ${TENANT}"
git -C "$ROOT" config --local protocol.version 0

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
