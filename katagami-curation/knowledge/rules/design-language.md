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
46. An art style is a *treatment*, not a subject or a catalog nickname. Store one paste-ready aesthetic prompt that directly specifies observable medium/material, marks/edges, tonal treatment, color roles, composition, signature details, and inline exclusions. It contains no placeholders, `in the style of …`, invented ArtStyle name, negative-prompt appendix, engine hints, or model-specific aesthetic variants. A consumer may add subject and palette facts before this prompt, but the aesthetic prompt itself remains byte-for-byte the same across models.
47. Reference images are optional examples, never the backbone. Behavioral proof uses the exact same prompt and exact same four governed, style-neutral sources on both edit models: one human portrait, one other living subject, one still life/product/object, and one landscape/environment, rotated across documentary photograph, black-ink line drawing, neutral synthetic 3D render, and flat vector illustration. Choose concrete subjects and compositions for the style; never impose a recurring house set. Use no style-reference image or user-supplied source. Every edit must preserve recognizable subject/content while fully replacing the source medium; medium/material scores 2/2, every other observable dimension is ≥1/2, and every case/model average is ≥1.5/2, so a lightly tinted source and a strong model hiding a weak model both fail.
48. Credit and qualify every source. `credits` names all attributable movements, studios, traditions, or people; `source_basis` is authored by a reviewer independent from the prompt author and records authoritative evidence and whether each source is a collective tradition/movement, public-domain artist, licensed/opt-in artist/source, or original synthesis. The review must explicitly reject both a named living artist and an unnamed but recognizably practitioner-specific target. A living person without explicit permission is a hard publication failure; attribution alone is not permission. Even an eligible artist's name stays out of the operative prompt — encode the observable tradition instead. Run a separate LLM contradiction/reference-dependence review, allow at most one revision, then let the WASM finalizer mechanically cross-check the structured evidence and exact prompt before publishing.

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

## Folded in from the batch-8 review round (2026-08-06) — curator verdicts, tagged `·B8nnn`

## Look (additions)
58. Body text is 17–18px at FINE weight — the 17px floor is also a ceiling; never a semibold or blocky body face; body voice reads fine, not chunky. (Sharpens rule 15.) `·B8001`
59. Compress the whole mid-tier (ledes, subheads, card copy, labels) toward body scale — only earned display moments are large; inflated mid-scale reads chunky and rejects the take. `·B8002`
60. At most 2 font families per artifact set, plus mono only when the language's own vocabulary earns it — identical set across landing, embodiment, and dashboard. (Sharpens rule 52.) `·B8003`
61. One radius degree per language, motivated by its own geometry: a square language uses 0 everywhere including cards; a slightly-rounded motif uses exactly that slight degree everywhere. A rounded card in a square language fails even though 16 is an allowed value. (Sharpens rule 14.) `·B8004`
62. Quiet the ground under every line of copy and give each scene one focal point — "very busy" and "not readable" reject takes on sight; decoration that says nothing gets cut. (Sharpens rule 54.) `·B8005`

## Motion (addition)
63. Every scroll effect and scene-change is perceivable at natural scroll speed: 80–120vh of travel per effect, tweens spread across the whole window, nothing completes within a single wheel gesture. `·B8006`

---
## Held — adopt after rewording (from the TR review)
- **TR-028** (accent used consistently across all sections) — adopt, but reword to **exempt documented semantic / heat-scale roles**, so it doesn't fight an intentional scale like Civic Press's ink→amber→ember.
- **TR-029** (layout-family diversity) — adopt the spirit (**4+ distinct families across 8 sections**), but **soften the absolute "each family at most once"** (three identical grids is the real smell, not a second principled reuse); N/A for dashboards / single-card artifacts.

## ADDENDUM (2026-07-24) — measured contract floors from batches 4–6

