import type { CSSProperties } from "react";
import type { DesignLanguage } from "@/lib/odata";
import { TrackedLink } from "@/components/tracked-link";
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
      className="group relative min-w-0 max-w-full"
      style={cardVisibilityStyle}
    >
      <TrackedLink
        href={`/language/${id}`}
        prefetch={false}
        className="block h-full"
        event="language_click"
        data={{ language_id: id, language_name: name, source: "card" }}
      >
        <FullCard lang={lang} stickyTint={stickyTint} eagerThumbnail={index < 6} />
      </TrackedLink>
      {canDelete ? (
        <LanguageCardOwnerControls
          id={id}
          name={name}
          status={lang.status}
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

// content-visibility skips off-screen cards for scroll perf. The intrinsic
// size is the placeholder reserved while a card is off-screen; the `auto`
// keyword makes the browser remember each card's real rendered height after
// it first paints, so the reservation self-corrects across breakpoints and
// never leaves a stale empty gap. The length is only the first-paint fallback.
const cardVisibilityStyle = {
  contentVisibility: "auto",
  containIntrinsicBlockSize: "auto 220px",
} as CSSProperties;

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
  const embodimentFormat = (f.embodiment_format as "html" | "tsx") ?? "html";
  const thumbnailFileId = f.thumbnail_file_id;
  const thumbnailAssetUrl = f.thumbnail_asset_url;
  const isPublished = lang.status === "Published";
  const thumbnailProxyFileId = isPublished ? undefined : thumbnailFileId;
  const hasThumbnailPreview = Boolean(thumbnailAssetUrl || thumbnailProxyFileId);


  return (
    <article
      className="sticker-card relative flex h-full w-full max-w-full flex-col overflow-hidden"
      style={{
        background: `color-mix(in srgb, ${stickyTint} 5%, var(--paper-tint-base))`,
        ["--card-ink" as string]: stickyTint,
      }}
    >
      {/* preview — edge to edge, with the palette as a thin ink strip on top */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
        <div aria-hidden className="absolute inset-x-0 top-0 z-10 flex h-[5px] overflow-hidden">
          {(paletteColors.length > 0 ? paletteColors : [stickyTint])
            .slice(0, 5)
            .map((color, i) => (
              <span key={`${color}-${i}`} className="h-full flex-1" style={{ background: color }} />
            ))}
        </div>
        {hasThumbnailPreview ? (
          <ThumbnailPreview
            fileId={thumbnailProxyFileId}
            src={thumbnailAssetUrl}
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
            colors={colors}
            headingFont={headingFont}
            seed={hashInt(id, "swatch")}
          />
        )}
        {isFeatured ? (
          <span className="absolute right-2 top-2 z-20">
            <FeaturedSeal tint={stickyTint} />
          </span>
        ) : null}
      </div>

      {/* footer — compact meta */}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-[16px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {f.name || "Untitled"}
          </h3>
          {lang.status !== "Published" ? (
            <StatusStamp status={lang.status} tint={stickyTint} />
          ) : null}
        </div>

        {tags.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            {tags.slice(0, 3).map((t, i) => (
              <span
                key={t}
                className="inline-flex min-w-0 items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground/85"
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
      <span aria-hidden className="relative block h-3.5 w-3.5">
        {petals.map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="absolute h-2 w-2 rounded-full opacity-80"
            style={{
              background: color,
              mixBlendMode: "var(--ink-blend)" as CSSProperties["mixBlendMode"],
              left: i === 1 ? "6px" : i === 3 ? "0px" : "3px",
              top: i === 0 ? "0px" : i === 2 ? "6px" : "3px",
            }}
          />
        ))}
      </span>
    </span>
  );
}

/** No thumbnail yet — print a riso swatch proof from the language's own
 *  palette: an ink field, an overprinting disc, a halftone screen, and a
 *  type specimen. Layout varies per card via `seed` so the wall doesn't
 *  read as 90 copies of one proof. */
function PreviewPlaceholder({
  paletteColors,
  stickyTint,
  colors = {},
  headingFont,
  seed = 0,
}: {
  paletteColors: string[];
  stickyTint: string;
  colors?: TokenColors;
  headingFont?: string;
  seed?: number;
}) {
  const inks = paletteColors.length > 0 ? paletteColors : [stickyTint];
  const primary = colors.primary ?? inks[0];
  const secondary = colors.secondary ?? inks[1] ?? primary;
  const accent = colors.accent ?? inks[2] ?? secondary;
  const paper = colors.background ?? "var(--paper-tape-mix)";
  const ink = colors.text ?? "var(--sumi)";
  const tilt = ((seed % 7) - 3) * 1.4;
  const discRight = 8 + (seed % 5) * 6;
  const fieldHeight = 46 + (seed % 4) * 6;
  return (
    <div
      aria-hidden
      data-katagami-preview-placeholder="true"
      className="absolute inset-0 overflow-hidden"
      style={{ background: paper }}
    >
      {/* ink field pass */}
      <div
        className="absolute -left-2 -right-2 top-0"
        style={{
          height: `${fieldHeight}%`,
          background: primary,
          transform: `rotate(${tilt * 0.4}deg)`,
          transformOrigin: "left bottom",
        }}
      />
      {/* overprint disc pass */}
      <div
        className="absolute rounded-full opacity-80"
        style={{
          width: "52%",
          aspectRatio: "1",
          right: `${discRight}%`,
          top: "18%",
          background: secondary,
          mixBlendMode: "multiply",
        }}
      />
      {/* halftone screen pass */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "42%",
          backgroundImage: `radial-gradient(circle at 2px 2px, ${accent} 1.7px, transparent 0)`,
          backgroundSize: "9px 9px",
          opacity: 0.65,
          maskImage: "linear-gradient(180deg, transparent, black 70%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 70%)",
        }}
      />
      {/* type specimen */}
      <div
        className="absolute bottom-2.5 left-3 flex items-baseline gap-1.5"
        style={{ transform: `rotate(${tilt * 0.3}deg)` }}
      >
        <span
          className="font-display text-[30px] font-black leading-none"
          style={{ color: ink, fontFamily: headingFont || undefined }}
        >
          Aa
        </span>
        <span className="flex gap-1">
          {inks.slice(0, 4).map((color, i) => (
            <span
              key={`${color}-${i}`}
              className="h-2 w-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 0 1.5px ${paper}` }}
            />
          ))}
        </span>
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
