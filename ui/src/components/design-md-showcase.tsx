"use client";

import { parseJson } from "@/lib/odata";
import {
  buildDesignMdFrontMatter,
  type SpecPanelProps,
} from "@/components/spec-panel";

// Katagami-styled DESIGN.md preview. The palette now lives in the identity
// row at the top of the page (resolved from the linked PaletteSystem), so this
// "at a glance" card focuses on the one thing it shows best: a live type
// specimen rendered in the language's own typefaces.
export function DesignMdShowcase(
  props: SpecPanelProps & { compact?: boolean },
) {
  const tokens = parseJson<Record<string, unknown>>(props.tokens);
  const fm = buildDesignMdFrontMatter(props, tokens);
  const typography = (fm.typography as Record<string, TypographyToken>) ?? {};

  const fontFamilies = Array.from(
    new Set(
      Object.values(typography)
        .map((t) => firstFontFamily(t.fontFamily))
        .filter(Boolean) as string[],
    ),
  );

  if (Object.keys(typography).length === 0) return null;

  return (
    <>
      <FontLoader families={fontFamilies} />
      <ShowcaseCard tape="sumire" title="Typography">
        <TypePreview typography={typography} />
      </ShowcaseCard>
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
