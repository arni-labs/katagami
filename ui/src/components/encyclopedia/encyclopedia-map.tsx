"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpRight, ChevronUp, List, Maximize2, Minus, Plus } from "lucide-react";
import type { EncyclopediaGraph, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_INK, MAP_LABEL, MAP_NAMES_ORDER, type RelationInk } from "@/lib/encyclopedia-graph";
import { Marker } from "@/components/page-hero";
import { RELATION_INK_VAR, SearchBox } from "./chrome";
import { cellFace, SET_INK } from "./material";
import { expandCell, expandedRadius, HUB_H, HUB_W, layoutVisible, levelScale, MAX_LEVEL, plateConnector, SAT_H, SAT_W, type PlateNode, type SatelliteNode } from "./graph-layout";
import { Hub, lodFor, Plate, Satellite } from "./map-cards";
import { CloseButton, IndexSheet, OpenCellButton, SheetBody, SheetTitle, type SheetTab } from "./focus-sheet";
import { EncyclopediaBrowse } from "./browse";
import { RecordCard } from "./record-card";
import { useMounted, usePanZoom, usePrefersReducedMotion, ZOOM_MAX } from "./use-pan-zoom";
import { cameraRect, SpatialIndex, type Rect } from "./spatial-index";
import { childrenOf, computeVisible, hubKey, initialExpansion, revealPath, showMore, toggle, type Expansion } from "./expansion";

// The encyclopedia: one map of every attested cell, opened a branch at a time.
// Each map has a category node at its middle; opening it puts the map's
// top-level cells on the paper in groups, opening a cell puts its narrower
// cells beside it, and folding takes a branch away again. What is open is the
// reader's choice. Zoom decides only how much of each open card is drawn:
// far out a picture and a name, closer the picture's origin, close in the
// scope, the material and the caption. Broader and typed relations are dashed
// lines with the word on them; each cell's manifestations are small
// satellites on dotted lines. The field never changes shape: a cell is where
// it settled whether or not it is on the paper right now.

/** The smallest a card may print at before it is left off the paper. Below
 *  this it is a smudge that costs a DOM node. */
const READABLE_CARD_PX = 8;
/** A cell's records appear once the cell prints big enough to be named — far
 *  out they would be dust around every card, and the field is the cards. */
const RECORDS_FROM_EK = 0.32;
/** The smallest an opened record node may print at. A ring of sixty records
 *  fitted to a 390px screen puts each node at about fifteen pixels, too small
 *  to hit, so below this the ring runs off the screen and is panned instead. */
const HITTABLE_NODE_PX = 34;
/** How far outside the viewport a card is still mounted, in screen pixels. */
const CULL_MARGIN_PX = 420;

/** How far in the camera goes to hold an opened cell's ring. */
function zoomForRing(radius: number, room: { w: number; h: number }, satPx: number): number {
  const fit = Math.min(room.w, room.h) / (radius * 2);
  const floor = HITTABLE_NODE_PX / Math.max(1, satPx);
  return Math.max(floor, Math.min(1.1, fit));
}

/** Whether there is room for the map beside a sheet. Read through
 *  `useSyncExternalStore` so the first client render already knows which of
 *  the two the reader is on; the server has no window and says desktop. */
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

