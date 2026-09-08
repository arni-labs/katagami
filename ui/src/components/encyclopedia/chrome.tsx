"use client";

import type { CSSProperties, ReactNode } from "react";
import { Minus, Plus, Maximize2, Search, X } from "lucide-react";
import type { MapName } from "@/lib/encyclopedia";
import { MAP_INK, MAP_LABEL, STATUS_LABEL, relationInk, type GraphIndex, type RelationInk, type RelationLine } from "@/lib/encyclopedia-graph";

// Shared chrome for both encyclopedia variations: ink stamps, the zoom
// cluster, the search + map filter row, and the relation legend. Everything
// is a sharp rectangle; separation is shadow and tint; labels are mono.

export const CHIP =
  "inline-flex h-8 items-center gap-2 px-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] shadow-[var(--shadow-sticker)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-sticker-lift)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export function inkChipStyle(ink: string, strength = 14): CSSProperties {
  return {
    background: `color-mix(in srgb, ${ink} ${strength}%, var(--paper-stamp-mix))`,
    color: `color-mix(in oklch, ${ink} 72%, var(--foreground))`,
  };
}

/** A tilted ink sticker. Grain, wash, radius 0. */
export function InkStamp({
  ink,
  children,
  tilt = -1.5,
  className = "",
  title,
}: {
  ink: string;
  children: ReactNode;
  tilt?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] shadow-[var(--shadow-sticker)] ${className}`}
      style={{
        ...inkChipStyle(ink, 18),
        backgroundImage: "var(--grain-url)",
        backgroundSize: "90px 90px",
        backgroundBlendMode: "var(--ink-blend)",
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {children}
    </span>
  );
}

export function ProvenanceStamp({ basis, tilt }: { basis: "cited" | "recollected"; tilt?: number }) {
  return basis === "cited" ? (
    <InkStamp ink="var(--ramune)" tilt={tilt} title="At least one source a reader can follow.">Cited</InkStamp>
  ) : (
    <InkStamp ink="var(--sakura)" tilt={tilt} title="Written from model training data; no external reference was located.">From model training data</InkStamp>
  );
}

const STATUS_INK: Record<string, string> = {
  Published: "var(--ramune)",
  UnderReview: "var(--yuzu)",
  Draft: "var(--graphite)",
  Archived: "var(--graphite)",
  ValidatingDocument: "var(--yuzu)",
};

export function StatusStamp({ status, tilt = -1 }: { status: string; tilt?: number }) {
  return (
    <InkStamp ink={STATUS_INK[status] ?? "var(--graphite)"} tilt={tilt}>
      {STATUS_LABEL[status] ?? status}
    </InkStamp>
  );
}

/** A strip of washi tape pinned over a corner. */
export function Tape({ ink, className = "", rotate = -5, width = 64 }: { ink: string; className?: string; rotate?: number; width?: number }) {
  return (
    <span
      aria-hidden
      className={`washi-tape pointer-events-none ${className}`}
      style={{ ["--strip-ink" as string]: ink, transform: `rotate(${rotate}deg)`, width }}
    />
  );
}

export function ZoomControls({
  onIn,
  onOut,
  onFit,
  className = "",
}: {
  onIn: () => void;
  onOut: () => void;
  onFit: () => void;
  className?: string;
}) {
  const button =
    "grid h-10 w-10 place-items-center bg-[var(--paper-sticker)] text-foreground shadow-[var(--shadow-sticker)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-sticker-lift)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} role="group" aria-label="Zoom">
      <button type="button" className={button} onClick={onIn} aria-label="Zoom in" title="Zoom in (+)">
        <Plus size={16} strokeWidth={2.2} />
      </button>
      <button type="button" className={button} onClick={onOut} aria-label="Zoom out" title="Zoom out (−)">
        <Minus size={16} strokeWidth={2.2} />
      </button>
      <button type="button" className={button} onClick={onFit} aria-label="Fit everything" title="Fit (0)">
        <Maximize2 size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function MapChips({
  value,
  onChange,
  counts,
}: {
  value: MapName | null;
  onChange: (map: MapName | null) => void;
  counts: Record<MapName, number>;
}) {
  const maps: MapName[] = ["art", "writing", "palettes", "design"];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by map">
      <button
        type="button"
        className={CHIP}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        style={value === null ? { background: "var(--foreground)", color: "var(--background)" } : { background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}
      >
        All maps
      </button>
      {maps.map((map) => {
        const active = value === map;
        return (
          <button
            key={map}
            type="button"
            className={CHIP}
            aria-pressed={active}
            onClick={() => onChange(active ? null : map)}
            style={active ? inkChipStyle(MAP_INK[map], 26) : { background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}
          >
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: MAP_INK[map] }} />
            {MAP_LABEL[map]}
            <span className="tabular-nums opacity-70">{counts[map]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Find a cell",
  className = "",
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <label className={`flex h-10 items-center gap-2 bg-[var(--paper-sticker)] px-3 shadow-[var(--shadow-sticker)] focus-within:shadow-[var(--shadow-sticker-lift)] ${className}`}>
      <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent font-sans text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="grid h-6 w-6 place-items-center text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      ) : (
        <kbd className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 sm:inline">/</kbd>
      )}
    </label>
  );
}

export const RELATION_INK_VAR: Record<RelationInk, string> = {
  ramune: "var(--ramune)",
  sakura: "var(--sakura)",
  yuzu: "var(--yuzu)",
};

/** The dashed-line legend: one entry per ink family actually present, with
 *  the relation labels it carries on hover. */
export function RelationLegend({ entries, showBroader = true }: { entries: Array<{ ink: RelationInk; family: string; labels: string[] }>; showBroader?: boolean }) {
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {showBroader ? (
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-[2px] w-6" style={{ background: "color-mix(in oklch, var(--foreground) 45%, transparent)" }} />
          <dd>broader → narrower</dd>
        </div>
      ) : null}
      {entries.map((entry) => (
        <div key={entry.ink} className="flex items-center gap-2" title={entry.labels.join(" · ")}>
          <span
            aria-hidden
            className="inline-block h-[2px] w-6"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${RELATION_INK_VAR[entry.ink]} 0 4px, transparent 4px 7px)`,
            }}
          />
          <dd>{entry.family} <span className="hidden normal-case tracking-normal opacity-70 lg:inline">({entry.labels.join(", ")})</span></dd>
        </div>
      ))}
    </dl>
  );
}

export function Eyebrow({ children, ink = "var(--ramune)", className = "" }: { children: ReactNode; ink?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground ${className}`}>
      <span aria-hidden className="inline-block h-[3px] w-7" style={{ background: ink }} />
      {children}
    </div>
  );
}

/** What a dashed line says: every relation stated between its two cells,
 *  each in its own direction, with the explanation the cell gives. */
export function RelationTooltip({ line, index }: { line: RelationLine; index: GraphIndex }) {
  return (
    <div className="grid gap-2.5">
      {line.entries.map((edge) => (
        <div key={`${edge.from}-${edge.label}`}>
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: `color-mix(in oklch, ${RELATION_INK_VAR[relationInk(edge.label)]} 72%, var(--foreground))` }}>
            {index.byId.get(edge.from)?.name} · {edge.label} · {index.byId.get(edge.to)?.name}
          </div>
          <p className="mt-1 text-[14px] leading-snug text-foreground">{edge.explanation}</p>
        </div>
      ))}
    </div>
  );
}
