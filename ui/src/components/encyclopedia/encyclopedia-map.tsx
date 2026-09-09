"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpRight, ChevronUp, List, Maximize2, Minus, Plus } from "lucide-react";
import type { EncyclopediaGraph, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_INK, MAP_LABEL, MAP_NAMES_ORDER, type RelationInk } from "@/lib/encyclopedia-graph";
import { Marker } from "@/components/page-hero";
import { RELATION_INK_VAR, SearchBox } from "./chrome";
import { SET_INK } from "./material";
import { expandCell, expandedRadius, layoutFromSeed, levelScale, PLATE_W, plateConnector, SAT_H, SAT_W, type LayoutSeed, type PlateNode, type SatelliteNode } from "./graph-layout";
import { lodFor, Plate, Satellite } from "./map-cards";
import { CloseButton, IndexSheet, OpenCellButton, SheetBody, SheetTitle, type SheetTab } from "./focus-sheet";
import { EncyclopediaBrowse } from "./browse";
import { useMounted, usePanZoom, usePrefersReducedMotion, ZOOM_MAX } from "./use-pan-zoom";
import { cameraRect, SpatialIndex } from "./spatial-index";

// The encyclopedia: one map of every attested cell. Cells are plates grouped
// by map; broader and typed relations are dashed lines with the word on them;
// each cell's manifestations are small satellites on dotted lines. Zoomed out
// the field is pictures; zooming in adds the words. Clicking a cell focuses
// it: the camera moves to it and the sheet opens. The map never changes shape.

/** The smallest a top-layer card may print at when the map first opens, and
 *  the smallest any card may print at before it is left off the paper. Below
 *  these a plate is a smudge and the field stops being worth looking at. */
const READABLE_PLATE_PX = 104;
const READABLE_CARD_PX = 44;
/** The smallest an opened record node may print at. A ring of sixty records
 *  fitted to a 390px screen puts each node at about fifteen pixels, too small
 *  to hit, so below this the ring runs off the screen and is panned instead. */
const HITTABLE_NODE_PX = 34;
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

