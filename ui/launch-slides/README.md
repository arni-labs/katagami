# launch-slides

Product Hunt gallery slides for Katagami. Two artboards at 1270x760, the size
Product Hunt wants, exported at 2x.

Built in the same riso vocabulary as the site: halftone ink fields, the
misregistered second pass on display type, ink stamps at radius 0, washi tape,
grain. Colours and effects are lifted from `ui/src/app/globals.css`, so if the
site palette moves, update `_common.css` to match.

## Files

- `_common.css` is the shared stylesheet. All the design lives here.
- `build.mjs` writes the artboards. Copy, layout and plate placement live here.
- `preview.mjs` renders each artboard to `out-*.png` at 2x with Playwright.
- `Main.dc.html`, `ArtStyles.dc.html` are generated. Do not edit them by hand.
- `canvas.json` places the artboards on the canvas.
- `slidetext.txt` is every word on the slides, for running through unspeak.
- `src/` holds the original uncropped screenshots.
- `plate-*.jpg` are those screenshots resized for weight, not cropped.
- `out/` holds the exports that went to Product Hunt.
- `katagami-launch-slides.html` is the published canvas.

## Rebuild

```bash
cd ui/launch-slides
node build.mjs      # regenerate the artboards
node preview.mjs    # render out-Main.png and out-ArtStyles.png
```

Playwright has to be resolvable. `npm i playwright` in this folder if it is not.

## Republish the canvas

The canvas is a Claude Design artifact. Reseed it with the helper from the
`design` skill, passing both artboards, both plates and `canvas.json`, then
publish `katagami-launch-slides.html` to the same URL.

## Adding a slide

Add a `slide({...})` call in `build.mjs` and put its name in `boards`. Every
slide takes a stamp, a headline, a paragraph, a header label, a footer and a
turned plate. Two rules the build enforces: a marker highlight has to be a
single word, because an inline-block span changes line wrapping and desyncs the
misregistration pass, and nothing outside the screenshots drops below 15px.
