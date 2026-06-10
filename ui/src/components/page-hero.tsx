import type { ReactNode } from "react";

type AccentColor =
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

export function PageHero({
  eyebrow,
  eyebrowAccent = "teal",
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
                className="inline-block h-[7px] w-9 skew-x-[-8deg]"
                style={{
                  background: `var(--${eyebrowAccent})`,
                  mixBlendMode: "var(--ink-blend)" as never,
                }}
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
    </section>
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
