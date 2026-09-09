"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Map as MapIcon, Search, X } from "lucide-react";
import type { EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_LABEL, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";
import { Marker } from "@/components/page-hero";
import { useCellFace } from "./map-cards";
import { CellThumb, OpenCellButton, SheetBody, SheetTitle, type SheetTab } from "./focus-sheet";
import { useWindowedList } from "./windowed-list";

// The encyclopedia on a phone.
//
// The map is a good way to see a field and a poor way to browse one on a
// screen four hundred pixels wide: the far view holds a layer that does not
// fit, the reading layer holds about two cards, and nothing about panning
// helps a reader reach a cell they already have in mind. What browsing means
// here is four things — reach a named cell, step between a cell and its
// neighbours, read one without losing your place, and get back out — and all
// four are navigation, not geography.
//
// So the phone gets a browser: search at the top, the library's own hierarchy
// as a list, and a cell page whose every neighbour is one tap away. The map is
// still here, one tap away as well, for the reader who wants the field. Rows
// are one height and windowed, so this costs the same over five thousand cells
// as over five hundred.

/** One row's height. Fixed, so the window is arithmetic — and so a list of any
 *  length scrolls at the same cost. */
const ROW_H = 88;

interface Step {
  /** The cell this level is under, or null for the top of the library. */
  parentId: string | null;
  /** Where the reader had scrolled to, restored when they come back up. */
  scrollTop: number;
}

function Eyebrow({ children, ink }: { children: React.ReactNode; ink: string }) {
  return (
    <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: `color-mix(in oklch, ${ink} 78%, var(--foreground))` }}>
      {children}
    </span>
  );
}

/** One cell in a list. Fixed height, so the row clamps rather than growing;
 *  the whole cell is a tap target, well past the forty-four pixels a finger
 *  needs. */
