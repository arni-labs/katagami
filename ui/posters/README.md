# posters

Self-contained poster TSX files. Rendered with
[`poster-ai`](https://github.com/Michaelliv/poster) — one `.tsx` → HTML /
PNG / PDF / SVG / JPG / WebP.

## Install (once)

```bash
npm install -g poster-ai     # gets you the `poster` CLI
# or, per-project:
npx poster-ai --help
```

## Render

```bash
# PNG (headless chrome)
poster export posters/agent-flow.tsx -o agent-flow.png

# Standalone HTML
poster build posters/agent-flow.tsx -o agent-flow.html

# PDF
poster export posters/agent-flow.tsx -o agent-flow.pdf

# SVG
poster export posters/agent-flow.tsx -o agent-flow.svg
```

## Canvas size

Each poster declares its own canvas via `w-[Npx] h-[Npx]` on the root
element inside the file. For `agent-flow.tsx` that's **1200 × 1800**.
Override with `--width` / `--height` if you need a different export size.

## Posters

- `agent-flow.tsx` — how a design language is made (idea → research →
  synthesize × N → organize × N → gallery). Katagami scrapbook style —
  dot-grid paper, sticky notes, washi tape, stamps, marker highlights.
