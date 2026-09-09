"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpRight, ChevronUp, Maximize2, Minus, Plus } from "lucide-react";
import type { EncyclopediaGraph, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_LABEL, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";
import { Marker } from "@/components/page-hero";
import { RELATION_INK_VAR, SearchBox } from "./chrome";
import { SET_INK } from "./material";
import { expandCell, expandedRadius, plateConnector, SAT_W, type PlateNode } from "./graph-layout";
import { lodFor, Plate, Satellite } from "./map-cards";
import { CloseButton, IndexSheet, OpenCellButton, SheetBody, SheetTitle, type SheetTab } from "./focus-sheet";
import { EncyclopediaBrowse } from "./browse";
import { useMounted, usePanZoom, usePrefersReducedMotion, ZOOM_MAX } from "./use-pan-zoom";
import { cameraRect, SpatialIndex } from "./spatial-index";
import { disclosureLayout, branchChildren, BRANCH_PAGE } from "./disclosure";
import { CategoryCard } from "./category-node";
import "./map.css";

// The existing map and reader share an explicitly revealed graph. Expansion
// changes membership; camera zoom changes only the detail of opened topics.

/** The smallest a top-layer card may print at when the map first opens, and
 *  the smallest any card may print at before it is left off the paper. Below
 *  these a plate is a smudge and the field stops being worth looking at. */
const OVERVIEW_MIN_ZOOM = 0.65;
/** The smallest an opened record node may print at. A ring of sixty records
 *  fitted to a 390px screen puts each node at about fifteen pixels, too small
 *  to hit, so below this the ring runs off the screen and is panned instead. */
const HITTABLE_NODE_PX = 64;
/** How far outside the viewport a card is still mounted, in screen pixels. A
 *  margin means a card is on the paper slightly before it is panned into view
 *  and is not thrown away the moment it leaves, so a slow drag never shows a
 *  bare edge; a whole viewport of margin is enough for the fastest flick a
 *  finger makes and still bounds what is mounted to a constant. */
const CULL_MARGIN_PX = 420;

/** How far in the camera goes to hold an opened cell's ring. One place decides
 *  it, because the opening frame and the fit control have to agree: they drifted
 *  apart once and fit put the records below the size they can be clicked at. */
function zoomForRing(radius: number, room: { w: number; h: number }, satPx: number): number {
  const fit = Math.min(room.w, room.h) / (radius * 2);
  const floor = HITTABLE_NODE_PX / Math.max(1, satPx);
  return Math.max(floor, Math.min(1.1, fit));
}

/** Whether there is room for the map beside a sheet.
 *
 *  Read through `useSyncExternalStore` rather than set from an effect, so the
 *  first client render already knows which of the two the reader is on. With
 *  an effect the phone painted the desktop layout first and swapped it a frame
 *  later, which now means painting a whole map before replacing it with the
 *  browser. The server has no window and says desktop, as it always did. */
function useIsDesktop(): boolean {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia("(min-width: 1024px)");
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

export function EncyclopediaMap({ graph, initialCellId }: { graph: EncyclopediaGraph; initialCellId?: string | null }) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  const [openCategories, setOpenCategories] = useState<Map<MapName,number>>(()=>new Map());
  const [expanded, setExpanded] = useState<Map<string,number>>(()=>new Map());
  const [pinned, setPinned] = useState<Set<string>>(()=>new Set(initialCellId ? [initialCellId] : []));
  const layout=useMemo(()=>disclosureLayout(index,openCategories,expanded,pinned),[index,openCategories,expanded,pinned]);
  const initial=initialCellId && index.byId.has(initialCellId) ? initialCellId : null;
  const [focusId,setFocusId]=useState<string|null>(initial);
  const [sheetOpen, setSheetOpen] = useState(Boolean(initial));
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [tab, setTab] = useState<SheetTab>("material");
  // Bumped when a cell's records are opened onto the map: the sheet unfolds its
  // manifestation list to match, so the same records are readable as a list.
  const [expandKey, setExpandKey] = useState(0);
  /** The cell whose records are opened out on the paper, if any. */
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [map, setMap] = useState<MapName | null>(null);
  const [query, setQuery] = useState("");
  // Mobile opens on the canvas; Browse remains available from its toolbar.
  const [phoneView, setPhoneView] = useState<"browse" | "map">("map");
  const desktop = useIsDesktop();
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();
  const maxZoom=ZOOM_MAX;
  const { viewportRef, bindViewport, camera, setCamera, animate, dragging, draggingRef, handlers, zoomStep, glide, centerOn } = usePanZoom({x:0,y:0,k:0.8},maxZoom);
  const lod=lodFor(camera.k);

  // The viewport's size in state, kept current by a ResizeObserver. Both the
  // culling below and the minimap read it during render, so it cannot live in
  // the ref alone.
  //
  // Measured from a callback ref rather than an effect, because the map is not
  // always on the page when this component mounts: on a phone it appears only
  // when the reader asks for it. An effect keyed on the ref object ran once,
  // found nothing, and never ran again — so the phone's map had no measured
  // viewport, fell back to drawing by card size alone, and mounted every plate
  // in the library exactly as it did before any of this. The element tells us
  // when it arrives and when it leaves.
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const sizeObserver = useRef<ResizeObserver | null>(null);
  // Whether the camera has been framed yet. Declared here because the ref
  // callback below clears it: a map mounted again is framed again rather than
  // left wherever its initial camera happened to be.
  const framed = useRef(false);
  const attachViewport = useCallback((el: HTMLDivElement | null) => {
    bindViewport(el);
    sizeObserver.current?.disconnect();
    sizeObserver.current = null;
    if (!el) {
      setViewportSize({ w: 0, h: 0 });
      framed.current = false;
      return;
    }
    const measure = () =>
      setViewportSize((at) => (at.w === el.clientWidth && at.h === el.clientHeight ? at : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    sizeObserver.current = observer;
  }, [bindViewport]);
  useEffect(() => () => sizeObserver.current?.disconnect(), []);


  const plateIndex=useMemo(()=>new SpatialIndex(layout.plates,layout.bounds),[layout]);

  /** The part of the paper the camera is over, with a margin. */
  const view = useMemo(() => cameraRect(camera, viewportSize, CULL_MARGIN_PX), [camera, viewportSize]);
  /** True once the viewport has been measured. Until then the map draws by
   *  size alone, as it always did: that is the far view, a few dozen cards,
   *  and it keeps the server-rendered HTML and the first client render the
   *  same. */
  const measured = viewportSize.w > 0 && viewportSize.h > 0;

  // ── what is actually drawn ──────────────────────────────────────────────
  // Two rules, and a card has to pass both. It has to print big enough to read
  // — judge a card by its own width, not by the widest a card can be, because
  // a cell with no material draws narrower than a pictured one. And it has to
  // be somewhere near the viewport. The size rule alone mounted every plate in
  // the library at reading zoom to show the two that fit on a phone.
  const visiblePlates=useMemo(()=>measured ? plateIndex.query(view) : layout.plates,[layout.plates,plateIndex,view,measured]);
  const visibleIds=useMemo(()=>new Set(visiblePlates.map(p=>p.id)),[visiblePlates]);
  const focusCell = focusId ? index.byId.get(focusId) ?? null : null;
  const focusPlate = focusId ? layout.byId.get(focusId) ?? null : null;

  const opened = useMemo(() => {
    const plate = openedId ? layout.byId.get(openedId) : null;
    if (!plate) return null;
    // Open from the same side the folded "+N" node sat on, so the fold control
    // appears where the hand already is.
    const more = layout.satellites.find((s) => s.cellId === plate.id && s.role === "more");
    const away = more ? Math.atan2(more.y - plate.y, more.x - plate.x) : -Math.PI / 2;
    const nodes = expandCell(plate, away);
    return { plate, nodes, radius: expandedRadius(plate, nodes) };
  }, [openedId, layout]);


  // ── framing ─────────────────────────────────────────────────────────────
  const fitAll = useCallback((smooth = true) => {
    const el = viewportRef.current;
    if (!el) return;
    const vw = el.clientWidth; const vh = el.clientHeight;
    const top = desktop ? 110 : 150; const bottom = desktop ? 110 : 210; const side = desktop ? 32 : 12;
    // With a cell opened out, "fit" means that cell and its records — that is
    // what is on the paper. Framing the whole field instead would fly the
    // camera off the thing the reader just opened, which reads as a bug the
    // first time anyone opens a ring and presses 0.
    if (opened) {
      const k = zoomForRing(opened.radius, { w: vw - side * 2, h: vh - top - bottom }, SAT_W * opened.plate.scale);
      const x = vw / 2 - opened.plate.x * k;
      const y = top + (vh - top - bottom) / 2 - opened.plate.y * k;
      if (smooth) glide({ k, x, y }); else setCamera({ k, x, y });
      return;
    }
    // Otherwise fit frames the top of the hierarchy, not every cell in the
    // library: that is the layer the far view is for, and the rest arrive as
    // you come in.
    const b = layout.topBounds;
    const whole = Math.min(1, (vw - side * 2) / b.w, (vh - top - bottom) / b.h);
    // A far view you cannot read is not a far view. If holding the whole top
    // layer at once would print its cards smaller than this, the map opens at
    // the size they are legible at and the rest is a pan away — the minimap
    // says where you are. The field is then readable at every zoom, which is
    // the point of the layers.
    const k = Math.max(0.05, whole, OVERVIEW_MIN_ZOOM);
    // When the whole top layer fits, frame it. When it does not — because the
    // library has outgrown the screen and the cards would be too small to read
    // — open on where those cells actually are rather than on the middle of a
    // bounding box that is mostly the gaps between regions.
    const centred = k > whole + 1e-6;
    const cx = centred ? (layout.categories[0]?.x ?? layout.topCentre.x) : b.x + b.w / 2;
    const cy = centred ? layout.topCentre.y : b.y + b.h / 2;
    const x = vw / 2 - cx * k;
    const y = top + (vh - top - bottom) / 2 - cy * k;
    if (smooth) glide({ k, x, y }); else setCamera({ k, x, y });
  }, [viewportRef, layout.topBounds, layout.topCentre, layout.categories, opened, desktop, glide, setCamera]);

  const fitRegion = useCallback((name: MapName) => {
    const el = viewportRef.current;
    const r = layout.regions.find((rg) => rg.map === name);
    if (!el || !r) return;
    const vw = el.clientWidth; const vh = el.clientHeight;
    const top = desktop ? 150 : 176; const bottom = desktop ? 130 : 230; const side = desktop ? 48 : 12;
    const k = Math.max(0.65, Math.min(1, (vw - side * 2) / r.w, (vh - top - bottom) / r.h));
    glide({ k, x: (vw - r.w * k) / 2 - r.x * k, y: top + ((vh - top - bottom) - r.h * k) / 2 - r.y * k });
  }, [viewportRef, layout.regions, desktop, glide]);

  /** Read a topic without changing which branches the reader has expanded. */
  const frameFocus=useCallback((id:string)=>{
    const el=viewportRef.current,p=layout.byId.get(id);
    if(!el||!p)return;
    const top=desktop ? 120 : 160, bottom=desktop ? 105 : 220;
    const k=Math.min(1.2,(el.clientWidth-80)/p.w,Math.max(140,el.clientHeight-top-bottom)/p.h);
    centerOn(p.x,p.y,k,{x:el.clientWidth/2,y:top+Math.max(140,el.clientHeight-top-bottom)/2});
  },[viewportRef,layout.byId,desktop,centerOn]);

  /** The sheet is the index's scroll parent, so the windowed list can read it. */
  const sheetScrollRef = useRef<HTMLElement | null>(null);
  const mobileSheetScrollRef = useRef<HTMLDivElement | null>(null);

  // First framing happens once the viewport has a size. The flag is set when
  // the frame actually runs, so a dependency change that cancels the pending
  // frame (the desktop/phone switch on first paint) schedules it again.
  useEffect(() => {
    if (framed.current) return;
    const id = requestAnimationFrame(() => {
      // A viewport with no size cannot be framed, and latching against one
      // would leave the map wherever the initial camera happened to be. This
      // is the case when the phone opens on the browser and the map is only
      // mounted later, on request.
      const el = viewportRef.current;
      if (!el || !el.clientWidth || !el.clientHeight) return;
      framed.current = true;
      // The cell in focus, when there is one, is where the reader already is —
      // handed over by the phone browser, or named in the URL. Only an
      // unfocused map opens on the whole field.
      const target = focusId ?? initial;
      if (target) frameFocus(target); else fitAll(false);
    });
    return () => cancelAnimationFrame(id);
  }, [initial, focusId, frameFocus, fitAll, viewportRef, viewportSize]);
  useEffect(() => {
    const onResize = () => { if (!focusId) fitAll(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitAll, focusId]);

  const focus = useCallback((id: string) => {
    if (!index.byId.has(id)) return;
    if(!layout.byId.has(id))setPinned(at=>new Set([...at,id]));
    setOpenedId((open) => (open === id ? open : null));
    setFocusId(id);
    setSheetOpen(true);
    setSheetExpanded(false);
    setTab("material");
  }, [index,layout.byId]);
  useEffect(()=>{if(focusId)frameFocus(focusId);},[focusId,frameFocus]);

  /** One handler for every card on the paper. It reads whether the pointer was
   *  dragged from a ref rather than from state, so its identity never changes
   *  and a memoised card is not re-rendered by the act of panning past it. */
  const focusUnlessDragging = useCallback((id: string) => { if (!draggingRef.current) focus(id); }, [focus, draggingRef]);

  const clearFocus = useCallback(() => { setFocusId(null); setSheetExpanded(false); setOpenedId(null); }, []);

  const toggleCategory=useCallback((name:MapName)=>{
    setOpenCategories(at=>{const next=new Map(at);if(next.has(name))next.delete(name);else next.set(name,BRANCH_PAGE);return next;});
    setPinned(at=>new Set([...at].filter(id=>{const c=index.byId.get(id);return c&&index.primaryMap(c)!==name;})));
    setFocusId(null);setOpenedId(null);setSheetOpen(false);
    setMap(name);
  },[index]);
  const moreCategory=useCallback((name:MapName)=>setOpenCategories(at=>new Map(at).set(name,(at.get(name)??0)+BRANCH_PAGE)),[]);
  const toggleBranch=useCallback((id:string)=>{
    setExpanded(at=>{const next=new Map(at);if(next.has(id))next.delete(id);else next.set(id,BRANCH_PAGE);return next;});
    setFocusId(id);setOpenedId(null);
  },[]);
  const moreBranch=useCallback((id:string)=>setExpanded(at=>new Map(at).set(id,(at.get(id)??0)+BRANCH_PAGE)),[]);
  const onFilter=(name:MapName|null)=>{
    setMap(name);
    if(name){setOpenCategories(at=>new Map(at).set(name,Math.max(BRANCH_PAGE,at.get(name)??0)));setFocusId(null);}
    else {setOpenCategories(new Map());setExpanded(new Map());setPinned(new Set());clearFocus();setSheetOpen(false);}
  };
  useEffect(()=>{
    if(focusId)return;
    if(map)fitRegion(map);else fitAll(false);
  },[layout,map,focusId,fitRegion,fitAll]);
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
    else if (event.key === "0") { fitAll(); event.preventDefault(); }
    else if (event.key === "Escape") { if (openedId) setOpenedId(null); else if (sheetExpanded) setSheetExpanded(false); else if (focusId) clearFocus(); }
  };

  const manifestationsById=useMemo(()=>new Map(graph.cells.map(c=>[c.id,c.manifestations])),[graph]);

  /** Open a cell's records onto the map, frame them, and unfold the same list
   *  in the sheet. Clicking the fold node puts them away again. */
  const toggleOpen = useCallback((cellId: string) => {
    if (openedId === cellId) { setOpenedId(null); return; }
    setOpenedId(cellId);
    setFocusId(cellId);
    setSheetOpen(true);
    setTab("material");
    setExpandKey((n) => n + 1);
  }, [openedId]);

  // Pull the camera back far enough to hold the whole opened cell, once the
  // ring for it exists.
  useEffect(() => {
    const el = viewportRef.current;
    if (!opened || !el) return;
    const room = desktop ? 120 : 200;
    const k = zoomForRing(opened.radius, { w: el.clientWidth - room, h: el.clientHeight - room }, SAT_W * opened.plate.scale);
    centerOn(opened.plate.x, opened.plate.y, k, { x: el.clientWidth / 2, y: el.clientHeight / 2 });
    // Framing belongs to the act of opening a cell, not to every camera move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened?.plate.id]);

  // Everything below is drawn INSIDE the layer the camera scales, so a value
  // written in world units is multiplied by the zoom on the way to the screen.
  // Each one therefore divides by it to come out the size it says. The floors
  // here were set when the camera stopped at 3.2; the ceiling is now derived
  // from the library's depth and reaches 8, where a 1.2 floor draws a line at
  // ten screen pixels and a 13px word at a hundred and four.
  const strokeW = 1.5 / camera.k;
  const labelPx = 13 / camera.k;
  const labelHalo = 6 / camera.k;
  const dash = `${5 / camera.k} ${6 / camera.k}`;
  const dots = `${1.5 / camera.k} ${5 / camera.k}`;
  const showWords = camera.k >= 0.45;
  // A line carries its word only when it touches the cell in focus, or when
  // the pointer is on it. With hundreds of cells on the paper, labelling every
  // edge printed "narrower cell" dozens of times at the same weight as the
  // cell names, and the eye read the connective tissue instead of the cells.
  // The ink already says what kind of relation a line is; the legend in the
  // bottom bar says what the inks mean.
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const wordFor = (key: string, a: string, b: string) =>
    showWords && (hoverEdge === key || (focusId !== null && (a === focusId || b === focusId)));

  // ── minimap ─────────────────────────────────────────────────────────────
  // The minimap's own geometry depends on the field, not on the camera, so it
  // is settled once. Fitting it to the union of the field and the viewport
  // instead — as it was — rescaled the whole minimap on every pan, which both
  // redrew every plate in the library each frame and made the field itself
  // drift under the reader while they were using it to keep their place.
  const MINI_W = 132;
  const MINI_H = 84;
  const miniField = useMemo(() => {
    // An opened ring reaches past the plate it belongs to, so the paper the
    // minimap draws has to include it.
    const field = layout.bounds;
    if (!opened) return field;
    const x = Math.min(field.x, opened.plate.x - opened.radius);
    const y = Math.min(field.y, opened.plate.y - opened.radius);
    return {
      x,
      y,
      w: Math.max(field.x + field.w, opened.plate.x + opened.radius) - x,
      h: Math.max(field.y + field.h, opened.plate.y + opened.radius) - y,
    };
  }, [layout.bounds, opened]);
  const miniGeometry = useMemo(() => {
    const s = Math.min(MINI_W / Math.max(1, miniField.w), MINI_H / Math.max(1, miniField.h));
    return {
      s,
      ox: (MINI_W - miniField.w * s) / 2 - miniField.x * s,
      oy: (MINI_H - miniField.h * s) / 2 - miniField.y * s,
    };
  }, [miniField]);
  const mini = (() => {
    const { s, ox, oy } = miniGeometry;
    const has = viewportSize.w > 0;
    const vw = has ? viewportSize.w / camera.k : miniField.w;
    const vh = has ? viewportSize.h / camera.k : miniField.h;
    const vx = has ? -camera.x / camera.k : miniField.x;
    const vy = has ? -camera.y / camera.k : miniField.y;
    // Panned off the edge of the field, the rectangle stays on the minimap
    // rather than sliding off it: it is there to say where you are looking,
    // and a rectangle drawn outside the paper says nothing.
    const clamp = (lo: number, hi: number, at: number) => Math.max(lo, Math.min(hi, at));
    const cx = clamp(miniField.x, miniField.x + Math.max(0, miniField.w - vw), vx);
    const cy = clamp(miniField.y, miniField.y + Math.max(0, miniField.h - vh), vy);
    return { W: MINI_W, H: MINI_H, s, ox, oy, view: { x: cx, y: cy, w: Math.min(vw, miniField.w), h: Math.min(vh, miniField.h) } };
  })();

  /** The field on the minimap. Static for a given layout, so panning and
   *  zooming redraw one rectangle rather than one per cell in the library. */
  const miniPlates = useMemo(
    () => (
      <>
        {[...layout.categories.map(h=>({...h,id:h.map})),...layout.plates].map((p) => (
          <rect
            key={p.id}
            x={miniGeometry.ox + (p.x - p.w / 2) * miniGeometry.s}
            y={miniGeometry.oy + (p.y - p.h / 2) * miniGeometry.s}
            width={Math.max(2.5, p.w * miniGeometry.s)}
            height={Math.max(2.5, p.h * miniGeometry.s)}
            fill="color-mix(in oklch, var(--foreground) 22%, transparent)"
          />
        ))}
      </>
    ),
    [layout.plates, layout.categories, miniGeometry],
  );

  const relationLines = useMemo(() => index.relationLines.filter((l) => visibleIds.has(l.a) && visibleIds.has(l.b)), [index, visibleIds]);
  const broaderEdges = useMemo(() => index.edges.filter((e) => e.kind === "broader" && visibleIds.has(e.from) && visibleIds.has(e.to)), [index, visibleIds]);

  const mapViewport = (
    <div
      ref={attachViewport}
      className="relative h-full w-full select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ramune)]"
      style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
      tabIndex={0}
      role="application"
      aria-label="Encyclopedia map. Drag to pan, scroll to zoom, click a cell to focus it."
      onKeyDown={onKey}
      {...handlers}
    >
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`, transformOrigin: "0 0", transition: animate && !reduced ? "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined, willChange: "transform" }}
      >
        {layout.categories.map(node=><CategoryCard key={node.map} node={node} onToggle={toggleCategory} onMore={moreCategory}/>)}
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          {!opened && layout.categories.flatMap(h=>h.rootIds.map(id=>{
            const p=layout.byId.get(id);if(!p)return null;
            return <path key={h.map+id} d={`M ${h.x+h.w/2} ${h.y} C ${h.x+240} ${h.y}, ${p.x-220} ${p.y}, ${p.x-p.w/2} ${p.y}`} fill="none" stroke="var(--ramune)" strokeWidth={strokeW} strokeDasharray={dash}/>;
          }))}
          {/* broader → narrower */}
          {!opened && broaderEdges.map((e) => {
            const a = layout.byId.get(e.from)!; const b = layout.byId.get(e.to)!;
            const { d, label } = plateConnector(a, b);
            const key = `${e.from}-${e.to}`;
            return (
              <g key={key}>
                <path d={d} fill="none" stroke="color-mix(in oklch, var(--foreground) 55%, transparent)" strokeWidth={strokeW * 1.1} strokeDasharray={dash} strokeLinecap="round" />
                {/* A wide invisible stroke so the thin dashed line is still
                    easy to put the pointer on. */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={strokeW * 12} style={{ pointerEvents: "stroke" }} onMouseEnter={() => setHoverEdge(key)} onMouseLeave={() => setHoverEdge((at) => (at === key ? null : at))} />
                {wordFor(key, e.from, e.to) ? <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="font-sans" style={{ fontSize: labelPx, fill: "var(--muted-foreground)", paintOrder: "stroke", stroke: "var(--washi)", strokeWidth: labelHalo, strokeLinejoin: "round" }}>narrower cell</text> : null}
              </g>
            );
          })}
          {/* typed relations */}
          {!opened && relationLines.map((line) => {
            const a = layout.byId.get(line.a)!; const b = layout.byId.get(line.b)!;
            const { d, label } = plateConnector(a, b);
            const ink = RELATION_INK_VAR[line.ink];
            const word = line.entries.length === 1 ? line.entries[0].label : line.entries.map((e) => e.label).join(" / ");
            return (
              <g key={line.key}>
                <path d={d} fill="none" stroke={ink} strokeWidth={strokeW * 1.3} strokeDasharray={dash} strokeLinecap="round" style={{ mixBlendMode: "var(--ink-blend)" as never }} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={strokeW * 12} style={{ pointerEvents: "stroke" }} onMouseEnter={() => setHoverEdge(line.key)} onMouseLeave={() => setHoverEdge((at) => (at === line.key ? null : at))} />
                {wordFor(line.key, line.a, line.b) ? <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="font-sans" style={{ fontSize: labelPx, fill: `color-mix(in oklch, ${ink} 70%, var(--foreground))`, paintOrder: "stroke", stroke: "var(--washi)", strokeWidth: labelHalo, strokeLinejoin: "round" }}>{word}</text> : null}
              </g>
            );
          })}
        </svg>

        {/* An opened cell's records, drawn after the plates so its nodes and
            its dotted lines are never behind a neighbouring card. */}
        {opened ? (
          <div className="pointer-events-none absolute left-0 top-0 h-0 w-0" style={{ zIndex: 5 }}>
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
              {opened.nodes.map((s) => {
                const p = opened.plate;
                const dx = s.x - p.x; const dy = s.y - p.y;
                const span = Math.max(Math.abs(dx) / (p.w / 2), Math.abs(dy) / (p.h / 2), 0.0001);
                return (
                  <line
                    key={s.id}
                    x1={p.x + dx / span} y1={p.y + dy / span} x2={s.x} y2={s.y}
                    stroke={`color-mix(in oklch, ${SET_INK[s.set]} 60%, var(--foreground))`}
                    strokeWidth={strokeW} strokeDasharray={dots} strokeLinecap="round"
                  />
                );
              })}
            </svg>
            <div className="pointer-events-auto">
              {opened.nodes.map((s) => (
                <Satellite
                  key={s.id}
                  node={s}
                  manifestation={s.role === "record" ? manifestationsById.get(s.cellId)?.[s.index] ?? null : null}
                  k={camera.k}
                  dimmed={false}
                  // With a few nodes open the names fit beside them; with fifty
                  // they would bury the ring, so the labels stand down and the
                  // sheet carries the list.
                  labelled={lod !== "picture" && opened.nodes.length <= 14}
                  onToggle={toggleOpen}
                />
              ))}
            </div>
          </div>
        ) : null}
        {visiblePlates.map((p: PlateNode) => (
          <Plate
            key={p.id}
            cell={p.cell}
            x={p.x}
            y={p.y}
            level={p.level}
            scale={p.scale}
            lod={expanded.has(p.id) ? lodFor(camera.k*p.scale) : "named"}
            size={{w:p.w/p.scale,h:p.h/p.scale}}
            k={camera.k}
            focused={focusId === p.id}
            dimmed={false}
            onFocus={focusUnlessDragging}
          />
        ))}
        {visiblePlates.map(p=>{
          const children=branchChildren(index,p.id),limit=expanded.get(p.id)??0;
          return <div key={p.id+"controls"} data-map-control className="encyclopedia-node-controls" style={{left:p.x-p.w/2,top:p.y+p.h/2+8}}>
            {children.length>0 ? <button aria-label={`${limit ? "Collapse":"Expand"} ${p.cell.name} connections`} aria-expanded={limit>0} onClick={()=>toggleBranch(p.id)}>{limit ? "Collapse −":`Expand ${children.length} +`}</button> : <button aria-expanded={limit>0} onClick={()=>toggleBranch(p.id)}>{limit ? "Less detail":"More detail"}</button>}
            {limit>0&&limit<children.length ? <button onClick={()=>moreBranch(p.id)}>+{Math.min(BRANCH_PAGE,children.length-limit)} more</button> : null}
            {p.cell.manifestations.length ? <button aria-expanded={openedId===p.id} onClick={()=>toggleOpen(p.id)}>{openedId===p.id ? "Hide records":`Related records ${new Set(p.cell.manifestations.map(m=>m.entitySet+":"+m.entityId)).size}`}</button> : null}
          </div>;
        })}
      </div>

      <div data-map-control className="encyclopedia-toolbar">
        <h1 className="font-display font-bold">The <Marker color="sakura">encyclopedia</Marker></h1>
        <div role="group" aria-label="Filter by map">
          {!desktop ? <button onClick={()=>setPhoneView("browse")}>Browse</button> : null}
          <button aria-pressed={map===null} onClick={()=>onFilter(null)}>Overview</button>
          {MAP_NAMES_ORDER.map(name=><button key={name} aria-pressed={map===name} disabled={!counts[name]} onClick={()=>onFilter(name)}>{MAP_LABEL[name]}</button>)}
        </div>
      </div>

      {/* search, top right */}
      <div data-map-control className="encyclopedia-search">
        <SearchBox value={query} onChange={setQuery} placeholder="Find a cell" />
        {query.trim() ? (
          <ul data-map-scroll role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto bg-[var(--washi)] py-1 shadow-[var(--shadow-card-hover)]">
            {results.length ? results.map((cell) => (
              <li key={cell.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => { focus(cell.id); setQuery(""); }} className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--yuzu)_22%,transparent)]">
                  <span className="font-display text-[16px] font-bold tracking-[-0.02em]">{cell.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}</span>
                </button>
              </li>
            )) : <li className="px-4 py-3 text-[16px] text-muted-foreground">No cell matches.</li>}
          </ul>
        ) : null}
      </div>

      {/* zoom + minimap */}
      <div data-map-control style={!desktop ? {bottom:focusCell ? 222 : 136}:undefined} className={`absolute z-20 ${desktop ? "bottom-12 left-6 flex items-end gap-2" : "right-3"}`}>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Plus size={16} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Minus size={16} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => fitAll()} aria-label="Fit overview" title="Fit (0)" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Maximize2 size={15} strokeWidth={2.2} /></button>
        </div>
        {desktop ? (
          <div className="bg-[var(--washi)] p-2 shadow-[var(--shadow-sticker)]">
            <svg width={mini.W} height={mini.H} aria-hidden className="block">
              {miniPlates}
              {focusPlate ? (
                <rect
                  x={mini.ox + (focusPlate.x - focusPlate.w / 2) * mini.s}
                  y={mini.oy + (focusPlate.y - focusPlate.h / 2) * mini.s}
                  width={Math.max(2.5, focusPlate.w * mini.s)}
                  height={Math.max(2.5, focusPlate.h * mini.s)}
                  fill="var(--ramune)"
                />
              ) : null}
              {/* An opened cell's records are on the paper too, so they are on
                  the minimap: a ring around the cell you opened, in the same
                  ink as the cell itself. */}
              {opened?.nodes.map((n) => (
                <rect key={`mini-${n.id}`} x={mini.ox + n.x * mini.s - 1} y={mini.oy + n.y * mini.s - 1} width={2} height={2} fill="var(--ramune)" />
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

      <div className="encyclopedia-legend">{opened ? `Related records of ${opened.plate.cell.name} · hide records to return to topic connections` : `${visiblePlates.length} topics visible · expand a branch to reveal connections · scroll to zoom`}{graph.withheld ? ` · ${graph.withheld} withheld` : ""}</div>
    </div>
  );

  // ── the sheet ──────────────────────────────────────────────────────────
  // The index is windowed against whichever element is actually scrolling it,
  // and that is a different element in the sheet beside the map and in the
  // sheet on a phone. Passing the desktop one to both left the phone's index
  // stuck at the two dozen rows it starts with.
  const sheetContent = (scrollRef: React.RefObject<HTMLElement | null>) =>
    focusCell ? (
      <>
        <div className="mt-6"><SheetTitle cell={focusCell} /></div>
        <p className="mt-4 text-[17px] leading-relaxed text-foreground">{focusCell.description || "A name and a scope. No description has been written for this cell yet."}</p>
        <SheetBody cell={focusCell} index={index} tab={tab} onTab={setTab} onFocus={focus} expandKey={expandKey} />
        <OpenCellButton cell={focusCell} />
      </>
    ) : (
      <IndexSheet index={index} onFocus={focus} scrollRef={scrollRef} />
    );

  const desktopSheet = (
    <aside key={focusId??"index"} ref={sheetScrollRef} className="relative flex h-full flex-col overflow-y-auto px-8 pb-10 pt-6" aria-label="Cell">
      {/* The sheet's edge is the house die-cut perforation, not a grey rule. */}
      <span aria-hidden className="sticker-perforation-y pointer-events-none absolute inset-y-0 left-0" />
      <span aria-hidden className="washi-tape pointer-events-none left-6 top-3" style={{ ["--strip-ink" as string]: "var(--ramune)", transform: "rotate(-4deg)", width: 66 }} />
      <div className="flex justify-end">{focusCell ? <CloseButton onClick={clearFocus} /> : <CloseButton onClick={() => setSheetOpen(false)} />}</div>
      {sheetContent(sheetScrollRef)}
    </aside>
  );

  const mobileSheet = mounted ? createPortal(
    <div
      className="fixed inset-x-0 z-40 flex flex-col bg-[var(--washi)] shadow-[var(--shadow-card-hover)] lg:hidden"
      style={{ bottom: 64, height: sheetExpanded ? "calc(100dvh - 64px - 56px)" : focusCell ? 206 : 120, transition: reduced ? undefined : "height 380ms cubic-bezier(0.22,1,0.36,1)" }}
      role="dialog"
      aria-label="Cell"
    >
      <button type="button" onClick={() => setSheetExpanded((v) => !v)} aria-label={sheetExpanded ? "Collapse" : "Expand"} className="mx-auto mt-2 block h-1.5 w-16 bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]" />
      {sheetExpanded ? (
        <>
          <div className="flex items-center justify-between px-5 pt-3">
            <button type="button" onClick={() => setSheetExpanded(false)} className="inline-flex items-center gap-2 font-sans text-[17px] text-foreground"><ArrowLeft size={18} aria-hidden /> Back to map</button>
            {focusCell ? <CloseButton onClick={clearFocus} /> : null}
          </div>
          <div ref={mobileSheetScrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">{sheetContent(mobileSheetScrollRef)}</div>
        </>
      ) : focusCell ? (
        <div className="px-5 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><SheetTitle cell={focusCell} size="md" /></div>
            <button type="button" onClick={() => setSheetExpanded(true)} aria-label="Expand" className="grid h-9 w-9 shrink-0 place-items-center"><ChevronUp size={22} /></button>
          </div>
          <p className="mt-2 truncate font-sans text-[16px] text-muted-foreground">{focusCell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}{focusCell.manifestations.length ? ` · ${focusCell.manifestations.length} made` : ""}</p>
          <button type="button" onClick={() => setSheetExpanded(true)} className="mt-3 flex h-12 w-full items-center justify-between bg-foreground px-5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)]">
            View cell <ArrowUpRight size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setSheetExpanded(true)} className="flex flex-1 items-center justify-between px-5 pb-4 pt-3 text-left">
          <span>
            <span className="block font-display text-[20px] font-bold tracking-[-0.02em]">{graph.cells.length} cells</span>
            <span className="mt-0.5 block font-sans text-[16px] text-muted-foreground">Tap a cell on the map, or open the index.</span>
          </span>
          <ChevronUp size={22} aria-hidden />
        </button>
      )}
    </div>,
    document.body,
  ) : null;

  const showMap = desktop || phoneView === "map";

  return (
    <div className="encyclopedia-workspace relative w-full" style={{ height: desktop ? "calc(100dvh - 64px)" : "calc(100dvh - 56px - 64px)" }}>
      {!desktop && phoneView === "browse" ? (
        <EncyclopediaBrowse
          index={index}
          focusId={focusId}
          onFocus={focus}
          onClearFocus={clearFocus}
          onShowMap={(cellId) => {
            // Carry the cell the reader is on across the seam. Tapping MAP and
            // landing somewhere else breaks the one thing the two views owe
            // each other: reading a cell without losing your place.
            if (cellId) { setPinned(at=>new Set([...at,cellId]));setFocusId(cellId); setSheetOpen(true); }
            setPhoneView("map");
          }}
          map={map}
          onMap={setMap}
          counts={counts}
          withheld={graph.withheld}
        />
      ) : null}
      {showMap ? (
        <div className={`grid h-full ${desktop && sheetOpen ? "grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"}`}>
          <div className="relative min-w-0">
            {mapViewport}
            {desktop && !sheetOpen ? (
              <button type="button" onClick={() => setSheetOpen(true)} className="absolute right-6 top-7 h-9 bg-foreground px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)]">Show sheet</button>
            ) : null}
          </div>
          {desktop && sheetOpen ? desktopSheet : null}
        </div>
      ) : null}
      {!desktop && phoneView === "map" ? mobileSheet : null}
    </div>
  );
}

