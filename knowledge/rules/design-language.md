# Design language rules

> The rules every Katagami design language — with its paired palette and art style — must
> uphold. The curation pipeline applies them when synthesizing and reviewing a language.
> One line each; newest direction wins; when in doubt, follow the rule.
> Sibling rulebooks for other entities (e.g. `art-style.md`) live alongside this file in
> `knowledge/rules/`. Rules folded in from the TR review (2026-06-23) are tagged `·TRnnn`.

## Concept
1. Give each language one ownable idea, expressed as a signature mechanic.
2. Never ship a generic language ("warm Swiss", "clean minimal").
3. Ship the language with its paired palette and art style as one coherent set.
4. Write copy in a real product scene — concrete verbs, product-specific nouns, invented brand/product names; never AI clichés, lorem, or placeholder names. `·TR008`

## Naming
> The name is a **masthead, not an identifier** — slug, tags, embeddings, and the
> lineage tree carry identity, uniqueness, and findability at any scale. So the
> name only has to be non-tacky and evocative, never globally unique. Prefer one
> distinctive word; use a two-word maker's-mark only when one word can't carry it.
> Two words, occasionally one; never three; never an adjective. Exemplars:
> **Halation**, **Civic Press**.

5. Prefer one distinctive evocative noun (real, cultural, place, or material — often non-English): Halation, Seiran, Quarry, Bungu, Plakat. This namespace is unbounded and scales to thousands while staying memorable.
6. Use `[concrete subject noun] + [grounding maker noun]` (Press, Ledger, Desk, Works, Bureau, Atelier, Bindery, Almanac, Review, Foundry) only when one word can't carry the idea.
7. Draw the subject noun from the language's single strongest motif — a material, object, place, or cultural image — never a mood word; rotate subjects widely (materials, places, flora, fauna, tools, civic objects).
8. Cap every grounding noun — only a handful of "____ Press" / "____ Works" across the whole library; let slug/tags/embeddings/lineage handle uniqueness and search.
9. Never lead with an adjective, stack genres/eras, coin portmanteaus (Tapehiss, Civica), or append IDs/dates. Banned tokens: System, Interface, Editorial, Noir, Lab, UI, Minimalism, Cyberpunk, Terminal, Collage, Brutalist, Deco, Manga, Style, Design, Revival, Lounge, Society, Cool, Clear, Compact, Critical, Atmospheric, Austere, Cinematic, Avant.