function BrowseRow({
  cell,
  index,
  onOpen,
  eyebrow,
}: {
  cell: EncyclopediaCell;
  index: GraphIndex;
  onOpen: (id: string) => void;
  eyebrow?: string;
}) {
  const { face, onImageError } = useCellFace(cell);
  const under = index.childrenOf(cell.id).length;
  const made = cell.manifestations.length;
  const on = cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ");
  return (
    <button
      type="button"
      onClick={() => onOpen(cell.id)}
      className="flex w-full items-center gap-4 px-5 text-left"
      style={{ height: ROW_H }}
    >
      <CellThumb face={face} onImageError={onImageError} size={56} />
      <span className="min-w-0 flex-1">
        <Eyebrow ink={face.ink}>{eyebrow ?? on}</Eyebrow>
        <span className="mt-0.5 block truncate font-sans text-[17px] font-semibold leading-snug text-foreground">{cell.name}</span>
        <span className="mt-0.5 block truncate font-sans text-[15px] leading-snug text-muted-foreground">
          {under ? `${under} narrower` : null}
          {under && made ? " · " : null}
          {made ? `${made} made` : null}
          {!under && !made ? cell.description || "A name and a scope." : null}
        </span>
      </span>
      <ChevronRight size={22} className="shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

/** A list of cells, windowed. Only the rows on screen are mounted; the rest
 *  are a measured gap above and below, so the scrollbar is honest. */
function CellList({
  cells,
  index,
  onOpen,
  scrollRef,
  empty,
}: {
  cells: EncyclopediaCell[];
  index: GraphIndex;
  onOpen: (id: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  empty: React.ReactNode;
}) {
  const { window: win } = useWindowedList(cells.length, ROW_H, scrollRef);
  if (!cells.length) return <div className="px-5 py-10">{empty}</div>;
  return (
    <div style={{ height: win.totalHeight, position: "relative" }} data-browse-list>
      <div style={{ transform: `translateY(${win.offsetTop}px)` }}>
        {cells.slice(win.from, win.to).map((cell) => (
          <BrowseRow key={cell.id} cell={cell} index={index} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function EncyclopediaBrowse({
  index,
  focusId,
  onFocus,
  onClearFocus,
  onShowMap,
  map,
  onMap,
  counts,
  withheld,
}: {
  index: GraphIndex;
  /** The cell the page is on, shared with the map so switching views keeps
   *  the reader where they were. */
  focusId: string | null;
  onFocus: (id: string) => void;
  onClearFocus: () => void;
  onShowMap: () => void;
  map: MapName | null;
  onMap: (map: MapName | null) => void;
  counts: Record<MapName, number>;
  /** Rows in the collection that are not shown. Said here, at the foot of the
   *  list it qualifies — on the page it sat below a fixed navigation bar and
   *  was never readable on a phone. */
  withheld: number;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SheetTab>("material");
  /** Where the reader is in the hierarchy. The last step is the level on
   *  screen; going back pops it. */
  const [trail, setTrail] = useState<Step[]>([{ parentId: null, scrollTop: 0 }]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const cell = focusId ? index.byId.get(focusId) ?? null : null;
  const here = trail[trail.length - 1];
  const searching = query.trim().length > 0;

  const results = useMemo(() => (searching ? index.search(query, map) : []), [index, query, map, searching]);

  /** The cells at the level the reader is on: the top of the library, or what
   *  sits under the cell they came through. */
  const level = useMemo(() => {
    if (here.parentId) return index.childrenOf(here.parentId);
    const roots = index.graph.cells.filter((c) => index.depthOf(c.id) === 0);
    const shown = map ? roots.filter((c) => c.maps.some((m) => m.map === map)) : roots;
    return [...shown].sort((a, b) => a.name.localeCompare(b.name));
  }, [index, here.parentId, map]);

  const open = useCallback(
    (id: string) => {
      const kids = index.childrenOf(id);
      // A cell with narrower cells under it is a level to step into; a leaf is
      // a page to read. Both are reachable either way — the page names its own
      // narrower cells too — but the common move down the hierarchy should not
      // cost two taps.
      if (kids.length) {
        // Remember where this level was scrolled to before leaving it, so
        // coming back puts the reader where they were rather than at the top
        // of a list they had already worked their way down.
        const at = scrollRef.current?.scrollTop ?? 0;
        setTrail((steps) => [...steps.slice(0, -1), { ...steps[steps.length - 1], scrollTop: at }, { parentId: id, scrollTop: 0 }]);
        setQuery("");
      } else {
        onFocus(id);
        setTab("material");
      }
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [index, onFocus],
  );

  const back = useCallback(() => {
    if (cell) { onClearFocus(); return; }
    setTrail((steps) => {
      if (steps.length < 2) return steps;
      const next = steps.slice(0, -1);
      const to = next[next.length - 1].scrollTop;
      // After the level has been drawn, not before it: the list is a different
      // height now, so scrolling first would be clamped to the old one.
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: to }));
      return next;
    });
  }, [cell, onClearFocus]);

  const parent = here.parentId ? index.byId.get(here.parentId) ?? null : null;
  const ancestry = focusId ? index.ancestry(focusId) : [];
  /** Where back goes, named. A button that only says "Back" makes the reader
   *  find out by pressing it. */
  const above = trail.length > 1 ? trail[trail.length - 2] : null;
  const backLabel = cell
    ? parent
      ? parent.name
      : "All cells"
    : above
      ? (above.parentId ? index.byId.get(above.parentId)?.name ?? "Back" : "All cells")
      : "Back";

  return (
    <div className="flex h-full flex-col bg-[var(--washi)]">
      {/* ── the bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 pb-3 pt-6">
        {cell || parent ? (
          <button type="button" onClick={back} className="mb-3 -ml-1 inline-flex h-11 max-w-full items-center gap-2 pr-3 font-sans text-[17px] text-foreground">
            <ArrowLeft size={20} className="shrink-0" aria-hidden />
            <span className="truncate">{backLabel}</span>
          </button>
        ) : (
          <>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>Encyclopedia</div>
            <h1 className="mt-2 font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">
              The <Marker color="sakura">encyclopedia</Marker>
            </h1>
          </>
        )}

        <div className="relative mt-3">
          <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a cell"
            aria-label="Find a cell"
            className="h-12 w-full bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] pl-12 pr-11 font-sans text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ramune)]"
          />
          {searching ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted-foreground">
              <X size={20} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by map">
          <button type="button" aria-pressed={map === null} onClick={() => onMap(null)} className="h-11 shrink-0 px-4 font-sans text-[16px] font-semibold shadow-[var(--shadow-sticker)]" style={map === null ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>All</button>
          {MAP_NAMES_ORDER.map((name) => (
            <button key={name} type="button" aria-pressed={map === name} onClick={() => onMap(map === name ? null : name)} disabled={!counts[name]} className="h-11 shrink-0 px-4 font-sans text-[16px] font-semibold shadow-[var(--shadow-sticker)] disabled:opacity-45" style={map === name ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>
              {MAP_LABEL[name]}
            </button>
          ))}
          <button type="button" onClick={onShowMap} className="ml-auto inline-flex h-11 shrink-0 items-center gap-2 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] shadow-[var(--shadow-sticker)]" style={{ background: "var(--washi)", color: "var(--foreground)" }}>
            <MapIcon size={16} aria-hidden /> Map
          </button>
        </div>
      </div>

      {/* ── what the reader is looking at ────────────────────────────────── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {cell ? (
          <div className="px-5 pb-16">
            {ancestry.length > 1 ? (
              <nav aria-label="Where this cell sits" className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {ancestry.slice(0, -1).map((up) => (
                  <span key={up.id} className="flex items-center gap-2">
                    <button type="button" onClick={() => onFocus(up.id)} className="underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px]">{up.name}</button>
                    <span aria-hidden>/</span>
                  </span>
                ))}
              </nav>
            ) : null}
            <div className="mt-5"><SheetTitle cell={cell} /></div>
            <p className="mt-4 text-[17px] leading-relaxed text-foreground">{cell.description || "A name and a scope. No description has been written for this cell yet."}</p>
            <SheetBody cell={cell} index={index} tab={tab} onTab={setTab} onFocus={onFocus} />
            <OpenCellButton cell={cell} />
          </div>
        ) : searching ? (
          <>
            <p className="px-5 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {results.length} {results.length === 1 ? "cell matches" : "cells match"} “{query.trim()}”
            </p>
            <CellList
              cells={results}
              index={index}
              onOpen={open}
              scrollRef={scrollRef}
              empty={<p className="text-[17px] leading-relaxed text-muted-foreground">No cell matches that. Try a shorter word, or clear the map filter.</p>}
            />
          </>
        ) : (
          <>
            {parent ? (
              <div className="px-5 pb-2 pt-1">
                <h2 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em]">{parent.name}</h2>
                <p className="mt-1.5 text-[17px] leading-relaxed text-muted-foreground">{parent.description || "A name and a scope."}</p>
                <button type="button" onClick={() => onFocus(parent.id)} className="mt-3 inline-flex h-12 items-center gap-2 bg-foreground px-5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-background">
                  Read this cell <ArrowUpRight size={17} aria-hidden />
                </button>
                <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">{level.length} narrower</p>
              </div>
            ) : (
              <p className="px-5 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {level.length} of {index.graph.cells.length} cells sit at the top
              </p>
            )}
            <CellList
              cells={level}
              index={index}
              onOpen={open}
              scrollRef={scrollRef}
              empty={<p className="text-[17px] leading-relaxed text-muted-foreground">No cells on this map yet.</p>}
            />
            {!parent && withheld ? (
              <p className="px-5 pb-10 pt-6 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
                {withheld} {withheld === 1 ? "cell is" : "cells are"} withheld: not attested under the current contract.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
