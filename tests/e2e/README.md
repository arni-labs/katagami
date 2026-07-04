# Local end-to-end harness — lane publish verification

Runs the REAL pipeline flow against a disposable local Temper: real image
Files through OData `$value`, a real ArtStyle/PaletteSystem, a real
CurationJob whose `Complete*Synthesis` action fires the actual
`finalize_spawned_session` WASM, which deep-verifies artifacts, publishes
public assets, and walks the entity to `Published` — or fails the job with a
typed error and leaves the entity unpublished.

This is the check the contract tests cannot do: it proves the feature works
end to end the way production uses it, before anything deploys.

## What it proves (10 assertions)

| Case | Expected |
|---|---|
| Art style with real JPEG references | job `Completed`, style `Published`, asset URLs + search blob attached |
| Art style with HTML posing as a reference image | job `Failed` with `lane_file_not_image`, style stays `Draft` |
| Palette with real tokens export + thumbnail | job `Completed`, palette `Published` |
| Palette with garbage tokens export | job `Failed` with `palette_tokens_export_invalid`, palette stays `Draft` |

## Run

```bash
# 1. Build a server binary from temper main (once):
git clone --depth 1 https://github.com/nerdsane/temper.git /tmp/temper-main
(cd /tmp/temper-main && cargo build -p temper-cli)

# 2. Build the finalizer WASM from this branch:
(cd ../../wasm && ./build.sh)

# 3. Boot the disposable server (merged single tenant `katagami`, isolated state):
TEMPER_BIN=/tmp/temper-main/target/debug/temper ./serve_local.sh

# 4. In another shell, drive the flow (uploads the WASM modules + secrets itself):
python3 e2e_lane_verification.py
```

Requires: python3 + Pillow, a paw-fs checkout for specs and the prebuilt
`blob_adapter.wasm` (`PAW_FS_SPECS` / `PAW_FS_BLOB_ADAPTER` to override
locations), and the `wasm32-unknown-unknown` toolchain for step 2.

## Notes

- `blob_sink.py` stands in for the public-asset object store: the
  publish-artifact flow PUTs blobs to `published_blob_endpoint` exactly as in
  production; the sink accepts them. The driver sets the three
  `published_blob_*` secrets plus `temper_api_url` for the tenant.
- The driver seeds `ArtStyleIds`/`PaletteSystemIds` at job creation as well as
  passing them to `Complete*Synthesis` — the finalizer re-reads job fields
  through the query projection, which can lag the just-dispatched action on a
  fresh local server.
- Everything is disposable: state lives under `.e2e-state/` (gitignored) and
  the tenant is local-only with a permit-all Cedar policy. Never point this at
  a real environment.
