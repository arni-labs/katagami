import type { ReactNode, CSSProperties } from "react";

type AccentColor =
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
    ? `color-mix(in srgb, var(--${tint}) 9%, var(--paper-tint-base))`
    : "var(--paper-tint-base)";
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: tintBg,
        backdropFilter: "blur(4px) saturate(1.05)",
        WebkitBackdropFilter: "blur(4px) saturate(1.05)",
        boxShadow:
          "0 1px 2px rgba(30, 35, 45, 0.04), 0 6px 18px rgba(30, 35, 45, 0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A small diagonal washi tape. Use absolute-positioned on a parent. */
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
      className={`pointer-events-none absolute rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: `repeating-linear-gradient(45deg, color-mix(in oklch, var(--${color}) 75%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--${color}) 35%, var(--paper-tape-mix)) 6px 12px)`,
        transform: `rotate(${rotate}deg)`,
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