## Look
10. Use no borders, and never one special edge in their place — no coloured highlight line across a card's top, no single accent rule, least of all on rounded cards. Separate with tinted surfaces and space.
11. Use at most 3 accent colours, like highlighters.
12. Keep one neutral temperature — derive mid-greys from the primary's hue (cool navy ink → cool-slate muted, e.g. `#5B6479`); never set a true grey beside a warm or cool primary. `·TR006`
13. Stay bright and clean. No gradients — use solid colour blobs; keep neutrals pure (#FFF / #000); never default to warm cream/beige page surfaces. `·TR027`
14. Use radius 0, 16, 24, or 9999 only — one geometry, no arbitrary in-between sizes.
15. Set body text 17px+; display tight (-0.02em); keep high contrast.
16. Make one button clearly primary; keep secondary and destructive actions quieter. Buttons in a set share one shape and height, label centred with even padding — creative is fine, sloppy never is. `·TR011`
17. Never nest cards; express hierarchy with spacing, type, and tinted surfaces. `·TR012`
18. Explicitly style every form control — no visible browser defaults. `·TR013`
19. Give generous spacing; always pad above titles.
20. Default to light mode. No emoji on buttons, and no symbol glyphs (▲ ▼, etc.) in copy, markup, or alt — use SVG primitives or deliberate icons. `·TR009`

## Responsive (the focus)
21. Make every artifact render well from ~390px mobile to 2560px+ ultra-wide.
22. On mobile, stack to a single column; hide non-essential nav links and table columns; never overflow horizontally.
23. On ultra-wide, cap and centre the contained content; let only the full-bleed hero span 100vw.
24. Use `minmax(0,1fr)` columns and `min-width:0` on grid/flex children so grids never blow out their container.

## Landing
25. Make the hero a true full-bleed image: 100vw × 100svh, edge to edge, no padding, no radius. (Video is allowed.)
26. Default the hero to a clean, immersive image with no baked-in text, from the paired art style.
27. Use `background-image: var(--hero-image)` for the hero — never an `<img>` — so the studio can swap it.
28. Overlay the nav and title on the image; put the title in a solid ink "press block".
29. Never use a gradient scrim; make overlays legible with solid blocks/chips.
30. Never add scroll cues, "scroll down" prompts, or down-arrow indicators.
31. Below the hero, return to a contained grid with rich, full sections.
32. Never stack a tiny uppercase letter-spaced eyebrow directly above an oversized hero headline — fold it into the headline, run it as a breadcrumb / role tag, or set it as a caption below. `·TR026`
33. Never use an oversized italic serif as the primary hero headline (the universal AI-startup default); editorial contexts may justify it, default is reject. `·TR025`

## Motion
34. Animate the landing like a shipped product page: staggered scroll-reveals per section (IntersectionObserver), count-up stats, hero parallax + ken-burns, demand bars that grow to their level, and hover micro-interactions (cards lift, image zoom, row/nav states). Motion carries meaning; never decorate.
35. Progressive-enhance: a small inline script adds a `.anim` class and drives the scroll motion, so the settled state is the default and the page is never stuck hidden. Respect `prefers-reduced-motion` (bail entirely). The gallery + studio previews are sandboxed (no JS) and freeze CSS via ScaledFrame, so they correctly show the static state — design for both.

## Compositions (landing + dashboard)
36. Take all colour from the role vars `injectTheme` overrides: `--bg --surface --text --muted --border --accent --on-accent --success --warning --error --info`. Set defaults in `:root`.
37. Make the swappable image `background-image: var(--hero-image)`.
38. Map signature mechanics onto semantic roles so they recolour on palette swap.

## Embodiment
39. Use the language's own colours; it is the identity showcase and the thumbnail source.
40. Make it substantial — many real component sections, not a thin gallery.
41. Every named signature pattern and visual_character trait must visibly appear in the embodiment — not merely be cited (a "construction grid" needs a quiet visible motif; grain belongs to the art-style/imagery layer). `·TR016`

## Thumbnail
42. Screenshot the embodiment at a true 1440×960 viewport (fonts loaded), scale to 600×400 JPEG, no crop.
43. Never use generated/illustrated art for the thumbnail.

## shadcn
44. Ship full components: an agent-authored `components.md` (`component-recipes-v1`, `Author: katagami-agent`) and a renderable `preview-shots.json` (`renderable-v1`, ≥3 product scenes, all 16 primitives). The registry theme is finalizer-owned.
45. The shadcn preview and registry theme must look like the language itself — honor its borders (a no-border language gets a transparent `--border`, never black outlines), its radius (controls use the card radius, never forced square at `sm:0`), and its material. Never stamp a generic "chassis" (paper borders, grain, offset shadows, tape) on a language that isn't that style — the renderer follows the `visualProfile`, never a house default.

## Art style
46. An art style is a *treatment*, not a subject. Its prompt template reads `{subject}, in the style of …, {palette}, …` and applies the look (grain, scanlines, ink, brushwork) to whatever subject the slot supplies. "A photo of a CRT screen / a printed page / a polaroid" as the object is wrong; "in the style of a CRT screen" is right — the style must never become the object.
47. Reference and proof images show the style ON real subjects (a face, an object, a scene), full-frame — never a render of the device or medium itself. Record the generating image model on the art style as provenance.
48. Credit the source. When an art style is recognizably attributable to a named artist, movement, studio, or tradition, name them — in a first-class `credits` property on the entity, never buried in prose. Credit *all* of them: a style an LLM produces is an aggregate of many influences, so `credits` is a list (Gekiga → Yoshihiro Tatsumi + Jirō Taniguchi + the gekiga movement; Benday Press → Roy Lichtenstein + Benjamin Day + golden-age comics). Each credit carries a `name`, a `kind` (artist / movement / studio / tradition), and a short note on how it informed the style. Never pass a recognizable style off as original — attribution is both courtesy and a correctness check. (Applies equally to design languages and palettes when they trace to a named hand.)

---
## Folded in from the Pushpin → Chiclet curated iterations (2026-07-04) — tagged `·CHnnn`

## Look (additions)
49. Button and chip text never wraps — a control is never a blob; the layout shrinks or stacks instead. `·CH001`
50. Links carry the language's own gesture — a sweep, a highlight, an ink-up — never a bare default underline. `·CH002`
51. One strict type scale: every text size on the page belongs to the declared scale — no one-off sizes anywhere, headings to footers. `·CH003`
52. Every typeface on the page has a declared role (display / body / mono at most) — no stray fonts outside them. `·CH004`
53. Shadows follow their element's geometry — shape and softness agree with the corner radius. `·CH005`
54. Copy and imagery never contest the same ground — text doesn't sit on busy artwork, and artwork never buries information. `·CH006`
55. Balance density across the canvas — never a crowded cluster beside a starved void. `·CH007`
56. Ornament forms one page-wide system: recurring elements, coherent through the entire page — never a one-off that appears once and vanishes. (Sharpens rule 18.) `·CH008`

## Responsive (addition)
57. Design the tablet band (~768–1024) as its own considered layout — never the mobile column stretched wide. `·CH009`

---
## Held — adopt after rewording (from the TR review)
- **TR-028** (accent used consistently across all sections) — adopt, but reword to **exempt documented semantic / heat-scale roles**, so it doesn't fight an intentional scale like Civic Press's ink→amber→ember.
- **TR-029** (layout-family diversity) — adopt the spirit (**4+ distinct families across 8 sections**), but **soften the absolute "each family at most once"** (three identical grids is the real smell, not a second principled reuse); N/A for dashboards / single-card artifacts.
