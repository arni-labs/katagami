# Nobori shadcn/ui Components

component-recipes-v1  
Author: katagami-agent

## Intent

Project shadcn/ui primitives into Nobori without adding a second visual system. The result should look like the Nobori Atlas product: bright white air, cool tone-separated surfaces, oversized press-block type, 48px controls, and exactly three accent colors used like highlighters.

## Required primitives

button, card, input, textarea, select, dialog, sheet, tabs, badge, separator, checkbox, switch, slider, tooltip, dropdown-menu, table.

## Token cues

- Background: `--bg #FFFFFF`.
- Surface: `--surface #F4FAFE`.
- Text: `--text #000000`.
- Muted: `--muted #546376`.
- Accent: `--accent #00C8F0`.
- Success: `--success #00D070`.
- Error and warning: `--error #FF2A62`.
- Border: transparent; do not render visible outlines.
- Control height: `48px` for every button, input, select, switch row, checkbox row, and table row minimum.
- Radius: only `0`, `16px`, `24px`, `9999px`.

## Visual character to preserve

1. White air and cool blue-white sheets separate content by tone and spacing.
2. Large black press blocks hold important headlines.
3. Product imagery appears in large crops, not as decorative stickers.
4. Highlighter accents map to action, readiness, or urgent attention.
5. All form controls are custom styled and visibly focused.

## ShadSync visual profile

- family: `graphic-product-editorial`
- material: `white-air-and-cool-surface`
- contour: `pill-controls-card-panels`
- border: `none-transparent`
- underlay: `tone-sheets`
- grain: `none`
- stickerBadges: `false`
- motion: `wind-lift`
- density: `operational-spacious`
- accents: `electric-sky, leaf-green, hot-coral`

## Signature component recipes

### button

Use one `.btn` base. Primary uses electric sky-blue fill and black text. Destructive or singular launch action uses hot coral fill. Secondary is white with tone shadow. Ghost is transparent until hover. All buttons are 48px tall, pill-shaped, and receive a 6px electric focus ring.

### card

Use 24px radius, white or cool surface fill, tone shadow, and no visible border. Do not nest cards. Interactive cards lift 2px on hover and show the same focus ring when focusable.

### input

Wrap every input in a field shell. The shell owns 48px height, 16px radius, white fill, tone shadow, hover lift, and focus-within ring. The native input has no visible browser chrome.

### textarea

Same wrapper and focus behavior as input. Minimum height is `calc(var(--control-height) * 2)`. Resize may be vertical only.

### select

Same wrapper as input. Use an inline SVG chevron with an authored path. Do not use text glyph arrows.

### dialog

Use a 24px white panel on a cool surface wash. No border. Primary action is one electric or hot button; secondary actions remain quiet.

### sheet

Use a 24px panel when inset or 0 radius when edge-flush. Separate from the page by tone and shadow only.

### tabs

Tab list is a pill group on cool surface. Active tab uses electric fill or bold black on white. Each tab is 48px tall.

### badge

Badges use pill radius. Blue means ready/info, green means confirmed, hot means due/urgent. Avoid extra accent colors.

### separator

Prefer spacing. If a separator is unavoidable, use an empty 8px or 16px tone gap; never a visible grey rule.

### checkbox

Render as a custom 48px row with a 24px square-like indicator using 16px radius or a pill check mark drawn with SVG. No native checkbox chrome.

### switch

48px high pill track with a white thumb. Checked state uses leaf green. Focus applies to the whole track.

### slider

48px interaction height. Track is a cool pill, fill is electric blue, thumb is a white pill/circle with tone shadow and focus ring.

### tooltip

Black press block with white text, 0 radius, generous padding, no arrow glyph. Use short operational copy.

### dropdown-menu

White 24px panel with tone shadow, no border. Items are 48px high pills or rows. Hover uses cool surface.

### table

Rows are 48px minimum, 15px+ text, cool surface tone, 24px row radius. Hide non-essential columns on mobile. No grid borders.

## Preview shots

- `application-shell`: Nobori Atlas release overview with sidebar nav, stats, progress bars, and venue queue.
- `detail-editor`: venue-release editor with text input, select, textarea, switch, and proof actions.
- `data-operations`: table-heavy operational queue with status badges, dropdown menu, slider, tooltip, and destructive hold action.

## Implementation contract

Import primitives from `@/components/ui/*`. Use Nobori tokens, the one control-height token, visible focus rings, no grey borders, no arbitrary radii, no default browser form chrome, and no extra accent colors. Product scenes should read as real Nobori Atlas screens, not a component inventory.

## Copy-paste component example

```tsx
<Button className="min-h-[48px] rounded-full bg-[var(--accent)] px-5 font-black text-[var(--on-accent)] shadow-[0_24px_70px_color-mix(in_srgb,var(--accent)_18%,transparent)] focus-visible:shadow-[var(--focus-ring)]">
  Send update
</Button>
```
