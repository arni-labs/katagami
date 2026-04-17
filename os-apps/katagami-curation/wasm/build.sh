#!/usr/bin/env bash
# Build all WASM modules for katagami-curation.
# Usage: cd os-apps/katagami-curation/wasm && ./build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

for module in build_session_message finalize_spawned_session launch_research; do
    echo "Building $module..."
    if (cd "$SCRIPT_DIR/$module" && cargo build --target wasm32-unknown-unknown --release 2>&1); then
        cp "$SCRIPT_DIR/$module/target/wasm32-unknown-unknown/release/$module.wasm" \
           "$SCRIPT_DIR/$module/$module.wasm"
        echo "  -> $module built successfully"
    else
        echo "  -> $module FAILED (skipping)"
    fi
done

echo ""
echo "WASM modules built:"
for module in build_session_message finalize_spawned_session launch_research; do
    wasm_file="$SCRIPT_DIR/$module/$module.wasm"
    if [ -f "$wasm_file" ]; then
        size=$(wc -c < "$wasm_file" | tr -d ' ')
        echo "  $module: $(( size / 1024 ))KB"
    fi
done
