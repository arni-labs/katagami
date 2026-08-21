# Keyblock shadcn/ui Components

Format: component-recipes-v1
Author: katagami-agent

## Intent

Make shadcn primitives print like Keyblock: indigo ink carries every line and
solid block, color arrives as flat plates slipping out of register, and every
edge is cut square. The shadcn house style (rounded corners, hairline borders,
soft shadows) must disappear entirely — Keyblock is a no-border, radius-0
language where hierarchy comes from tone (paper vs washed paper vs ink) and
from the kento-registration offset plate.

## Required primitives

button, card, input, textarea, select, dialog, sheet, tabs, badge, separator,
checkbox, switch, slider, tooltip, dropdown-menu, table.

## Token cues

- `--radius: 0rem` everywhere — never override per component.
- `--border: transparent`; components never draw outlines. Separation is
  `background` (#FFFFFF paper) against `card`/`muted` (#EEF1F8 washed paper).
- `--primary: #E23A21` (vermillion) with white foreground — the only loud
  action color. `--accent: #24359E` (registration blue) marks selection,
  links, and every `--ring` focus state (3px, offset 2px).
- Text is `--foreground: #131A38` at 17px body / Inter; display and panel
  titles are Archivo 900 tracked -0.02em.
- One shared control height: `h-12` (48px) for buttons, inputs, selects,
  tabs triggers in console density; `h-13` (52px) on marketing surfaces.

## Visual character to preserve

1. **Ink press blocks** — solid `#131A38` fills with white type for table
   headers, popovers, tooltips, active tabs, and any type over imagery.
2. **Kento registration offset** — a flat color plate translated 8-10px
   behind card-level surfaces (`::before` or a wrapper div), rotating ink,
   vermillion, and registration blue. Never a blur shadow.
3. **Cut edges** — radius 0 on every element including thumbs, swatches,
   and checks.
4. **Cool neutrals** — all greys derive from the indigo hue (#5B647F,
   #EEF1F8); no warm greys, no true-black.
5. **Vermillion scarcity** — one primary action and one or two plates per
   viewport; semantic reds stay quieter (#C22F18).

## ShadSync visual profile

family: flat-print; material: paper; contour: cut (radius 0);
border: none (transparent); underlay: offset solid plate 8-10px
(ink/vermillion/registration); grain: none on UI (woodgrain lives in
imagery only); stickerBadges: false; motion: register/slip
(translate into place, 200-350ms, cubic-bezier(.2,.7,.2,1));
density: airy (96px+ section rhythm); accents: max 3
(#131A38, #E23A21, #24359E).

## Signature component recipes

- **button**: `rounded-none h-12 px-7 font-bold text-[17px]`. Primary:
  `bg-primary text-primary-foreground hover:-translate-x-[3px]
  hover:-translate-y-[3px] hover:shadow-[6px_6px_0_0_#131A38] transition`.
  Secondary: `bg-secondary text-foreground hover:bg-foreground
  hover:text-background`. Destructive: `bg-background text-destructive
  hover:bg-destructive hover:text-white`. Focus: `focus-visible:ring-[3px]
  ring-ring ring-offset-2`.
- **card**: `rounded-none border-0 bg-card` wrapped in a relative container
  whose `::before` is `absolute inset-0 bg-primary translate-x-[10px]
  translate-y-[10px] -z-10` (rotate `bg-foreground` / `bg-accent` across a
  card set). CardTitle is Archivo 700, 21px, -0.02em.
- **input**: `rounded-none border-0 bg-input h-12 px-4 text-[17px]
  text-foreground placeholder:text-muted-foreground focus-visible:ring-[3px]
  ring-ring`. Error state: `shadow-[inset_0_0_0_3px_#C22F18]`, never an
  outline.
- **textarea**: as input with `min-h-[120px] py-3` and vertical resize only.
- **select**: trigger styled as input with a custom ink chevron
  (`stroke-[#131A38] stroke-[2.5]`); content panel `rounded-none border-0
  bg-popover text-popover-foreground` (ink block), items highlight
  `bg-primary text-white`.
- **dialog**: `rounded-none border-0 bg-background p-8` over a solid
  `bg-foreground/80` overlay (no blur); the dialog sits on a vermillion
  offset plate; DialogTitle is Archivo 900 with the kento corner mark.
- **sheet**: side panel `rounded-none border-0 bg-background`; its leading
  edge carries no rule — a 12px vermillion plate offset behind the panel
  implies the edge.
- **tabs**: TabsList `rounded-none bg-secondary p-1`; triggers `rounded-none
  h-11 px-5 font-semibold text-muted-foreground
  data-[state=active]:bg-foreground data-[state=active]:text-background`.
- **badge**: `rounded-none px-2.5 py-1 text-[13.5px] font-bold` in solid
  plates: accent (running), primary (new), `#1E7A4F` (complete), `#C27A00`
  (paused), secondary+muted-foreground (draft).
- **separator**: never a line — render as `h-4 bg-transparent` spacing, or a
  12x4px vermillion kento tick when a break must be visible.
- **checkbox**: `rounded-none size-[26px] border-0 bg-secondary
  data-[state=checked]:bg-foreground` with a white check.
- **switch**: `rounded-none h-[30px] w-[58px] bg-secondary
  data-[state=checked]:bg-primary`; thumb `rounded-none size-[22px]
  bg-foreground data-[state=checked]:bg-white translate-x-transition`.
- **slider**: track `rounded-none h-1.5 bg-secondary`; range `bg-foreground`;
  thumb `rounded-none size-[22px] bg-primary border-0`.
- **tooltip**: `rounded-none border-0 bg-foreground text-background
  text-[14.5px] px-3.5 py-2` with a cut (clip-path) triangle pointer.
- **dropdown-menu**: content `rounded-none border-0 bg-popover
  text-popover-foreground min-w-[220px] p-0`; items `rounded-none px-4 py-3
  focus:bg-primary focus:text-white`; separators are 8px transparent gaps.
- **table**: header row `bg-foreground text-background` (Archivo 700 14px);
  body rows alternate `bg-background` / `bg-secondary`; `hover:bg-foreground
  hover:text-background` takes the full ink plate; numeric cells
  `font-bold text-right tabular-nums`.

## Preview shots

See `preview-shots.json` (katagami:shadcn-preview-shots, renderable-v1) —
three scenes in the Kento reading world: the desk shell, the installment
editor, and the run-sheet data operations view.

## Implementation contract

1. Install the registry theme (`registry-theme.json`) before any component
   work; it zeroes the radius and empties every border var.
2. Never reintroduce `border` utilities or `rounded-*` above 0; audit
   generated markup for shadcn defaults and strip them.
3. Wrap card-level surfaces in the kento-registration container; rotate the
   three plate colors, never repeat one plate three times in a row.
4. Keep one control height per surface; do not mix h-9/h-10/h-12 controls
   in one view.
5. Respect `prefers-reduced-motion`: register/slip transitions collapse to
   opacity only.
6. All type over imagery goes inside a solid ink press block — no scrims,
   no gradients, no text-shadow.

## Copy-paste component example

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function InstallmentCard() {
  return (
    <div className="relative">
      {/* kento registration plate */}
      <div className="absolute inset-0 translate-x-[10px] translate-y-[10px] bg-[#E23A21]" aria-hidden />
      <Card className="relative rounded-none border-0 bg-[#EEF1F8]">
        <CardContent className="p-7">
          <Badge className="rounded-none bg-[#24359E] font-bold text-white">
            Running · Part 7 of 12
          </Badge>
          <CardTitle className="mt-4 font-[Archivo] text-[26px] font-black tracking-[-0.02em] text-[#131A38]">
            The Paper Harbor
          </CardTitle>
          <p className="mt-2 text-[16.5px] text-[#5B647F]">
            A year inside the last hand-set print shop in Kanazawa.
          </p>
          <Button className="mt-6 h-12 rounded-none bg-[#E23A21] px-7 text-[17px] font-bold text-white transition hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_0_#131A38]">
            Continue reading
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```
