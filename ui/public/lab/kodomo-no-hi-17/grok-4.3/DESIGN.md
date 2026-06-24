# Koinobori

**One language. Two surfaces. Kodomo no Hi.**

## Concept & POV

Koinobori is the language of ascent made visible. It takes the single strongest motif of Kodomo no Hi — the carp streamers that climb on the wind on the fifth of May — and turns that motion into a design system.

The signature mechanic is **vertical lift through layered air**. Compositions step upward in deliberate rhythms. Overlapping translucent planes and rising verticals suggest fabric caught mid-billow. Open white ground and generous sky give the eye room to rise. Accent colour is used exactly like festival highlighters: electric, immediate, never muddy or pastel.

The tone is bright, confident, grown-up graphic design — an event an adult would proudly organize and attend. Clean edges, crisp type, strong editorial hierarchy, real concrete detail in every sentence. No toy-like clutter, no childish illustration, no washed gradients.

Name source: "Koinobori" (鯉のぼり), the carp streamer itself. The noun is the object and the act. One word, cultural, direct from the motif.

## Tokens

All colour is expressed through the role variables so a single theme swap recolours everything.

### Colour roles (light, clear early-summer ground)

```css
:root {
  --bg: #ffffff;
  --surface: #f8fafc;
  --surface-2: #eef2f7;        /* tone separation, never border */
  --text: #0a111f;
  --muted: #5b6678;
  --border: #e2e8f0;           /* used sparingly; surfaces do the separation */

  --accent: #00c4ff;           /* electric sky-blue — primary highlighter */
  --on-accent: #ffffff;

  --success: #00d99a;          /* fresh stream green */
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* one extra pop used only for emphasis where needed */
  --koi: #ff2d6b;              /* hot festival pop — third accent colour */
}
```

