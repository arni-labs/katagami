"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { parseJson } from "@/lib/odata";
import {
  buildDesignMdFrontMatter,
  type SpecPanelProps,
} from "@/components/spec-panel";

// Katagami-styled DESIGN.md preview: large, airy sticker cards showing the
// distilled palette / typography / spacing / shape so the rich JSON behind
// the spec is visible at-a-glance, not just downloadable.
export function DesignMdShowcase(
  props: SpecPanelProps & { compact?: boolean },
) {
  const tokens = parseJson<Record<string, unknown>>(props.tokens);
  const fm = buildDesignMdFrontMatter(props, tokens);
  const colors = (fm.colors as Record<string, string>) ?? {};
  const typography = (fm.typography as Record<string, TypographyToken>) ?? {};
  const spacing = (fm.spacing as Record<string, string>) ?? {};
  const rounded = (fm.rounded as Record<string, string>) ?? {};

  const fontFamilies = Array.from(
    new Set(
      Object.values(typography)
        .map((t) => firstFontFamily(t.fontFamily))
        .filter(Boolean) as string[],
    ),
  );

  const hasColors = Object.keys(colors).length > 0;
  const hasTypography = Object.keys(typography).length > 0;
  const hasSpacing = Object.keys(spacing).length > 0;
  const hasRounded = Object.keys(rounded).length > 0;
  const hasComponents = hasColors && hasRounded;

  if (
    !hasColors &&
    !hasTypography &&
    !hasSpacing &&
    !hasRounded &&
    !hasComponents
  )
    return null;

  return (
    <>
      <FontLoader families={fontFamilies} />
      <div
        className={props.compact ? "grid gap-5" : "grid gap-8 xl:grid-cols-2"}
      >
        {hasColors && (
          <ShowcaseCard tape="sakura" title="Palette">
            <PaletteGrid colors={colors} />
          </ShowcaseCard>
        )}
        {hasTypography && (
          <ShowcaseCard tape="sumire" title="Typography">
            <TypePreview typography={typography} />
          </ShowcaseCard>
        )}
        {hasComponents && (
          <ShowcaseCard tape="yuzu" title="Components">
            <ComponentSamples
              colors={colors}
              rounded={rounded}
              typography={typography}
            />
          </ShowcaseCard>
        )}
        {hasSpacing && (
          <ShowcaseCard tape="ramune" title="Spacing">
            <SpacingScale spacing={spacing} />
          </ShowcaseCard>
        )}
        {hasRounded && (
          <ShowcaseCard tape="sakura" title="Shape">
            <RoundedSamples rounded={rounded} />
          </ShowcaseCard>
        )}
      </div>
    </>
  );
}

interface TypographyToken {
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  lineHeight?: string | number;
}

// ── Font loader ────────────────────────────────────────────────────

const GENERIC_FAMILIES = new Set([
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "inherit",
  "initial",
  "unset",
]);

