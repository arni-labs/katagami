// Katagami control vocabulary — shared class strings so buttons, fields, and
// labels match the main page. Principle: NO grey box borders. Inputs are a
// dashed ink underline; surfaces are paper tints + soft shadow; buttons are
// ink/paper fills with a hard offset shadow + a hover lift; corners stay sharp.

// Dashed-underline text field (transparent box, ink underline; solid on focus).
export const KX_FIELD =
  "w-full rounded-none border-0 border-b border-dashed border-foreground/30 bg-transparent px-1 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-solid focus:border-foreground/70";

// Primary action: solid ink fill, letterpress offset shadow, lifts on hover.
export const KX_BTN_INK =
  "inline-flex items-center justify-center gap-2 bg-foreground px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.18)] transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-1deg] disabled:translate-y-0 disabled:rotate-0 disabled:opacity-40 disabled:shadow-none";

// Secondary action: paper fill, lighter offset shadow, same lift. No border.
export const KX_BTN_PAPER =
  "inline-flex items-center justify-center gap-2 bg-card px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground shadow-[0_2px_0_rgba(30,35,45,0.09)] transition-all duration-200 hover:-translate-y-[2px] hover:bg-[color-mix(in_srgb,var(--foreground)_5%,var(--card))] disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none";

// Mono uppercase micro-label.
export const KX_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground";

// Soft paper surface (no border) — for panels/cards/triggers.
export const KX_PAPER =
  "bg-card/70 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)] backdrop-blur-[4px]";
