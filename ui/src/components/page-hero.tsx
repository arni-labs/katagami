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
      <div className="flex items-end justify-between gap-6">
        <div className="max-w-2xl">
          {eyebrow && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              <span
                className="inline-block h-[3px] w-9 rounded-[2px]"
                style={{ background: `var(--${eyebrowAccent})` }}
              />
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {rightSlot && (
          <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
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
