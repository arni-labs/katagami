# Design language rules

> The rules every Katagami design language — with its paired palette and art style — must
> uphold. The curation pipeline (and any agent that builds a language) applies them when
> synthesizing and reviewing. One line each; newest direction wins; when in doubt, follow the rule.
> Sibling rulebooks for other entities (e.g. `art-style.md`) may live alongside this file in
> `knowledge/rules/`. Rules folded in from the TR review (2026-06-23) are tagged `·TRnnn`.

## How these rules work (read first)
> Each rule states a **taste goal** or a **procedure**, and leaves the *how* to the language.
> An anti-pattern names the **slop** to avoid — never a whole vocabulary to remove (don't ban
> colours, modes, borders, gradients, or layouts wholesale). Don't prescribe a specific colour,
> composition, value, or reference language. **If a rule would make every language converge on
> the same look, it is too prescriptive — broaden it.** Variety between languages is the point.
> Frame each rule so an agent follows it *as written* — a clean directive or a positive taste
> goal. Never "avoid X unless Y": an agent obeys the "avoid" and never weighs the exception, so
> the escape clause is dead. Say what to do, not what to do *unless*.

## Concept
1. Give each language one ownable idea, expressed as a signature mechanic.
2. Never ship a generic language ("warm Swiss", "clean minimal").
3. Ship the language with its paired palette and art style as one coherent set.
4. Write copy in a real, concrete scene for whatever the language is for — concrete verbs, specific real-world nouns, invented names that fit the subject; never AI clichés, lorem, or placeholder names. `·TR008`

## Naming
> The name is a **masthead, not an identifier** — slug, tags, embeddings, and the lineage tree
> carry identity and findability. Prefer one distinctive word; a two-word maker's-mark only when
> one word can't carry it. Two words, occasionally one; never three; never an adjective.

5. Prefer one distinctive evocative noun (real, cultural, place, or material). Match the name's language/culture to the concept's own theme — don't default to one language (Japanese especially) unless the theme genuinely is that; vary the source widely across the library: Halation, Quarry, Plakat, Marquee, Bungu. Render the name in plain-ASCII Title Case — never ALL-CAPS, never diacritics/macrons/accents (carry the cultural flavour in the spelling, e.g. Yunagi not Yūnagi, Rosee not Rosée) so names stay typable and searchable.
6. Use `[concrete subject noun] + [grounding maker noun]` (Press, Ledger, Works, Bureau, Atelier, Bindery, Foundry) only when one word can't carry the idea.
7. Draw the subject noun from the language's single strongest motif — a material, object, place, or cultural image — never a mood word; rotate subjects AND cultures widely (don't let one language dominate).
8. Cap every grounding noun — only a handful of "____ Press" / "____ Works" across the whole library.
9. Never lead with an adjective, stack genres/eras, coin portmanteaus, or append IDs/dates. Banned tokens: System, Interface, Editorial, Noir, Lab, UI, Minimalism, Cyberpunk, Terminal, Collage, Brutalist, Deco, Manga, Style, Design, Revival, Lounge, Society, Cool, Clear, Compact, Critical, Atmospheric, Austere, Cinematic, Avant.

## Look
10. Never give a card a single accent/highlight edge — not top, not a side, not bottom.
11. Use at most 3 accent colours; their hue and intensity are the language's own choice — vivid or muted, dark or pale — never defaulted to bright.
12. Tune neutrals to the palette's temperature. `·TR006`
13. Clean, never muddy.
14. One coherent geometry; no arbitrary in-between radii.
15. Body text 17px+; high contrast.
16. Make one button clearly primary; keep the rest quieter. A button set shares one shape and height, label centred — creative is fine, sloppy never. `·TR011`
17. Everything fits its container — nothing overflows, clips, or crowds. Size controls and labels to their content, text optically centred and evenly padded. Loose fit reads as unfinished.
18. Ornament should mean something and belong to one considered system — coherent with the whole and suited to the content's tone. Tacky isn't "too much"; it's decoration without an idea: unrelated flourishes piled together, or one shape stamped on everything until it's wallpaper.
19. Don't over-box the chrome: never nest cards, and never trap navigation in a floating rounded card or pill bar — a boxed-in nav reads as a widget. Let navigation breathe as part of the page; build hierarchy with space, type, and surface. `·TR012`
20. Explicitly style every form control — no visible browser defaults. `·TR013`
21. Give generous spacing; always pad above titles.
22. Light, dark, or colour — the concept chooses the mode and the ground; don't default either way.
23. No emoji on buttons, and no symbol glyphs (▲ ▼, etc.) in copy, markup, or alt — use SVG primitives or deliberate icons. `·TR009`

