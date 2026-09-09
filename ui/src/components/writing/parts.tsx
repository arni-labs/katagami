"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { InkStamp, StatusStamp, inkChipStyle, CHIP } from "@/components/encyclopedia/chrome";
import { BASIS_LABEL, CREDIT_KIND_LABEL, creditLine, type Exemplar, type Facet, type FacetKey, type FacetSelection, type WritingStyleSpecimen } from "@/lib/writing-styles";

// Pieces shared by both writing variations: the passage block, the credit
// line, tag chips, the cell links, the checkable contract tables, and the
// facet controls. The passage is the hero everywhere, so it gets one
// treatment: Nunito at reading size, a riso-ink opening quote, the
// annotation in the mono label voice.

export { StatusStamp };

export function Passage({ exemplar, size = "md", clamp, ink = "var(--sakura)" }: { exemplar: Exemplar; size?: "md" | "lg"; clamp?: number; ink?: string }) {
  return (
    <blockquote className="relative">
      <span aria-hidden className="pointer-events-none absolute -left-1 -top-3 select-none font-display text-[56px] font-black leading-none" style={{ color: ink, mixBlendMode: "var(--ink-blend)" as never, opacity: 0.85 }}>
        “
      </span>
      <p
        className={`relative whitespace-pre-line pl-6 text-foreground ${size === "lg" ? "text-[19px] leading-[1.6] sm:text-[21px]" : "text-[17px] leading-[1.6]"}`}
        style={clamp ? { display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {exemplar.text}
      </p>
      {exemplar.annotation || exemplar.kind ? (
        <footer className="mt-2.5 pl-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {[exemplar.kind, exemplar.annotation].filter(Boolean).join(" · ")}
        </footer>
      ) : null}
    </blockquote>
  );
}

export function CreditLine({ specimen, className = "" }: { specimen: WritingStyleSpecimen; className?: string }) {
  const line = creditLine(specimen);
  const basis = BASIS_LABEL[specimen.consentBasis];
  if (!line && !basis) return <p className={`font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 ${className}`}>No credit recorded</p>;
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground ${className}`}>
      {line}{line && basis ? " · " : ""}{basis}
    </p>
  );
}

export function TagChips({ tags, onPick, active }: { tags: string[]; onPick?: (tag: string) => void; active?: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const on = active?.includes(tag);
        const label = tag.replace(/[_-]+/g, " ");
        return (
          <li key={tag}>
            {onPick ? (
              <button type="button" onClick={() => onPick(tag)} aria-pressed={on} className="px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em]" style={on ? inkChipStyle("var(--yuzu)", 40) : { background: "color-mix(in srgb, var(--foreground) 5%, transparent)", color: "var(--muted-foreground)" }}>
                {label}
              </button>
            ) : (
              <span className="inline-block px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground" style={{ background: "color-mix(in srgb, var(--foreground) 5%, transparent)" }}>{label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CellLinks({ specimen }: { specimen: WritingStyleSpecimen }) {
  if (!specimen.cells.length) {
    return <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">Encyclopedia: no cell claims this style yet</p>;
  }
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      Encyclopedia:{" "}
      {specimen.cells.map((cell, i) => (
        <span key={cell.cellId}>
          {i > 0 ? ", " : ""}
          <Link href={`/lab/encyclopedia?cell=${encodeURIComponent(cell.cellId)}`} title={cell.explanation} className="normal-case tracking-normal text-[13px] font-semibold text-foreground underline decoration-[var(--ramune)] decoration-2 underline-offset-[3px] hover:decoration-[var(--yuzu)]">
            {cell.cellName}
          </Link>
        </span>
      ))}
    </p>
  );
}

export function VoiceMdLink({ url, className = "" }: { url: string; className?: string }) {
  if (!url) return <span className={`font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 ${className}`}>No VOICE.md yet</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] ${className}`}>
      VOICE.md <ArrowUpRight size={12} aria-hidden />
    </a>
  );
}

