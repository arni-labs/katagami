"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { applyFilters, buildFacets, type FacetKey, type FacetSelection, type WritingStyleSpecimen } from "@/lib/writing-styles";
import { SearchBox, Tape, CHIP, inkChipStyle } from "@/components/encyclopedia/chrome";
import { useMounted, usePrefersReducedMotion } from "@/components/encyclopedia/use-pan-zoom";
import { CellLinks, CreditLine, FacetControls, Passage, StatusStamp, TagChips, VoiceMdLink } from "./parts";
import { CompareBoard } from "./compare";

// The writing styles page: passage first. The text is the hero: each card opens on a real
// exemplar passage, quoted with its credit, and the name comes after. Filters
// are a rail built from the records' own fields. A shortlist collects styles;
// compare lays two or three side by side.

const MAX_COMPARE = 3;

function PassageCard({ specimen, shortlisted, onShortlist, onTag, activeTags, index }: { specimen: WritingStyleSpecimen; shortlisted: boolean; onShortlist: () => void; onTag: (tag: string) => void; activeTags: string[]; index: number }) {
  const [which, setWhich] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const exemplar = specimen.exemplars[which];
  const many = specimen.exemplars.length > 1;
  return (
    <article
      className="sticker-card riso-reveal relative flex flex-col p-5 sm:p-6"
      style={{ ["--card-ink" as string]: "var(--sakura)", ["--reveal-i" as string]: Math.min(index, 8), background: shortlisted ? "color-mix(in srgb, var(--yuzu) 9%, var(--paper-tint-base))" : undefined }}
    >
      {shortlisted ? <Tape ink="var(--yuzu)" className="-top-2 left-5" rotate={-4} width={64} /> : null}
      <div className="flex items-center justify-between gap-2">
        <StatusStamp status={specimen.status} />
        <button
          type="button"
          onClick={onShortlist}
          aria-pressed={shortlisted}
          aria-label={shortlisted ? `Remove ${specimen.name} from shortlist` : `Shortlist ${specimen.name}`}
          className="grid h-8 w-8 place-items-center shadow-[var(--shadow-sticker)] transition-transform hover:-translate-y-[1px] motion-reduce:hover:translate-y-0"
          style={shortlisted ? inkChipStyle("var(--yuzu)", 55) : { background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}
        >
          <Bookmark size={15} fill={shortlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-5 min-h-[7.5rem]">
        {exemplar ? (
          <>
            <Passage exemplar={exemplar} clamp={expanded ? undefined : 7} />
            {exemplar.text.length > 380 ? (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 pl-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground">
                {expanded ? "Fold the passage" : "Read the whole passage"}
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-[16px] leading-relaxed text-muted-foreground">No exemplar passage is on this record yet.</p>
        )}
      </div>
      {many ? (
        <div className="mt-3 flex items-center gap-2 pl-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <button type="button" onClick={() => { setWhich((w) => (w - 1 + specimen.exemplars.length) % specimen.exemplars.length); setExpanded(false); }} aria-label="Previous passage" className="grid h-6 w-6 place-items-center hover:text-foreground"><ChevronLeft size={14} /></button>
          <span className="tabular-nums">passage {which + 1} / {specimen.exemplars.length}</span>
          <button type="button" onClick={() => { setWhich((w) => (w + 1) % specimen.exemplars.length); setExpanded(false); }} aria-label="Next passage" className="grid h-6 w-6 place-items-center hover:text-foreground"><ChevronRight size={14} /></button>
        </div>
      ) : null}

      <span aria-hidden className="sticker-perforation mt-5 block" />

      <h3 className="mt-4 font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em]">{specimen.name}</h3>
      {specimen.persona ? <p className="mt-1.5 text-[16px] leading-relaxed text-muted-foreground">{specimen.persona}</p> : null}
      <CreditLine specimen={specimen} className="mt-3" />
      <div className="mt-3"><TagChips tags={specimen.tags} onPick={onTag} active={activeTags} /></div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
        <CellLinks specimen={specimen} />
        <VoiceMdLink url={specimen.voiceMdUrl} />
      </div>
    </article>
  );
}

export function WritingA({ specimens }: { specimens: WritingStyleSpecimen[] }) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<FacetSelection>({});
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  const compareRef = useRef<HTMLDivElement | null>(null);
  const mounted = useMounted();

  const facets = useMemo(() => buildFacets(specimens), [specimens]);
  const shown = useMemo(() => applyFilters(specimens, selection, query), [specimens, selection, query]);
  const byId = useMemo(() => new Map(specimens.map((s) => [s.id, s])), [specimens]);
  const chosen = shortlist.map((id) => byId.get(id)).filter((s): s is WritingStyleSpecimen => Boolean(s));

  const toggle = (key: FacetKey, value: string) =>
    setSelection((current) => {
      const list = current[key] ?? [];
      return { ...current, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  const toggleShortlist = (id: string) =>
    setShortlist((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= MAX_COMPARE ? [...list.slice(1), id] : [...list, id]));

  useEffect(() => {
    if (comparing) compareRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [comparing, reduced]);

  return (
    <div className="pb-28">
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Search passages, names, tags, credits" className="w-full sm:max-w-md" />
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">{shown.length} of {specimens.length} styles</span>
          <button type="button" onClick={() => setRailOpen((v) => !v)} aria-expanded={railOpen} className={`${CHIP} lg:hidden`} style={{ background: "var(--paper-sticker)", color: "var(--foreground)" }}>
            <SlidersHorizontal size={13} aria-hidden /> Filters
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${railOpen ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-24">
            <FacetControls facets={facets} selection={selection} onToggle={toggle} onClear={() => setSelection({})} layout="rail" />
          </div>
        </aside>

        <div>
          {comparing && chosen.length >= 2 ? (
            <div ref={compareRef} className="mb-8 scroll-mt-24">
              <CompareBoard specimens={chosen} onRemove={toggleShortlist} onClose={() => setComparing(false)} />
            </div>
          ) : null}
          {shown.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((specimen, i) => (
                <PassageCard
                  key={specimen.id}
                  index={i}
                  specimen={specimen}
                  shortlisted={shortlist.includes(specimen.id)}
                  onShortlist={() => toggleShortlist(specimen.id)}
                  onTag={(tag) => toggle("tags", tag)}
                  activeTags={selection.tags ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="sticker-card max-w-xl p-6">
              <p className="text-[16px] leading-relaxed text-muted-foreground">No style matches these filters. Clear one and the shelf fills back up.</p>
            </div>
          )}
        </div>
      </div>

      {/* The shortlist bar is fixed to the window, so it renders through a
          portal: the route transition leaves a transform on the page wrapper,
          which would otherwise turn "fixed" into "relative to the page". */}
      {mounted ? createPortal(
      <div
        // On a phone the bar sits above the bottom navigation, so sliding it
        // down by its own height parks it exactly over that navigation instead
        // of off the screen: it stayed visible and swallowed taps on controls
        // that worked before this page existed. Empty, it clears its own
        // height AND that offset, and stops taking pointer events at all —
        // aria-hidden only hides it from a screen reader.
        className={`fixed inset-x-0 bottom-0 z-40 max-md:bottom-[64px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          shortlist.length
            ? "translate-y-0"
            : "pointer-events-none translate-y-full max-md:translate-y-[calc(100%+64px)]"
        }`}
        aria-hidden={!shortlist.length}
      >
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 bg-[var(--paper-sticker-hover)] px-4 py-3 shadow-[var(--shadow-card-hover)] backdrop-blur-md">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Shortlist <span className="tabular-nums text-foreground">{shortlist.length}</span></span>
            {chosen.map((s, i) => (
              <button key={s.id} type="button" onClick={() => toggleShortlist(s.id)} className="inline-flex h-8 items-center gap-2 px-3 font-sans text-[16px] font-semibold shadow-[var(--shadow-sticker)]" style={inkChipStyle(["var(--sakura)", "var(--ramune)", "var(--yuzu)"][i % 3], 22)} aria-label={`Remove ${s.name} from shortlist`}>
                {s.name} <span aria-hidden>×</span>
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">up to {MAX_COMPARE}</span>
              <button
                type="button"
                disabled={chosen.length < 2}
                onClick={() => setComparing(true)}
                className="inline-flex h-10 items-center gap-2 bg-foreground px-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] hover:rotate-[-1deg] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:rotate-0 motion-reduce:transition-none"
              >
                Compare <span className="tabular-nums">{chosen.length}</span>
              </button>
            </span>
          </div>
        </div>
      </div>,
        document.body,
      ) : null}
    </div>
  );
}
