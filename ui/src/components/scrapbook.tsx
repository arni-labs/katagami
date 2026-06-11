import type { ReactNode, CSSProperties } from "react";

type AccentColor =
  | "graphite"
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

/** A generic sticky-note-style card (sharp corners, translucent, soft shadow). */
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
  const tintBg = tint
    ? `color-mix(in srgb, var(--${tint}) 8%, var(--paper-tint-base))`
    : "var(--paper-tint-base)";
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: tintBg,
        boxShadow: "var(--shadow-card)",
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
  height = 16,
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
      className={`washi-tape pointer-events-none ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ["--strip-ink" as string]: `var(--${color})`,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    />
  );
}

/** Section heading: display font + optional marker highlight + eyebrow stamp. */
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