export function KeyValueTable({ rows, empty }: { rows: Record<string, string>; empty: string }) {
  const entries = Object.entries(rows);
  if (!entries.length) return <p className="text-[15px] text-muted-foreground">{empty}</p>;
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{key.replace(/[_-]+/g, " ")}</dt>
          <dd className="text-[15px] leading-relaxed text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({ items, empty, strike = false }: { items: string[]; empty: string; strike?: boolean }) {
  if (!items.length) return <p className="text-[15px] text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid gap-1.5">
      {items.map((item, i) => (
        <li key={`${i}-${item}`} className={`flex gap-2.5 text-[15px] leading-relaxed ${strike ? "text-muted-foreground line-through decoration-[var(--sakura)] decoration-2" : "text-foreground"}`}>
          <span aria-hidden className="mt-[9px] inline-block h-1.5 w-1.5 shrink-0" style={{ background: strike ? "var(--sakura)" : "var(--ramune)" }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CreditsList({ credits }: { credits: WritingStyleSpecimen["credits"] }) {
  if (!credits.length) return <p className="text-[15px] text-muted-foreground">No credits recorded.</p>;
  return (
    <ul className="grid gap-2">
      {credits.map((credit, i) => (
        <li key={`${credit.name}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15.5px] font-semibold text-foreground">{credit.name}</span>
          {credit.kind ? <InkStamp ink={credit.kind === "writer" ? "var(--sakura)" : credit.kind === "movement" ? "var(--ramune)" : "var(--graphite)"} tilt={-1}>{CREDIT_KIND_LABEL[credit.kind] ?? credit.kind}</InkStamp> : null}
          {credit.note ? <span className="w-full text-[14px] leading-relaxed text-muted-foreground">{credit.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function Section({ eyebrow, ink = "var(--ramune)", children }: { eyebrow: string; ink?: string; children: ReactNode }) {
  return (
    <section className="pt-6">
      <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span aria-hidden className="inline-block h-[3px] w-6" style={{ background: ink }} />
        {eyebrow}
      </div>
      {children}
    </section>
  );
}

/** Every facet as a group of toggles. Values and counts come from the data. */
export function FacetControls({ facets, selection, onToggle, onClear, layout }: { facets: Facet[]; selection: FacetSelection; onToggle: (key: FacetKey, value: string) => void; onClear: () => void; layout: "rail" | "row" }) {
  const active = Object.values(selection).reduce((n, list) => n + (list?.length ?? 0), 0);
  if (layout === "row") {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {facets.map((facet) => (
          <div key={facet.key} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/80">{facet.label}</span>
            {facet.values.slice(0, facet.key === "tags" ? 10 : 8).map((entry) => {
              const on = selection[facet.key]?.includes(entry.value) ?? false;
              return (
                <button key={entry.value} type="button" aria-pressed={on} onClick={() => onToggle(facet.key, entry.value)} className="h-7 px-2.5 font-mono text-[9.5px] uppercase tracking-[0.12em] shadow-[var(--shadow-sticker)]" style={on ? inkChipStyle("var(--yuzu)", 42) : { background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}>
                  {entry.label} <span className="tabular-nums opacity-60">{entry.count}</span>
                </button>
              );
            })}
          </div>
        ))}
        {active ? (
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground underline decoration-[var(--sakura)] decoration-2 underline-offset-[3px] hover:text-foreground">
            <X size={11} aria-hidden /> clear {active}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid gap-6">
      {facets.map((facet) => (
        <RailFacet key={facet.key} facet={facet} selection={selection} onToggle={onToggle} />
      ))}
      {active ? (
        <button type="button" onClick={onClear} className={`${CHIP} w-fit`} style={{ background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}>
          <X size={12} aria-hidden /> Clear all
        </button>
      ) : null}
    </div>
  );
}

const RAIL_SHOWN = 8;

/** One rail facet; long lists (register keys run past forty) fold to the
 *  first eight and the chosen ones, with a toggle for the rest. */
function RailFacet({ facet, selection, onToggle }: { facet: Facet; selection: FacetSelection; onToggle: (key: FacetKey, value: string) => void }) {
  const [all, setAll] = useState(false);
  const chosen = selection[facet.key] ?? [];
  const values = all || facet.values.length <= RAIL_SHOWN ? facet.values : facet.values.filter((entry, i) => i < RAIL_SHOWN || chosen.includes(entry.value));
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{facet.label}</legend>
      <ul className="grid gap-1">
        {values.map((entry) => {
              const on = selection[facet.key]?.includes(entry.value) ?? false;
              return (
                <li key={entry.value}>
                  <label className="group flex cursor-pointer items-center gap-2.5 py-0.5 text-[15px] text-foreground">
                    <input type="checkbox" checked={on} onChange={() => onToggle(facet.key, entry.value)} className="peer sr-only" />
                    <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center shadow-[var(--shadow-sticker)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ramune)]" style={{ background: on ? "var(--yuzu)" : "var(--paper-sticker)" }}>
                      {on ? <span className="block h-2 w-2 bg-foreground" /> : null}
                    </span>
                    <span className={on ? "font-semibold" : ""}>{entry.label}</span>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">{entry.count}</span>
                  </label>
                </li>
              );
        })}
      </ul>
      {facet.values.length > RAIL_SHOWN ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground">
          {all ? "Fewer" : `All ${facet.values.length}`}
        </button>
      ) : null}
    </fieldset>
  );
}
