"use client";

import type { CSSProperties, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { STATUS_LABEL, type RelationInk } from "@/lib/encyclopedia-graph";

// Shared chrome for the encyclopedia and writing pages: ink stamps, washi
// tape, the search box. Everything is a sharp rectangle; separation is shadow
// and tint; labels are mono.

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
      className={`inline-flex items-center gap-1.5 px-2 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.14em] shadow-[var(--shadow-sticker)] ${className}`}
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
    <label className={`flex h-8 items-center gap-2 bg-[var(--paper-sticker)] px-2.5 shadow-[var(--shadow-sticker)] focus-within:shadow-[var(--shadow-sticker-lift)] ${className}`}>
      <Search size={13} className="shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent font-sans text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/70"
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