function union(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const r of rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

const plateRect = (p: PlateNode): Rect => ({ x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h });
const hubRect = (hub: { x: number; y: number }): Rect => ({ x: hub.x - HUB_W / 2, y: hub.y - HUB_H / 2, w: HUB_W, h: HUB_H });

export function EncyclopediaMap({ graph, initialCellId }: { graph: EncyclopediaGraph; initialCellId?: string | null }) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  /** The maps that have cells, in house order — one category node each. */
  const maps = useMemo(() => MAP_NAMES_ORDER.filter((m) => graph.cells.some((c) => index.primaryMap(c) === m)), [graph, index]);
  const initial = initialCellId && index.byId.has(initialCellId) ? initialCellId : null;
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
  // for why — and the map is a tap away from it and a tap back.
  const [phoneView, setPhoneView] = useState<"browse" | "map">("browse");
  const desktop = useIsDesktop();
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();

  // ── what is open ────────────────────────────────────────────────────────
  // A cell named in the URL is on the paper when the page opens: the chain
  // above it is opened first, paged far enough to include it.
  const [expansion, setExpansion] = useState<Expansion>(() => (initial ? revealPath(index, initialExpansion(maps), initial) : initialExpansion(maps)));
  const visible = useMemo(() => computeVisible(index, maps, expansion), [index, maps, expansion]);
  // The paper: what is open, laid out. Linear in the open cells, so it is
  // recomputed on every change of expansion in a few milliseconds.
  const settled = useMemo(() => layoutVisible(index, visible, maps), [index, visible, maps]);
  // Where the reader has dragged things. An offset on a node moves the node
  // and everything open under it — a branch is one thing to pick up — so the
  // layout stays a pure function of the data and the reader's moves sit on
  // top of it, keyed by id, and survive a branch folding and opening again.
  const [offsets, setOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());
  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;
  const layout = useMemo(() => {
    if (!offsets.size) return settled;
    const parentOf = new Map<string, string>();
    for (const [key, kids] of visible.shown) for (const kid of kids) if (!parentOf.has(kid.id)) parentOf.set(kid.id, key);
    const eff = new Map<string, { x: number; y: number }>();
    const effective = (key: string): { x: number; y: number } => {
      const known = eff.get(key);
      if (known) return known;
      const own = offsets.get(key) ?? { x: 0, y: 0 };
      const up = parentOf.get(key);
      const above = up ? effective(up) : { x: 0, y: 0 };
      const at = { x: own.x + above.x, y: own.y + above.y };
      eff.set(key, at);
      return at;
    };
    const plates = settled.plates.map((p) => { const d = effective(p.id); return d.x || d.y ? { ...p, x: p.x + d.x, y: p.y + d.y } : p; });
    const byId = new Map(plates.map((p) => [p.id, p]));
    // A record node moves with its cell, and can be moved on its own.
    const satellites = settled.satellites.map((s) => { const d = effective(s.cellId); const own = offsets.get(s.id) ?? { x: 0, y: 0 }; const dx = d.x + own.x; const dy = d.y + own.y; return dx || dy ? { ...s, x: s.x + dx, y: s.y + dy } : s; });
    const hubs = settled.hubs.map((h) => { const d = effective(h.key); return d.x || d.y ? { ...h, x: h.x + d.x, y: h.y + d.y } : h; });
    let left = Infinity; let top = Infinity; let right = -Infinity; let bottom = -Infinity;
    for (const b of [...plates, ...hubs]) { left = Math.min(left, b.x - b.w / 2); top = Math.min(top, b.y - b.h / 2); right = Math.max(right, b.x + b.w / 2); bottom = Math.max(bottom, b.y + b.h / 2); }
    const bounds = Number.isFinite(left) ? { x: left - 200, y: top - 200, w: right - left + 400, h: bottom - top + 400 } : settled.bounds;
    return { plates, satellites, hubs, byId, bounds };
  }, [settled, offsets, visible]);
  const hubs = layout.hubs;

  // Reading a card means seeing it at the size it was designed at, so the
  // camera must be able to reach 1 / scale for the deepest layer the library
  // has, with room to spare.
  const maxZoom = Math.max(ZOOM_MAX, 1 / levelScale(MAX_LEVEL) * 1.25);
  const { viewportRef, camera, setCamera, animate, dragging, draggingRef, handlers, zoomStep, glide, centerOn, guardWheel } = usePanZoom({ x: 0, y: 0, k: 0.2 }, maxZoom);
  // The camera, readable from a handler without being one of its
  // dependencies: a card's handlers keep one identity across every pan and
  // zoom, which is what lets the memoised cards skip the work.
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Picking a node up. The pointer's first four pixels decide whether this is
  // a click or a drag, the same threshold the camera uses; past it the node
  // follows the pointer in paper units and the click that ends the drag is
  // ignored. The event does not reach the viewport, so the camera stays put.
  const nodeDrag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const draggedNode = useRef(false);
  const startNodeDrag = useCallback((id: string, event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.stopPropagation();
    const at = offsetsRef.current.get(id) ?? { x: 0, y: 0 };
    nodeDrag.current = { id, sx: event.clientX, sy: event.clientY, ox: at.x, oy: at.y, moved: false };
    const move = (ev: PointerEvent) => {
      const d = nodeDrag.current;
      if (!d) return;
      const dx = ev.clientX - d.sx; const dy = ev.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      draggedNode.current = true;
      const k = cameraRef.current.k;
      setOffsets((prev) => new Map(prev).set(d.id, { x: d.ox + dx / k, y: d.oy + dy / k }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      nodeDrag.current = null;
      window.setTimeout(() => { draggedNode.current = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, []);

  // The viewport's size in state, kept current by a ResizeObserver, measured
  // from a callback ref because the map is not always on the page when this
  // component mounts: on a phone it appears only when the reader asks for it.
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const sizeObserver = useRef<ResizeObserver | null>(null);
  const framed = useRef(false);
  const attachViewport = useCallback((el: HTMLDivElement | null) => {
    viewportRef.current = el;
    guardWheel(el);
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
  }, [viewportRef, guardWheel]);
  useEffect(() => () => sizeObserver.current?.disconnect(), []);

  // The page is the map. The site shell puts a footer under every page, so
  // without this the document itself scrolled, and a wheel or a swipe moved
  // the page and the paper together. While the map is on screen the document
  // does not scroll; the sheet scrolls itself and contains its overscroll.
  useEffect(() => {
    const root = document.documentElement;
    const was = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    return () => { root.style.overflow = was.overflow; root.style.overscrollBehavior = was.overscroll; };
  }, []);

  // ── what is actually drawn ──────────────────────────────────────────────
  // The paper indexed by where things are, built once per settled field, so
  // the map costs the same over five thousand cells as over five hundred.
  const plateIndex = useMemo(() => new SpatialIndex(layout.plates, layout.bounds), [layout]);
  const satelliteBoxes = useMemo(
    () => layout.satellites.map((node) => ({ x: node.x, y: node.y, w: SAT_W * node.scale, h: SAT_H * node.scale, node })),
    [layout.satellites],
  );
  const satelliteIndex = useMemo(() => new SpatialIndex(satelliteBoxes, layout.bounds), [satelliteBoxes, layout.bounds]);
  const view = useMemo(() => cameraRect(camera, viewportSize, CULL_MARGIN_PX), [camera, viewportSize]);
  const measured = viewportSize.w > 0 && viewportSize.h > 0;

  // A card has to be open, has to print big enough to be anything, and has to
  // be somewhere near the viewport.
  const visiblePlates = useMemo(() => {
    const drawn = (p: PlateNode) => camera.k * p.w >= READABLE_CARD_PX;
    if (!measured) return layout.plates.filter(drawn);
    return plateIndex.query(view).filter(drawn);
  }, [layout.plates, plateIndex, view, camera.k, measured]);
  const visibleIds = useMemo(() => new Set(visiblePlates.map((p) => p.id)), [visiblePlates]);
  /** Every open plate, wherever it is — what fit frames and the minimap draws. */
  const openPlates = layout.plates;

  const focusCell = focusId ? index.byId.get(focusId) ?? null : null;
  const focusPlate = focusId ? layout.byId.get(focusId) ?? null : null;

  const opened = useMemo(() => {
    const plate = openedId ? layout.byId.get(openedId) : null;
    if (!plate) return null;
    const more = layout.satellites.find((s) => s.cellId === plate.id && s.role === "more");
    const away = more ? Math.atan2(more.y - plate.y, more.x - plate.x) : -Math.PI / 2;
    const nodes = expandCell(plate, away).map((s) => { const own = offsets.get(s.id); return own ? { ...s, x: s.x + own.x, y: s.y + own.y } : s; });
    return { plate, nodes, radius: expandedRadius(plate, nodes) };
  }, [openedId, layout, offsets]);

  /** What each category node shows of its map: the faces of its most
   *  prominent cells, pictured ones first. */
  const hubFaces = useMemo(() => new Map(maps.map((map) => [map, childrenOf(index, hubKey(map))
    .map((c) => ({ id: c.id, name: c.name, face: cellFace(c) }))
    .sort((a, b) => Number(b.face.kind !== "name") - Number(a.face.kind !== "name"))
    .slice(0, 4)])), [maps, index]);

  // ── framing ─────────────────────────────────────────────────────────────
  /** Frame a set of world rectangles inside the room the chrome leaves. */
  const frameRects = useCallback((rects: Rect[], smooth: boolean, maxK = 1) => {
    const el = viewportRef.current;
    const box = union(rects);
    if (!el || !box) return;
    const vw = el.clientWidth; const vh = el.clientHeight;
    const top = desktop ? 96 : 150; const bottom = desktop ? 72 : 220; const side = desktop ? 40 : 12;
    const k = Math.max(0.04, Math.min(maxK, maxZoom, (vw - side * 2) / box.w, (vh - top - bottom) / box.h));
    const x = vw / 2 - (box.x + box.w / 2) * k;
    const y = top + (vh - top - bottom) / 2 - (box.y + box.h / 2) * k;
    if (smooth) glide({ k, x, y }); else setCamera({ k, x, y });
  }, [viewportRef, desktop, maxZoom, glide, setCamera]);

  const fitAll = useCallback((smooth = true) => {
    const el = viewportRef.current;
    if (!el) return;
    // With a cell's records opened out, "fit" means that cell and its
    // records — that is what is on the paper.
    if (opened) {
      const vw = el.clientWidth; const vh = el.clientHeight;
      const top = desktop ? 96 : 150; const bottom = desktop ? 72 : 220; const side = desktop ? 40 : 12;
      const k = zoomForRing(opened.radius, { w: vw - side * 2, h: vh - top - bottom }, SAT_W * opened.plate.scale);
      const x = vw / 2 - opened.plate.x * k;
      const y = top + (vh - top - bottom) / 2 - opened.plate.y * k;
      if (smooth) glide({ k, x, y }); else setCamera({ k, x, y });
      return;
    }
    // Otherwise fit frames what is open: the category nodes and every cell
    // the reader has put on the paper.
    frameRects([...hubs.map(hubRect), ...openPlates.map(plateRect)], smooth);
  }, [viewportRef, opened, desktop, glide, setCamera, frameRects, hubs, openPlates]);


  const fitRegion = useCallback((name: MapName) => {
    const hub = hubs.find((h) => h.map === name);
    if (!hub) return;
    // Every open cell on the map, whichever cluster it sits in: a cell on
    // both maps is pulled into the frame, not left dimmed in the other one.
    frameRects([hubRect(hub), ...openPlates.filter((p) => p.cell.maps.some((m) => m.map === name)).map(plateRect)], true);
  }, [hubs, openPlates, frameRects]);


  /** Bring a plate to the reading layer, centred in the room the sheet leaves. */
  const frameFocus = useCallback((id: string) => {
    const el = viewportRef.current;
    const p = layout.byId.get(id);
    if (!el || !p) return;
    // Come in far enough that the card reads, not merely far enough that it
    // is drawn: a cell on a lower layer draws at a fraction of full size.
    const k = Math.min(maxZoom, Math.max(cameraRef.current.k, 0.8 / p.scale));
    if (desktop) centerOn(p.x, p.y, k, { x: el.clientWidth / 2, y: el.clientHeight / 2 + 24 });
    else {
      const fit = Math.min(k, (el.clientWidth - 40) / p.w);
      centerOn(p.x, p.y, fit, { x: el.clientWidth / 2, y: 150 + p.h * 0.5 * fit - 24 });
    }
  }, [viewportRef, layout.byId, desktop, centerOn, maxZoom]);

  /** The sheet is the index's scroll parent, so the windowed list can read it. */
  const sheetScrollRef = useRef<HTMLElement | null>(null);
  const mobileSheetScrollRef = useRef<HTMLDivElement | null>(null);

  // First framing happens once the viewport has a size.
  useEffect(() => {
    if (framed.current) return;
    const id = requestAnimationFrame(() => {
      const el = viewportRef.current;
      if (!el || !el.clientWidth || !el.clientHeight) return;
      framed.current = true;
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

  // ── opening and folding ─────────────────────────────────────────────────
  /** A node the reader just opened, to be framed once its children are on
   *  the paper. The camera only ever pans or pulls back for this — it never
   *  zooms in on its own, because zoom is the reader's. */
  const [frameKey, setFrameKey] = useState<{ key: string; n: number } | null>(null);
  useEffect(() => {
    if (!frameKey) return;
    const el = viewportRef.current;
    if (!el) return;
    const hub = hubs.find((h) => h.key === frameKey.key);
    const parent = hub ? hubRect(hub) : (() => { const p = layout.byId.get(frameKey.key); return p ? plateRect(p) : null; })();
    if (!parent) return;
    const kids = (visible.shown.get(frameKey.key) ?? []).map((c) => layout.byId.get(c.id)).filter((p): p is PlateNode => Boolean(p)).map(plateRect);
    const rects = [parent, ...kids];
    const room = cameraRect(cameraRef.current, { w: el.clientWidth, h: el.clientHeight });
    if (rects.every((r) => contains(room, r))) return;
    frameRects(rects, true, cameraRef.current.k);
    // Framing belongs to the act of opening, not to every later change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey]);

  const expansionRef = useRef(expansion);
  expansionRef.current = expansion;
  const toggleOpen = useCallback((key: string) => {
    const opening = !expansionRef.current.open.has(key);
    setExpansion((state) => toggle(state, key));
    if (opening) setFrameKey({ key, n: Date.now() });
  }, []);
  const openMore = useCallback((key: string) => {
    setExpansion((state) => showMore(state, key));
    setFrameKey({ key, n: Date.now() });
  }, []);

  /** A cell to bring into view once it is on the paper. Framing waits for
   *  the layout that has it: a cell reached by search may not be open yet,
   *  and the chain above it opens in the same change. */
  const [pendingFrame, setPendingFrame] = useState<{ id: string; n: number } | null>(null);
  useEffect(() => {
    if (!pendingFrame || !layout.byId.has(pendingFrame.id)) return;
    frameFocus(pendingFrame.id);
    setPendingFrame(null);
  }, [pendingFrame, layout, frameFocus]);

  const focus = useCallback((id: string) => {
    if (!index.byId.has(id)) return;
    // A cell reached by search, from the sheet or from the phone browser is
    // put on the paper if it is not there: the chain above it opens.
    setExpansion((state) => (visible.cells.has(id) ? state : revealPath(index, state, id)));
    setOpenedId((open) => (open === id ? open : null));
    setFocusId(id);
    setSheetOpen(true);
    setSheetExpanded(false);
    setTab("material");
    setPendingFrame({ id, n: Date.now() });
  }, [index, visible]);

  /** One handler for every card on the paper, reading whether the pointer was
   *  dragged from a ref so its identity never changes. */
  const focusUnlessDragging = useCallback((id: string) => { if (!draggingRef.current && !draggedNode.current) focus(id); }, [focus, draggingRef]);

  const clearFocus = useCallback(() => { setFocusId(null); setSheetExpanded(false); setOpenedId(null); setRecordOpen(null); }, []);

  /** The record node whose card is open on the canvas, if any. */
  const [recordOpen, setRecordOpen] = useState<SatelliteNode | null>(null);
  const openRecord = useCallback((node: SatelliteNode) => {
    if (draggedNode.current) return;
    setRecordOpen((at) => (at?.id === node.id ? null : node));
  }, []);
  // The card belongs to a node on the paper; when the node goes, so does it.
  const recordNodeNow = recordOpen ? (opened?.nodes.find((s) => s.id === recordOpen.id) ?? layout.satellites.find((s) => s.id === recordOpen.id) ?? null) : null;
  const recordManifestation = recordNodeNow ? index.byId.get(recordNodeNow.cellId)?.manifestations[recordNodeNow.index] ?? null : null;

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
    else if (event.key === "Escape") { if (recordOpen) setRecordOpen(null); else if (openedId) setOpenedId(null); else if (sheetExpanded) setSheetExpanded(false); else if (focusId) clearFocus(); }
  };

  // ── emphasis ────────────────────────────────────────────────────────────
  // Emphasis is added, never subtracted: the cell in focus gets its tape and
  // its outline, the lines that touch it carry their words, and nothing else
  // on the paper is fogged for it. A card the reader has zoomed in on must
  // read whatever else is in focus. The two exceptions are the map filter,
  // which is the reader's own request to step a map back, and a cell's
  // opened ring, whose sixty nodes need the paper under them quiet.
  const dimmedPlate = (id: string) => Boolean(map && !index.byId.get(id)!.maps.some((m) => m.map === map));
  /** The maps a cell belongs to besides the one it is drawn in: the cell is
   *  marked with them, so a cell in the writing cluster that is also art says
   *  so on its face. */
  const alsoOn = (p: PlateNode): MapName[] => p.cell.maps.map((m) => m.map).filter((m) => m !== index.primaryMap(p.cell));
  const ringDim = (id: string) => Boolean(opened && id !== opened.plate.id);
  const dimTo = 0.35;
  const manifestationsById = useMemo(() => new Map(graph.cells.map((c) => [c.id, c.manifestations])), [graph]);

  // ── the records around the open cells ───────────────────────────────────
  // A record is on the paper once its cell prints big enough to be named, and
  // a record named by several open cells is one node joined to all of them —
  // Aquatint, Lithography and Ukiyo-e share a style, and three copies of its
  // thumbnail read as three styles.
  const recordPlates = useMemo(() => new Set(visiblePlates.filter((p) => camera.k * p.scale >= RECORDS_FROM_EK).map((p) => p.id)), [visiblePlates, camera.k]);
  const records = useMemo(() => {
    const near = measured ? satelliteIndex.query(view).map((b) => b.node) : layout.satellites;
    const drawn = near.filter((sat) => recordPlates.has(sat.cellId) && !(opened && sat.cellId === opened.plate.id));
    const byRecord = new Map<string, SatelliteNode>();
    const nodes: SatelliteNode[] = [];
    const also = new Map<string, number>();
    const shared: Array<{ plate: PlateNode; node: SatelliteNode }> = [];
    for (const sat of drawn) {
      if (sat.role !== "record") { nodes.push(sat); continue; }
      const m = manifestationsById.get(sat.cellId)?.[sat.index];
      const key = m ? `${m.entitySet}:${m.entityId}` : sat.id;
      const first = byRecord.get(key);
      if (!first) { byRecord.set(key, sat); nodes.push(sat); continue; }
      also.set(first.id, (also.get(first.id) ?? 0) + 1);
      const plate = layout.byId.get(sat.cellId);
      if (plate) shared.push({ plate, node: first });
    }
    return { nodes, also, shared };
  }, [layout.satellites, layout.byId, satelliteIndex, view, measured, opened, recordPlates, manifestationsById]);
  const shownRecords = records.nodes.filter((s) => s.role === "record").length + (opened ? opened.nodes.filter((s) => s.role === "record").length : 0);

  /** Open a cell's records onto the map, frame them, and unfold the same list
   *  in the sheet. Clicking the fold node puts them away again. */
  const toggleRecords = useCallback((cellId: string) => {
    if (openedId === cellId) { setOpenedId(null); return; }
    setOpenedId(cellId);
    setFocusId(cellId);
    setSheetOpen(true);
    setTab("material");
    setExpandKey((n) => n + 1);
  }, [openedId]);

  // Pull the camera back far enough to hold the whole opened ring.
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
  const strokeW = 0.9 / camera.k;
  const dash = `${4 / camera.k} ${5 / camera.k}`;
  const dots = `${1.2 / camera.k} ${4.5 / camera.k}`;
  // No words on the lines. The arrow says which end is narrower, the ink says
  // what family a relation is, the legend says what the inks mean, and the
  // sheet carries the relation's own word and explanation. A line touching
  // the cell in focus, or under the pointer, draws heavier; hovering it shows
  // its word as a tooltip.
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const touches = (key: string, a: string, b: string) => hoverEdge === key || (focusId !== null && (a === focusId || b === focusId));

  // ── minimap ─────────────────────────────────────────────────────────────
  const MINI_W = 120;
  const MINI_H = 76;
  const miniField = useMemo(() => {
    const field = layout.bounds;
    if (!opened) return field;
    const x = Math.min(field.x, opened.plate.x - opened.radius);
    const y = Math.min(field.y, opened.plate.y - opened.radius);
    return { x, y, w: Math.max(field.x + field.w, opened.plate.x + opened.radius) - x, h: Math.max(field.y + field.h, opened.plate.y + opened.radius) - y };
  }, [layout.bounds, opened]);
  const miniGeometry = useMemo(() => {
    const s = Math.min(MINI_W / Math.max(1, miniField.w), MINI_H / Math.max(1, miniField.h));
    return { s, ox: (MINI_W - miniField.w * s) / 2 - miniField.x * s, oy: (MINI_H - miniField.h * s) / 2 - miniField.y * s };
  }, [miniField]);
  const mini = (() => {
    const { s, ox, oy } = miniGeometry;
    const has = viewportSize.w > 0;
    const vw = has ? viewportSize.w / camera.k : miniField.w;
    const vh = has ? viewportSize.h / camera.k : miniField.h;
    const vx = has ? -camera.x / camera.k : miniField.x;
    const vy = has ? -camera.y / camera.k : miniField.y;
    const clamp = (lo: number, hi: number, at: number) => Math.max(lo, Math.min(hi, at));
    const cx = clamp(miniField.x, miniField.x + Math.max(0, miniField.w - vw), vx);
    const cy = clamp(miniField.y, miniField.y + Math.max(0, miniField.h - vh), vy);
    return { W: MINI_W, H: MINI_H, s, ox, oy, view: { x: cx, y: cy, w: Math.min(vw, miniField.w), h: Math.min(vh, miniField.h) } };
  })();
  /** What is on the paper, on the minimap: the category nodes and the open
   *  cells. Redrawn when something opens, not when the camera moves. */
  const miniPlates = useMemo(
    () => (
      <>
        {hubs.map((h) => (
          <rect key={`hub-${h.map}`} x={miniGeometry.ox + (h.x - HUB_W / 2) * miniGeometry.s} y={miniGeometry.oy + (h.y - HUB_H / 2) * miniGeometry.s} width={Math.max(3, HUB_W * miniGeometry.s)} height={Math.max(3, HUB_H * miniGeometry.s)} fill={MAP_INK[h.map]} opacity={0.7} />
        ))}
        {openPlates.map((p) => (
          <rect key={p.id} x={miniGeometry.ox + (p.x - p.w / 2) * miniGeometry.s} y={miniGeometry.oy + (p.y - p.h / 2) * miniGeometry.s} width={Math.max(2, p.w * miniGeometry.s)} height={Math.max(2, p.h * miniGeometry.s)} fill="color-mix(in oklch, var(--foreground) 30%, transparent)" />
        ))}
      </>
    ),
    [hubs, openPlates, miniGeometry],
  );

  const RELATION_FAMILY: Record<RelationInk, string> = { ramune: "influence", sakura: "opposition", yuzu: "kinship" };
  const inkFamilies = useMemo(() => {
    const present = new Set(index.relationLines.map((l) => l.ink));
    return (["ramune", "sakura", "yuzu"] as RelationInk[]).filter((ink) => present.has(ink));
  }, [index]);

  // A line is drawn when both its ends are open and either end is near the
  // viewport, so a line leading off the screen stays on the paper.
  const onPaper = (a: string, b: string) => visible.cells.has(a) && visible.cells.has(b) && (visibleIds.has(a) || visibleIds.has(b));
  const relationLines = useMemo(() => index.relationLines.filter((l) => onPaper(l.a, l.b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, visible, visibleIds]);
  const broaderEdges = useMemo(() => index.edges.filter((e) => e.kind === "broader" && onPaper(e.from, e.to)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, visible, visibleIds]);
  /** The lines from each category node to the top-level cells it has opened. */
  const hubLines = useMemo(() => hubs.flatMap((h) => (visible.shown.get(h.key) ?? []).map((c) => ({ hub: h, plate: layout.byId.get(c.id) })).filter((l): l is { hub: typeof h; plate: PlateNode } => Boolean(l.plate))), [hubs, visible, layout.byId]);

  const mapViewport = (
    <div
      ref={attachViewport}
      className="relative h-full w-full select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ramune)]"
      style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab", overscrollBehavior: "none" }}
      tabIndex={0}
      role="application"
      aria-label="Encyclopedia map. Drag to pan, scroll to zoom, click a cell to focus it, open a cell to see its narrower cells."
      onKeyDown={onKey}
      {...handlers}
    >
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`, transformOrigin: "0 0", transition: animate && !reduced ? "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined, willChange: "transform" }}
      >
        {/* each map's ground: a halftone wash behind its category node */}
        {hubs.map((h) => (
          <span key={`wash-${h.map}`} aria-hidden className="halftone-wash pointer-events-none absolute" style={{ left: h.x - 340, top: h.y - 260, width: 680, height: 520, ["--wash-ink" as string]: MAP_INK[h.map], opacity: map && map !== h.map ? 0.1 : 0.32 }} />
        ))}

        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
          <defs>
            {/* The arrow says which end is the narrower cell. Scaled with the
                stroke, so it is the same few pixels at every zoom. */}
            <marker id="enc-narrower" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="color-mix(in oklch, var(--foreground) 45%, transparent)" />
            </marker>
          </defs>
          {/* category → top-level cell */}
          {hubLines.map(({ hub, plate }) => {
            const { d } = plateConnector(hub, plate);
            const dim = dimmedPlate(plate.id) || ringDim(plate.id);
            return <path key={`${hub.key}-${plate.id}`} d={d} fill="none" stroke={`color-mix(in oklch, ${MAP_INK[hub.map]} 70%, var(--foreground))`} strokeWidth={strokeW} strokeDasharray={dash} strokeLinecap="round" opacity={dim ? 0.2 : 0.55} />;
          })}
          {/* satellite dotted lines */}
          {records.nodes.map((s) => {
            const p = layout.byId.get(s.cellId)!;
            const dim = dimmedPlate(s.cellId) || ringDim(s.cellId);
            // Start the line at the plate's edge, not its centre.
            const dx = s.x - p.x; const dy = s.y - p.y;
            const span = Math.max(Math.abs(dx) / (p.w / 2), Math.abs(dy) / (p.h / 2), 0.0001);
            return (
              <line key={s.id} x1={p.x + dx / span} y1={p.y + dy / span} x2={s.x} y2={s.y} stroke={`color-mix(in oklch, ${SET_INK[s.set]} 60%, var(--foreground))`} strokeWidth={strokeW} strokeDasharray={dots} strokeLinecap="round" opacity={dim ? 0.2 : 0.9} />
            );
          })}
          {/* a record named by more than one open cell: one node, a line to each */}
          {records.shared.map(({ plate, node }) => {
            const dx = node.x - plate.x; const dy = node.y - plate.y;
            const span = Math.max(Math.abs(dx) / (plate.w / 2), Math.abs(dy) / (plate.h / 2), 0.0001);
            return (
              <line key={`${plate.id}~${node.id}`} x1={plate.x + dx / span} y1={plate.y + dy / span} x2={node.x} y2={node.y} stroke={`color-mix(in oklch, ${SET_INK[node.set]} 60%, var(--foreground))`} strokeWidth={strokeW} strokeDasharray={dots} strokeLinecap="round" opacity={dimmedPlate(plate.id) || ringDim(plate.id) ? 0.2 : 0.9} />
            );
          })}
          {/* broader → narrower */}
          {broaderEdges.map((e) => {
            const a = layout.byId.get(e.from)!; const b = layout.byId.get(e.to)!;
            const { d } = plateConnector(a, b);
            const dim = (dimmedPlate(a.id) && dimmedPlate(b.id)) || (ringDim(a.id) && ringDim(b.id));
            const key = `${e.from}-${e.to}`;
            const lit = touches(key, e.from, e.to);
            return (
              <g key={key} opacity={dim ? 0.2 : 1}>
                <path d={d} fill="none" stroke={lit ? "var(--foreground)" : "color-mix(in oklch, var(--foreground) 45%, transparent)"} strokeWidth={strokeW * (lit ? 1.6 : 1)} strokeDasharray={dash} strokeLinecap="round" markerEnd="url(#enc-narrower)" />
                <path d={d} fill="none" stroke="transparent" strokeWidth={strokeW * 14} style={{ pointerEvents: "stroke" }} onMouseEnter={() => setHoverEdge(key)} onMouseLeave={() => setHoverEdge((at) => (at === key ? null : at))}>
                  <title>{`${a.cell.name} → ${b.cell.name}: narrower cell${e.explanation ? `. ${e.explanation}` : ""}`}</title>
                </path>
              </g>
            );
          })}
          {/* typed relations */}
          {relationLines.map((line) => {
            const a = layout.byId.get(line.a)!; const b = layout.byId.get(line.b)!;
            const { d } = plateConnector(a, b);
            const dim = (dimmedPlate(a.id) && dimmedPlate(b.id)) || (ringDim(a.id) && ringDim(b.id));
            const ink = RELATION_INK_VAR[line.ink];
            const lit = touches(line.key, line.a, line.b);
            return (
              <g key={line.key} opacity={dim ? 0.2 : 1}>
                <path d={d} fill="none" stroke={ink} strokeWidth={strokeW * (lit ? 1.8 : 1.15)} strokeDasharray={dash} strokeLinecap="round" style={{ mixBlendMode: "var(--ink-blend)" as never }} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={strokeW * 14} style={{ pointerEvents: "stroke" }} onMouseEnter={() => setHoverEdge(line.key)} onMouseLeave={() => setHoverEdge((at) => (at === line.key ? null : at))}>
                  <title>{line.entries.map((e) => `${index.byId.get(e.from)?.name} ${e.label} ${index.byId.get(e.to)?.name}${e.explanation ? `. ${e.explanation}` : ""}`).join("\n")}</title>
                </path>
              </g>
            );
          })}
        </svg>

        {records.nodes.map((s) => (
          <Satellite
            key={s.id}
            node={s}
            manifestation={s.role === "record" ? manifestationsById.get(s.cellId)?.[s.index] ?? null : null}
            k={camera.k}
            dimmed={dimmedPlate(s.cellId) || ringDim(s.cellId)}
            dimTo={dimTo}
            labelled={focusId === s.cellId && lodFor(camera.k * s.scale) !== "picture"}
            also={records.also.get(s.id)}
            onToggle={toggleRecords}
            onOpen={openRecord}
            onDragStart={startNodeDrag}
          />
        ))}
        {/* An opened cell's records, drawn after the plates so its nodes and
            its dotted lines are never behind a neighbouring card. */}
        {opened ? (
          <div className="pointer-events-none absolute left-0 top-0 h-0 w-0" style={{ zIndex: 5 }}>
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
              {opened.nodes.map((s) => {
                const p = opened.plate;
                const dx = s.x - p.x; const dy = s.y - p.y;
                const span = Math.max(Math.abs(dx) / (p.w / 2), Math.abs(dy) / (p.h / 2), 0.0001);
                return <line key={s.id} x1={p.x + dx / span} y1={p.y + dy / span} x2={s.x} y2={s.y} stroke={`color-mix(in oklch, ${SET_INK[s.set]} 60%, var(--foreground))`} strokeWidth={strokeW} strokeDasharray={dots} strokeLinecap="round" />;
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
                  labelled={lodFor(camera.k * s.scale) !== "picture" && opened.nodes.length <= 14}
                  onToggle={toggleRecords}
                  onOpen={openRecord}
                  onDragStart={startNodeDrag}
                />
              ))}
            </div>
          </div>
        ) : null}
        {hubs.map((h) => (
          <Hub
            key={h.key}
            map={h.map}
            x={h.x}
            y={h.y}
            count={h.count}
            roots={h.roots}
            open={expansion.open.has(h.key)}
            hidden={visible.hidden.get(h.key) ?? 0}
            faces={hubFaces.get(h.map) ?? []}
            k={camera.k}
            ink={MAP_INK[h.map]}
            dimmed={Boolean(map && map !== h.map) || Boolean(opened)}
            onToggle={toggleOpen}
            onMore={openMore}
            onFit={fitRegion}
            onDragStart={startNodeDrag}
          />
        ))}
        {visiblePlates.map((p: PlateNode) => (
          <Plate
            key={p.id}
            cell={p.cell}
            x={p.x}
            y={p.y}
            level={p.level}
            scale={p.scale}
            k={camera.k}
            focused={focusId === p.id}
            dimmed={dimmedPlate(p.id) || ringDim(p.id)}
            dimTo={dimTo}
            narrower={index.childrenOf(p.id).length}
            open={expansion.open.has(p.id)}
            hidden={visible.hidden.get(p.id) ?? 0}
            onFocus={focusUnlessDragging}
            onToggleOpen={toggleOpen}
            onMore={openMore}
            onDragStart={startNodeDrag}
            alsoOn={alsoOn(p)}
            filtered={map}
          />
        ))}
      </div>

      {/* title block, on the paper — compact: this is a canvas, and the room
          is for exploring */}
      <div className="pointer-events-none absolute left-0 top-0 max-w-full bg-[var(--washi)] pb-2.5 pl-4 pr-6 pt-3 sm:pl-5 sm:pt-3.5" style={{ maskImage: "linear-gradient(90deg, black 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, black 92%, transparent)" }}>
        <div className="font-mono text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>Encyclopedia</div>
        <h1 className="mt-0.5 font-display text-[16px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[18px]">
          The <Marker color="sakura">encyclopedia</Marker>
        </h1>
        <div className="pointer-events-auto mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Filter by map">
          {!desktop ? (
            <button type="button" onClick={() => setPhoneView("browse")} className="inline-flex h-7 shrink-0 items-center gap-1.5 bg-foreground px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-background shadow-[var(--shadow-sticker)]">
              <List size={14} aria-hidden /> Browse
            </button>
          ) : null}
          <button type="button" aria-pressed={map === null} onClick={() => onFilter(null)} className="h-6 px-2 font-sans text-[11px] font-medium shadow-[var(--shadow-sticker)]" style={map === null ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>All</button>
          {MAP_NAMES_ORDER.map((name) => (
            <button key={name} type="button" aria-pressed={map === name} onClick={() => onFilter(map === name ? null : name)} disabled={!counts[name]} title={counts[name] ? `${counts[name]} cells` : "No cells on this map yet"} className="h-6 px-2 font-sans text-[11px] font-medium shadow-[var(--shadow-sticker)] disabled:cursor-not-allowed disabled:opacity-45" style={map === name ? { background: "var(--yuzu)", color: "var(--sumi)" } : { background: "var(--washi)", color: "var(--foreground)" }}>
              {MAP_LABEL[name]}
            </button>
          ))}
        </div>
      </div>

      {/* search, top right */}
      <div className="absolute right-3 top-3 hidden w-56 sm:block">
        <SearchBox value={query} onChange={setQuery} placeholder="Find a cell" />
        {query.trim() ? (
          <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto bg-[var(--washi)] py-1 shadow-[var(--shadow-card-hover)]">
            {results.length ? results.map((cell) => (
              <li key={cell.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => { focus(cell.id); setQuery(""); }} className="flex w-full items-baseline gap-3 px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--yuzu)_22%,transparent)]">
                  <span className="font-display text-[12.5px] font-medium tracking-[-0.01em]">{cell.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">{cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}</span>
                </button>
              </li>
            )) : <li className="px-3 py-2 text-[12px] text-muted-foreground">No cell matches.</li>}
          </ul>
        ) : null}
      </div>

      {/* a record, read where it is */}
      {recordNodeNow && recordManifestation ? (
        <RecordCard
          manifestation={recordManifestation}
          cell={index.byId.get(recordNodeNow.cellId)!}
          index={index}
          at={{ x: recordNodeNow.x * camera.k + camera.x, y: recordNodeNow.y * camera.k + camera.y, size: SAT_W * recordNodeNow.scale * camera.k }}
          room={viewportSize}
          onClose={() => setRecordOpen(null)}
          onFocusCell={(id) => { setRecordOpen(null); focus(id); }}
        />
      ) : null}

      {/* zoom + minimap */}
      <div className={`absolute z-20 ${desktop ? "bottom-10 left-4 flex items-end gap-2" : "bottom-3 right-3"}`}>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="grid h-7 w-7 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Plus size={13} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="grid h-7 w-7 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Minus size={13} strokeWidth={2.2} /></button>
          <button type="button" onClick={() => fitAll()} aria-label="Fit what is open" title="Fit (0)" className="grid h-7 w-7 place-items-center bg-[var(--washi)] shadow-[var(--shadow-sticker)]"><Maximize2 size={12} strokeWidth={2.2} /></button>
        </div>
        {desktop ? (
          <div className="bg-[var(--washi)] p-1.5 shadow-[var(--shadow-sticker)]">
            <svg width={mini.W} height={mini.H} aria-hidden className="block">
              {miniPlates}
              {focusPlate ? <rect x={mini.ox + (focusPlate.x - focusPlate.w / 2) * mini.s} y={mini.oy + (focusPlate.y - focusPlate.h / 2) * mini.s} width={Math.max(2.5, focusPlate.w * mini.s)} height={Math.max(2.5, focusPlate.h * mini.s)} fill="var(--ramune)" /> : null}
              {opened?.nodes.map((n) => <rect key={`mini-${n.id}`} x={mini.ox + n.x * mini.s - 1} y={mini.oy + n.y * mini.s - 1} width={2} height={2} fill="var(--ramune)" />)}
              <rect x={mini.ox + mini.view.x * mini.s} y={mini.oy + mini.view.y * mini.s} width={mini.view.w * mini.s} height={mini.view.h * mini.s} fill="none" stroke="var(--ramune)" strokeWidth={1.5} />
            </svg>
            <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="tabular-nums">{Math.round(camera.k * 100)}%</span>
              <span>Drag · Scroll to zoom</span>
            </div>
          </div>
        ) : null}
      </div>

      {desktop ? (
        <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="pointer-events-auto flex items-center gap-2 font-sans text-[11.5px]">
            <button type="button" onClick={() => { clearFocus(); fitAll(); }} className="text-foreground hover:underline">Encyclopedia</button>
            {focusCell ? (<><span className="text-muted-foreground">/</span><span className="font-semibold" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>{focusCell.name}</span></>) : null}
          </span>
          <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
            <span style={{ color: "color-mix(in oklch, var(--sakura) 78%, var(--foreground))" }}>{visible.cells.size} of {graph.cells.length} cells open</span>
            {" · "}{shownRecords} records
            {graph.withheld ? <> · <span title="Not attested under the current contract, so not shown.">{graph.withheld} withheld</span></> : null}
            {" · distances are schematic"}
          </span>
          <span className="ml-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
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

          </span>
        </div>
      ) : null}
    </div>
  );

  // ── the sheet ──────────────────────────────────────────────────────────
  const sheetExpansion = focusCell ? { open: expansion.open.has(focusCell.id), onToggle: toggleOpen } : undefined;
  const sheetContent = (scrollRef: React.RefObject<HTMLElement | null>) =>
    focusCell ? (
      <>
        <div className="mt-4"><SheetTitle cell={focusCell} /></div>
        <p className="mt-2 text-[12px] leading-relaxed text-foreground">{focusCell.description || "A name and a scope. No description has been written for this cell yet."}</p>
        <SheetBody cell={focusCell} index={index} tab={tab} onTab={setTab} onFocus={focus} expandKey={expandKey} expansion={sheetExpansion} />
        <OpenCellButton cell={focusCell} />
      </>
    ) : (
      <IndexSheet index={index} onFocus={focus} scrollRef={scrollRef} />
    );

  const desktopSheet = (
    <aside ref={sheetScrollRef} className="relative flex h-full flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-3" aria-label="Cell">
      <span aria-hidden className="sticker-perforation-y pointer-events-none absolute inset-y-0 left-0" />
      <span aria-hidden className="washi-tape pointer-events-none left-6 top-2" style={{ ["--strip-ink" as string]: "var(--ramune)", transform: "rotate(-4deg)", width: 58 }} />
      <div className="flex justify-end">{focusCell ? <CloseButton onClick={clearFocus} /> : <CloseButton onClick={() => setSheetOpen(false)} />}</div>
      {sheetContent(sheetScrollRef)}
    </aside>
  );

  const mobileSheet = mounted ? createPortal(
    <div
      className="fixed inset-x-0 z-40 flex flex-col bg-[var(--washi)] shadow-[var(--shadow-card-hover)] lg:hidden"
      style={{ bottom: 64, height: sheetExpanded ? "calc(100dvh - 64px - 56px)" : focusCell ? 196 : 112, transition: reduced ? undefined : "height 380ms cubic-bezier(0.22,1,0.36,1)" }}
      role="dialog"
      aria-label="Cell"
    >
      <button type="button" onClick={() => setSheetExpanded((v) => !v)} aria-label={sheetExpanded ? "Collapse" : "Expand"} className="mx-auto mt-2 block h-1.5 w-16 bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]" />
      {sheetExpanded ? (
        <>
          <div className="flex items-center justify-between px-5 pt-3">
            <button type="button" onClick={() => setSheetExpanded(false)} className="inline-flex items-center gap-2 font-sans text-[14px] text-foreground"><ArrowLeft size={18} aria-hidden /> Back to map</button>
            {focusCell ? <CloseButton onClick={clearFocus} /> : null}
          </div>
          <div ref={mobileSheetScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">{sheetContent(mobileSheetScrollRef)}</div>
        </>
      ) : focusCell ? (
        <div className="px-5 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><SheetTitle cell={focusCell} size="md" /></div>
            <button type="button" onClick={() => setSheetExpanded(true)} aria-label="Expand" className="grid h-9 w-9 shrink-0 place-items-center"><ChevronUp size={22} /></button>
          </div>
          <p className="mt-1.5 truncate font-sans text-[12px] text-muted-foreground">{focusCell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}{focusCell.manifestations.length ? ` · ${focusCell.manifestations.length} made` : ""}{index.childrenOf(focusCell.id).length ? ` · ${index.childrenOf(focusCell.id).length} narrower` : ""}</p>
          <button type="button" onClick={() => setSheetExpanded(true)} className="mt-3 flex h-9 w-full items-center justify-between bg-foreground px-4 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)]">
            View cell <ArrowUpRight size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setSheetExpanded(true)} className="flex flex-1 items-center justify-between px-5 pb-4 pt-3 text-left">
          <span>
            <span className="block font-display text-[15px] font-semibold tracking-[-0.01em]">{visible.cells.size} of {graph.cells.length} cells open</span>
            <span className="mt-0.5 block font-sans text-[12px] text-muted-foreground">Tap a cell on the map, or open the index.</span>
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
          onShowMap={(cellId) => {
            // Carry the cell the reader is on across the seam, and put it on
            // the paper if it is not there yet.
            if (cellId) {
              setExpansion((state) => revealPath(index, state, cellId));
              setFocusId(cellId);
              setSheetOpen(true);
            }
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
              <button type="button" onClick={() => setSheetOpen(true)} className="absolute right-4 top-3 h-8 bg-foreground px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)]">Show sheet</button>
            ) : null}
          </div>
          {desktop && sheetOpen ? desktopSheet : null}
        </div>
      ) : null}
      {!desktop && phoneView === "map" ? mobileSheet : null}
    </div>
  );
}