The immersive-landing skill §5 "MEASURED FLOORS" is binding for the landing. Contributor-side additions (each failed real takes):
- `provenance_tier:"agent_generated"` is REQUIRED at submit (missed twice; verifiers hard-fail).
- preview-shots.json: `scene` is an OBJECT (`headline`+`description`+one-of `rows|fields|stats`), ≥3 scene-bearing shots, ≥16 componentRecipes — node-validate before upload (string scenes failed twice).
- Embodiment: measure `scrollWidth == viewport` at true-390 (one take shipped 48% horizontal overflow from fixed-width type-specimen rows).
- Attach*/Set* actions reset entity readiness guards — after your LAST attach, re-arm every false content guard with the ids already on the entity (AttachDesignMd needs the lint params again; AttachShadcn* need file ids + format versions + manifests). Finish UnderReview with all content guards true; `quality_review_passed`/`has_published_assets` stay false — curator-owned, never call MarkQualityPassed/Publish.
- Landing scroll: native scroll is the base, smooth-scroll libs are enhancement only — prove wheel/touch/CDN-blocked traversal (a curator personally hit an unscrollable page that had passed headless checks).

## LLM defaults: the checkable rubric (2026-09-26), tagged `·LDnnn`

> A language fails when any model given the same brief would have made it. These are the defaults the library itself drifted into (audit of all 301 Published languages, 2026-09-26: 35% sit on cream paper and 41% on near-black; 94% declare a mono face; 84% set a role in one of ten stock faces; 71% build with hairline rules; "warm" appears 288 times in their philosophies).
> Check every line against the language's own tokens and rules and score it 0 (absent), 1 (present) or 2 (defining or repeated). A pattern scores 0 only when the rules name the real object it comes from and the token takes its value from that object: the green of a real P1 phosphor, the bars of real greenbar computer paper, the pink of a real riso drum. "Warm", "paper", "tactile" and "editorial" are not objects.
> Colour checks use OKLCH (L lightness 0 to 1, C chroma, h hue in degrees). The hex values are calibration examples.

