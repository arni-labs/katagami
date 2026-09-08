"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { EncyclopediaCell, EncyclopediaGraph, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_INK, MAP_LABEL, relationLegend, studyImage, type RelationLine } from "@/lib/encyclopedia-graph";
import { layoutField, NODE_H, NODE_W, type Placed } from "./field-layout";
import { usePanZoom, usePrefersReducedMotion } from "./use-pan-zoom";
import { CellSheet } from "./cell-sheet";
import { Eyebrow, InkStamp, MapChips, ProvenanceStamp, RELATION_INK_VAR, RelationLegend, RelationTooltip, SearchBox, ZoomControls } from "./chrome";

// Variation A — the radial field. One continuous plane. The top layer is the
// roots, clustered by map. Click a cell and its narrower cells open on a ring
// around it; click again and they fold back in. Typed relations are dashed
// lines in the three inks. Zoom changes what a node is: far away a disc and a
// name, closer a label card, up close a specimen with its study.

type Lod = "far" | "mid" | "near";

function lodFor(k: number): Lod {
  if (k < 0.42) return "far";
  if (k < 1.2) return "mid";
  return "near";
}

/** Semantic zoom: past the label layer the field itself spreads, so specimen
 *  cards (which are far larger than label cards) have room. 1 up to k = 1,
 *  rising smoothly to 2.3 by k = 1.5. */
function spreadFor(k: number): number {
  const t = Math.min(1, Math.max(0, (k - 1) / 0.5));
  const eased = t * t * (3 - 2 * t);
  return 1 + eased * 1.3;
}

function spreadNodes(nodes: Placed[], spread: number, anchor: { x: number; y: number }): Placed[] {
  if (spread === 1) return nodes;
  return nodes.map((p) => ({ ...p, x: anchor.x + (p.x - anchor.x) * spread, y: anchor.y + (p.y - anchor.y) * spread }));
}

function nodeImage(cell: EncyclopediaCell): { url: string; label: string } | null {
  const study = studyImage(cell);
  if (study) return { url: study.url, label: study.kind === "generated" ? `Generated · ${study.generatedBy ?? ""}`.trim() : study.kind === "original" ? "Original study" : "Historical study" };
  const record = cell.manifestations.find((m) => m.record?.image)?.record;
  if (record) return { url: record.image!, label: `made · ${record.name}` };
  return null;
}

