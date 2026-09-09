"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpRight, ChevronUp, Maximize2, Minus, Plus } from "lucide-react";
import type { EncyclopediaGraph, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_LABEL, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";
import { Marker } from "@/components/page-hero";
import { SearchBox } from "./chrome";
import { cellMaterial, openingCell } from "./material";
import { connector, layoutFocus, type Size } from "./focus-layout";
import { FocusCard, NeighbourCard } from "./map-cards";
import { CloseButton, OpenCellButton, SheetBody, SheetTitle, type SheetTab } from "./focus-sheet";
import { useMounted, usePanZoom, usePrefersReducedMotion } from "./use-pan-zoom";

// The encyclopedia map. One cell is in focus as a large specimen card; its
// broader, narrower and related cells sit around it, joined by dashed lines
// that carry the relation word. Click a neighbour and it takes the focus: the
// map re-centres and its own neighbours appear — that is how you go a level
// deeper or wider. The sheet beside the map (below it on a phone) holds the
// full material. Drag to pan, scroll to zoom; zoomed out, cards fold to their
// names.

const SHEET_W = 440;

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

export function EncyclopediaMap({ graph, initialCellId }: { graph: EncyclopediaGraph; initialCellId?: string | null }) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  const opening = useMemo(() => (initialCellId && index.byId.has(initialCellId) ? index.byId.get(initialCellId)! : openingCell(index)), [index, initialCellId]);
  const [focusId, setFocusId] = useState<string | null>(opening?.id ?? null);
  const [trail, setTrail] = useState<string[]>(opening ? [opening.id] : []);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [tab, setTab] = useState<SheetTab>("material");
  const [map, setMap] = useState<MapName | null>(null);
  const [query, setQuery] = useState("");
  const [sizes, setSizes] = useState<Map<string, Size>>(() => new Map());
  const desktop = useIsDesktop();
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();

  const layout = useMemo(() => layoutFocus(index, focusId, sizes), [index, focusId, sizes]);
  const focusCell = focusId ? index.byId.get(focusId) ?? null : null;
  const materials = useMemo(() => new Map(layout.cards.map((c) => [c.cell.id, cellMaterial(c.cell)])), [layout]);

  const { viewportRef, camera, setCamera, animate, dragging, handlers, zoomStep, glide } = usePanZoom({ x: 0, y: 0, k: 1 });
  const lod: "full" | "compact" = camera.k < 0.62 ? "compact" : "full";

  // ── measure cards so the layout uses real sizes ─────────────────────────
  const cardEls = useRef(new Map<string, HTMLElement>());
  const setCardEl = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) cardEls.current.set(id, el);
    else cardEls.current.delete(id);
  }, []);
  useLayoutEffect(() => {
    if (lod === "compact") return;
    let changed = false;
    const next = new Map(sizes);
    for (const card of layout.cards) {
      const el = cardEls.current.get(card.cell.id);
      if (!el) continue;
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      const prev = next.get(card.cell.id);
      if (!prev || prev.w !== w || prev.h !== h) { next.set(card.cell.id, { w, h }); changed = true; }
    }
    if (changed) setSizes(next);
  }, [lod, sizes, layout.cards]);

  // ── framing ─────────────────────────────────────────────────────────────
  const frame = useCallback((smooth = true) => {
    const el = viewportRef.current;
    if (!el || !layout.focus) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    // Leave the title block and the controls their room.
    const top = desktop ? 150 : 176;
    const bottom = desktop ? 150 : 206 + 16;
    const side = desktop ? 48 : 12;
    const b = layout.bounds;
    const f = layout.focus;
    if (!desktop) {
      // On a phone the focused card fills the width; neighbours sit just off
      // the edge and are a drag away, as in the reference.
      const k = Math.min(1, (vw - side * 2) / f.w, (vh - top - bottom) / f.h);
      const x = vw / 2 - (f.x + f.w / 2) * k;
      const y = top + ((vh - top - bottom) - f.h * k) / 2 - f.y * k;
      if (smooth) glide({ k, x, y }); else setCamera({ k, x, y });
      return;
    }
    const k = Math.min(1, (vw - side * 2) / b.w, (vh - top - bottom) / b.h);
    // Centre the focused card; if that pushes a neighbour off the paper,
    // shift just enough to bring it back.
    let x = vw / 2 - (f.x + f.w / 2) * k;
    if (b.x * k + x < side) x = side - b.x * k;
    else if ((b.x + b.w) * k + x > vw - side) x = vw - side - (b.x + b.w) * k;
    let y = top + (vh - top - bottom) / 2 - (f.y + f.h / 2) * k;
    if (b.y * k + y < top) y = top - b.y * k;
    else if ((b.y + b.h) * k + y > vh - bottom) y = vh - bottom - (b.y + b.h) * k;
    if (smooth) glide({ k, x, y });
    else setCamera({ k, x, y });
  }, [viewportRef, layout, desktop, glide, setCamera]);

  // Frame after a focus change, and keep re-framing while the cards settle
  // (fonts and images arriving change their heights for a moment).
  const settleUntil = useRef(Date.now() + 4000);
  const layoutKey = `${focusId}|${layout.cards.map((c) => `${c.cell.id}:${c.w}x${c.h}`).join(",")}|${desktop}|${sheetOpen}`;
  useEffect(() => {
    if (Date.now() > settleUntil.current) return;
    const measured = layout.cards.every((c) => sizes.has(c.cell.id));
    if (!measured) return;
    const id = requestAnimationFrame(() => frame(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);
  useEffect(() => {
    const onResize = () => frame(false);
    window.addEventListener("resize", onResize);
    // Web fonts arriving re-wrap every title; frame once more when they land.
    let cancelled = false;
    document.fonts?.ready.then(() => { if (!cancelled) frame(true); });
    return () => { cancelled = true; window.removeEventListener("resize", onResize); };
  }, [frame]);

  const focus = useCallback((id: string) => {
    if (!index.byId.has(id) || id === focusId) { setSheetOpen(true); return; }
    setFocusId(id);
    setTrail((t) => [...t.filter((x) => x !== id), id].slice(-4));
    setSheetOpen(true);
    setSheetExpanded(false);
    setTab("material");
    settleUntil.current = Date.now() + 3000;
  }, [index, focusId]);

  const goBack = useCallback(() => {
    if (trail.length < 2) return;
    const previous = trail[trail.length - 2];
    setTrail((t) => t.slice(0, -1));
    setFocusId(previous);
    settleUntil.current = Date.now() + 3000;
  }, [trail]);

  const onFilter = (next: MapName | null) => {
    setMap(next);
    if (next && focusCell && !focusCell.maps.some((m) => m.map === next)) {
      const first = index.graph.cells.filter((c) => c.maps.some((m) => m.map === next)).sort((a, b) => index.neighbours(b.id).length - index.neighbours(a.id).length)[0];
      if (first) focus(first.id);
    }
  };

  const results = useMemo(() => (query.trim() ? index.search(query, map).slice(0, 8) : []), [index, query, map]);
  const counts = useMemo(() => {
    const out = { art: 0, writing: 0, palettes: 0, design: 0 } as Record<MapName, number>;
    for (const cell of graph.cells) for (const m of cell.maps) out[m.map]++;
    return out;
  }, [graph]);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).tagName === "INPUT") return;
    const step = 90;
    const pan: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (pan[event.key]) { const [dx, dy] = pan[event.key]; setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy })); event.preventDefault(); return; }
    if (event.key === "+" || event.key === "=") { zoomStep(1); event.preventDefault(); }
    else if (event.key === "-" || event.key === "_") { zoomStep(-1); event.preventDefault(); }
    else if (event.key === "0") { frame(true); event.preventDefault(); }
    else if (event.key === "Backspace") { goBack(); event.preventDefault(); }
    else if (event.key === "Escape") { if (sheetExpanded) setSheetExpanded(false); else setSheetOpen(false); }
  };

  const dimmed = (cellId: string) => (map ? !index.byId.get(cellId)?.maps.some((m) => m.map === map) : false);
  const strokeW = 1.5 / camera.k;
  const dash = `${5 / camera.k} ${6 / camera.k}`;
  const showSheet = sheetOpen && focusCell;

  // ── minimap geometry ────────────────────────────────────────────────────
  const mini = (() => {
    const el = viewportRef.current;
    const W = 132;
    const H = 84;
    const b = layout.bounds;
    // World box shown: layout bounds padded so the viewport rectangle fits.
    const vw = el ? el.clientWidth / camera.k : b.w;
    const vh = el ? el.clientHeight / camera.k : b.h;
    const vx = el ? -camera.x / camera.k : b.x;
    const vy = el ? -camera.y / camera.k : b.y;
    const minX = Math.min(b.x, vx);
    const minY = Math.min(b.y, vy);
    const maxX = Math.max(b.x + b.w, vx + vw);
    const maxY = Math.max(b.y + b.h, vy + vh);
    const s = Math.min(W / (maxX - minX), H / (maxY - minY));
    const ox = (W - (maxX - minX) * s) / 2 - minX * s;
    const oy = (H - (maxY - minY) * s) / 2 - minY * s;
    return { W, H, s, ox, oy, view: { x: vx, y: vy, w: vw, h: vh } };
  })();

  const mapViewport = (
    <div
      ref={viewportRef}
      className="relative h-full w-full select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ramune)]"
      style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      tabIndex={0}
      role="application"
      aria-label="Encyclopedia map. Drag to pan, scroll to zoom, click a cell to bring it into focus."
      onKeyDown={onKey}
      {...handlers}
    >
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`, transformOrigin: "0 0", transition: animate && !reduced ? "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined, willChange: "transform" }}
      >
        {layout.focus ? (
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
            {layout.cards.filter((c) => c.role !== "focus").map((card) => {
              const { d, label } = connector(card, layout.focus!);
              const dim = dimmed(card.cell.id);
              const words = card.word.split(" ");
              const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [card.word];
              return (
                <g key={card.cell.id} opacity={dim ? 0.3 : 1}>
                  <path d={d} fill="none" stroke="color-mix(in oklch, var(--foreground) 55%, transparent)" strokeWidth={strokeW} strokeDasharray={dash} strokeLinecap="round" />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={card.side === "left" || card.side === "right" ? "middle" : "start"}
                    dominantBaseline="middle"
                    className="font-sans"
                    style={{ fontSize: 13, fill: "var(--muted-foreground)", paintOrder: "stroke", stroke: "var(--washi)", strokeWidth: 6, strokeLinejoin: "round" }}
                  >
                    {lines.map((line, i) => <tspan key={i} x={label.x} dy={i === 0 ? -(lines.length - 1) * 16 : 16}>{line}</tspan>)}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : null}

        {layout.cards.map((card) =>
          card.role === "focus" ? (
            <FocusCard
              key={card.cell.id}
              card={card}
              index={index}
              material={materials.get(card.cell.id)!}
              lod={lod}
              k={camera.k}
              onOpen={() => { setSheetOpen(true); setSheetExpanded(true); }}
              onFocus={focus}
              cardRef={setCardEl(card.cell.id)}
            />
          ) : (
            <NeighbourCard
              key={card.cell.id}
              card={card}
              material={materials.get(card.cell.id)!}
              lod={lod}
              k={camera.k}
              fixedSize={sizes.get(card.cell.id)}
              dimmed={dimmed(card.cell.id)}
              onFocus={() => { if (!dragging) focus(card.cell.id); }}
              cardRef={setCardEl(card.cell.id)}
            />
          ),
        )}
        {focusCell && layout.cards.length === 1 ? (
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-sans text-[13px] text-muted-foreground" style={{ top: layout.focus!.y + layout.focus!.h + 28 }}>
            No connections recorded for this cell yet.
          </div>
        ) : null}
      </div>

      {/* title block, on the paper */}
      <div className="pointer-events-none absolute left-0 top-0 bg-[var(--washi)] pb-4 pl-5 pr-6 pt-5 sm:pl-8 sm:pr-8 sm:pt-7" style={{ maskImage: "linear-gradient(90deg, black 85%, transparent)", WebkitMaskImage: "linear-gradient(90deg, black 85%, transparent)" }}>
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>Encyclopedia</div>
        <h1 className="mt-1 font-display text-[36px] font-bold leading-[1] tracking-[-0.03em] sm:text-[44px]">
          The <Marker color="sakura">encyclopedia</Marker>
        </h1>
        <div className="pointer-events-auto mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by map">
          <button type="button" aria-pressed={map === null} onClick={() => onFilter(null)} className="h-8 px-3 font-sans text-[14px] font-semibold shadow-[var(--shadow-sticker)] sm:h-9 sm:px-4 sm:text-[15px]" style={map === null ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>All</button>
          {MAP_NAMES_ORDER.map((name) => (
            <button key={name} type="button" aria-pressed={map === name} onClick={() => onFilter(map === name ? null : name)} disabled={!counts[name]} title={counts[name] ? `${counts[name]} cells` : "No cells on this map yet"} className="h-8 px-3 font-sans text-[14px] font-semibold shadow-[var(--shadow-sticker)] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:px-4 sm:text-[15px]" style={map === name ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>
              {MAP_LABEL[name]}
            </button>
          ))}
        </div>
      </div>

      {/* search, top right */}
      <div className="absolute right-4 top-5 hidden w-64 sm:block sm:top-7">
        <SearchBox value={query} onChange={setQuery} placeholder="Find a cell" />
        {query.trim() ? (
          <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto bg-[var(--washi)] py-1 shadow-[var(--shadow-card-hover)]">
            {results.length ? results.map((cell) => (
              <li key={cell.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => { focus(cell.id); setQuery(""); }} className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--yuzu)_22%,transparent)]">
                  <span className="font-display text-[15px] font-bold tracking-[-0.02em]">{cell.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}</span>
                </button>
              </li>
            )) : <li className="px-4 py-3 text-[14.5px] text-muted-foreground">No cell matches.</li>}
          </ul>
        ) : null}
      </div>

      {/* zoom + minimap, bottom left on desktop; zoom on the right on phones */}
      <div className={`absolute z-20 ${desktop ? "bottom-12 left-6 flex items-end gap-2" : "bottom-4 right-3"}`}>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Plus size={16} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Minus size={16} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => frame(true)} aria-label="Fit" title="Fit (0)" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Maximize2 size={15} strokeWidth={2.2} /></button>
        </div>
        {desktop ? (
          <div className="bg-[var(--washi)] p-2 shadow-[var(--shadow-sticker)]">
            <svg width={mini.W} height={mini.H} aria-hidden className="block">
              {layout.cards.map((c) => (
                <rect key={c.cell.id} x={mini.ox + c.x * mini.s} y={mini.oy + c.y * mini.s} width={Math.max(3, c.w * mini.s)} height={Math.max(3, c.h * mini.s)} fill={c.role === "focus" ? "color-mix(in oklch, var(--ramune) 30%, transparent)" : "color-mix(in oklch, var(--foreground) 14%, transparent)"} />
              ))}
              <rect x={mini.ox + mini.view.x * mini.s} y={mini.oy + mini.view.y * mini.s} width={mini.view.w * mini.s} height={mini.view.h * mini.s} fill="none" stroke="var(--ramune)" strokeWidth={1.5} />
            </svg>
            <div className="mt-1.5 flex items-center justify-between gap-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="tabular-nums">{Math.round(camera.k * 100)}%</span>
              <span>Drag to pan · Scroll to zoom</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* trail, bottom left */}
      {desktop ? (
        <div className="pointer-events-none absolute bottom-4 left-6 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="pointer-events-auto flex items-center gap-2 font-sans text-[15px]">
            <button type="button" onClick={() => { if (opening) focus(opening.id); }} className="text-foreground hover:underline">Encyclopedia</button>
            {trail.map((id) => (
              <span key={id} className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <button type="button" onClick={() => focus(id)} className={id === focusId ? "font-semibold" : "text-muted-foreground hover:text-foreground"} style={id === focusId ? { color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" } : undefined}>{index.byId.get(id)?.name}</button>
              </span>
            ))}
          </span>
          <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span style={{ color: "color-mix(in oklch, var(--sakura) 78%, var(--foreground))" }}>Draft cells</span> · Distances are schematic
          </span>
        </div>
      ) : null}
    </div>
  );

  // ── the sheet ──────────────────────────────────────────────────────────
  const desktopSheet = focusCell ? (
    <aside className="relative flex h-full flex-col overflow-y-auto px-8 pb-10 pt-6" aria-label="Cell" style={{ boxShadow: "inset 1px 0 0 color-mix(in srgb, var(--foreground) 8%, transparent)" }}>
      <span aria-hidden className="washi-tape pointer-events-none left-6 top-3" style={{ ["--strip-ink" as string]: "var(--ramune)", transform: "rotate(-4deg)", width: 66 }} />
      <div className="flex justify-end"><CloseButton onClick={() => setSheetOpen(false)} /></div>
      <div className="mt-6"><SheetTitle cell={focusCell} /></div>
      <p className="mt-4 text-[17px] leading-relaxed text-foreground">{focusCell.description || "A name and a scope. No description has been written for this cell yet."}</p>
      <SheetBody cell={focusCell} index={index} tab={tab} onTab={setTab} onFocus={focus} />
      <OpenCellButton cell={focusCell} />
    </aside>
  ) : null;

  const mobileSheet = focusCell && mounted ? createPortal(
    <div
      className="fixed inset-x-0 z-40 flex flex-col bg-[var(--washi)] shadow-[var(--shadow-card-hover)] lg:hidden"
      style={{ bottom: 64, height: sheetExpanded ? "calc(100dvh - 64px - 56px)" : 206, transition: reduced ? undefined : "height 380ms cubic-bezier(0.22,1,0.36,1)" }}
      role="dialog"
      aria-label="Cell"
    >
      <button type="button" onClick={() => setSheetExpanded((v) => !v)} aria-label={sheetExpanded ? "Collapse" : "Expand"} className="mx-auto mt-2 block h-1.5 w-16 rounded-full bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]" />
      {sheetExpanded ? (
        <>
          <div className="flex items-center justify-between px-5 pt-3">
            <button type="button" onClick={() => setSheetExpanded(false)} className="inline-flex items-center gap-2 font-sans text-[17px] text-foreground"><ArrowLeft size={18} aria-hidden /> Back to map</button>
            <CloseButton onClick={() => { setSheetExpanded(false); setSheetOpen(false); }} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">
            <SheetTitle cell={focusCell} />
            <p className="mt-4 text-[17px] leading-relaxed text-foreground">{focusCell.description || "A name and a scope. No description has been written for this cell yet."}</p>
            <SheetBody cell={focusCell} index={index} tab={tab} onTab={setTab} onFocus={focus} />
            <OpenCellButton cell={focusCell} />
          </div>
        </>
      ) : (
        <div className="px-5 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><SheetTitle cell={focusCell} size="md" /></div>
            <button type="button" onClick={() => setSheetExpanded(true)} aria-label="Expand" className="grid h-9 w-9 shrink-0 place-items-center"><ChevronUp size={22} /></button>
          </div>
          <p className="mt-2 truncate font-sans text-[15px] text-muted-foreground">{focusCell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}{focusCell.manifestations.length ? ` · ${focusCell.manifestations.length} made` : ""}</p>
          <button type="button" onClick={() => setSheetExpanded(true)} className="mt-3 flex h-12 w-full items-center justify-between bg-foreground px-5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)]">
            View cell <ArrowUpRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>,
    document.body,
  ) : null;

  const mobileClosedPill = focusCell && mounted && !sheetOpen ? createPortal(
    <button type="button" onClick={() => setSheetOpen(true)} className="fixed left-1/2 z-40 -translate-x-1/2 bg-foreground px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] lg:hidden" style={{ bottom: 76 }}>
      Show cell
    </button>,
    document.body,
  ) : null;

  return (
    <div className="relative w-full" style={{ height: desktop ? "calc(100dvh - 64px)" : "calc(100dvh - 56px - 64px)" }}>
      <div className={`grid h-full ${desktop && showSheet ? "grid-cols-[minmax(0,1fr)_440px]" : "grid-cols-1"}`} style={{ ["--sheet-w" as string]: `${SHEET_W}px` }}>
        <div className="relative min-w-0">
          {mapViewport}
          {!desktop && focusCell && sheetOpen ? <div aria-hidden style={{ height: 0 }} /> : null}
          {desktop && !sheetOpen && focusCell ? (
            <button type="button" onClick={() => setSheetOpen(true)} className="absolute right-6 top-7 h-9 bg-foreground px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)]">Show cell</button>
          ) : null}
        </div>
        {desktop && showSheet ? desktopSheet : null}
      </div>
      {!desktop && sheetOpen ? mobileSheet : null}
      {!desktop ? mobileClosedPill : null}
    </div>
  );
}
