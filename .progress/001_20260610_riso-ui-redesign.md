# Riso UI Redesign — Plan

Branch: `feat/riso-ui-redesign` (worktree off origin/master)
Goal: Full-app restyle into a risograph print aesthetic + a human-scale exploration
experience for large catalogs of design languages / palettes / art styles.
Note: Temper MCP planning path unavailable (`.claude/skills/temper-agent.md` missing) — using `.progress/` fallback per global CLAUDE.md.

## Design direction — "Katagami × Risograph"

Katagami are dye stencils; risograph is stencil duplication. The redesign leans
into that lineage: the site is a riso-printed specimen catalog of design languages.

- **Paper**: warm uncoated cream paper (light), deep indigo "night print" (dark).
- **Inks**: retuned existing palette as riso spot inks (fluor pink sakura, riso blue
  ramune, yuzu yellow, matcha green, sumire violet, teal). Names/vars preserved.
- **Misregistration**: headings + key blocks get a second offset ink pass
  (pseudo-element, multiply blend, 2–3px offset).
- **Grain**: global SVG feTurbulence grain overlay + per-surface grain.
- **Halftone**: radial dot fields for section transitions and accents.
- **NO borders**: surfaces defined by ink blocks, offset misprint shadows,
  halftone fades. Replace stamp borders & dashed rules with ink equivalents.
- **Motion**: one orchestrated load reveal; ink-pass hovers; lightweight canvas
  parallax hero (no three.js dependency — print aesthetic, perf-friendly).
- **Continuity**: keep Bricolage Grotesque display + Nunito body, Japanese ink
  names, stamp/tape/sticker concepts (re-expressed as riso), class & var names.

## Exploration UX (for "thousands" of entries)

1. Unified explore surface on home: visual-first specimen wall.
2. Facet chips from tags/taxonomies (vibe browsing for people who don't know
   what they want).
3. Color-hue explorer: pick an ink → filter by dominant palette hue.
4. "Surprise me" shuffle dealing random specimens.
5. ⌘K command palette searching across languages + palettes + art styles.
6. Related items on detail pages (shared tags).

## Content for local browsing

- Real data: Railway Temper (2 languages, 4 palettes, 3 art styles) via .env.local (copied).
- Demo specimen catalog: local fixture layer (fresh-batch 5 languages w/ real
  embodiments + generated specimen entries) merged into list fns behind
  `NEXT_PUBLIC_KATAGAMI_DEMO_CATALOG=1` so explore UX is browsable at volume.
  Clearly tagged "specimen"; never mutates remote data.

## Contracts to preserve

- `check-gallery-renders-all-cards.mjs`: gallery server-renders ALL cards.
- `check-shadcn-preview-contract.mjs`: shadsync preview pipeline untouched in
  structure; only outer chrome restyled.
- CSS var names (--sakura etc.) and scrapbook class names kept.

## Phases

1. ✅ Worktree + env + data probe
2. ✅ globals.css riso system (tokens, grain, misregistration, halftone, borderless)
3. ✅ Primitives (scrapbook.tsx → riso), nav, hero
4. ✅ Home gallery + cards + filters
5. ✅ Explore features (facets, hue, shuffle, ⌘K, related)
6. ✅ Demo specimen catalog + assets (103 sheets locally)
7. ✅ Detail pages + lanes (language/palettes/art-styles)
8. ✅ Studio/compare/taxonomy/lineage/owner (3 parallel agents)
9. ✅ Tests (both contracts) + lint (0 errors) + build
10. ✅ Dev server visual pass (light+dark, ⌘K, shuffle, detail, palettes)
11. ⏸ Draft PR — BLOCKED on GitHub identity: commit 218abcb is local on
    feat/riso-ui-redesign; push needs `gh auth switch -u rita-aga` (active
    account nerdsane gets 403; classifier blocks agent-side identity switch).
    Unblock: switch account, then
    `git -c credential.helper= -c "credential.helper=!gh auth git-credential" push -u origin feat/riso-ui-redesign`
    and `gh pr create --draft --base master`.

## Deviations from plan

- Three.js skipped intentionally — the parallax stencil hero is pure SVG +
  one rAF (print aesthetic, no 200KB dep). Noted as option if more depth wanted.
- paper-card class was dead CSS; usages converted to sticker-card.
- SVG pattern content doesn't inherit currentColor — inked patterns directly.