function FieldNode({
  placed,
  index,
  lod,
  k,
  expanded,
  selected,
  dimmed,
  onActivate,
}: {
  placed: Placed;
  index: GraphIndex;
  lod: Lod;
  k: number;
  expanded: boolean;
  selected: boolean;
  dimmed: boolean;
  onActivate: (id: string) => void;
}) {
  const { cell } = placed;
  const ink = MAP_INK[index.primaryMap(cell)];
  const kids = index.childrenOf(cell.id).length;
  const image = lod === "near" ? nodeImage(cell) : null;
  const showFarLabel = expanded || selected;
  const label = `${cell.name}${kids ? `, ${kids} narrower` : ""}${expanded ? ", expanded" : ""}`;
  const common = "absolute left-0 top-0 block text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ramune)]";
  const dim = `${dimmed ? "opacity-[0.16]" : ""} ${selected || expanded ? "z-10" : ""}`;

  if (lod === "far") {
    // Screen-space node: the disc and its label stay the same size on screen
    // however far out the camera is, like pins on a map.
    return (
      <button
        type="button"
        aria-label={label}
        aria-expanded={kids ? expanded : undefined}
        onClick={() => onActivate(cell.id)}
        className={`${common} ${dim} field-node group`}
        style={{ transform: `translate(${placed.x}px, ${placed.y}px) scale(${1 / k}) translate(-50%, -50%)`, transformOrigin: "0 0" }}
      >
        <span
          aria-hidden
          className="relative grid h-[22px] w-[22px] place-items-center rounded-full"
          style={{ background: ink, mixBlendMode: "var(--ink-blend)" as never, boxShadow: selected ? "0 0 0 4px color-mix(in oklch, var(--yuzu) 70%, transparent)" : undefined }}
        >
          {kids && !expanded ? <span className="font-mono text-[10px] font-bold text-[var(--washi)]">{kids}</span> : null}
        </span>
        {/* The label sits outside the button's box so neighbouring pins never cover each other. */}
        <span className={`pointer-events-none absolute left-[30px] top-1/2 -translate-y-1/2 whitespace-nowrap bg-[var(--paper-sticker)] px-2 py-1 font-display text-[14px] font-bold tracking-[-0.02em] text-foreground shadow-[var(--shadow-sticker)] ${showFarLabel ? "" : "invisible group-hover:visible group-focus-visible:visible"}`}>
          {cell.name}
        </span>
      </button>
    );
  }

  if (lod === "mid") {
    return (
      <button
        type="button"
        aria-label={label}
        aria-expanded={kids ? expanded : undefined}
        onClick={() => onActivate(cell.id)}
        className={`${common} ${dim} field-node sticker-card group px-3.5 py-3`}
        style={{
          width: NODE_W,
          minHeight: NODE_H,
          transform: `translate(${placed.x}px, ${placed.y}px) translate(-50%, -50%)`,
          ["--card-ink" as string]: ink,
          background: `color-mix(in srgb, ${ink} ${selected ? 14 : 6}%, var(--paper-tint-base))`,
          boxShadow: selected ? "var(--shadow-card-hover), 3px 3px 0 color-mix(in srgb, var(--yuzu) 80%, transparent)" : undefined,
        }}
      >
        <span className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: ink }} />
            {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
          </span>
          {kids ? <span className="tabular-nums" style={{ color: `color-mix(in oklch, ${ink} 72%, var(--foreground))` }}>{expanded ? "−" : "+"}{kids}</span> : null}
        </span>
        <span className="mt-1.5 block font-display text-[17px] font-bold leading-[1.15] tracking-[-0.02em] text-foreground">{cell.name}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={kids ? expanded : undefined}
      onClick={() => onActivate(cell.id)}
      className={`${common} ${dim} field-node sticker-card group overflow-hidden`}
      style={{
        width: 264,
        transform: `translate(${placed.x}px, ${placed.y}px) translate(-50%, -50%)`,
        ["--card-ink" as string]: ink,
        background: `color-mix(in srgb, ${ink} ${selected ? 12 : 5}%, var(--paper-tint-base))`,
        boxShadow: selected ? "var(--shadow-card-hover), 3px 3px 0 color-mix(in srgb, var(--yuzu) 80%, transparent)" : undefined,
      }}
    >
      {image ? (
        <span className="relative block h-[128px] w-full overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
          <span className="absolute bottom-2 left-2 bg-[var(--paper-sticker)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-foreground/80">{image.label}</span>
        </span>
      ) : null}
      <span className="block px-4 pb-4 pt-3">
        <span className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: ink }} />
            {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
          </span>
          {kids ? <span className="tabular-nums" style={{ color: `color-mix(in oklch, ${ink} 72%, var(--foreground))` }}>{expanded ? "−" : "+"}{kids} narrower</span> : null}
        </span>
        <span className="mt-1.5 block font-display text-[19px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">{cell.name}</span>
        {cell.description ? <span className="mt-1.5 line-clamp-2 block text-[13.5px] leading-snug text-muted-foreground">{cell.description}</span> : null}
        <span className="mt-3 flex flex-wrap items-center gap-1.5">
          <ProvenanceStamp basis={cell.provenance.basis} tilt={-1} />
          {cell.manifestations.length ? <InkStamp ink="var(--yuzu)" tilt={1}>{cell.manifestations.length} made</InkStamp> : null}
        </span>
      </span>
    </button>
  );
}

