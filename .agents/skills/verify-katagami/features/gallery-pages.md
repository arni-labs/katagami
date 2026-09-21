# Gallery and detail pages

## Sub-features
The gallery home (`/`) and the detail pages: `/language/[id]`, `/palettes/[id]`, `/art-styles/[id]`. All are Server Components that read Temper over OData with the server-side bearer token; the browser never sees it.

`/` is the mosaic sheet (`ui/src/app/(site)/explore/mosaic/`), not a grid of cards. The card gallery and the lane index pages are still in the tree but no longer offered to anyone: `/gallery`, `/ask`, `/atlas`, `/palettes`, `/art-styles` and `/studio` each answer 307 to `/` (the list is in `ui/next.config.ts`). A 307 there is the contract holding, not a broken route — the detail pages under those prefixes, and `/studio/BRIEF.md`, are untouched.

## How to get to it (user POV)
A visitor opens katagami.ai, pans the sheet or asks it for what they are making, and opens a stamp to read that language's spec and see its embodiment.

## Driving it
The sheet draws itself in the browser, so curl cannot count its stamps — open `/`
in a real browser and pan it. Curl still settles the detail pages and the
retired routes:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3500/            # 200, the sheet
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3500/palettes   # 307 -> /
ID=$(curl -s -H "X-Tenant-Id: default" -H "Authorization: Bearer test-local-key" \
     "http://localhost:3499/tdata/DesignLanguages" | python3 -c 'import sys,json; print(json.load(sys.stdin)["value"][0]["entity_id"])')
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3500/language/$ID"
```
For anything visual, open the page in a browser and look at it. HTTP 200 says the route rendered, not that it looks right.

## What proves it
The sheet at `/` fills the viewport under the header, pans, answers an ask, and a stamp's Open button reaches a real detail page. (When you are checking a card grid — the retired gallery behind its redirect — count its links with `grep -o | wc -l`, never `grep -c`: the markup is one long line, so `grep -c` answers 1 no matter how many cards there are, which reads as a broken gallery.) The detail page returns 200 and carries that language's name and tokens, and every image and embodiment iframe on it resolves (the file proxy at `/api/file/[id]` answers rather than 404s). For a styling change, the rendered page against the design contract in AGENTS.md and `ui/DESIGN.md` is the proof, not the diff.

## Gotchas
The first hit on each route compiles for a few seconds under `next dev`; a timeout on the first request is not a failure. Thumbnails prefer immutable `*_asset_url` fields, which point at assets.katagami.ai and therefore only resolve for content published from a deployed environment; locally the file proxy fallback is what you are exercising. `ui/scripts/check-gallery-renders-all-cards.mjs` and the other checks `npm test` runs already cover the projection contracts, so do not re-derive them by hand.
