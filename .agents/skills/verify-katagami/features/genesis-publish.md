# Genesis publish and install

## Sub-features
`scripts/sync-genesis-katagami.sh pull|push` between this repo and the Genesis git server, the `katagami-commons` and `katagami-curation` app repos there, and the dependency pins in each `app.toml`.

## How to get to it (user POV)
An operator ships a spec or policy change: merge on GitHub, publish to Genesis, then install the published version into the running temperpaw backend.

## Driving it
```bash
GENESIS_TOKEN=... bash scripts/sync-genesis-katagami.sh pull    # inspect first
GENESIS_TOKEN=... bash scripts/sync-genesis-katagami.sh push
```
Then install the published ref into the target server and read the installed pin back.

## What proves it
The installed pinned ref (`katagami/katagami-commons@<hash>`) matches the hash Genesis just published, and the app's entity sets answer on the target server rather than 403. Read the pin; do not infer it from a successful push.

## Gotchas
The variable is `GENESIS_TOKEN`, not `GENESIS_API_KEY`, and this script also reads `GENESIS_API_KEY` for its git extra-headers, so check both when auth fails. Use the sync script rather than a raw `git push` to a Genesis remote. `katagami-curation/app.toml` pins `katagami-commons` by hash, so a commons change means republishing commons first and then moving the curation pin. On divergence Genesis wins, so pull and read before pushing over anything. Never push to Genesis as a side effect of unrelated work.
