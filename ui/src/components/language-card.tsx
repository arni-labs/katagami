"use client";

import Link from "next/link";
import {
  memo,
  useMemo,
  useState,
} from "react";
import type { DesignLanguage } from "@/lib/odata";
import { parseJson, getFileUrl } from "@/lib/odata";
import { DeleteLanguageButton } from "@/components/delete-language-button";

const statusStamp: Record<string, string> = {
  Draft: "text-muted-foreground",
  UnderReview: "text-[color-mix(in_oklch,var(--yuzu),black_30%)]",
  Published: "text-[color-mix(in_oklch,var(--salad),black_22%)]",
  Archived: "text-[var(--beni)]",
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

const paletteLabels = ["primary", "accent", "surface", "bg", "text"];

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

// Tiny computation used by both skeleton (for tint) and full card.
function tintFor(lang: DesignLanguage): string {
  const tokens = parseJson<Tokens>(lang.fields.tokens);
  const primary = tokens?.colors?.primary;
  if (primary) return primary;
  const id = lang.entity_id;
  return accentColors[hashInt(id, "tint") % accentColors.length];
}

export function LanguageCard({
  lang,
  canDelete = false,
}: {
  lang: DesignLanguage;
  canDelete?: boolean;
}) {
  const id = lang.entity_id;
  const stickyTint = useMemo(() => tintFor(lang), [lang]);

  return (
    <div className="group relative min-w-0">
      <Link href={`/language/${id}`} prefetch={false} className="block h-full">
        <FullCard lang={lang} stickyTint={stickyTint} />
      </Link>
      {canDelete ? (
        <DeleteLanguageButton
          id={id}
          name={lang.fields.name || "Untitled"}
          variant="icon"
        />
      ) : null}
    </div>
  );
}

// ── Full card (all the chrome — memo'd) ──

interface FullCardProps {
  lang: DesignLanguage;
  stickyTint: string;
}

const FullCard = memo(function FullCard({
  lang,
  stickyTint,
}: FullCardProps) {
  // Defensive: check every plausible location for the `featured` flag.
  const isFeatured = (() => {
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
  })();
  const f = lang.fields;
  const c = lang.counters;
  const id = lang.entity_id;

  const tags = useMemo(
    () => parseJson<string[]>(f.tags) ?? [],
    [f.tags],
  );
  const lineage = f.lineage_type ?? "original";
  const slug = f.slug || id;
  const elementCount =
    c.element_count ?? (parseInt(f.element_count ?? "0", 10) || 0);

  const tokens = useMemo(() => parseJson<Tokens>(f.tokens), [f.tokens]);
  const philosophy = useMemo(
    () => parseJson<Philosophy>(f.philosophy),
    [f.philosophy],
  );

  const paletteEntries = useMemo(() => {
    const entries: { label: string; color: string }[] = [];
    const colors = tokens?.colors ?? {};
    const ordered: [string, string | undefined][] = [
      ["primary", colors.primary],
      ["accent", colors.accent],
      ["secondary", colors.secondary],
      ["surface", colors.surface],
      ["bg", colors.background],
    ];
    for (const [label, color] of ordered) {
      if (color) entries.push({ label, color });
    }
    return entries;
  }, [tokens]);

  const headingFont = tokens?.typography?.heading_font;
  const bodyFont = tokens?.typography?.body_font;
  const summary = philosophy?.summary;
  const embodimentFileId = f.embodiment_file_id;
  const embodimentFormat = (f.embodiment_format as "html" | "tsx") ?? "html";
  const thumbnailFileId = f.thumbnail_file_id;
  const hasPreviewSlot = Boolean(embodimentFileId || thumbnailFileId);

  const tapeAColor = accentColors[hashInt(id, "t1") % accentColors.length];
  const tapeBColor = accentColors[hashInt(id, "t2") % accentColors.length];
  const tapeARot = ((hashInt(id, "ra") % 11) - 5) * 0.6 - 4;
  const tapeBRot = ((hashInt(id, "rb") % 11) - 5) * 0.6 + 7;

  const ribbonStripes =
    paletteEntries.length > 0
      ? paletteEntries.map((p) => p.color)
      : [accentColors[hashInt(id, "r") % accentColors.length]];

  return (
    <article
      className="sticker-card relative h-full overflow-hidden"
      style={{
        background: `color-mix(in srgb, ${stickyTint} 9%, var(--paper-tint-base))`,
      }}
    >
      {/* Palette ribbon */}
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 flex h-[10px]">
        {ribbonStripes.map((color, i) => (
          <span key={i} className="flex-1" style={{ background: color }} />
        ))}
      </div>

      {/* Featured — sakura/sumire sticker pill, pink fill nearly transparent */}
      {isFeatured && (
        <div
          className="pointer-events-none absolute right-2 top-4 z-30"
          style={{ transform: "rotate(6deg)" }}
        >
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
            style={{
              background: "color-mix(in oklch, var(--sakura) 18%, transparent)",
              border: "1px solid color-mix(in oklch, var(--sumire) 70%, var(--paper-tape-mix))",
              color: "color-mix(in oklch, var(--sumire), black 15%)",
            }}
          >
            <FeaturedSparkle />
            featured
          </span>
        </div>
      )}

      {/* Washi tapes */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[18px] w-20 rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeAColor} 78%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, ${tapeAColor} 40%, var(--paper-tape-mix)) 7px 14px)`,
          transform: `rotate(${tapeARot}deg)`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 bottom-4 z-20 h-[14px] w-14 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeBColor} 72%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, ${tapeBColor} 35%, var(--paper-tape-mix)) 6px 12px)`,
          transform: `rotate(${tapeBRot}deg)`,
        }}
      />

      {/* Embodiment preview — static thumbnail polaroid */}
      {hasPreviewSlot ? (
        <div className="px-4 pb-1 pt-6">
          <div
            className="relative mx-auto w-[94%] rotate-[-1deg] transition-transform duration-300 ease-out group-hover:rotate-0"
            style={{ transformOrigin: "center top" }}
          >
            <div className="relative rounded-[2px] border border-border bg-card p-1.5 pb-5 shadow-[0_2px_10px_rgba(30,35,45,0.09)]">
              <div
                className="relative w-full overflow-hidden rounded-[1px] bg-muted"
                style={{ aspectRatio: "3 / 2" }}
              >
                {thumbnailFileId ? (
                  <ThumbnailPreview
                    fileId={thumbnailFileId}
                    alt={`${f.name || "Design language"} desktop embodiment preview`}
                    fallback={
                      embodimentFormat === "tsx" ? (
                        <TsxPlaceholder
                          paletteColors={paletteEntries.map((p) => p.color)}
                          headingFont={headingFont}
                          bodyFont={bodyFont}
                        />
                      ) : (
                        <PreviewPlaceholder
                          paletteColors={paletteEntries.map((p) => p.color)}
                          stickyTint={stickyTint}
                        />
                      )
                    }
                  />
                ) : embodimentFormat === "tsx" ? (
                  <TsxPlaceholder
                    paletteColors={paletteEntries.map((p) => p.color)}
                    headingFont={headingFont}
                    bodyFont={bodyFont}
                  />
                ) : (
                  <PreviewPlaceholder
                    paletteColors={paletteEntries.map((p) => p.color)}
                    stickyTint={stickyTint}
                  />
                )}
                {/* soft bottom fade */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card/55 to-transparent"
                />
                {/* event blocker so card click goes to the Link */}
                <span
                  aria-hidden
                  className="absolute inset-0 z-10 cursor-pointer"
                />
              </div>
              <span className="absolute bottom-0.5 left-0 right-0 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/85">
                preview
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[14px]" />
      )}

      <header
        className={`space-y-1.5 px-4 pb-2 ${hasPreviewSlot ? "pt-3" : "pt-6"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 font-display text-lg font-bold leading-tight tracking-[-0.02em]">
            <Sparkle />
            <span className="truncate">{f.name || "Untitled"}</span>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`stamp ${statusStamp[lang.status] ?? ""}`}>
              {statusLabel[lang.status] ?? lang.status}
            </span>
          </div>
        </div>
        {summary ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            &ldquo;{summary}&rdquo;
          </p>
        ) : (
          <p className="font-mono text-[11px] text-muted-foreground">{slug}</p>
        )}
      </header>

      <div className="space-y-3 px-4 pb-5">
        {paletteEntries.length > 0 && (
          <section className="space-y-1.5">
            <SectionLabel>palette</SectionLabel>
            <div className="flex items-start gap-1.5">
              {paletteEntries.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1"
                  title={`${p.label}: ${p.color}`}
                >
                  <span
                    className="block h-7 w-7 rounded-[3px] border border-border shadow-[0_1px_0_rgba(30,35,45,0.06)]"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">
                    {paletteLabels[i] || p.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(headingFont || bodyFont) && (
          <section className="space-y-1.5">
            <SectionLabel>type</SectionLabel>
            <div className="flex items-center gap-3 rounded-[4px] border border-dashed border-border bg-[color-mix(in_oklch,var(--yuzu)_8%,var(--paper-tape-mix))] px-3 py-2">
              <span className="font-display text-2xl font-bold leading-none text-foreground">
                Aa
              </span>
              <div className="flex min-w-0 flex-col leading-tight">
                {headingFont && (
                  <span className="truncate text-[11px] font-semibold text-foreground/90">
                    {headingFont}
                  </span>
                )}
                {bodyFont && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {bodyFont}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-2 py-0.5 font-mono uppercase tracking-wider text-muted-foreground">
            {lineage}
          </span>
          {lineage !== "original" && (
            <span
              className="inline-flex items-center gap-1 rounded-[3px] border border-border px-2 py-0.5 font-mono text-foreground/80"
              style={{
                background: "color-mix(in oklch, var(--sumire) 22%, var(--paper-tape-mix))",
              }}
            >
              gen {f.generation_number ?? "?"}
            </span>
          )}
          {elementCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-2 py-0.5 font-mono text-muted-foreground">
              {elementCount} elem
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((t, i) => {
              const rot = ((hashInt(t, "rt") % 7) - 3) * 0.7;
              return (
                <span
                  key={t}
                  className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium text-foreground/85 shadow-[0_1px_0_rgba(30,35,45,0.05)]"
                  style={{
                    transform: `rotate(${rot}deg)`,
                    background: `color-mix(in oklch, ${accentColors[i % accentColors.length]} 38%, var(--paper-tape-mix))`,
                  }}
                >
                  {t}
                </span>
              );
            })}
          </div>
        )}

        <div className="sticker-perforation mt-2" />

        <div className="flex items-center gap-3 pt-1 font-mono text-[10px] text-muted-foreground">
          <span>v{c.version ?? 0}</span>
          <span className="text-foreground/20">·</span>
          <span>{c.usage_count ?? 0} uses</span>
          <span className="text-foreground/20">·</span>
          <span>{c.fork_count ?? 0} forks</span>
        </div>
      </div>
    </article>
  );
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
      <span className="inline-block h-[1px] w-3 bg-foreground/25" />
      {children}
    </div>
  );
}

function Sparkle() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="h-3 w-3 shrink-0 text-[var(--sumire)] transition-transform duration-300 group-hover:rotate-[20deg] group-hover:scale-110"
    >
      <path
        d="M6 0.5 L6.8 4.6 L11 5.4 L6.8 6.2 L6 10.5 L5.2 6.2 L1 5.4 L5.2 4.6 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FeaturedSparkle() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className="h-3 w-3 shrink-0"
      fill="currentColor"
    >
      <path d="M6 0.5 L7 4.9 L11.5 6 L7 7.1 L6 11.5 L5 7.1 L0.5 6 L5 4.9 Z" />
    </svg>
  );
}

function ThumbnailPreview({
  fileId,
  alt,
  fallback,
}: {
  fileId: string;
  alt: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    // Direct file-proxy delivery is intentional: thumbnail_file_id already
    // points at a generated, card-sized PawFS image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getFileUrl(fileId)}
      alt={alt}
      width={600}
      height={400}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      data-katagami-thumbnail="true"
      data-file-id={fileId}
      onError={() => setFailed(true)}
    />
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
      <div className="flex gap-1">
        {dots.slice(0, 5).map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="h-2 w-2 rounded-full"
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
}

/** Cheap palette + type specimen shown for TSX embodiments in the gallery.
 *  Mounting the live React tree per card crashes the page with many cards;
 *  the real preview is available on the detail page. */
function TsxPlaceholder({
  paletteColors,
  headingFont,
  bodyFont,
  subtitle = "tsx · preview unavailable",
}: {
  paletteColors: string[];
  headingFont?: string;
  bodyFont?: string;
  subtitle?: string;
}) {
  const stripes = paletteColors.length > 0 ? paletteColors : ["#e5e5e5"];
  return (
    <div className="absolute inset-0 flex flex-col bg-card">
      <div className="flex h-[55%]">
        {stripes.map((c, i) => (
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