function firstFontFamily(value: string | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim().replace(/['"]/g, "");
  if (!first) return null;
  if (GENERIC_FAMILIES.has(first.toLowerCase())) return null;
  return first;
}

// Loads design-spec fonts from Google Fonts at runtime. Most well-known
// design-system fonts (Inter, Montserrat, Playfair Display, Noto, …) are
// served by Google Fonts; obscure ones gracefully fall back to system.
function FontLoader({ families }: { families: string[] }) {
  if (families.length === 0) return null;
  const imports = families
    .map((f) => {
      const safe = f.replace(/\s+/g, "+");
      return `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        safe,
      ).replace(/%2B/g, "+")}:wght@400;500;600;700&display=swap');`;
    })
    .join("\n");
  return <style>{imports}</style>;
}

// ── Sticker card chrome ───────────────────────────────────────────

function ShowcaseCard({
  title,
  tape,
  children,
}: {
  title: string;
  tape: string;
  children: React.ReactNode;
}) {
  return (
    <article className="relative bg-card px-6 py-7 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_8px_22px_rgba(30,35,45,0.05)] sm:px-8 sm:py-8">
      <header className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-block h-[3px] w-7 rounded-[2px]"
          style={{ background: `var(--${tape})` }}
        />
        <h3 className="font-display text-[20px] font-bold leading-none tracking-[-0.02em] sm:text-[24px]">
          {title}
        </h3>
      </header>
      {children}
    </article>
  );
}

// ── Palette ───────────────────────────────────────────────────────

function PaletteGrid({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.entries(colors).map(([name, value]) => (
        <ColorChip key={name} name={name} value={value} />
      ))}
    </div>
  );
}

function ColorChip({ name, value }: { name: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title={`copy ${value}`}
      className="group relative flex flex-col gap-2 text-left transition-transform hover:-translate-y-[1px]"
    >
      <span
        aria-hidden
        className="block h-20 w-full rounded-[2px] shadow-[inset_0_0_0_1px_rgba(30,35,45,0.06)]"
        style={{ background: value }}
      />
      <span className="flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {name}
        </span>
        {copied ? (
          <Check className="h-3 w-3 shrink-0 text-[var(--foreground)]" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
        )}
      </span>
      <span className="truncate font-mono text-[12px] text-foreground/85">
        {value}
      </span>
    </button>
  );
}

// ── Typography ────────────────────────────────────────────────────

function TypePreview({
  typography,
}: {
  typography: Record<string, TypographyToken>;
}) {
  const entries = Object.entries(typography).slice(0, 5);
  return (
    <div className="space-y-6">
      {entries.map(([key, token]) => (
        <TypeRow key={key} name={key} token={token} />
      ))}
    </div>
  );
}

function TypeRow({ name, token }: { name: string; token: TypographyToken }) {
  const family = token.fontFamily || "inherit";
  const cleanFamily = firstFontFamily(family);
  const size = sizeOf(token.fontSize, 18);
  const weight = String(token.fontWeight ?? 400);
  const lineHeight = token.lineHeight ?? 1.4;

  // Cap render size so a 64px heading still fits comfortably in the card
  const renderSize = Math.min(size, 36);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {name}
        </span>
        <span className="truncate font-mono text-[10px] text-muted-foreground/70">
          {cleanFamily ?? "system"} · {size}px · {weight}
        </span>
      </div>
      <p
        className="text-foreground"
        style={{
          fontFamily: family,
          fontSize: renderSize,
          fontWeight: weight,
          lineHeight: String(lineHeight),
        }}
      >
        The quick brown fox jumps
      </p>
    </div>
  );
}

function sizeOf(v: string | number | undefined, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.match(/^(\d*\.?\d+)/);
    if (m) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n)) {
        if (v.endsWith("rem") || v.endsWith("em")) return Math.round(n * 16);
        return Math.round(n);
      }
    }
  }
  return fallback;
}

// ── Spacing ───────────────────────────────────────────────────────

