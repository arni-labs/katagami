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

/** Section heading: display font + optional marker highlight + eyebrow stamp. */
export function SectionHeading({
  eyebrow,
  eyebrowColor = "sumire",
  children,
}: {
  eyebrow?: string;
  eyebrowColor?: AccentColor;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end gap-3">
      {eyebrow && (
        <span
          className="stamp shrink-0"
          style={{ color: `var(--${eyebrowColor})` }}
        >
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
        {children}
      </h2>
    </div>
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