export function FieldA({ graph, initialCellId }: { graph: EncyclopediaGraph; initialCellId?: string | null }) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  // Arriving with ?cell= opens that cell: its ancestry is expanded from the
  // first render and the mount effect frames it.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (initialCellId) for (const ancestor of index.ancestry(initialCellId)) if (ancestor.id !== initialCellId) set.add(ancestor.id);
    return set;
  });
  const [selected, setSelected] = useState<string | null>(initialCellId && index.byId.has(initialCellId) ? initialCellId : null);
  const [query, setQuery] = useState("");
  const [map, setMap] = useState<MapName | null>(null);
  const [hoverLine, setHoverLine] = useState<{ line: RelationLine; x: number; y: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  // Last known positions, so expanding one node does not reshuffle the rest.
  // A stable Map held in state and mutated after each layout settles.
  const [previous] = useState(() => new Map<string, { x: number; y: number }>());
  const reduced = usePrefersReducedMotion();

  const layout = useMemo(() => layoutField(index, expanded, previous), [index, expanded, previous]);
  const base = layout.nodes;
  useEffect(() => {
    previous.clear();
    for (const p of base) previous.set(p.cell.id, { x: p.x, y: p.y });
  }, [base, previous]);

  const { viewportRef, camera, setCamera, animate, dragging, handlers, zoomStep, fit, centerOn, glide } = usePanZoom({ x: 0, y: 0, k: 0.5 });
  const lod = lodFor(camera.k);
  // The spread is anchored on the selected cell so it holds still while the
  // field opens around it; with nothing selected, on the field's centre.
  const spread = spreadFor(camera.k);
  const anchor = useMemo(() => {
    const target = selected ? base.find((p) => p.cell.id === selected) : undefined;
    return target ? { x: target.x, y: target.y } : { x: 0, y: 0 };
  }, [base, selected]);
  const placed = useMemo(() => spreadNodes(base, spread, anchor), [base, spread, anchor]);
  const placedById = useMemo(() => new Map(placed.map((p) => [p.cell.id, p])), [placed]);

  const rectsOf = useCallback((nodes: Placed[]) => [
    ...nodes.map((p) => ({ x: p.x - NODE_W / 2 - 40, y: p.y - NODE_H / 2 - 40, w: NODE_W + 80, h: NODE_H + 80 })),
    // The cluster labels and the empty-map regions belong in the frame too.
    ...layout.clusters.filter((c) => !c.empty).map((c) => ({ x: c.x, y: c.y - 90, w: c.w, h: c.h + 90 })),
  ], [layout.clusters]);

  // Frame the whole top layer once the viewport has a size — or, arriving
  // with ?cell=, frame that cell.
  const framed = useRef(false);
  useEffect(() => {
    if (framed.current) return;
    framed.current = true;
    const id = requestAnimationFrame(() => {
      const target = initialCellId ? placedById.get(initialCellId) : undefined;
      if (target) {
        const el = viewportRef.current;
        const inset = el && el.clientWidth >= 768 ? 220 : 0;
        centerOn(target.x, target.y, 1.3, el ? { x: (el.clientWidth - inset) / 2, y: el.clientHeight * (el.clientWidth >= 768 ? 0.5 : 0.32) } : undefined);
      } else {
        fit(rectsOf(base), 48, 1);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [fit, base, rectsOf, initialCellId, placedById, centerOn, viewportRef]);

  const visibleBroader = useMemo(() => index.edges.filter((edge) => edge.kind === "broader" && placedById.has(edge.from) && placedById.has(edge.to)), [index, placedById]);
  const visibleLines = useMemo(() => index.relationLines.filter((line) => placedById.has(line.a) && placedById.has(line.b)), [index, placedById]);
  const legend = useMemo(() => relationLegend(index), [index]);
  const counts = useMemo(() => {
    const out = { art: 0, writing: 0, palettes: 0, design: 0 } as Record<MapName, number>;
    for (const cell of graph.cells) for (const m of cell.maps) out[m.map]++;
    return out;
  }, [graph]);

  /** Make a cell visible (expand its ancestry), select it, and bring it in. */
  const open = useCallback((id: string, zoomTo?: number) => {
    const chain = index.ancestry(id);
    const next = new Set(expanded);
    for (const ancestor of chain) if (ancestor.id !== id) next.add(ancestor.id);
    setExpanded(next);
    setSelected(id);
    // The opened cell becomes the spread anchor, so its base position is
    // where it will be drawn at any zoom.
    const target = layoutField(index, next, previous).nodes.find((p) => p.cell.id === id);
    if (target) {
      const el = viewportRef.current;
      const sheetInset = el && el.clientWidth >= 768 ? 220 : 0;
      const k = zoomTo ?? Math.max(camera.k, 0.9);
      centerOn(target.x, target.y, k, el ? { x: (el.clientWidth - sheetInset) / 2, y: el.clientHeight * (el.clientWidth >= 768 ? 0.5 : 0.32) } : undefined);
    }
  }, [index, expanded, camera.k, centerOn, viewportRef, previous]);

  const activate = useCallback((id: string) => {
    if (dragging) return;
    const kids = index.childrenOf(id);
    if (selected === id && expanded.has(id)) {
      // Fold this branch back in, keeping the cell selected.
      const next = new Set(expanded);
      next.delete(id);
      for (const d of index.descendants(id)) next.delete(d.id);
      setExpanded(next);
      return;
    }
    // Opening the sheet covers the right of the field on desktop; slide the
    // camera left by half the sheet so what was centred stays in view.
    const el = viewportRef.current;
    if (selected === null && el && el.clientWidth >= 768) glide({ ...camera, x: camera.x - 220 });
    if (el && el.clientWidth < 768) {
      // On a phone the sheet rises from the bottom; keep the tapped cell in
      // the band that stays visible above it.
      const node = placedById.get(id);
      if (node) centerOn(node.x, node.y, undefined, { x: el.clientWidth / 2, y: el.clientHeight * 0.18 });
    }
    setSelected(id);
    if (kids.length && !expanded.has(id)) {
      const next = new Set(expanded);
      next.add(id);
      setExpanded(next);
    }
  }, [dragging, index, selected, expanded, viewportRef, camera, glide, placedById, centerOn]);

  const closeSheet = useCallback(() => {
    const el = viewportRef.current;
    if (selected !== null && el && el.clientWidth >= 768) glide({ ...camera, x: camera.x + 220 });
    setSelected(null);
  }, [selected, viewportRef, camera, glide]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
    fit(rectsOf(layoutField(index, new Set(), previous).nodes), 48, 1);
  }, [fit, index, rectsOf, previous]);

  const onFilter = useCallback((next: MapName | null) => {
    setMap(next);
    const nodes = next ? base.filter((p) => p.cell.maps.some((m) => m.map === next)) : base;
    if (nodes.length) fit(rectsOf(nodes), 48, next ? 1.1 : 1);
  }, [base, fit, rectsOf]);

  const results = useMemo(() => (query.trim() ? index.search(query, map).slice(0, 8) : []), [index, query, map]);

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
    else if (event.key === "0") { fit(rectsOf(base), 48, 1); event.preventDefault(); }
    else if (event.key === "Escape") { closeSheet(); setSearchOpen(false); }
    else if (event.key === "/") { searchRef.current?.focus(); event.preventDefault(); }
  };

  const selectedCell = selected ? index.byId.get(selected) ?? null : null;
  const sheetOpen = Boolean(selectedCell);
  const dimmedFor = (cell: EncyclopediaCell) => (map ? !cell.maps.some((m) => m.map === map) : false);
  const strokeW = 1.6 / camera.k;
  const dash = `${6 / camera.k} ${7 / camera.k}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <SearchBox
            value={query}
            inputRef={searchRef}
            onChange={(v) => { setQuery(v); setSearchOpen(Boolean(v.trim())); }}
            placeholder="Find a cell"
          />
          {searchOpen && query.trim() ? (
            <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto bg-[var(--paper-sticker-hover)] py-1 shadow-[var(--shadow-card-hover)] backdrop-blur-sm">
              {results.length ? results.map((cell) => (
                <li key={cell.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => { open(cell.id, 1.3); setSearchOpen(false); }}
                    className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--yuzu)_22%,transparent)]"
                  >
                    <span className="font-display text-[16px] font-bold tracking-[-0.02em]">{cell.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}</span>
                  </button>
                </li>
              )) : (
                <li className="px-4 py-3 text-[15px] text-muted-foreground">No cell matches.</li>
              )}
            </ul>
          ) : null}
        </div>
        <MapChips value={map} onChange={onFilter} counts={counts} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RelationLegend entries={legend} />
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="tabular-nums">{placed.length}/{graph.cells.length} cells on the field</span>
          {expanded.size ? (
            <button type="button" onClick={collapseAll} className="underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground">Fold everything</button>
          ) : null}
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[max(560px,calc(100dvh-180px))] w-full select-none overflow-hidden bg-[var(--washi)] shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
        tabIndex={0}
        role="application"
        aria-label="Encyclopedia field. Drag to pan, scroll to zoom, click a cell to open it."
        onKeyDown={onKey}
        {...handlers}
      >
        <div
          className="absolute left-0 top-0 h-0 w-0"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`,
            transformOrigin: "0 0",
            transition: animate && !reduced ? "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
            willChange: "transform",
          }}
        >
          {/* map regions: a label above each cluster, a halftone wash behind it */}
          {layout.clusters.map((cluster) => {
            const ink = MAP_INK[cluster.map];
            const dim = map && map !== cluster.map;
            const left = anchor.x + (cluster.x - 60 - anchor.x) * spread;
            const top = anchor.y + (cluster.y - 90 - anchor.y) * spread;
            return (
              <div key={cluster.map} className="pointer-events-none absolute" style={{ left, top, width: (cluster.w + 120) * spread, height: (cluster.h + 150) * spread, opacity: dim ? 0.2 : 1, transition: "opacity 240ms ease" }}>
                <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: ink, opacity: cluster.empty ? 0.22 : 0.3 }} />
                <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-center" style={{ transform: `translateX(-50%) scale(${Math.max(1, Math.min(3, 0.9 / camera.k))})`, transformOrigin: "50% 0" }}>
                  <div className="font-mono text-[20px] font-bold uppercase tracking-[0.3em]" style={{ color: `color-mix(in oklch, ${ink} 72%, var(--foreground))` }}>{MAP_LABEL[cluster.map]}</div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {cluster.empty ? "no cells on this map yet" : `${cluster.roots} top-level · ${counts[cluster.map]} on this map`}
                  </div>
                </div>
              </div>
            );
          })}

          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
            {visibleBroader.map((edge) => {
              const a = placedById.get(edge.from)!;
              const b = placedById.get(edge.to)!;
              const dimmed = map ? dimmedFor(a.cell) && dimmedFor(b.cell) : false;
              const mx = (a.x + b.x) / 2;
              return (
                <path
                  key={`${edge.from}-${edge.to}-b`}
                  d={`M ${a.x} ${a.y} Q ${mx} ${a.y + (b.y - a.y) * 0.15} ${b.x} ${b.y}`}
                  fill="none"
                  stroke="color-mix(in oklch, var(--foreground) 42%, transparent)"
                  strokeWidth={strokeW}
                  opacity={dimmed ? 0.15 : 1}
                  style={{ mixBlendMode: "var(--ink-blend)" as never }}
                />
              );
            })}
            {visibleLines.map((line) => {
              const a = placedById.get(line.a)!;
              const b = placedById.get(line.b)!;
              const dimmed = map ? dimmedFor(a.cell) && dimmedFor(b.cell) : false;
              const ink = RELATION_INK_VAR[line.ink];
              const hovered = hoverLine?.line === line;
              // Bow each relation away from the straight line so it does not
              // cut through the cards that happen to sit between its ends.
              const mid = { x: (a.x + b.x) / 2 - (b.y - a.y) * 0.18, y: (a.y + b.y) / 2 + (b.x - a.x) * 0.18 };
              const d = `M ${a.x} ${a.y} Q ${mid.x} ${mid.y} ${b.x} ${b.y}`;
              return (
                <g key={line.key} className="pointer-events-auto" opacity={dimmed ? 0.15 : 1}>
                  <path d={d} fill="none" stroke={ink} strokeWidth={hovered ? strokeW * 2.2 : strokeW * 1.3} strokeDasharray={dash} strokeLinecap="round" style={{ mixBlendMode: "var(--ink-blend)" as never }} />
                  <path
                    d={d} fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(14 / camera.k, 10)}
                    className="cursor-help"
                    onPointerEnter={() => setHoverLine({ line, ...mid })}
                    onPointerLeave={() => setHoverLine((h) => (h?.line === line ? null : h))}
                    onClick={(event) => { event.stopPropagation(); setHoverLine((h) => (h?.line === line ? null : { line, ...mid })); }}
                  />
                </g>
              );
            })}
          </svg>

          {placed.map((p) => (
            <FieldNode
              key={p.cell.id}
              placed={p}
              index={index}
              lod={lod}
              k={camera.k}
              expanded={expanded.has(p.cell.id)}
              selected={selected === p.cell.id}
              dimmed={dimmedFor(p.cell)}
              onActivate={activate}
            />
          ))}
        </div>

        {hoverLine ? (
          <div
            className="pointer-events-none absolute z-20 w-72 bg-[var(--paper-sticker-hover)] p-3 shadow-[var(--shadow-card-hover)] backdrop-blur-sm"
            style={{ left: hoverLine.x * camera.k + camera.x + 12, top: hoverLine.y * camera.k + camera.y + 12 }}
            role="tooltip"
          >
            <RelationTooltip line={hoverLine.line} index={index} />
          </div>
        ) : null}

        <ZoomControls
          className="absolute bottom-4 left-4 z-20"
          onIn={() => zoomStep(1)}
          onOut={() => zoomStep(-1)}
          onFit={() => fit(rectsOf(base), 48, 1)}
        />
        <div className="pointer-events-none absolute bottom-4 left-[68px] z-20 hidden items-end sm:flex">
          <InkStamp ink="var(--graphite)" tilt={0}>{lod === "far" ? "far · pins" : lod === "mid" ? "mid · labels" : "near · specimens"}</InkStamp>
        </div>

        {/* the sheet: right on desktop, bottom on phones */}
        <div
          className={`absolute z-30 md:inset-y-3 md:right-3 md:w-[440px] max-md:inset-x-0 max-md:bottom-0 max-md:h-[58%] ${sheetOpen ? "" : "pointer-events-none"}`}
          style={{
            transition: reduced ? undefined : "opacity 240ms ease",
            opacity: sheetOpen ? 1 : 0,
          }}
          aria-hidden={!sheetOpen}
        >
          <div className={`h-full ${sheetOpen ? "" : "md:translate-x-6 max-md:translate-y-6"}`} style={{ transition: reduced ? undefined : "transform 380ms cubic-bezier(0.22,1,0.36,1)" }}>
            {selectedCell ? (
              <CellSheet
                cell={selectedCell}
                index={index}
                onSelect={(id) => open(id)}
                onClose={closeSheet}
                onLocate={(id) => { const p = placedById.get(id); if (p) centerOn(p.x, p.y, Math.max(camera.k, 1)); }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow ink="var(--yuzu)">How to move</Eyebrow>
        <p className="text-[14.5px] leading-relaxed text-muted-foreground">
          Drag to pan, scroll or pinch to zoom, click a cell to open its narrower cells, click it again to fold them. Keys: + − zoom, 0 fit, / search, Esc close.
        </p>
      </div>
    </div>
  );
}