### Palette (`tokens.colors`)
64. Warm-paper ground: the page ground at L 0.88 or more, C 0.008 to 0.06, h 50 to 105 (cream, ivory, oat, bone, parchment: #F4EFE4, #FAF7F0, #EDE6D6, #F2E8D5). Use pure white, a real coloured stock at full strength, or a dark ground. `·LD001`
65. Muted earth accent: an accent in sage (#8A9A82, #9CAF88), olive (#7A7A3A), terracotta or clay (#C4663F, #C07A5A), muted amber, ochre or tan (#B08A55, #C9A26B), dusty blue or slate (#6E86A0), dusty rose or mauve (#C49A9A), or espresso and taupe (#5C4A3D). Score 2 when the lead accent is one, or two accents are. `·LD002`
66. Nothing at full strength: no accent reaches C 0.17 or 85% of the most chroma sRGB allows at its lightness and hue (vermilion #E34234, cobalt #0047AB and signal yellow #C9A227 do; sage #8A9A82 is at 20%). Every language carries at least one ink at full strength. `·LD003`
67. Whisper accent: the lead accent (the `accent` token) is not a full-strength colour and measures under 3:1 against the ground (score 2 under 2.2:1), so it can neither carry a word nor mark a state. `·LD004`
68. Taupe stack: surface, border and muted are all warm-tinted greys (C 0.008 to 0.06, h 40 to 105). `·LD005`
69. Stock console: a near-black ground (L under 0.25) with a neon accent (phosphor green, cyan, amber or magenta at full strength) and glow, bloom, phosphor or CRT vocabulary. Five Published languages are called Phosphor. `·LD006`
70. SaaS violet and gradients: a full-strength indigo or violet accent (h 270 to 310, #6366F1, #8B5CF6), or a colour gradient on any surface, rail, button or ground. A CSS gradient function that draws dots, stripes or grain is texture and scores under rule 79. `·LD007`

### Type (`tokens.typography` and the rules that use it)
71. Stock faces: a role set in one of the ten faces the library already over-uses (languages using each, of 301: IBM Plex Mono 116, Space Grotesk 56, Archivo 54, Fraunces 48, Spline Sans Mono 48, Inter 47, Space Mono 40, IBM Plex Sans 37, JetBrains Mono 23, Newsreader 21). Score 1 for one role, 2 for two or more. Take the face from the source: its era, country, printing or signage technology. `·LD008`
72. Serif display over mono metadata: a serif display face paired with a mono face for labels and captions. `·LD009`
73. Tiny tracked caps: labels, eyebrows, kickers or micro-captions set uppercase with open tracking at 10 to 12px, usually in mono. Put the word in the body face at body size, or drop it. `·LD010`
74. Decorative metadata: codes that mean nothing to the reader, such as episode and seat numbers, serials, coordinates, folios, FIG. and No. marks, timestamps in margins, "marginalia". Keep a code only when the product would really show it. `·LD011`
75. Mono by reflex: a mono face declared although the source has no terminal, typewriter, receipt printer, ticker or instrument in it. Leave `mono_font` empty when the source has none. `·LD012`

### Structure and ornament (`tokens.borders`, `tokens.surfaces`, `rules`)
76. Hairline structure: 1px rules, keylines or ruled frames as the main separator, under every header, around every card, between rows. (Rule 10 already bans borders; hairlines are the usual way around it.) Separate with a real material edge, a colour field or space. `·LD013`
77. Frame marks: corner brackets, crop marks, registration crosses, reticles or tick marks decorating panels. `·LD014`
78. Chips on everything: status chips, pills, badges, LEDs or status dots attached to most modules. `·LD015`
79. Faint texture: grain, noise, scanlines, halftone, paper tooth, or a rule or dot field laid at low opacity as seasoning. A texture belongs at full strength when the material is the point, or not at all. `·LD016`
80. Console furniture: terminal panes, prompts, carets, blinking cursors, readouts and telemetry rows in a language whose subject is not a machine. `·LD017`
81. SaaS surface kit: soft blurred shadows, rounded floating cards, bento grids, glass or frosted panels. `·LD018`
82. Sparkle and glint: star, sparkle or glint marks and shimmer. `·LD019`
83. Stock motion: count-up stats, staggered fade-ups on every section, parallax with ken-burns, pulsing or breathing status dots, hover lift. Take motion from the material instead: ink spreading, a stamp landing, a split-flap turning. This supersedes the stock list in rule 34. `·LD020`

### Words (`name`, `philosophy`, rules prose)
84. Mood adjectives: the philosophy summary, values and visual character lean on mood words (warm, soft, quiet, calm, editorial, material, luminous, restrained, tactile, considered, crafted): 4 or more per 100 words scores 1, 6 or more scores 2. Name the thing instead: its material, maker, place, date and use. `·LD021`
85. Personified interface: the language describes its own surfaces as alive: panels that breathe, marks that whisper, rules that hum. "Breathing room" for space is an idiom, and product copy that says sorry in an error message is voice; neither scores. `·LD022`
86. Stock name: a name another Published language already uses (Phosphor five times, Caliper three), or one from the instrument shelf the library keeps reaching for: Phosphor, Caliper, Reticle, Vernier, Meridian, Folio, Quire, Galley, Broadside, Litmus, Tincture, Gantry, Fathom, Halide, Ledger. `·LD023`

### Verdict
87. Add the scores. A new or revised language passes at 8 or less. 9 to 15 goes back for repair of every scored line. 16 or more is generic and fails rule 2. `·LD024`
88. Two combinations fail on sight whatever the total. The warm-editorial default: rule 64, plus 65 or 66, plus 72 or 73. The stock-console default: rule 69 at 2, plus 73, plus 77 or 79. `·LD025`
89. A repair keeps the language's idea and its one real signature mechanic, and replaces each scored default with something taken from a named real material, object or cultural source, at full contrast. Name the source in the rules and take the colours and faces from it. `·LD026`
