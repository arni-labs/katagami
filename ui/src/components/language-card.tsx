"use client";

import Link from "next/link";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DesignLanguage } from "@/lib/odata";
import { parseJson, getFileUrl } from "@/lib/odata";
import { useIframeSlot } from "@/lib/iframe-slots";
import { SafeEmbodimentFrame } from "@/components/safe-embodiment-frame";

const PREVIEW_VIEWPORT_WIDTH = 1440;
const PREVIEW_VIEWPORT_HEIGHT = 960;

const statusStamp: Record<string, string> = {
  Draft: "text-muted-foreground",
  UnderReview: "text-[color-mix(in_oklch,var(--yuzu),black_30%)]",
  Published: "text-[color-mix(in_oklch,var(--salad),black_22%)]",
  Archived: "text-[var(--beni)]",
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

// ── Root card ──
// The full chrome (palette ribbon, washi tapes, title, etc.) always renders
// — it's cheap DOM. Only the iframe mounts/unmounts based on inView so
// memory stays bounded. This avoids the skeleton-swap layout shift that was
// causing scroll jank.

export function LanguageCard({ lang }: { lang: DesignLanguage }) {
  // hasSlot is gated by the global iframe cap (at most N iframes mount
  // across the whole page, prioritised by viewport distance). This is
  // the hard memory bound that stops scroll crashes.
  const { ref, hasSlot } = useIframeSlot<HTMLAnchorElement>();
  const id = lang.entity_id;
  const stickyTint = useMemo(() => tintFor(lang), [lang]);

  return (
    <Link
      ref={ref}
      href={`/language/${id}`}
      prefetch={false}
      className="group relative block min-w-0"
    >
      <FullCard lang={lang} stickyTint={stickyTint} iframeInView={hasSlot} />
    </Link>
  );
}

// ── Full card (all the chrome — memo'd) ──

interface FullCardProps {
  lang: DesignLanguage;
  stickyTint: string;
  iframeInView: boolean;
}

const FullCard = memo(function FullCard({
  lang,
  stickyTint,
  iframeInView,
}: FullCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.22);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setPreviewScale(w / PREVIEW_VIEWPORT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        background: `color-mix(in srgb, ${stickyTint} 9%, rgba(255, 255, 255, 0.85))`,
      }}
    >
      {/* Palette ribbon */}
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 flex h-[10px]">
        {ribbonStripes.map((color, i) => (
          <span key={i} className="flex-1" style={{ background: color }} />
        ))}
      </div>

      {/* Washi tapes */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 top-3 z-20 h-[18px] w-20 rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeAColor} 78%, white) 0 7px, color-mix(in oklch, ${tapeAColor} 40%, white) 7px 14px)`,
          transform: `rotate(${tapeARot}deg)`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 bottom-4 z-20 h-[14px] w-14 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
        style={{
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeBColor} 72%, white) 0 6px, color-mix(in oklch, ${tapeBColor} 35%, white) 6px 12px)`,
          transform: `rotate(${tapeBRot}deg)`,
        }}
      />

      {/* Embodiment preview — polaroid frame */}
      {embodimentFileId ? (
        <div className="px-4 pb-1 pt-6">
          <div
            className="relative mx-auto w-[94%] rotate-[-1deg] transition-transform duration-300 ease-out group-hover:rotate-0"
            style={{ transformOrigin: "center top" }}
          >
            <div className="relative rounded-[2px] border border-border bg-white p-1.5 pb-5 shadow-[0_2px_10px_rgba(30,35,45,0.09)]">
              <div
                ref={previewRef}
                className="relative w-full overflow-hidden rounded-[1px] bg-muted"
                style={{ aspectRatio: "3 / 2" }}
              >
                {embodimentFormat === "tsx" ? (
                  <TsxPlaceholder
                    paletteColors={paletteEntries.map((p) => p.color)}
                    headingFont={headingFont}
                    bodyFont={bodyFont}
                  />
                ) : iframeInView ? (
                  <SafeEmbodimentFrame
                    fileId={embodimentFileId}
                    url={getFileUrl(embodimentFileId)}
                    width={PREVIEW_VIEWPORT_WIDTH}
                    height={PREVIEW_VIEWPORT_HEIGHT}
                    scale={previewScale}
                    title={`${f.name} preview`}
                  />
                ) : (
                  // No iframe — show a design-rich placeholder: palette
                  // stripes + Aa type specimen. Same pattern as TsxPlaceholder
                  // so cards with/without active iframe feel equivalent.
                  <TsxPlaceholder
                    paletteColors={paletteEntries.map((p) => p.color)}
                    headingFont={headingFont}
                    bodyFont={bodyFont}
                    subtitle="preview"
                  />
                )}
                {/* soft bottom fade */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/55 to-transparent"
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
        className={`space-y-1.5 px-4 pb-2 ${embodimentFileId ? "pt-3" : "pt-6"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 font-display text-lg font-bold leading-tight tracking-[-0.02em]">
            <Sparkle />
            <span className="truncate">{f.name || "Untitled"}</span>
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`stamp ${statusStamp[lang.status] ?? ""}`}>
              {lang.status}
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
            <div className="flex items-center gap-3 rounded-[4px] border border-dashed border-border bg-[color-mix(in_oklch,var(--yuzu)_8%,white)] px-3 py-2">
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
                background: "color-mix(in oklch, var(--sumire) 22%, white)",
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
                    background: `color-mix(in oklch, ${accentColors[i % accentColors.length]} 38%, white)`,
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
    <div className="absolute inset-0 flex flex-col bg-white">
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