function SpacingScale({ spacing }: { spacing: Record<string, string> }) {
  const entries = Object.entries(spacing);
  const sizes = entries.map(([, v]) => sizeOf(v, 0));
  const max = Math.max(...sizes, 16);

  return (
    <ul className="space-y-3">
      {entries.map(([key, value], i) => {
        const px = sizes[i];
        const pct = Math.max(6, Math.round((px / max) * 100));
        return (
          <li key={key} className="flex items-center gap-3">
            <span className="w-14 shrink-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {key}
            </span>
            <span className="flex-1">
              <span
                aria-hidden
                className="block h-2.5 rounded-[1px] bg-foreground/70"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right font-mono text-[11px] text-foreground/85">
              {value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Components ────────────────────────────────────────────────────

function pickColor(
  colors: Record<string, string>,
  candidates: string[],
): string | null {
  for (const c of candidates) {
    if (colors[c]) return colors[c];
  }
  return null;
}

function pickRounded(
  rounded: Record<string, string>,
  candidates: string[],
): string {
  for (const c of candidates) {
    if (rounded[c]) return rounded[c];
  }
  const first = Object.values(rounded)[0];
  return first ?? "4px";
}

function ComponentSamples({
  colors,
  rounded,
  typography,
}: {
  colors: Record<string, string>;
  rounded: Record<string, string>;
  typography: Record<string, TypographyToken>;
}) {
  const colorList = Object.values(colors);
  const primary =
    pickColor(colors, ["primary", "accent", "brand"]) ?? colorList[0];
  const accent =
    pickColor(colors, ["accent", "secondary", "highlight"]) ??
    colorList[1] ??
    primary;
  const surface =
    pickColor(colors, ["surface", "background", "card", "paper"]) ?? "#ffffff";
  const text =
    pickColor(colors, ["text", "foreground", "ink", "primary_text"]) ??
    "#1a1a1a";
  const muted =
    pickColor(colors, ["muted", "subtle", "secondary_text"]) ??
    "color-mix(in oklch, " + text + " 60%, " + surface + ")";

  const buttonRadius = pickRounded(rounded, ["md", "lg", "base"]);
  const cardRadius = pickRounded(rounded, ["lg", "xl", "md"]);
  const inputRadius = pickRounded(rounded, ["sm", "md", "base"]);
  const badgeRadius = pickRounded(rounded, ["full", "pill", "xl", "lg"]);

  const bodyFamily =
    typography.body?.fontFamily ||
    typography.text?.fontFamily ||
    "inherit";
  const headingFamily =
    typography.heading?.fontFamily ||
    typography.display?.fontFamily ||
    typography.title?.fontFamily ||
    bodyFamily;

  // Pick a contrasting button text color: if surface is light, use text;
  // otherwise use surface.
  const buttonTextColor = isLight(primary) ? text : "#ffffff";

  return (
    <div
      className="space-y-5 rounded-[2px] p-5"
      style={{ background: surface, color: text, fontFamily: bodyFamily }}
    >
      {/* Buttons row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 text-[13px] font-semibold transition-transform hover:-translate-y-[1px]"
          style={{
            background: primary,
            color: buttonTextColor,
            borderRadius: buttonRadius,
          }}
        >
          Primary action
        </button>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 text-[13px] font-medium transition-transform hover:-translate-y-[1px]"
          style={{
            background: "transparent",
            color: text,
            border: `1px solid ${muted}`,
            borderRadius: buttonRadius,
          }}
        >
          Secondary
        </button>
        <span
          className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{
            background: accent,
            color: isLight(accent) ? text : "#ffffff",
            borderRadius: badgeRadius,
          }}
        >
          New
        </span>
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <label
          className="block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: muted }}
        >
          Email
        </label>
        <input
          type="text"
          readOnly
          defaultValue="hello@example.com"
          className="w-full px-3 py-2 text-[13px] focus:outline-none"
          style={{
            background: surface,
            color: text,
            border: `1px solid ${muted}`,
            borderRadius: inputRadius,
          }}
        />
      </div>

      {/* Mini card */}
      <div
        className="px-4 py-3 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_12px_rgba(30,35,45,0.06)]"
        style={{
          background: surface,
          borderRadius: cardRadius,
          border: `1px solid ${muted}`,
        }}
      >
        <div
          className="text-[15px] font-bold leading-tight"
          style={{ fontFamily: headingFamily, color: text }}
        >
          Card title
        </div>
        <p
          className="mt-1 text-[12px] leading-relaxed"
          style={{ color: muted }}
        >
          Components rendered with this language&rsquo;s tokens —
          colors, type, and rounded corners as specified.
        </p>
      </div>
    </div>
  );
}

// Rough perceived-lightness check on a hex color so we can pick a
// readable text color for buttons / badges.
function isLight(hex: string): boolean {
  const m = hex.match(/^#([0-9a-fA-F]{3,8})$/);
  if (!m) return false;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // sRGB luma
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6;
}

// ── Rounded ───────────────────────────────────────────────────────

function RoundedSamples({ rounded }: { rounded: Record<string, string> }) {
  const entries = Object.entries(rounded);
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col items-center gap-2">
          <span
            aria-hidden
            className="block h-14 w-14 bg-foreground/15 shadow-[inset_0_0_0_1px_rgba(30,35,45,0.12)]"
            style={{ borderRadius: value }}
          />
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {key}
          </span>
          <span className="truncate font-mono text-[11px] text-foreground/85">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