## Responsive (the focus)
24. Make every artifact render well from ~390px mobile to 2560px+ ultra-wide.
25. On mobile, stack to a single column; hide non-essential nav links and table columns; never overflow horizontally. Oversized display/hero headlines MUST shrink responsively (clamp()/viewport units) and wrap — they may never clip or run off the 390px edge; an `overflow:hidden` that merely hides the overrun is NOT a fix (it leaves words chopped). The nav must wrap or collapse, never spill off-screen. Verify by READING a 390px screenshot for clipped text, not just by `scrollWidth == clientWidth`.
26. On ultra-wide, cap and centre the contained content; let only the full-bleed hero span 100vw.
27. Grids never blow out their container — children shrink instead of overflowing (e.g. `minmax(0,1fr)` + `min-width:0`).

## Landing
28. The landing opens on a full-viewport hero (100vw × 100svh, edge to edge); its composition is the language's choice — don't prescribe one layout. But it is NEVER the generic SaaS-hero template: NOT a tracked eyebrow-tag above the title, NOT a primary+secondary button pair, NOT a three-number stat row as default furniture. Derive the hero from THIS language's signature mechanic and vary it per language — "free composition" must not collapse onto the startup cliché. (One CTA is plenty; if a stat or tag genuinely belongs, it must be the language's own device, not the default trio.)
29. The hero always uses a swappable image — `background-image: var(--hero-image)`, never an `<img>` — so the studio can swap it.
30. Keep the hero overlay legible over the image; no lazy gradient scrim.
31. No scroll cues, "scroll down" prompts, or down-arrow indicators.
32. Below the hero, return to rich, full sections.
33. Make the hero headline unmistakably this language's, not the generic AI-startup default — not the oversized italic serif, and NOT the regular-serif/italic-serif swap (some words upright, some italic in the same serif face): that flip is the tell. Highlighter marks or a colour pop on a word are good; the serif↔italic swap is not. `·TR025`

## Motion
34. Animate the landing with intent, like a real, shipped page; motion carries meaning, never decoration.
35. The fully-rendered, settled state is the default — visible with no JavaScript. Motion is added on top: an inline script gates the hidden start-state (behind a class it sets on `<html>`) and drives the reveal, so a no-JS render and the ScaledFrame gallery/studio preview show the finished page, never a blank one. Respect `prefers-reduced-motion`. `·TR-pe`

## Compositions (landing + dashboard)
36. Take all colour from the role vars `injectTheme` overrides: `--bg --surface --text --muted --border --accent --on-accent --success --warning --error --info`. Set defaults in `:root`.
37. Drive any swappable image with `background-image: var(--hero-image)`.
38. Map signature mechanics onto semantic roles so they recolour on palette swap.

## Embodiment
39. Use the language's own colours; it is the identity showcase and the thumbnail source.
40. Make it substantial — many real component sections, not a thin gallery.
41. Every named signature pattern and visual-character trait must visibly appear in the embodiment — not merely be cited. `·TR016`

## Thumbnail
42. Screenshot the embodiment at a true 1440×960 viewport (fonts loaded), scale to 600×400 JPEG, no crop.
43. Never use generated/illustrated art for the thumbnail.

## shadcn
44. Ship full components: an agent-authored `components.md` (`component-recipes-v1`, `Author: katagami-agent`) and a renderable `preview-shots.json` (`renderable-v1`, ≥3 product scenes, all 16 primitives). The registry theme is finalizer-owned.
45. The shadcn preview and registry theme must look like the language itself — honour its borders, radius, and material; never stamp a generic house "chassis". The renderer follows the `visualProfile`.

## Art style
46. A style is the **transferable technique**, independent of subject — it should dress a face, a city, or a teapot equally. If the subject domain (botanical, soda) has crept into the style's name, medium, or prompt, it's wrong. A style treats a subject; it is never the subject, nor the apparatus/medium itself.
47. Reference images are full-frame, style-representative exemplars — not landing comps with empty space. A style may also carry the agent's own landing image, composed however that landing needs it.
48. Credit the source. When a style is recognizably attributable to named artists / movements / studios / traditions, name them in a first-class `credits` list (each with `name`, `kind`, and a short note) — a style is an aggregate of influences; never pass a recognizable style off as original. (Applies to languages and palettes too.) `·TR-credits`

---
## Held — adopt after rewording (from the TR review)
- **TR-028** (accent used consistently across all sections) — adopt, but exempt documented semantic / heat-scale roles, so it doesn't fight an intentional scale.
- **TR-029** (layout-family diversity) — adopt the spirit (4+ distinct families across 8 sections), but soften the absolute "each family at most once"; N/A for dashboards / single-card artifacts.
