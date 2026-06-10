import type { ReactNode, CSSProperties } from "react";

type AccentColor =
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

/** A riso print note — flat paper sheet, no border; the edge is a
    misregistered ink pass offset underneath, tinted by `tint`. */
export function StickyNote({
  children,
  tint,
  className = "",
  style,
}: {
  children: ReactNode;
  tint?: AccentColor;
  className?: string;
  style?: CSSProperties;
}) {
  const ink = `var(--${tint ?? "ramune"})`;
  const tintBg = tint
    ? `color-mix(in srgb, var(--${tint}) 8%, var(--paper-tint-base))`
    : "var(--paper-tint-base)";
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: tintBg,
        boxShadow: `0 1px 2px rgba(33, 33, 60, 0.03), 4px 5px 0 color-mix(in srgb, ${ink} 15%, transparent)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A strip of overprinted spot ink (was washi tape). Absolute-position on a parent. */
export function WashiTape({
  color = "sakura",
  rotate = -5,
  className = "",
  width = 64,
  height = 13,
  style,
}: {
  color?: AccentColor;
  rotate?: number;
  className?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute opacity-75 ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: `var(--${color})`,
        mixBlendMode: "var(--ink-blend)" as CSSProperties["mixBlendMode"],
        transform: `rotate(${rotate}deg) skewX(-8deg)`,
        ...style,
      }}
    />
  );
}

/** Section heading: display font + optional marker highlight + eyebrow stamp.
    The stamp sits on a short strip of overprinted ink — tape holds the
    label to the page. */
export function SectionHeading({
  eyebrow,
  eyebrowColor = "ramune",
  children,
}: {
  eyebrow?: string;
  eyebrowColor?: AccentColor;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end gap-3">
      {eyebrow && (
        <span className="relative shrink-0">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-1.5 h-[11px] w-[calc(100%+16px)] opacity-70"
            style={{
              background: `var(--${eyebrowColor})`,
              mixBlendMode: "var(--ink-blend)" as CSSProperties["mixBlendMode"],
              transform: "rotate(-2deg) skewX(-8deg)",
            }}
          />
          <span
            className="stamp relative"
            style={{ color: `var(--${eyebrowColor})` }}
          >
            {eyebrow}
          </span>
        </span>
      )}
      <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
        {children}
      </h2>
    </div>
  );
}

/** Print registration cross — the press operator's alignment mark.
    Decorative punctuation for section corners and drawer labels. */
export function RegMark({
  className = "",
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`text-[var(--graphite)] opacity-60 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="6" />
      <path d="M 0 12 H 24 M 12 0 V 24" />
    </svg>
  );
}

/** Vermillion hanko seal — 型 pressed in ink. The library's chop. */
export function HankoSeal({
  className = "",
  size = 44,
  glyph = "型",
}: {
  className?: string;
  size?: number;
  glyph?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-grid place-items-center font-display font-bold ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: "color-mix(in oklch, var(--sakura) 55%, var(--beni))",
        backgroundImage: "var(--grain-url)",
        backgroundSize: "90px 90px",
        backgroundBlendMode: "soft-light",
        color: "var(--washi)",
        fontSize: size * 0.5,
        lineHeight: 1,
        transform: "rotate(-6deg)",
        maskImage:
          "radial-gradient(circle at 30% 35%, black 52%, rgba(0,0,0,0.82) 78%, rgba(0,0,0,0.92) 100%)",
        WebkitMaskImage:
          "radial-gradient(circle at 30% 35%, black 52%, rgba(0,0,0,0.82) 78%, rgba(0,0,0,0.92) 100%)",
      }}
    >
      {glyph}
    </span>
  );
}

/** Stamp-style pill. */
export function Stamp({
  color = "sumire",
  rotate,
  children,
  className = "",
}: {
  color?: AccentColor;
  rotate?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`stamp ${className}`}
      style={{
        color: `var(--${color})`,
        ...(rotate !== undefined && { transform: `rotate(${rotate}deg)` }),
      }}
    >
      {children}
    </span>
  );
}

/** Thin perforation divider (dashed). */
export function Perforation({ className = "" }: { className?: string }) {
  return <div className={`sticker-perforation ${className}`} />;
}
