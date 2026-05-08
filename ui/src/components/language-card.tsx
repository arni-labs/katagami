import Link from "next/link";
import type { CSSProperties } from "react";
import type { DesignLanguage } from "@/lib/odata";
import { parseJson } from "@/lib/odata";
import { LanguageCardOwnerControls } from "@/components/language-card-owner-controls";
import { ThumbnailPreview } from "@/components/thumbnail-preview";

const statusFallbackTone: Record<string, string> = {
  Draft: "var(--muted-foreground)",
  UnderReview: "color-mix(in oklch, var(--yuzu), black 30%)",
  Archived: "var(--beni)",
};

const statusLabel: Record<string, string> = {
  Draft: "Draft",
  UnderReview: "Under review",
  Published: "Published",
  Archived: "Archived",
};

const accentColors = [
  "var(--sakura)",
  "var(--yuzu)",
  "var(--salad)",
  "var(--teal)",
  "var(--ramune)",
  "var(--sumire)",
];

interface TokenColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  [key: string]: string | undefined;
}

interface Tokens {
  colors?: TokenColors;
  typography?: {
    heading_font?: string;
    body_font?: string;
    [key: string]: string | number | undefined;
  };
}

interface Philosophy {
  summary?: string;
  [key: string]: unknown;
}

function hashInt(s: string, salt = "") {
  let h = 0;
  const str = s + salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function tintFor(lang: DesignLanguage): string {
  const tokens = parseJson<Tokens>(lang.fields.tokens);
  const primary = tokens?.colors?.primary;
  if (primary) return primary;
  const id = lang.entity_id;
  return accentColors[hashInt(id, "tint") % accentColors.length];
}

function tapeTintFor(
  paletteColors: string[],
  id: string,
): string {
  const secondaryPaletteColors = [
    paletteColors[1],
    paletteColors[2],
  ].filter((color): color is string => Boolean(color));
  if (secondaryPaletteColors.length > 0) {
    return secondaryPaletteColors[
      hashInt(id, "palette-tape") % secondaryPaletteColors.length
    ];
  }
  return accentColors[hashInt(id, "tape-fallback") % accentColors.length];
}

function isFeaturedLanguage(lang: DesignLanguage): boolean {
  const bag = lang as unknown as Record<string, unknown>;
  const bags = [bag.booleans, bag.fields, bag.counters, bag];
  for (const b of bags) {
    if (!b || typeof b !== "object") continue;
    const rec = b as Record<string, unknown>;
    const v = rec.featured ?? rec.Featured ?? rec.isFeatured;
    if (v === true || v === 1) return true;
    if (typeof v === "string" && v.toLowerCase() === "true") return true;
  }
  return false;
}

function displayOrder(lang: DesignLanguage): number {
  const bag = lang as unknown as Record<string, unknown>;
  const bags = [bag.counters, bag.fields, bag];
  for (const b of bags) {
    if (!b || typeof b !== "object") continue;
    const rec = b as Record<string, unknown>;
    const v = rec.display_order ?? rec.displayOrder ?? rec.DisplayOrder;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

export function LanguageCard({
  lang,
  index = 0,
  canDelete = false,
}: {
  lang: DesignLanguage;
  index?: number;
  canDelete?: boolean;
}) {
  const id = lang.entity_id;
  const stickyTint = tintFor(lang);
  const name = lang.fields.name || "Untitled";
  const featured = isFeaturedLanguage(lang);

  return (
    <div
      className="group relative min-w-0"
      style={cardVisibilityStyle}
    >
      <Link href={`/language/${id}`} prefetch={false} className="block h-full">
        <FullCard lang={lang} stickyTint={stickyTint} eagerThumbnail={index < 6} />
      </Link>
      {canDelete ? (
        <LanguageCardOwnerControls
          id={id}
          name={name}
          featured={featured}
          displayOrder={displayOrder(lang)}
        />
      ) : null}
    </div>
  );
}

interface FullCardProps {
  lang: DesignLanguage;
  stickyTint: string;
  eagerThumbnail: boolean;
}

const cardVisibilityStyle = {
  contentVisibility: "auto",
  containIntrinsicSize: "430px",
} as CSSProperties;

function compactSummary(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 190) return normalized;
  return `${normalized.slice(0, 187).trimEnd()}...`;
}

function FullCard({
  lang,
  stickyTint,
  eagerThumbnail,
}: FullCardProps) {
  const isFeatured = isFeaturedLanguage(lang);
  const f = lang.fields;
  const id = lang.entity_id;

  const tags = parseJson<string[]>(f.tags) ?? [];
  const tokens = parseJson<Tokens>(f.tokens);
  const philosophy = parseJson<Philosophy>(f.philosophy);

  const colors = tokens?.colors ?? {};
  const paletteColors = [
    colors.primary,
    colors.accent,
    colors.secondary,
    colors.surface,
    colors.background,
  ].filter((color): color is string => Boolean(color));

  const headingFont = tokens?.typography?.heading_font;
  const bodyFont = tokens?.typography?.body_font;
  const summary = compactSummary(philosophy?.summary);
  const embodimentFormat = (f.embodiment_format as "html" | "tsx") ?? "html";
  const thumbnailFileId = f.thumbnail_file_id;

  const tapeColor = tapeTintFor(paletteColors, id);
  const tapeRot = ((hashInt(id, "ra") % 11) - 5) * 0.55 - 3;

  return (
    <article
      className="sticker-card relative flex h-full min-h-[430px] flex-col overflow-hidden"
      style={{
        background: `color-mix(in srgb, ${stickyTint} 7%, var(--paper-tint-base))`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 flex h-[6px] overflow-hidden"
      >
        {(paletteColors.length > 0 ? paletteColors : [stickyTint])
          .slice(0, 5)
          .map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="h-full flex-1"
              style={{ background: color }}
            />
          ))}
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[15px] w-20 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeColor} 74%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, ${tapeColor} 36%, var(--paper-tape-mix)) 7px 14px)`,
          transform: `rotate(${tapeRot}deg)`,
        }}
      />

      <div className="px-4 pb-1 pt-7">
        <div
          className="relative mx-auto w-[96%] rotate-[-0.7deg] transition-transform duration-300 ease-out group-hover:rotate-0"
          style={{ transformOrigin: "center top" }}
        >
          <div className="relative border border-border bg-card p-1.5 pb-3 shadow-[0_2px_10px_rgba(30,35,45,0.09)]">
            <div
              className="relative w-full overflow-hidden rounded-[1px] bg-muted"
              style={{ aspectRatio: "3 / 2" }}
            >
              {thumbnailFileId ? (
                <ThumbnailPreview
                  fileId={thumbnailFileId}
                  alt={`${f.name || "Design language"} preview`}
                  eager={eagerThumbnail}
                  placeholderTint={stickyTint}
                  paletteColors={paletteColors.slice(0, 4)}
                />
              ) : embodimentFormat === "tsx" ? (
                <TsxPlaceholder
                  paletteColors={paletteColors}
                  headingFont={headingFont}
                  bodyFont={bodyFont}
                />
              ) : (
                <PreviewPlaceholder
                  paletteColors={paletteColors}
                  stickyTint={stickyTint}
                />
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card/55 to-transparent"
              />
              <span aria-hidden className="absolute inset-0 z-10 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-2 flex min-h-6 items-center justify-between gap-3">
          <StatusStamp status={lang.status} tint={stickyTint} />
          {isFeatured ? <FeaturedSeal tint={stickyTint} /> : null}
        </div>

        <h3 className="font-display text-[22px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
          {f.name || "Untitled"}
        </h3>

        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
          {summary ?? "A design language ready to inspect, remix, and hand to an agent."}
        </p>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {tags.slice(0, 3).map((t, i) => (
              <span
                key={t}
                className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/85"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      paletteColors[i % Math.max(paletteColors.length, 1)] ??
                      accentColors[i % accentColors.length],
                  }}
                />
                <span className="truncate">{t}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="sticker-perforation mb-3" />
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground transition-transform duration-200 group-hover:translate-x-1">
            View details
            <span
              aria-hidden
              className="inline-block h-[7px] w-10 rounded-[2px]"
              style={{ background: stickyTint }}
            />
          </span>
        </div>
      </div>
    </article>
  );
}

function StatusStamp({
  status,
  tint,
}: {
  status: string;
  tint: string;
}) {
  const label = statusLabel[status] ?? status;
  const tone =
    status === "Published"
      ? `color-mix(in oklch, ${tint} 82%, var(--foreground))`
      : (statusFallbackTone[status] ?? tint);

  return (
    <span
      className="relative inline-flex h-[18px] shrink-0 items-center rounded-[2px] border px-2 font-sans text-[8.5px] font-bold uppercase leading-none tracking-[0.14em]"
      style={{
        color: tone,
        background: `color-mix(in oklch, ${tone} 7%, var(--paper-stamp-mix))`,
        borderColor: `color-mix(in oklch, ${tone} 62%, var(--border))`,
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--card) 72%, transparent)",
        transform: "rotate(-0.7deg)",
      }}
    >
      <span
        aria-hidden
        className="absolute -left-1 top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-l-[1px]"
        style={{
          background: `color-mix(in oklch, ${tone} 30%, var(--paper-tape-mix))`,
        }}
      />
      {label}
    </span>
  );
}

function FeaturedSeal({ tint }: { tint: string }) {
  const petals = ["var(--sakura)", "var(--yuzu)", tint, "var(--ramune)"];

  return (
    <span
      aria-label="Featured language"
      title="Featured"
      className="relative inline-grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border border-dashed bg-[color-mix(in_oklch,var(--paper-stamp-mix)_86%,transparent)] shadow-[0_1px_0_rgba(30,35,45,0.05)]"
      style={{
        borderColor: `color-mix(in oklch, ${tint} 48%, var(--border))`,
        transform: "rotate(2deg)",
      }}
    >
      <span
        aria-hidden
        className="absolute -right-1 top-1/2 h-3 w-1 -translate-y-1/2 rounded-r-[2px]"
        style={{
          background: `color-mix(in oklch, ${tint} 36%, var(--paper-tape-mix))`,
        }}
      />
      <span aria-hidden className="relative block h-3.5 w-3.5">
        {petals.map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="absolute h-2 w-2 rounded-full opacity-80 mix-blend-multiply"
            style={{
              background: color,
              left: i === 1 ? "6px" : i === 3 ? "0px" : "3px",
              top: i === 0 ? "0px" : i === 2 ? "6px" : "3px",
            }}
          />
        ))}
      </span>
    </span>
  );
}

function PreviewPlaceholder({
  paletteColors,
  stickyTint,
}: {
  paletteColors: string[];
  stickyTint: string;
}) {
  const dots = paletteColors.length > 0 ? paletteColors : [stickyTint];
  return (
    <div
      aria-hidden
      data-katagami-preview-placeholder="true"
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `color-mix(in srgb, ${stickyTint} 6%, var(--paper-tape-mix))`,
      }}
    >
      <div className="flex gap-1.5">
        {dots.slice(0, 4).map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
}

function TsxPlaceholder({
  paletteColors,
  headingFont,
  bodyFont,
  subtitle = "tsx preview",
}: {
  paletteColors: string[];
  headingFont?: string;
  bodyFont?: string;
  subtitle?: string;
}) {
  const stripes = paletteColors.length > 0 ? paletteColors : ["#e5e5e5"];
  return (
    <div className="absolute inset-0 flex flex-col bg-card">
      <div className="flex h-[52%]">
        {stripes.slice(0, 4).map((c, i) => (
          <span key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 text-center">
        <span
          className="font-display text-2xl font-black leading-none tracking-tight text-foreground/90"
          style={headingFont ? { fontFamily: headingFont } : undefined}
        >
          Aa
        </span>
        {(headingFont || bodyFont) && (
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            {headingFont}
            {headingFont && bodyFont ? " · " : ""}
            {bodyFont}
          </span>
        )}
        <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground/70">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
