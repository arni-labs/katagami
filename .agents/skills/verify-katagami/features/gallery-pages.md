# Gallery and detail pages

## Sub-features
The gallery home (`/`), language detail (`/language/[id]`), palettes (`/palettes`, `/palettes/[id]`), art styles (`/art-styles`, `/art-styles/[id]`), and the studio (`/studio`). All are Server Components that read Temper over OData with the server-side bearer token; the browser never sees it.

## How to get to it (user POV)
A visitor opens katagami.ai, browses the gallery, and clicks into a language to read its spec and see its embodiment.

## Driving it
```bash
curl -s http://localhost:3500/ -o /tmp/verify-katagami/<date>/gallery.html -w '%{http_code}\n'
grep -c 'href="/language/' /tmp/verify-katagami/<date>/gallery.html   # cards present
ID=$(curl -s -H "X-Tenant-Id: default" -H "Authorization: Bearer test-local-key" \
     "http://localhost:3499/tdata/DesignLanguages" | python3 -c 'import sys,json; print(json.load(sys.stdin)["value"][0]["entity_id"])')
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3500/language/$ID"
```
For anything visual, open the page in a browser and look at it. HTTP 200 says the route rendered, not that it looks right.

## What proves it
Cards on the gallery link to real language ids, the detail page returns 200 and carries that language's name and tokens, and every image and embodiment iframe on it resolves (the file proxy at `/api/file/[id]` answers rather than 404s). For a styling change, the rendered page against the design contract in AGENTS.md and `ui/DESIGN.md` is the proof, not the diff.

## Gotchas
The first hit on each route compiles for a few seconds under `next dev`; a timeout on the first request is not a failure. Thumbnails prefer immutable `*_asset_url` fields, which point at assets.katagami.ai and therefore only resolve for content published from a deployed environment; locally the file proxy fallback is what you are exercising. `ui/scripts/check-gallery-renders-all-cards.mjs` and the other checks in `npm run test:contracts` already cover the projection contracts, so do not re-derive them by hand.
