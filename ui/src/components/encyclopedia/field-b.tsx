"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, ChevronRight, CornerDownRight } from "lucide-react";
import type { EncyclopediaCell, EncyclopediaGraph, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_INK, MAP_LABEL, relationInk, studyImage, type Edge } from "@/lib/encyclopedia-graph";
import { layoutDrawers, type Tile } from "./drawers-layout";
import { usePanZoom, usePrefersReducedMotion } from "./use-pan-zoom";
import { CellSheet } from "./cell-sheet";
import { Eyebrow, InkStamp, MapChips, ProvenanceStamp, RELATION_INK_VAR, RelationLegend, SearchBox, ZoomControls } from "./chrome";

// Variation B — the drawers. The hierarchy is laid out once as sheets inside
// sheets: a cell is a sheet with a title strip, its narrower cells are smaller
// sheets packed inside it, all the way down. You do not expand a node; you
// enter it, and the camera moves. Deeper layers are physically smaller, so
// they are unreadable until you go in, which is the point. The breadcrumb is
// the depth.

function tileImage(cell: EncyclopediaCell): { url: string; label: string } | null {
  const study = studyImage(cell);
  if (study) return { url: study.url, label: study.kind === "generated" ? `Generated · ${study.generatedBy ?? ""}`.trim() : study.kind === "original" ? "Original study" : "Historical study" };
  const record = cell.manifestations.find((m) => m.record?.image)?.record;
  if (record) return { url: record.image!, label: record.name };
  return null;
}

