"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { parseJson } from "@/lib/odata";
import {
  buildDesignMdFrontMatter,
  type SpecPanelProps,
} from "@/components/spec-panel";

// A Katagami-styled DESIGN.md preview block: four sticker cards showing the
// distilled palette / typography / spacing / shape so the rich JSON behind
// the spec is also visible at-a-glance, not just downloadable.
export function DesignMdShowcase(props: SpecPanelProps) {
  const tokens = parseJson<Record<string, unknown>>(props.tokens);
  const fm = buildDesignMdFrontMatter(props, tokens);
  const colors = (fm.colors as Record<string, string>) ?? {};
  const typography = (fm.typography as Record<string, TypographyToken>) ?? {};
  const spacing = (fm.spacing as Record<string, string>) ?? {};
  const rounded = (fm.rounded as Record<string, string>) ?? {};

  const hasColors = Object.keys(colors).length > 0;
  const hasTypography = Object.keys(typography).length > 0;
  const hasSpacing = Object.keys(spacing).length > 0;
  const hasRounded = Object.keys(rounded).length > 0;

  if (!hasColors && !hasTypography && !hasSpacing && !hasRounded) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {hasColors && (
        <ShowcaseCard tape="sakura" title="Palette" rotate={-0.3}>
          <PaletteGrid colors={colors} />
        </ShowcaseCard>
      )}
      {hasTypography && (
        <ShowcaseCard tape="sumire" title="Type" rotate={0.3}>
          <TypePreview typography={typography} />
        </ShowcaseCard>
      )}
      {hasSpacing && (
        <ShowcaseCard tape="teal" title="Spacing" rotate={-0.2}>
          <SpacingScale spacing={spacing} />
        </ShowcaseCard>
      )}
      {hasRounded && (
        <ShowcaseCard tape="salad" title="Shape" rotate={0.2}>
          <RoundedSamples rounded={rounded} />
        </ShowcaseCard>
      )}
    </div>
  );
}

interface TypographyToken {
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  lineHeight?: string | number;
}

// ── Sticker card chrome ───────────────────────────────────────────

function ShowcaseCard({
  title,
  tape,
  rotate,
  children,
}: {
  title: string;
  tape: string;
  rotate: number;
  children: React.ReactNode;
}) {
  return (
    <article
      className="relative bg-card/85 px-4 py-4 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)]"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span
        aria-hidden
        className="washi-tape absolute -left-3 -top-2 z-10"
        style={{
          width: "70px",
          height: "14px",
          transform: "rotate(-5deg)",
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, var(--${tape}) 70%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--${tape}) 30%, var(--paper-tape-mix)) 6px 12px)`,
        }}
      />
      <h3 className="mb-3 inline-flex items-center font-display text-[15px] font-bold leading-none tracking-[-0.015em]">
        <span className="relative">
          <span
            aria-hidden
            className="absolute inset-x-[-3px] bottom-0 z-0 h-[6px] rounded-[1px]"
            style={{
              background: `var(--${tape})`,
              opacity: 0.85,
              transform: "rotate(-0.4deg)",
            }}
          />
          <span className="relative z-10">{title}</span>
        </span>
      </h3>
      {children}
    </article>
  );
}

// ── Palette ───────────────────────────────────────────────────────

function PaletteGrid({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
      className="group relative flex flex-col gap-1.5 bg-card/60 p-1.5 text-left shadow-[0_1px_0_rgba(30,35,45,0.04)] transition-transform hover:-translate-y-[1px]"
    >
      <span
        aria-hidden
        className="block h-12 w-full rounded-[2px] shadow-[inset_0_0_0_1px_rgba(30,35,45,0.06)]"
        style={{ background: value }}
      />
      <span className="flex min-w-0 items-center justify-between gap-1">
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {name}
        </span>
        {copied ? (
          <Check className="h-3 w-3 shrink-0 text-[var(--salad)]" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
        )}
      </span>
      <span className="truncate font-mono text-[10px] text-foreground/85">
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
    <div className="space-y-3">
      {entries.map(([key, token]) => (
        <TypeRow key={key} name={key} token={token} />
      ))}
    </div>
  );
}

function TypeRow({ name, token }: { name: string; token: TypographyToken }) {
  const family = token.fontFamily || "inherit";
  const size = sizeOf(token.fontSize, 18);
  const weight = String(token.fontWeight ?? 400);
  const lineHeight = token.lineHeight ?? 1.4;

  // Cap render size so a 64px heading doesn't blow up the card layout
  const renderSize = Math.min(size, 32);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="font-semibold text-foreground/80">{name}</span>
        <span className="truncate text-muted-foreground/70">
          {size}px · {weight}
        </span>
      </div>
      <p
        className="text-foreground/90"
        style={{
          fontFamily: family,
          fontSize: renderSize,
          fontWeight: weight,
          lineHeight: String(lineHeight),
        }}
      >
        The quick brown fox
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
  // Find max for normalizing bar width
  const sizes = entries.map(([, v]) => sizeOf(v, 0));
  const max = Math.max(...sizes, 16);

  return (
    <ul className="space-y-1.5">
      {entries.map(([key, value], i) => {
        const px = sizes[i];
        const pct = Math.max(6, Math.round((px / max) * 100));
        return (
          <li key={key} className="flex items-center gap-2">
            <span className="w-12 shrink-0 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {key}
            </span>
            <span className="flex-1">
              <span
                aria-hidden
                className="block h-2 rounded-[1px]"
                style={{
                  width: `${pct}%`,
                  background: `color-mix(in oklch, var(--teal) 60%, var(--paper-tape-mix))`,
                }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-[10px] text-foreground/85">
              {value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Rounded ───────────────────────────────────────────────────────

function RoundedSamples({ rounded }: { rounded: Record<string, string> }) {
  const entries = Object.entries(rounded);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex flex-col items-center gap-1.5 bg-card/60 p-2"
        >
          <span
            aria-hidden
            className="block h-10 w-10 shadow-[inset_0_0_0_1px_rgba(30,35,45,0.08)]"
            style={{
              borderRadius: value,
              background: `color-mix(in oklch, var(--salad) 30%, var(--paper-tape-mix))`,
            }}
          />
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {key}
          </span>
          <span className="truncate font-mono text-[10px] text-foreground/85">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