Accents: exactly three highlighters — electric sky (#00c4ff), fresh green (#00d99a), hot koi pop (#ff2d6b). All other semantic roles stay within this temperature.

Neutrals are cool and crisp to match the clear light of the day.

### Typography

System sans, graphic and editorial.

```css
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

--fs-0: 13px;   /* small labels */
--fs-1: 15px;
--fs-2: 17px;   /* body minimum */
--fs-3: 19px;
--fs-4: 23px;
--fs-5: 28px;
--fs-6: 34px;
--fs-7: 42px;
--fs-8: 56px;
--fs-9: 72px;   /* display / hero */

--lh-tight: 1.1;
--lh-snug: 1.25;
--lh-base: 1.55;
--lh-relaxed: 1.7;

--tracking-tight: -0.025em;
--tracking-normal: -0.01em;
```

Body always 17px+. Display uses weight 700–800 + tight tracking. Headlines never default to generic oversized italic.

### Spacing (generous, titles always padded above)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
--space-10: 128px;
```

Section titles receive at least --space-7 padding-top. Gaps between major blocks use --space-8 / --space-9.

### Radius — one coherent geometry

Only these four values:

```css
--r-0: 0px;
--r-1: 8px;
--r-2: 16px;
--r-3: 24px;
--r-full: 9999px;
```

Cards and controls use --r-2. Larger containers --r-3. Sharp graphic moments use --r-0 or --r-1. Nothing in between.

### Control height — exactly one shared token

```css
--control-h: 48px;
```

Every button, input, select, textarea (multi-line exception), checkbox/radio visual target, and form row uses exactly this height. Label + control pairs size the control to 48px tall.

## State Matrix (applied to every control)

All interactive elements share the same five states. No browser defaults remain.

**Default**  
Solid or light surface, full contrast text, subtle border where needed for definition.

**Hover**  
Slight lift in surface tone or accent tint on text / border. 120ms ease.

**Focus (visible ring)**  
Always a 2px ring using --accent, offset 2px. Never rely on browser outline alone. Ring is the only focus indicator.

**Active**  
Slight scale or translate inward + darker / more saturated surface. Immediate.

**Disabled**  
Opacity 0.45, no pointer, desaturated.

Buttons carry one primary (solid --accent on dark text or white on accent). All other buttons use surface or quiet treatment. Primary is unmistakable.

## Surfaces & Separation

Surfaces are separated by tone, never by heavy borders or outlines:

- Page ground: --bg
- Primary content blocks: --surface
- Nested or secondary panels: --surface-2

Cards never receive a single accent edge. A thin --border may appear only to separate dense rows inside a surface (tables, lists). Most visual separation is achieved by 24–48px gaps and value shift.

Navigation lives in the flow of the page; it is never trapped inside a floating rounded bar.

## Components (built once from tokens)

- **Button** — height exactly --control-h, radius --r-2, font --fs-2 weight 600, centered. Primary = background --accent, color --on-accent. Secondary = surface + text. Quiet = transparent + text. All states as above.
- **Input / Select / Textarea** — height --control-h, radius --r-1, padding 0 16px, background --surface or --bg, border 1px --border (focus ring replaces). Appearance none where needed. Checkbox and radio are custom: 20px square/circle with interior check using currentColor or accent fill, same states + ring on focus.
- **Card** — background --surface, radius --r-2, generous internal padding --space-6, no outer border. When stacked on --bg they read as raised by tone alone.
- **Section heading** — --fs-6 or --fs-7, weight 700, tracking --tracking-tight, padding-top --space-8.
- **Body** — --fs-2, --lh-base, max line length comfortable on all widths.
- **Koinobori motif elements** — inline SVG primitives (simple billowing arcs, stacked triangles for fins, clean lines). Used as decorative accents or section markers only. Never wallpaper.

## Imagery

Hero always uses `background-image: var(--hero-image)` on a full-bleed 100svh container. Overlay text is set in high-contrast dark with generous leading so it remains legible over any graphic image. No gradient scrim.

Feature images are placed inside cards or full-bleed-with-margin blocks using the same graphic language.

All generated media lives in `./media/` and is referenced relatively.

## Motion

Motion serves the ascent idea.

- On load, elements that "rise" start in a subtle lowered + lower-opacity state.
- A tiny inline script adds the `ready` class to `<html>` (or `js` flag) only when motion is allowed.
- Transitions use 180–280ms ease for lift, 80–120ms for micro states.
- Respects `prefers-reduced-motion: reduce` — everything settles immediately to final state when reduced.
- No continuous loops. No scroll-jacking. No down arrows or "scroll for more".

The settled, no-JS state is always a complete, beautiful page.

## Responsive

- 390px–2560px+.
- Mobile: single column, hide secondary nav items, tables collapse or scroll only horizontally inside their container.
- Ultra-wide: content capped and centered; only the hero is full-bleed.
- Grids use `minmax(0, 1fr)` and `min-width: 0` on children so they never overflow.

## Copy Voice

Concrete, specific, present-tense where possible. Real objects (kashiwa-mochi, kabuto, black carp for the father, blue for the eldest son). Real actions: "families raise the streamers before dawn", "the river path fills by nine". No lorem, no placeholder names, no AI festival clichés. Every sentence could appear on a printed programme for an actual day.

## Credits (art direction)

Koinobori graphic language draws from the living tradition of Japanese festival posters, the hand-painted and printed koinobori of the Showa and Heisei periods, and contemporary clean editorial illustration. The system itself is authored for this language; no single artist is imitated.

---

All rules from `design-language.md` are met:
- One ownable idea (ascent / lift)
- Name: single evocative noun from the motif, culture-matched
- ≤3 accent highlighters
- Body 17px+
- One control height
- Surfaces by tone
- Explicit full state matrix
- Coherent radii from the set
- Full-bleed hero via var(--hero-image)
- Generous spacing + title padding
- No emoji on buttons, no symbol glyphs in copy
- Motion gated for no-JS settled state
- Every form control styled
- Self-contained deliverables
