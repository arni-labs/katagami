"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { DesignLanguage } from "@/lib/odata";
import { parseJson, getFileUrl } from "@/lib/odata";
import { DeleteLanguageButton } from "@/components/delete-language-button";

const statusStamp: Record<string, string> = {
  Draft: "text-muted-foreground",
  UnderReview: "text-[color-mix(in_oklch,var(--yuzu),black_25%)]",
  Published: "text-[color-mix(in_oklch,var(--salad),black_20%)]",
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

export function LanguageCard({ lang }: { lang: DesignLanguage }) {
  const f = lang.fields;
  const c = lang.counters;
  const tags = parseJson<string[]>(f.tags) ?? [];
  const lineage = f.lineage_type ?? "original";
  const slug = f.slug || lang.entity_id;
  const elementCount = c.element_count ?? (parseInt(f.element_count ?? "0", 10) || 0);
  const hasNotes = !!f.curator_notes;

  const tokens = parseJson<Tokens>(f.tokens);
  const philosophy = parseJson<Philosophy>(f.philosophy);

  const palette = tokens?.colors
    ? [
        tokens.colors.primary,
        tokens.colors.secondary,
        tokens.colors.accent,
        tokens.colors.background,
        tokens.colors.surface,
      ].filter((c): c is string => !!c)
    : [];

  const headingFont = tokens?.typography?.heading_font;
  const bodyFont = tokens?.typography?.body_font;
  const summary = philosophy?.summary;
  const embodimentFileId = f.embodiment_file_id;

  // per-card hashed variation
  const id = lang.entity_id;
  const ribbonColor = accentColors[hashInt(id, "r") % accentColors.length];
  const tapeAColor = accentColors[hashInt(id, "t1") % accentColors.length];
  const tapeBColor = accentColors[hashInt(id, "t2") % accentColors.length];
  const tapeARot = ((hashInt(id, "ra") % 11) - 5) * 0.6;
  const tapeBRot = ((hashInt(id, "rb") % 11) - 5) * 0.6 + 6;

  return (
    <Link href={`/language/${id}`} className="group relative block">
      <DeleteLanguageButton id={id} name={f.name || "Untitled"} variant="icon" />

      <article className="sticker-card relative h-full overflow-hidden">
        {/* colored top ribbon */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[6px]"
          style={{ background: ribbonColor }}
        />

        {/* washi tape — top-left */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-3 top-3 h-[18px] w-20 rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
          style={{
            background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeAColor} 75%, white) 0 7px, color-mix(in oklch, ${tapeAColor} 40%, white) 7px 14px)`,
            transform: `rotate(${tapeARot}deg)`,
          }}
        />
        {/* washi tape — bottom-right (smaller) */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 bottom-3 h-[14px] w-14 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.05)]"
          style={{
            background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${tapeBColor} 70%, white) 0 6px, color-mix(in oklch, ${tapeBColor} 35%, white) 6px 12px)`,
            transform: `rotate(${tapeBRot}deg)`,
          }}
        />

        {/* Embodiment preview */}
        {embodimentFileId && (
          <div className="relative mt-[6px] h-36 w-full overflow-hidden border-b border-border bg-muted">
            <iframe
              src={getFileUrl(embodimentFileId)}
              className="absolute left-0 top-0 h-[800px] w-[1200px] border-0"
              style={{
                transform: "scale(0.15)",
                transformOrigin: "top left",
                pointerEvents: "none",
              }}
              tabIndex={-1}
              loading="lazy"
              sandbox=""
              title={`${f.name} preview`}
            />
            <span className="absolute bottom-1.5 right-2 rounded-[3px] border border-border bg-background/95 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              preview
            </span>
          </div>
        )}

        <header className={`space-y-1.5 px-4 pb-2 ${embodimentFileId ? "pt-4" : "pt-6"}`}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight tracking-[-0.02em]">
              {f.name || "Untitled"}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {hasNotes && (
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={`stamp ${statusStamp[lang.status] ?? ""}`}>
                {lang.status}
              </span>
            </div>
          </div>
          {summary ? (
            <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : (
            <p className="font-mono text-[11px] text-muted-foreground">{slug}</p>
          )}
        </header>

        <div className="space-y-3 px-4 pb-5">
          {palette.length > 0 && (
            <div className="flex items-center gap-1.5">
              {palette.map((color, i) => (
                <span
                  key={i}
                  className="h-5 w-5 rounded-full border border-border shadow-[0_1px_0_rgba(30,35,45,0.05)]"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}

          {(headingFont || bodyFont) && (
            <div className="truncate border-b border-dashed border-border pb-2 text-[12px]">
              {headingFont && (
                <span className="font-semibold text-foreground/90">{headingFont}</span>
              )}
              {headingFont && bodyFont && (
                <span className="mx-1.5 text-muted-foreground">·</span>
              )}
              {bodyFont && <span className="text-muted-foreground">{bodyFont}</span>}
            </div>
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
              {tags.slice(0, 5).map((t, i) => (
                <span
                  key={t}
                  className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium text-foreground/80"
                  style={{
                    background: `color-mix(in oklch, ${accentColors[i % accentColors.length]} 38%, white)`,
                  }}
                >
                  {t}
                </span>
              ))}
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
    </Link>
  );
}