function DrawerTile({
  tile,
  index,
  k,
  focused,
  selected,
  inFocus,
  dimmed,
  onEnter,
  onGhost,
}: {
  tile: Tile;
  index: GraphIndex;
  k: number;
  focused: boolean;
  selected: boolean;
  /** Inside the currently entered sheet (or no sheet entered). */
  inFocus: boolean;
  dimmed: boolean;
  onEnter: (tile: Tile) => void;
  onGhost: (targetId: string) => void;
}) {
  const { cell } = tile;
  const ink = MAP_INK[index.primaryMap(cell)];
  const sw = tile.w * k;
  const kids = index.childrenOf(cell.id).length;
  const leaf = kids === 0;
  const opacity = dimmed ? 0.16 : inFocus ? 1 : 0.55;

  if (tile.ghost) {
    return (
      <button
        type="button"
        onClick={() => onGhost(tile.target!)}
        aria-label={`${cell.name}, also under another cell. Go to it.`}
        className="absolute block text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
        style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h, opacity, outline: `${Math.max(1.5, 2 / k)}px dashed color-mix(in oklch, ${ink} 60%, transparent)`, outlineOffset: -2 }}
      >
        {sw >= 110 ? (
          <span className="flex h-full flex-col justify-center px-4" style={{ fontSize: sw < 220 ? Math.min(28, 12 / k) : undefined }}>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground" style={sw < 220 ? { fontSize: "0.75em" } : undefined}>
              <CornerDownRight size={sw < 220 ? 10 : 12} aria-hidden /> also here
            </span>
            <span className="mt-1 font-display font-bold leading-tight tracking-[-0.02em] text-foreground" style={{ fontSize: sw < 220 ? "1em" : 17 }}>{cell.name}</span>
          </span>
        ) : null}
      </button>
    );
  }

  const image = sw >= 300 ? tileImage(cell) : null;
  return (
    <div
      className="absolute"
      style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h, opacity, transition: "opacity 240ms ease" }}
    >
      <button
        type="button"
        onClick={() => onEnter(tile)}
        aria-label={`${cell.name}${kids ? `, ${kids} narrower` : ""}${focused ? ", entered" : ""}`}
        aria-current={focused ? "true" : undefined}
        className="absolute inset-0 block text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
        style={{
          background: `color-mix(in srgb, ${ink} ${selected ? 13 : tile.depth === 0 ? 5 : 7}%, var(--paper-tint-base))`,
          boxShadow: selected
            ? `var(--shadow-card-hover), ${3 / k}px ${3 / k}px 0 color-mix(in srgb, var(--yuzu) 85%, transparent)`
            : focused
              ? "var(--shadow-card-hover)"
              : "var(--shadow-card)",
        }}
      >
        {/* title strip */}
        <span className="absolute left-0 right-0 top-0 block overflow-hidden" style={{ height: tile.headerH }}>
          {sw < 70 ? (
            <span aria-hidden className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: Math.max(8, tile.w * 0.22), height: Math.max(8, tile.w * 0.22), background: ink, mixBlendMode: "var(--ink-blend)" as never }} />
          ) : sw < 170 ? (
            <span className="absolute inset-0 flex items-center justify-center px-2 text-center font-display font-bold leading-tight tracking-[-0.02em] text-foreground" style={{ fontSize: Math.min(40, Math.max(12, 12.5 / k)) }}>
              {cell.name}
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center gap-3 px-4">
              {image && sw >= 460 && !leaf ? (
                <span className="relative block h-[48px] w-[72px] shrink-0 overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: ink }} />
                  {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
                  {kids ? <span className="tabular-nums" style={{ color: `color-mix(in oklch, ${ink} 72%, var(--foreground))` }}>· {kids} narrower</span> : null}
                  {sw >= 460 && cell.manifestations.length ? <span className="tabular-nums">· {cell.manifestations.length} made</span> : null}
                </span>
                <span className="mt-0.5 block truncate font-display font-bold leading-tight tracking-[-0.02em] text-foreground" style={{ fontSize: sw >= 460 ? 21 : 17 }}>{cell.name}</span>
              </span>
              {sw >= 460 ? <ProvenanceStamp basis={cell.provenance.basis} tilt={-1} /> : null}
            </span>
          )}
        </span>
        {/* a leaf uses its body as the specimen */}
        {leaf && sw >= 170 ? (
          <span className="absolute inset-x-0 bottom-0 block overflow-hidden px-4 pb-4" style={{ top: 56 }}>
            {image && sw >= 300 ? (
              <span className="relative mb-2 block h-[52%] w-full overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                <span className="absolute bottom-1.5 left-1.5 bg-[var(--paper-sticker)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-foreground/80">{image.label}</span>
              </span>
            ) : null}
            {cell.description ? <span className="line-clamp-3 block text-[13.5px] leading-snug text-muted-foreground">{cell.description}</span> : <span className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/70">name and scope only</span>}
          </span>
        ) : null}
        {!leaf && sw >= 170 && focused ? (
          <span className="absolute right-4 bottom-3 block font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">entered · click a sheet inside</span>
        ) : null}
      </button>
    </div>
  );
}

export function FieldB({ graph, initialCellId }: { graph: EncyclopediaGraph; initialCellId?: string | null }) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  const layout = useMemo(() => layoutDrawers(index), [index]);
  const [focus, setFocus] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [map, setMap] = useState<MapName | null>(null);
  const [hoverEdge, setHoverEdge] = useState<{ edge: Edge; x: number; y: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const { viewportRef, camera, setCamera, animate, dragging, handlers, zoomStep, fit } = usePanZoom({ x: 0, y: 0, k: 0.3 });

  const framed = useRef(false);
  const fitAll = useCallback(() => fit([layout.bounds], 40, 1), [fit, layout.bounds]);

  const sheetInset = useCallback(() => {
    const el = viewportRef.current;
    return el && el.clientWidth >= 768 ? 440 + 12 : 0;
  }, [viewportRef]);

  /** Frame a tile leaving room for the side sheet. */
  const frameTile = useCallback((tile: Tile, padding = 48) => {
    const el = viewportRef.current;
    if (!el) return;
    const inset = sheetInset();
    const vw = el.clientWidth - inset;
    const vh = el.clientWidth >= 768 ? el.clientHeight : el.clientHeight * 0.34;
    const k = Math.min(2.4, Math.max(0.18, Math.min((vw - padding * 2) / tile.w, (vh - padding * 2) / tile.h)));
    setCamera({ k, x: (vw - tile.w * k) / 2 - tile.x * k, y: (vh - tile.h * k) / 2 - tile.y * k });
  }, [viewportRef, sheetInset, setCamera]);

  const enter = useCallback((tile: Tile) => {
    if (dragging) return;
    if (focus === tile.id) {
      setSelected((s) => (s === tile.id ? null : tile.id));
      return;
    }
    setFocus(tile.id);
    setSelected(tile.id);
    frameTile(tile);
  }, [dragging, focus, frameTile]);

  const goTo = useCallback((id: string) => {
    const tile = layout.byId.get(id);
    if (!tile) return;
    setFocus(id);
    setSelected(id);
    frameTile(tile);
  }, [layout.byId, frameTile]);

  // Frame everything once the viewport has a size — or, arriving with ?cell=,
  // enter that cell straight away.
  const goToRef = useRef(goTo);
  useEffect(() => { goToRef.current = goTo; }, [goTo]);
  useEffect(() => {
    if (framed.current) return;
    framed.current = true;
    const id = requestAnimationFrame(() => {
      if (initialCellId && layout.byId.has(initialCellId)) goToRef.current(initialCellId);
      else fitAll();
    });
    return () => cancelAnimationFrame(id);
  }, [fitAll, initialCellId, layout.byId]);

  const up = useCallback(() => {
    const current = focus ? layout.byId.get(focus) : null;
    if (!current) return;
    if (current.parent) goTo(current.parent);
    else { setFocus(null); setSelected(null); fitAll(); }
  }, [focus, layout.byId, goTo, fitAll]);

  // Animate camera moves triggered by entering; the hook's setCamera does not.
  const [glideOn, setGlideOn] = useState(false);
  const glideTimer = useRef<number | null>(null);
  const withGlide = useCallback((fn: () => void) => {
    setGlideOn(true);
    fn();
    if (glideTimer.current) window.clearTimeout(glideTimer.current);
    glideTimer.current = window.setTimeout(() => setGlideOn(false), 560);
  }, []);

  const legend = useMemo(() => {
    const seen = new Map<string, ReturnType<typeof relationInk>>();
    for (const edge of index.edges) if (edge.kind === "relation" && !seen.has(edge.label)) seen.set(edge.label, relationInk(edge.label));
    return [...seen.entries()].map(([label, ink]) => ({ label, ink }));
  }, [index]);
  const counts = useMemo(() => {
    const out = { art: 0, writing: 0, palettes: 0, design: 0 } as Record<MapName, number>;
    for (const cell of graph.cells) for (const m of cell.maps) out[m.map]++;
    return out;
  }, [graph]);
  const relationEdges = useMemo(() => index.edges.filter((edge) => edge.kind === "relation" && layout.byId.has(edge.from) && layout.byId.has(edge.to)), [index, layout.byId]);

  const crumbs = useMemo(() => {
    const chain: Tile[] = [];
    let cursor = focus ? layout.byId.get(focus) : undefined;
    while (cursor) { chain.unshift(cursor); cursor = cursor.parent ? layout.byId.get(cursor.parent) : undefined; }
    return chain;
  }, [focus, layout.byId]);
  const focusSet = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus]);
    for (const d of index.descendants(focus)) set.add(d.id);
    let cursor = layout.byId.get(focus);
    while (cursor?.parent) { set.add(cursor.parent); cursor = layout.byId.get(cursor.parent); }
    return set;
  }, [focus, index, layout.byId]);

  const results = useMemo(() => (query.trim() ? index.search(query, map).slice(0, 8) : []), [index, query, map]);
  const dimmedFor = (cell: EncyclopediaCell) => (map ? !cell.maps.some((m) => m.map === map) : false);

  const onFilter = (next: MapName | null) => {
    setMap(next);
    const board = next ? layout.boards.find((b) => b.map === next) : null;
    withGlide(() => (board ? fit([board], 40, 1.2) : fitAll()));
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).tagName === "INPUT") return;
    const step = 90;
    const pan: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (pan[event.key]) {
      const [dx, dy] = pan[event.key];
      setCamera((cam) => ({ ...cam, x: cam.x + dx, y: cam.y + dy }));
      event.preventDefault();
      return;
    }
    if (event.key === "+" || event.key === "=") { zoomStep(1); event.preventDefault(); }
    else if (event.key === "-" || event.key === "_") { zoomStep(-1); event.preventDefault(); }
    else if (event.key === "0") { withGlide(fitAll); event.preventDefault(); }
    else if (event.key === "Backspace") { withGlide(up); event.preventDefault(); }
    else if (event.key === "Escape") { if (selected) setSelected(null); else withGlide(up); }
    else if (event.key === "/") { searchRef.current?.focus(); event.preventDefault(); }
  };

  const selectedCell = selected ? index.byId.get(selected) ?? null : null;
  const sheetOpen = Boolean(selectedCell);
  const strokeW = 1.6 / camera.k;
  const dash = `${6 / camera.k} ${7 / camera.k}`;
  const headerCentre = (tile: Tile) => ({ x: tile.x + tile.w / 2, y: tile.y + Math.min(tile.headerH, 64) / 2 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <SearchBox value={query} inputRef={searchRef} onChange={(v) => { setQuery(v); setSearchOpen(Boolean(v.trim())); }} placeholder="Find a cell" />
          {searchOpen && query.trim() ? (
            <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto bg-[var(--paper-sticker-hover)] py-1 shadow-[var(--shadow-card-hover)] backdrop-blur-sm">
              {results.length ? results.map((cell) => (
                <li key={cell.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => { withGlide(() => goTo(cell.id)); setSearchOpen(false); }} className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--yuzu)_22%,transparent)]">
                    <span className="font-display text-[16px] font-bold tracking-[-0.02em]">{cell.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{index.ancestry(cell.id).slice(0, -1).map((c) => c.name).join(" › ") || MAP_LABEL[index.primaryMap(cell)]}</span>
                  </button>
                </li>
              )) : <li className="px-4 py-3 text-[15px] text-muted-foreground">No cell matches.</li>}
            </ul>
          ) : null}
        </div>
        <MapChips value={map} onChange={onFilter} counts={counts} />
      </div>

      {/* breadcrumb = depth */}
      <nav aria-label="Where you are" className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em]">
        <button type="button" onClick={() => withGlide(() => { setFocus(null); setSelected(null); fitAll(); })} className={`px-2.5 py-1.5 shadow-[var(--shadow-sticker)] ${focus ? "bg-[var(--paper-sticker)] text-muted-foreground hover:text-foreground" : "bg-[var(--foreground)] text-[var(--background)]"}`}>
          All maps
        </button>
        {crumbs.map((tile, i) => (
          <span key={tile.id} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-muted-foreground" aria-hidden />
            <button
              type="button"
              onClick={() => withGlide(() => goTo(tile.id))}
              aria-current={i === crumbs.length - 1 ? "page" : undefined}
              className={`px-2.5 py-1.5 shadow-[var(--shadow-sticker)] ${i === crumbs.length - 1 ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--paper-sticker)] text-muted-foreground hover:text-foreground"}`}
            >
              {tile.cell.name}
            </button>
          </span>
        ))}
        {focus ? (
          <button type="button" onClick={() => withGlide(up)} className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-foreground" title="Up one level (Backspace)">
            <ArrowUp size={12} aria-hidden /> up
          </button>
        ) : null}
        <span className="ml-auto flex items-center gap-4 text-muted-foreground"><RelationLegend entries={legend} /></span>
      </nav>

      <div
        ref={viewportRef}
        className="relative h-[min(78dvh,900px)] min-h-[540px] w-full select-none overflow-hidden bg-[var(--washi)] shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
        tabIndex={0}
        role="application"
        aria-label="Encyclopedia drawers. Drag to pan, scroll to zoom, click a sheet to enter it, Backspace to go up."
        onKeyDown={onKey}
        onDoubleClick={(event) => { if (event.target === event.currentTarget) withGlide(up); }}
        {...handlers}
      >
        <div
          className="absolute left-0 top-0 h-0 w-0"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`,
            transformOrigin: "0 0",
            transition: (animate || glideOn) && !reduced ? "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
            willChange: "transform",
          }}
        >
          {layout.boards.map((board) => (
            <div
              key={board.map}
              className="absolute"
              style={{ left: board.x, top: board.y, width: board.w, height: board.h, opacity: map && map !== board.map ? 0.18 : 1, transition: "opacity 240ms ease", background: `color-mix(in srgb, ${MAP_INK[board.map]} 2.5%, var(--paper-sticker))`, boxShadow: "var(--shadow-card)" }}
              onDoubleClick={(event) => { if (event.target === event.currentTarget) withGlide(up); }}
            >
              <span aria-hidden className="halftone-wash pointer-events-none absolute -right-10 -top-10 h-64 w-96" style={{ ["--wash-ink" as string]: MAP_INK[board.map], opacity: 0.5 }} />
              <div className="pointer-events-none absolute left-8 top-6 flex items-baseline gap-3">
                <span className="font-mono text-[26px] font-bold uppercase tracking-[0.3em]" style={{ color: `color-mix(in oklch, ${MAP_INK[board.map]} 72%, var(--foreground))` }}>{MAP_LABEL[board.map]}</span>
                <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">{board.count} on this map</span>
              </div>
            </div>
          ))}

          {layout.tiles.map((tile) => (
            <DrawerTile
              key={tile.id}
              tile={tile}
              index={index}
              k={camera.k}
              focused={focus === tile.id}
              selected={selected === tile.id && !tile.ghost}
              inFocus={!focusSet || focusSet.has(tile.id) || (tile.ghost && focusSet.has(tile.parent ?? ""))}
              dimmed={dimmedFor(tile.cell)}
              onEnter={(t) => withGlide(() => enter(t))}
              onGhost={(id) => withGlide(() => goTo(id))}
            />
          ))}

          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
            {relationEdges.map((edge) => {
              const a = headerCentre(layout.byId.get(edge.from)!);
              const b = headerCentre(layout.byId.get(edge.to)!);
              const ink = RELATION_INK_VAR[relationInk(edge.label)];
              const hovered = hoverEdge?.edge === edge;
              const lit = !focusSet || focusSet.has(edge.from) || focusSet.has(edge.to);
              const dim = map ? dimmedFor(index.byId.get(edge.from)!) && dimmedFor(index.byId.get(edge.to)!) : false;
              // A gentle bow so parallel relations do not stack on one line.
              const mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.12;
              const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.12;
              const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
              return (
                <g key={`${edge.from}-${edge.to}-${edge.label}`} className="pointer-events-auto" opacity={dim ? 0.12 : lit ? 1 : 0.28}>
                  <path d={d} fill="none" stroke={ink} strokeWidth={hovered ? strokeW * 2.2 : strokeW * 1.4} strokeDasharray={dash} strokeLinecap="round" style={{ mixBlendMode: "var(--ink-blend)" as never }} />
                  <path
                    d={d} fill="none" stroke="transparent" strokeWidth={Math.max(14 / camera.k, 10)} className="cursor-help"
                    onPointerEnter={() => setHoverEdge({ edge, x: mx, y: my })}
                    onPointerLeave={() => setHoverEdge((h) => (h?.edge === edge ? null : h))}
                    onClick={(event) => { event.stopPropagation(); setHoverEdge((h) => (h?.edge === edge ? null : { edge, x: mx, y: my })); }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {hoverEdge ? (
          <div className="pointer-events-none absolute z-20 w-64 bg-[var(--paper-sticker-hover)] p-3 shadow-[var(--shadow-card-hover)] backdrop-blur-sm" style={{ left: hoverEdge.x * camera.k + camera.x + 12, top: hoverEdge.y * camera.k + camera.y + 12 }} role="tooltip">
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: `color-mix(in oklch, ${RELATION_INK_VAR[relationInk(hoverEdge.edge.label)]} 72%, var(--foreground))` }}>
              {index.byId.get(hoverEdge.edge.from)?.name} · {hoverEdge.edge.label} · {index.byId.get(hoverEdge.edge.to)?.name}
            </div>
            <p className="mt-1.5 text-[14px] leading-snug text-foreground">{hoverEdge.edge.explanation}</p>
          </div>
        ) : null}

        <ZoomControls className="absolute bottom-4 left-4 z-20" onIn={() => zoomStep(1)} onOut={() => zoomStep(-1)} onFit={() => withGlide(fitAll)} />
        <div className="pointer-events-none absolute bottom-4 left-[68px] z-20 hidden sm:flex">
          <InkStamp ink="var(--graphite)" tilt={0}>{focus ? `depth ${crumbs.length}` : "all maps"}</InkStamp>
        </div>

        <div className={`absolute z-30 md:inset-y-3 md:right-3 md:w-[440px] max-md:inset-x-0 max-md:bottom-0 max-md:h-[64%] ${sheetOpen ? "" : "pointer-events-none"}`} style={{ opacity: sheetOpen ? 1 : 0, transition: reduced ? undefined : "opacity 240ms ease" }} aria-hidden={!sheetOpen}>
          {selectedCell ? (
            <CellSheet
              cell={selectedCell}
              index={index}
              frame="side"
              onSelect={(id) => withGlide(() => goTo(id))}
              onClose={() => setSelected(null)}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow ink="var(--yuzu)">How to move</Eyebrow>
        <p className="text-[14.5px] leading-relaxed text-muted-foreground">
          Click a sheet to enter it; the breadcrumb is how deep you are. Backspace or double-click the paper to go up. Drag to pan, scroll or pinch to zoom. Keys: + − zoom, 0 everything, / search, Esc close.
        </p>
      </div>
    </div>
  );
}