export function EncyclopediaMap({ graph, layout: seed, initialCellId }: { graph: EncyclopediaGraph; layout: LayoutSeed; initialCellId?: string | null }) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  // Settled on the server; here the cells are put back on the geometry, which
  // is linear in the number of cells rather than the seconds a full layout
  // takes. Nothing about the field changes — it is the same pure function's
  // output, computed once.
  const layout = useMemo(() => layoutFromSeed(seed, index), [seed, index]);
  const initial = initialCellId && layout.byId.has(initialCellId) ? initialCellId : null;
  const [focusId, setFocusId] = useState<string | null>(initial);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [tab, setTab] = useState<SheetTab>("material");
  // Bumped when a cell's records are opened onto the map: the sheet unfolds its
  // manifestation list to match, so the same records are readable as a list.
  const [expandKey, setExpandKey] = useState(0);
  /** The cell whose records are opened out on the paper, if any. */
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [map, setMap] = useState<MapName | null>(null);
  const [query, setQuery] = useState("");
  // What the phone is showing. The browser is the way in — see `browse.tsx`
  // for why — and the map is a tap away from it and a tap back. On a desktop
  // this is not read at all: there the map has the room it needs.
  const [phoneView, setPhoneView] = useState<"browse" | "map">("browse");
  const desktop = useIsDesktop();
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();
  // Reading a card means seeing it at the size it was designed at, so the
  // camera must be able to reach 1 / scale for the deepest layer the library
  // has. With four layers that is a zoom of 8, well past the default ceiling —
  // and without it the text on a deep cell never becomes legible however far
  // in you go, which would make the whole premise of the layers false.
  const deepestLevel = useMemo(() => seed.plates.reduce((d, p) => Math.max(d, p.level), 0), [seed]);
  const maxZoom = Math.max(ZOOM_MAX, 1 / levelScale(deepestLevel) * 1.25);
  const { viewportRef, camera, setCamera, animate, dragging, draggingRef, handlers, zoomStep, glide, centerOn } = usePanZoom({ x: 0, y: 0, k: 0.2 }, maxZoom);
  const lod = lodFor(camera.k);

  // The viewport's size in state, kept current by a ResizeObserver. Both the
  // culling below and the minimap read it during render, so it cannot live in
  // the ref alone.
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportSize((at) => (at.w === el.clientWidth && at.h === el.clientHeight ? at : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewportRef]);


  // ── one layer at a time ────────────────────────────────────────────────
  // A cell is drawn once its card would actually print big enough to read.
  // Because each layer draws at half the size of the one above it, that single
  // rule reveals the map a layer at a time: the top of the field from far out,
  // the next layer when the camera has come in by a factor of two, and so on.
  // Cells below the drawn layers are still on the map and still reachable — by
  // zooming, by search, or by focusing a cell above them — they are simply not
  // all drawn at once. Five hundred cells at one size is a mesh.
  // The paper indexed by where things are, built once per settled field. Both
  // queries below are answered in time proportional to what is on screen, so
  // the map costs the same over five thousand cells as over five hundred.
  const plateIndex = useMemo(() => new SpatialIndex(layout.plates, layout.bounds), [layout]);
  const satelliteBoxes = useMemo(
    () => layout.satellites.map((node) => ({ x: node.x, y: node.y, w: SAT_W * node.scale, h: SAT_H * node.scale, node })),
    [layout.satellites],
  );
  const satelliteIndex = useMemo(() => new SpatialIndex(satelliteBoxes, layout.bounds), [satelliteBoxes, layout.bounds]);

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
  const visiblePlates = useMemo(() => {
    const readable = (p: PlateNode) => camera.k * p.w >= READABLE_CARD_PX;
    if (!measured) return layout.plates.filter(readable);
    return plateIndex.query(view).filter(readable);
  }, [layout.plates, plateIndex, view, camera.k, measured]);
  const visibleIds = useMemo(() => new Set(visiblePlates.map((p) => p.id)), [visiblePlates]);
  /** The deepest layer the camera has reached, and how many the library has.
   *  Read from the zoom rather than from what happens to be on screen, so
   *  panning at a fixed zoom does not make the readout flicker between layers
   *  as cards of different sizes come and go. */
  const levels = useMemo(() => layout.plates.reduce((d, p) => Math.max(d, p.level), 0), [layout.plates]);
  const deepestShown = useMemo(() => {
    let deepest = 0;
    for (let level = 0; level <= levels; level++) {
      if (camera.k * PLATE_W * levelScale(level) >= READABLE_CARD_PX) deepest = level;
    }
    return deepest;
  }, [camera.k, levels]);

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
    const top = desktop ? 118 : 176; const bottom = desktop ? 104 : 230; const side = desktop ? 32 : 12;
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
    const k = Math.max(0.05, whole, READABLE_PLATE_PX / PLATE_W);
    // When the whole top layer fits, frame it. When it does not — because the
    // library has outgrown the screen and the cards would be too small to read
    // — open on where those cells actually are rather than on the middle of a
    // bounding box that is mostly the gaps between regions.
    const centred = k > whole + 1e-6;
    const cx = centred ? layout.topCentre.x : b.x + b.w / 2;
    const cy = centred ? layout.topCentre.y : b.y + b.h / 2;
    const x = vw / 2 - cx * k;
    const y = top + (vh - top - bottom) / 2 - cy * k;
    if (smooth) glide({ k, x, y }); else setCamera({ k, x, y });
  }, [viewportRef, layout.topBounds, layout.topCentre, opened, desktop, glide, setCamera]);

  const fitRegion = useCallback((name: MapName) => {
    const el = viewportRef.current;
    const r = layout.regions.find((rg) => rg.map === name);
    if (!el || !r) return;
    const vw = el.clientWidth; const vh = el.clientHeight;
    const top = desktop ? 150 : 176; const bottom = desktop ? 130 : 230; const side = desktop ? 48 : 12;
    const k = Math.max(0.05, Math.min(1, (vw - side * 2) / r.w, (vh - top - bottom) / r.h));
    glide({ k, x: (vw - r.w * k) / 2 - r.x * k, y: top + ((vh - top - bottom) - r.h * k) / 2 - r.y * k });
  }, [viewportRef, layout.regions, desktop, glide]);

  /** Bring a plate to the reading layer, centred in the room the sheet leaves. */
  const frameFocus = useCallback((id: string) => {
    const el = viewportRef.current;
    const p = layout.byId.get(id);
    if (!el || !p) return;
    // Come in far enough that the card reads, not merely far enough that it is
    // drawn. A cell on a lower layer draws at a fraction of full size, so its
    // 22px title only reaches 22px on screen at 1 / scale; stopping at the
    // threshold that makes it visible left that title at about three pixels.
    const k = Math.min(maxZoom, Math.max(camera.k, 1 / p.scale));
    if (desktop) centerOn(p.x, p.y, k, { x: el.clientWidth / 2, y: el.clientHeight / 2 + 30 });
    else {
      const fit = Math.min(k, (el.clientWidth - 40) / p.w);
      centerOn(p.x, p.y, fit, { x: el.clientWidth / 2, y: 196 + p.h * 0.5 * fit - 40 });
    }
  }, [viewportRef, layout.byId, camera.k, desktop, centerOn, maxZoom]);

  // First framing happens once the viewport has a size. The flag is set when
  // the frame actually runs, so a dependency change that cancels the pending
  // frame (the desktop/phone switch on first paint) schedules it again.
  /** The sheet is the index's scroll parent, so the windowed list can read it. */
  const sheetScrollRef = useRef<HTMLElement | null>(null);
  const mobileSheetScrollRef = useRef<HTMLDivElement | null>(null);

  const framed = useRef(false);
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
      if (initial) frameFocus(initial); else fitAll(false);
    });
    return () => cancelAnimationFrame(id);
  }, [initial, frameFocus, fitAll, viewportRef, viewportSize]);
  useEffect(() => {
    const onResize = () => { if (!focusId) fitAll(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitAll, focusId]);

  const focus = useCallback((id: string) => {
    if (!layout.byId.has(id)) return;
    setOpenedId((open) => (open === id ? open : null));
    setFocusId(id);
    setSheetOpen(true);
    setSheetExpanded(false);
    setTab("material");
    frameFocus(id);
  }, [layout.byId, frameFocus]);

  /** One handler for every card on the paper. It reads whether the pointer was
   *  dragged from a ref rather than from state, so its identity never changes
   *  and a memoised card is not re-rendered by the act of panning past it. */
  const focusUnlessDragging = useCallback((id: string) => { if (!draggingRef.current) focus(id); }, [focus, draggingRef]);

  const clearFocus = useCallback(() => { setFocusId(null); setSheetExpanded(false); setOpenedId(null); }, []);

  const onFilter = (next: MapName | null) => {
    setMap(next);
    if (next) fitRegion(next); else fitAll();
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
    else if (event.key === "0") { fitAll(); event.preventDefault(); }
    else if (event.key === "Escape") { if (openedId) setOpenedId(null); else if (sheetExpanded) setSheetExpanded(false); else if (focusId) clearFocus(); }
  };

  // ── emphasis ────────────────────────────────────────────────────────────
  const neighbourIds = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const n of index.neighbours(focusId)) set.add(n.cell.id);
    return set;
  }, [index, focusId]);
  const dimmedPlate = (id: string) => {
    const cell = index.byId.get(id)!;
    if (map && !cell.maps.some((m) => m.map === map)) return true;
    return false;
  };
  // With a cell opened out, the paper around it steps back so the ring of
  // records reads as one thing rather than as nodes scattered over neighbours.
  const faded = (id: string) => (opened ? id !== opened.plate.id : Boolean(neighbourIds && lod === "reading" && !neighbourIds.has(id)));
  const manifestationsById = useMemo(() => new Map(graph.cells.map((c) => [c.id, c.manifestations])), [graph]);

  // ── opening a cell's records onto the paper ─────────────────────────────
  // The map's own shape never changes: opening a cell swaps that one cell's
  // ring for a full set of record nodes around the same plate, and leaves
  // every other plate and satellite exactly where it settled.
  /** The settled map minus the cell that is currently opened out — its own
   *  nodes are drawn separately, above the plates. */
  // Dimming has two strengths. Fading a non-neighbour at the reading layer is
  // a hint, so it stays legible; stepping the paper back behind an opened cell
  // has to stop neighbouring names and scope text reading through the gaps
  // between its nodes, or the ring looks like noise rather than one object.
  const dimTo = opened ? 0.08 : 0.3;

  const baseSatellites: SatelliteNode[] = useMemo(
    () => {
      // A record node belongs to a cell that is drawn, and is itself near the
      // viewport. The second test matters at the reading layer, where a cell's
      // ring can reach well outside the screen its plate is on.
      const near = measured ? satelliteIndex.query(view).map((b) => b.node) : layout.satellites;
      const drawn = near.filter((sat) => visibleIds.has(sat.cellId));
      return opened ? drawn.filter((sat) => sat.cellId !== opened.plate.id) : drawn;
    },
    [layout.satellites, satelliteIndex, view, measured, opened, visibleIds],
  );
  const shownRecords = (opened ? baseSatellites.concat(opened.nodes) : layout.satellites).filter((s) => s.role === "record").length;

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

  const strokeW = Math.max(1.2, 1.5 / camera.k);
  const dash = `${5 / camera.k} ${6 / camera.k}`;
  const dots = `${1.5 / camera.k} ${5 / camera.k}`;
  const showWords = lod === "reading";
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
        {layout.plates.map((p) => (
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
    [layout.plates, miniGeometry],
  );

  /** What the inks on the paper mean. With the words off every line but the
   *  focused one, this is where a reader learns to read them. Only the
   *  families the library actually uses are listed. */
  const RELATION_FAMILY: Record<RelationInk, string> = { ramune: "influence", sakura: "opposition", yuzu: "kinship" };
  const inkFamilies = useMemo(() => {
    const present = new Set(index.relationLines.map((l) => l.ink));
    return (["ramune", "sakura", "yuzu"] as RelationInk[]).filter((ink) => present.has(ink));
  }, [index]);

  const relationLines = useMemo(() => index.relationLines.filter((l) => visibleIds.has(l.a) && visibleIds.has(l.b)), [index, visibleIds]);
  const broaderEdges = useMemo(() => index.edges.filter((e) => e.kind === "broader" && visibleIds.has(e.from) && visibleIds.has(e.to)), [index, visibleIds]);

  const mapViewport = (
    <div
      ref={viewportRef}
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
        {/* map regions */}
        {layout.regions.map((r) => (
          <div key={r.map} className="pointer-events-none absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, opacity: map && map !== r.map ? 0.25 : 1 }}>
            <span aria-hidden className="halftone-wash absolute -right-10 -top-10 h-[420px] w-[620px]" style={{ ["--wash-ink" as string]: MAP_INK[r.map], opacity: 0.35 }} />
            <div className="absolute left-10 top-8" style={{ transform: `scale(${Math.max(1, Math.min(3.2, 0.6 / camera.k))})`, transformOrigin: "0 0" }}>
              <div className="font-mono text-[28px] font-bold uppercase tracking-[0.3em]" style={{ color: `color-mix(in oklch, ${MAP_INK[r.map]} 72%, var(--foreground))` }}>{MAP_LABEL[r.map]}</div>
              <div className="mt-1 font-mono text-[12px] uppercase tracking-[0.2em] text-muted-foreground">{r.count ? `${r.count} cells` : "no cells here yet"}</div>
            </div>
          </div>
        ))}

        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          {/* satellite dotted lines */}
          {baseSatellites.map((s) => {
            const p = layout.byId.get(s.cellId)!;
            const dim = dimmedPlate(s.cellId) || faded(s.cellId);
            // Start the line at the plate's edge, not its centre: a satellite
            // hugs its cell, so a line drawn from the middle would spend all
            // of itself hidden behind the plate.
            const dx = s.x - p.x; const dy = s.y - p.y;
            const span = Math.max(Math.abs(dx) / (p.w / 2), Math.abs(dy) / (p.h / 2), 0.0001);
            const x1 = p.x + dx / span; const y1 = p.y + dy / span;
            return (
              <g key={s.id} opacity={dim ? 0.2 : 0.9}>
                <line x1={x1} y1={y1} x2={s.x} y2={s.y} stroke={`color-mix(in oklch, ${SET_INK[s.set]} 60%, var(--foreground))`} strokeWidth={strokeW} strokeDasharray={dots} strokeLinecap="round" />
              </g>
            );
          })}
          {/* broader → narrower */}
          {broaderEdges.map((e) => {
            const a = layout.byId.get(e.from)!; const b = layout.byId.get(e.to)!;
            const { d, label } = plateConnector(a, b);
            const dim = (dimmedPlate(a.id) && dimmedPlate(b.id)) || (faded(a.id) && faded(b.id));
            const key = `${e.from}-${e.to}`;
            return (
              <g key={key} opacity={dim ? 0.2 : 1}>
                <path d={d} fill="none" stroke="color-mix(in oklch, var(--foreground) 55%, transparent)" strokeWidth={strokeW * 1.1} strokeDasharray={dash} strokeLinecap="round" />
                {/* A wide invisible stroke so the thin dashed line is still
                    easy to put the pointer on. */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={strokeW * 12} style={{ pointerEvents: "stroke" }} onMouseEnter={() => setHoverEdge(key)} onMouseLeave={() => setHoverEdge((at) => (at === key ? null : at))} />
                {wordFor(key, e.from, e.to) ? <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="font-sans" style={{ fontSize: 13, fill: "var(--muted-foreground)", paintOrder: "stroke", stroke: "var(--washi)", strokeWidth: 6, strokeLinejoin: "round" }}>narrower cell</text> : null}
              </g>
            );
          })}
          {/* typed relations */}
          {relationLines.map((line) => {
            const a = layout.byId.get(line.a)!; const b = layout.byId.get(line.b)!;
            const { d, label } = plateConnector(a, b);
            const dim = (dimmedPlate(a.id) && dimmedPlate(b.id)) || (faded(a.id) && faded(b.id));
            const ink = RELATION_INK_VAR[line.ink];
            const word = line.entries.length === 1 ? line.entries[0].label : line.entries.map((e) => e.label).join(" / ");
            return (
              <g key={line.key} opacity={dim ? 0.2 : 1}>
                <path d={d} fill="none" stroke={ink} strokeWidth={strokeW * 1.3} strokeDasharray={dash} strokeLinecap="round" style={{ mixBlendMode: "var(--ink-blend)" as never }} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={strokeW * 12} style={{ pointerEvents: "stroke" }} onMouseEnter={() => setHoverEdge(line.key)} onMouseLeave={() => setHoverEdge((at) => (at === line.key ? null : at))} />
                {wordFor(line.key, line.a, line.b) ? <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="font-sans" style={{ fontSize: 13, fill: `color-mix(in oklch, ${ink} 70%, var(--foreground))`, paintOrder: "stroke", stroke: "var(--washi)", strokeWidth: 6, strokeLinejoin: "round" }}>{word}</text> : null}
              </g>
            );
          })}
        </svg>

        {baseSatellites.map((s) => (
          <Satellite
            key={s.id}
            node={s}
            manifestation={s.role === "record" ? manifestationsById.get(s.cellId)?.[s.index] ?? null : null}
            k={camera.k}
            dimmed={dimmedPlate(s.cellId) || faded(s.cellId)}
            dimTo={dimTo}
            labelled={focusId === s.cellId && lod !== "picture"}
            onToggle={toggleOpen}
          />
        ))}
        {/* Plain paper laid over the stepped-back field and masked out at its
            edge, the way the corner washes are masked. It sits under the
            opened cell's own card and over its neighbours, so their names and
            scope text stop reading up through the gaps between the nodes and
            the ring reads as one object. */}
        {opened ? (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: opened.plate.x - opened.radius * 1.35,
              top: opened.plate.y - opened.radius * 1.35,
              width: opened.radius * 2.7,
              height: opened.radius * 2.7,
              background: "var(--washi)",
              maskImage: "radial-gradient(closest-side, black 62%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(closest-side, black 62%, transparent 100%)",
              zIndex: 3,
            }}
          />
        ) : null}
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
            lod={lod}
            k={camera.k}
            focused={focusId === p.id}
            dimmed={dimmedPlate(p.id) || faded(p.id)}
            dimTo={dimTo}
            onFocus={focusUnlessDragging}
          />
        ))}
      </div>

      {/* title block, on the paper */}
      <div className="pointer-events-none absolute left-0 top-0 max-w-full bg-[var(--washi)] pb-4 pl-5 pr-5 pt-5 sm:pl-8 sm:pr-8 sm:pt-7" style={{ maskImage: "linear-gradient(90deg, black 94%, transparent)", WebkitMaskImage: "linear-gradient(90deg, black 94%, transparent)" }}>
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>Encyclopedia</div>
        <h1 className="mt-1 font-display text-[24px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[44px]">
          The <Marker color="sakura">encyclopedia</Marker>
        </h1>
        <div className="pointer-events-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:mt-4 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Filter by map">
          {!desktop ? (
            <button type="button" onClick={() => setPhoneView("browse")} className="inline-flex h-11 shrink-0 items-center gap-2 bg-foreground px-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[var(--shadow-sticker)]">
              <List size={16} aria-hidden /> Browse
            </button>
          ) : null}
          <button type="button" aria-pressed={map === null} onClick={() => onFilter(null)} className="h-8 px-3 font-sans text-[16px] font-semibold shadow-[var(--shadow-sticker)] sm:h-9 sm:px-4" style={map === null ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>All</button>
          {MAP_NAMES_ORDER.map((name) => (
            <button key={name} type="button" aria-pressed={map === name} onClick={() => onFilter(map === name ? null : name)} disabled={!counts[name]} title={counts[name] ? `${counts[name]} cells` : "No cells on this map yet"} className="h-8 px-3 font-sans text-[16px] font-semibold shadow-[var(--shadow-sticker)] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:px-4" style={map === name ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>
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
                  <span className="font-display text-[16px] font-bold tracking-[-0.02em]">{cell.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}</span>
                </button>
              </li>
            )) : <li className="px-4 py-3 text-[16px] text-muted-foreground">No cell matches.</li>}
          </ul>
        ) : null}
      </div>

      {/* zoom + minimap */}
      <div className={`absolute z-20 ${desktop ? "bottom-12 left-6 flex items-end gap-2" : "bottom-4 right-3"}`}>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Plus size={16} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Minus size={16} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => fitAll()} aria-label="Fit everything" title="Fit (0)" className="grid h-9 w-9 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Maximize2 size={15} strokeWidth={2.2} /></button>
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

      {desktop ? (
        <div className="pointer-events-none absolute bottom-4 left-6 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="pointer-events-auto flex items-center gap-2 font-sans text-[16px]">
            <button type="button" onClick={() => { clearFocus(); fitAll(); }} className="text-foreground hover:underline">Encyclopedia</button>
            {focusCell ? (<><span className="text-muted-foreground">/</span><span className="font-semibold" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>{focusCell.name}</span></>) : null}
          </span>
          <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span style={{ color: "color-mix(in oklch, var(--sakura) 78%, var(--foreground))" }}>{graph.cells.length} draft cells</span>
            {" · "}
            {levels > 0
              ? <>showing {visiblePlates.length} · {deepestShown + 1} of {levels + 1} layers{deepestShown < levels ? " · zoom in for the next" : ""}</>
              : <>{visiblePlates.length} on the map</>}
            {" · "}{shownRecords} manifestations · distances are schematic
          </span>
          <span className="ml-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-[2px] w-5" style={{ backgroundImage: "repeating-linear-gradient(90deg, color-mix(in oklch, var(--foreground) 55%, transparent) 0 4px, transparent 4px 7px)" }} />
              narrower
            </span>
            {inkFamilies.map((ink) => (
              <span key={ink} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-[2px] w-5" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${RELATION_INK_VAR[ink]} 0 4px, transparent 4px 7px)` }} />
                {RELATION_FAMILY[ink]}
              </span>
            ))}
            <span className="normal-case tracking-normal opacity-70">hover a line for its word</span>
          </span>
        </div>
      ) : null}
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
    <aside ref={sheetScrollRef} className="relative flex h-full flex-col overflow-y-auto px-8 pb-10 pt-6" aria-label="Cell">
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
    <div className="relative w-full" style={{ height: desktop ? "calc(100dvh - 64px)" : "calc(100dvh - 56px - 64px)" }}>
      {!desktop && phoneView === "browse" ? (
        <EncyclopediaBrowse
          index={index}
          focusId={focusId}
          onFocus={focus}
          onClearFocus={clearFocus}
          onShowMap={() => setPhoneView("map")}
          map={map}
          onMap={setMap}
          counts={counts}
          withheld={graph.withheld}
        />
      ) : null}
      {showMap ? (
        <div className={`grid h-full ${desktop && sheetOpen ? "grid-cols-[minmax(0,1fr)_440px]" : "grid-cols-1"}`}>
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

