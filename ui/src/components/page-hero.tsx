import type { ReactNode } from "react";

type AccentColor =
  | "graphite"
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

export function PageHero({
  eyebrow,
  eyebrowAccent = "ramune",
  title,
  description,
  rightSlot,
}: {
  eyebrow?: ReactNode;
  eyebrowAccent?: AccentColor;
  title: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <section className="relative">
      {/* corner halftone — one screened pass of the eyebrow ink */}
      <span
        aria-hidden
        className="halftone-wash -right-8 -top-10 hidden h-44 w-64 sm:block"
        style={{ ["--wash-ink" as string]: `var(--${eyebrowAccent})` }}
      />
      <div className="flex items-end justify-between gap-6">
        <div className="riso-reveal max-w-2xl">
          {eyebrow && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              <span
                className="inline-block h-[3px] w-9 rounded-[2px]"
                style={{ background: `var(--${eyebrowAccent})` }}
              />
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[52px]">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {rightSlot && (
          <div
            className="riso-reveal hidden shrink-0 flex-col items-end gap-1.5 sm:flex"
            style={{ ["--reveal-i" as string]: 2 }}
          >
            {rightSlot}
          </div>
        )}
      </div>
      {/* close the hero with the same gentle dashes that open it under the header */}
      <span aria-hidden className="sticker-perforation mt-7 block sm:mt-8" />
    </section>
  );
}

/** A clean published-count figure — the big number is the point, anchored by
 *  one small accent tick (matching the eyebrow). Sits in a PageHero rightSlot. */
export function HeroStat({
  value,
  label,
  accent = "graphite",
}: {
  value: number | string;
  label: string;
  accent?: AccentColor;
}) {
  return (
    <div className="text-right">
      <div className="font-display text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground sm:text-[56px]">
        {value}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <span
          aria-hidden
          className="inline-block h-[3px] w-6 rounded-[2px]"
          style={{ background: `var(--${accent})` }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Inline marker-highlighted word for use inside <PageHero title>. */
export function Marker({
  children,
  color = "yuzu",
}: {
  children: ReactNode;
  color?: AccentColor;
}) {
  return (
    <span className="marker">
      <span
        aria-hidden
        className="marker-fill"
        style={{ background: `var(--${color})` }}
      />
      <span className="marker-text">{children}</span>
    </span>
  );
}
