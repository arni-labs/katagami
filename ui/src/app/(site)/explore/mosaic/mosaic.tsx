"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AskDock, fitWord, hueOf, useAsk, useScreen, type Family, type Fit, type Kinds, type Word } from "../shared";
import { flow } from "../river/course";
import { Stamp, quick } from "../stamp";

// The library as an endless sheet of stamps. The sheet wraps in both directions,
// so you can pan for ever and come round again; drag (or scroll) to pan, with
// momentum, and pinch or press + and − to take in more or fewer at once. Only
// the stamps on screen exist. How the sheet is sorted is the picture it makes:
// by colour it is a spectrum, by family a quilt, by fit a bloom round the best
// answer. Each stamp is a small card that leans toward the light and takes a
// highlight from it; the light is the pointer, or the way you are moving.

type Mode = "colour" | "family" | "fit";
type Cell = { kind: "style"; s: AtlasStyle } | { kind: "soon"; h: AtlasHole } | null;

const TRAIT = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
const SIZES = { phone: [46, 74, 112], desk: [58, 96, 148] };
const RATIO = 1.2, GAP = 10;
const GROUND = "color-mix(in srgb, var(--foreground) 15%, var(--background))"; // the desk the stamps lie on
const HUE_ANGLE: Record<string, number> = { red: 0, orange: 28, yellow: 52, green: 120, teal: 172, blue: 222, violet: 275, pink: 325 };
const mod = (n: number, m: number) => ((n % m) + m) % m;
const tone = (ink: string | null) => {
  if (!ink) return { h: 0, s: 0, l: 0.6 };
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  return { h: d === 0 ? 0 : (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};

// The large picture is asked for before it is needed: when a card is pointed at or pressed, and for the cards either
// side of an open one. By the time the view opens, it is usually already here.
const warmed = new Set<string>();
function warm(src: string | null | undefined, width: 750 | 1080) {
  if (!src || warmed.has(src)) return;
  warmed.add(src);
  const img = new Image(); img.decoding = "async"; img.src = quick(src, width);
}

type CellProps = { c: number; r: number; cell: Cell; w: number; h: number; stepX: number; stepY: number; dim: boolean; hold: (key: string, el: HTMLElement | null) => void; onOpen: (c: number, r: number) => void };
// One stamp on the sheet, keyed by its slot in a recycling pool (see Sheet): when the window slides, the stamp
// that left one edge is handed the place that arrived at the other, which is an update, not a mount. Memoised on plain values, so when the window of visible cells slides by a row
// only the new row is drawn: the stamps already there are left alone.
const CellView = memo(function CellView({ c, r, cell, w, h, stepX, stepY, dim, hold, onOpen }: CellProps) {
  if (!cell) return null;
  const x = c * stepX, y = r * stepY, key = `${c},${r}`;
  if (cell.kind === "soon") return <span ref={(el) => hold(key, el)} title={`${cell.h.name}: coming soon`} className="absolute left-0 top-0 block" style={{ transform: `translate(${x}px, ${y}px)`, opacity: dim ? 0.25 : 0.8 }}><Stamp src={null} ink={null} w={w} h={h} label={w > 66 ? "Soon" : undefined} soon /></span>;
  const s = cell.s;
  return (
    <button ref={(el) => hold(key, el)} type="button" onPointerEnter={(e) => { if (e.pointerType === "mouse") warm(s.thumbnail_url, 1080); }} onPointerDown={() => warm(s.thumbnail_url, w < 60 ? 750 : window.innerWidth < 768 ? 750 : 1080)} onClick={() => onOpen(c, r)} aria-label={s.name} className="absolute left-0 top-0 block cursor-pointer" style={{ transform: `translate(${x}px, ${y}px)`, opacity: dim ? 0.2 : 1, }}>
      <Stamp src={s.thumbnail_url} ink={s.ink} w={w} h={h} label={w > 66 ? s.name : undefined} fast={w > 120 ? 384 : w > 70 ? 256 : 128} />
    </button>
  );
});

type SheetProps = { hold: (key: string, el: HTMLElement | null) => void; cells: { c: number; r: number; cell: Cell }[]; w: number; h: number; stepX: number; stepY: number; lit: Set<string> | null; onOpen: (c: number, r: number) => void };
const Sheet = memo(function Sheet({ hold, cells, w, h, stepX, stepY, lit, onOpen }: SheetProps) {
  return (
    <>
      {cells.map(({ c, r, cell }) => {
        const id = cell?.kind === "style" ? cell.s.id : "";
        return <CellView key={`${mod(c, 64)},${mod(r, 48)}`} c={c} r={r} cell={cell} w={w} h={h} stepX={stepX} stepY={stepY} dim={Boolean(lit && (!id || !lit.has(id)))} hold={hold} onOpen={onOpen} />;
      })}
    </>
  );
});

export function Mosaic({ styles: all, families, holes }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const box = useRef<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  // How much of the top the controls and the sentence take, for whatever is laid out beneath them.
  const head = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = head.current, root = box.current;
    if (!el || !root) return;
    const watch = new ResizeObserver(() => root.style.setProperty("--head", `${Math.round(el.getBoundingClientRect().height)}px`));
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);
  const layer = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<Mode>("colour");
  const [win, setWin] = useState({ c0: 0, c1: 0, r0: 0, r1: 0 });
  const [open, setOpen] = useState<{ c: number; r: number } | null>(null);
  const [hue, setHue] = useState("");
  const ask = useAsk();
  // Design languages and art styles, both by default; pressing one turns it off or on, and the last one on stays on.
  const [kinds, setKinds] = useState<Kinds>({ language: true, art_style: true });
  const [tray, setTray] = useState(false);
  const styles = useMemo(() => all.filter((s) => kinds[s.kind]), [all, kinds]);
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const w = SIZES[phone ? "phone" : "desk"][zoom], h = Math.round(w * RATIO), stepX = w + GAP, stepY = h + GAP;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);

  const topFit = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
  const [seenFit, setSeenFit] = useState<string | undefined>(undefined);
  if (seenFit !== topFit) { setSeenFit(topFit); setMode(topFit ? "fit" : mode === "fit" ? "colour" : mode); setTray(Boolean(topFit)); }

  // ---- the world: one wrapping grid, filled according to the sort ------------
  const world = useMemo(() => {
    const n = styles.length, cols = Math.max(4, Math.ceil(Math.sqrt(n * 1.5))), rows = Math.max(3, Math.ceil(n / cols));
    const grid: Cell[] = Array.from({ length: cols * rows }, () => null);
    const put = (c: number, r: number, s: AtlasStyle) => { grid[r * cols + c] = { kind: "style", s }; };
    const bloom = (order: AtlasStyle[]) => {
      const spots = Array.from({ length: cols * rows }, (_, k) => ({ c: k % cols, r: Math.floor(k / cols) })).sort((a, b) => Math.hypot(a.c - (cols - 1) / 2, (a.r - (rows - 1) / 2) * RATIO) - Math.hypot(b.c - (cols - 1) / 2, (b.r - (rows - 1) / 2) * RATIO));
      order.forEach((s, i) => { const at = spots[i]; if (at) put(at.c, at.r, s); });
    };
    if (hue && !ask.fits) {
      // A picked colour gathers in the middle, its most saturated first; the rest ring it by how far their hue is from it.
      const want = HUE_ANGLE[hue], all = styles.map((s) => ({ s, t: tone(s.ink), mine: hueOf(s.ink) === hue }));
      const far = (h: number) => (want === undefined ? 0 : Math.min(Math.abs(h - want), 360 - Math.abs(h - want)));
      bloom(all.sort((a, b) => Number(b.mine) - Number(a.mine) || (a.mine ? b.t.s - a.t.s : (a.t.s < 0.22 ? 400 : far(a.t.h)) - (b.t.s < 0.22 ? 400 : far(b.t.h)))).map((v) => v.s));
    } else if (mode === "colour") {
      // Columns run through the hues, each from light to dark; the greys close the sheet.
      const all = styles.map((s) => ({ s, t: tone(s.ink) }));
      const ordered = [...all.filter((x) => x.t.s >= 0.22).sort((a, b) => ((a.t.h + 30) % 360) - ((b.t.h + 30) % 360)), ...all.filter((x) => x.t.s < 0.22).sort((a, b) => b.t.l - a.t.l)];
      for (let c = 0; c * rows < ordered.length; c++) ordered.slice(c * rows, (c + 1) * rows).sort((a, b) => b.t.l - a.t.l).forEach((x, r) => put(c, r, x.s));
    } else if (mode === "family") {
      flow(styles, families).forEach((s, i) => put(i % cols, Math.floor(i / cols), s));
    } else {
      // The fits bloom from the middle, best first; the rest follow by how near they sit to the best on the atlas.
      const lead = topFit ? byId.get(topFit) : undefined;
      const rank = (s: AtlasStyle) => ask.fits?.get(s.id)?.rank ?? 1000 + (lead ? Math.hypot(s.x - lead.x, s.y - lead.y) * 1000 : 0);
      bloom([...styles].sort((p, q) => rank(p) - rank(q)));
    }
    // What the library has not made yet fills the places left over.
    let k = 0;
    for (let i = 0; i < grid.length; i++) if (!grid[i] && holes.length > 0) grid[i] = { kind: "soon", h: holes[k++ % holes.length] };
    const where = new Map<string, { c: number; r: number }>();
    grid.forEach((cell, i) => { if (cell?.kind === "style") where.set(cell.s.id, { c: i % cols, r: Math.floor(i / cols) }); });
    return { cols, rows, grid, where };
  }, [styles, families, holes, mode, hue, ask.fits, topFit, byId]);
  const cellAt = useCallback((c: number, r: number) => world.grid[mod(r, world.rows) * world.cols + mod(c, world.cols)], [world]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  // ---- the camera: an offset that never stops at an edge, and a light ---------
  const cam = useRef({ x: 0, y: 0, vx: 0, vy: 0, px: -1, py: -1, run: 0, drag: null as null | { x: number; y: number; t: number; far: number }, pinch: 0 });
  const calm = useRef(false);
  useEffect(() => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); const read = () => { calm.current = q.matches; }; read(); q.addEventListener("change", read); return () => q.removeEventListener("change", read); }, []);
  const winRef = useRef({ c0: 0, c1: 0, r0: 0, r1: 0 });
  const glare = useRef<HTMLDivElement | null>(null);
  const held = useRef(new Map<string, HTMLElement>());
  const lit_ = useRef(new Set<string>());
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const hold = useCallback((key: string, el: HTMLElement | null) => { if (el) held.current.set(key, el); else held.current.delete(key); }, []);
  const paint = useCallback(() => {
    const k = cam.current, el = layer.current;
    if (!el || size.w === 0) return;
    el.style.transform = `translate3d(${k.x}px, ${k.y}px, 0)`;
    // One glare for the whole sheet, sliding at a fraction of the pan so it reads as light, not as print.
    // Moved by transform alone (the compositor's job, no repaint), wrapping within the pattern's repeat.
    if (glare.current) glare.current.style.transform = `translate3d(${((k.x * 0.35) % (size.w * 1.5)).toFixed(1)}px, ${((k.y * 0.2) % (size.h * 1.5)).toFixed(1)}px, 0)`;
    // Only the cards round the pointer lean to it and take its highlight; the rest lie flat.
    const near = new Set<string>();
    if (k.px >= 0 && zoomRef.current > 0) {
      const lx = k.px - k.x + k.vx * 6, ly = k.py - k.y + k.vy * 6, reach = stepX * 1.7;
      for (let r = Math.floor((ly - reach) / stepY); r <= Math.floor((ly + reach) / stepY); r++) for (let c = Math.floor((lx - reach) / stepX); c <= Math.floor((lx + reach) / stepX); c++) {
        const key = `${c},${r}`, card = held.current.get(key);
        if (!card) continue;
        near.add(key);
        card.classList.add("lit-on");
        card.style.setProperty("--lx", lx.toFixed(0)); card.style.setProperty("--ly", ly.toFixed(0));
        card.style.setProperty("--cx", String(c * stepX + stepX / 2)); card.style.setProperty("--cy", String(r * stepY + stepY / 2));
      }
    }
    for (const key of lit_.current) if (!near.has(key)) held.current.get(key)?.classList.remove("lit-on");
    lit_.current = near;
    const c0 = Math.floor(-k.x / stepX) - 1, r0 = Math.floor(-k.y / stepY) - 1, c1 = c0 + Math.ceil(size.w / stepX) + 2, r1 = r0 + Math.ceil(size.h / stepY) + 2;
    const now = winRef.current;
    if (now.c0 !== c0 || now.c1 !== c1 || now.r0 !== r0 || now.r1 !== r1) { winRef.current = { c0, c1, r0, r1 }; setWin({ c0, c1, r0, r1 }); }
  }, [size, stepX, stepY]);
  const coast = useCallback(() => {
    const k = cam.current;
    // Asked for less motion: nothing glides. A flick stops where it was let go; a jump (see bring) lands at once.
    if (calm.current) { k.vx = 0; k.vy = 0; paint(); return; }
    if (k.run) return;
    const step = () => {
      k.x += k.vx; k.y += k.vy; k.vx *= 0.94; k.vy *= 0.94;
      paint();
      k.run = Math.abs(k.vx) + Math.abs(k.vy) > 0.15 ? requestAnimationFrame(step) : 0;
      if (!k.run) { k.vx = 0; k.vy = 0; paint(); }
    };
    k.run = requestAnimationFrame(step);
  }, [paint]);
  useEffect(() => { const f = requestAnimationFrame(paint); return () => cancelAnimationFrame(f); }, [paint]);
  useEffect(() => { const k = cam.current; return () => cancelAnimationFrame(k.run); }, []);

  /** Glide until a cell sits in the middle of the room left by the ask. */
  const bring = useCallback((c: number, r: number) => {
    const k = cam.current;
    // The nearest copy of that cell on the wrapping sheet.
    const wantX = size.w / 2 - (c + 0.5) * stepX, wantY = (size.h - 120) / 2 - (r + 0.5) * stepY, spanX = world.cols * stepX, spanY = world.rows * stepY;
    const dx = wantX - k.x - Math.round((wantX - k.x) / spanX) * spanX, dy = wantY - k.y - Math.round((wantY - k.y) / spanY) * spanY;
    if (calm.current) { k.x += dx; k.y += dy; k.vx = 0; k.vy = 0; paint(); return; }
    k.vx = dx * 0.064; k.vy = dy * 0.064; // what a 0.94 decay carries just that far
    coast();
  }, [size, stepX, stepY, world, coast, paint]);
  const goTo = useCallback((id: string) => { const at = world.where.get(id); if (at) { bring(at.c, at.r); setOpen(at); } }, [world, bring]);
  // A new sort or a new answer brings its centre (or its best fit) into view.
  const led = useRef("");
  useEffect(() => {
    const key = `${mode}|${topFit ?? ""}|${hue}`;
    if (led.current === key || size.w === 0) return;
    const f = requestAnimationFrame(() => { led.current = key; const at = topFit && mode === "fit" ? world.where.get(topFit) : undefined; bring(at?.c ?? Math.floor(world.cols / 2), at?.r ?? Math.floor(world.rows / 2)); });
    return () => cancelAnimationFrame(f);
  }, [mode, topFit, hue, size.w, world, bring]);

  const zoomTo = useCallback((next: number, ax = size.w / 2, ay = size.h / 2) => {
    const z = Math.max(0, Math.min(2, next));
    if (z === zoom) return;
    // The point under the pointer stays under it.
    const k = cam.current, f = (SIZES[phone ? "phone" : "desk"][z] + GAP) / stepX;
    k.x = ax - (ax - k.x) * f; k.y = ay - (ay - k.y) * f;
    setZoom(z);
  }, [zoom, phone, stepX, size]);

  const queued = useRef(0);
  useEffect(() => () => cancelAnimationFrame(queued.current), []);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const at = (e: React.PointerEvent | React.WheelEvent) => { const r = (box.current as HTMLDivElement).getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => {
    const p = at(e), k = cam.current;
    pts.current.set(e.pointerId, p);
    if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; k.pinch = Math.hypot(a.x - b.x, a.y - b.y); k.drag = null; return; }
    cancelAnimationFrame(k.run); k.run = 0; k.vx = 0; k.vy = 0;
    k.drag = { x: p.x, y: p.y, t: performance.now(), far: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = at(e), k = cam.current;
    k.px = p.x; k.py = p.y;
    if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, p);
    if (pts.current.size === 2 && k.pinch) {
      const [a, b] = [...pts.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > k.pinch * 1.35) { k.pinch = d; zoomTo(zoom + 1, (a.x + b.x) / 2, (a.y + b.y) / 2); } else if (d < k.pinch * 0.74) { k.pinch = d; zoomTo(zoom - 1, (a.x + b.x) / 2, (a.y + b.y) / 2); }
      return;
    }
    if (k.drag) {
      const now = performance.now(), dt = Math.max(1, now - k.drag.t), dx = p.x - k.drag.x, dy = p.y - k.drag.y;
      k.x += dx; k.y += dy; k.vx = k.vx * 0.5 + (dx / dt) * 8; k.vy = k.vy * 0.5 + (dy / dt) * 8;
      k.drag = { x: p.x, y: p.y, t: now, far: k.drag.far + Math.abs(dx) + Math.abs(dy) };
      if (k.drag.far > 6) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!queued.current) queued.current = requestAnimationFrame(() => { queued.current = 0; paint(); }); // once a frame, however many events arrive
  };
  const dragged = useRef(false);
  const onUp = (e: React.PointerEvent) => {
    const k = cam.current;
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) k.pinch = 0;
    dragged.current = (k.drag?.far ?? 0) > 6;
    k.drag = null;
    if (e.pointerType !== "mouse") { k.px = -1; k.py = -1; }
    coast();
  };
  // The canvas is the page: the document does not scroll under it (so the site's footer is simply never reached
  // here), and the wheel belongs to the canvas. React's wheel listener is passive and cannot say so, hence a native one.
  const wheel = useRef<(e: WheelEvent) => void>(() => undefined);
  useEffect(() => {
    wheel.current = (e: WheelEvent) => {
      e.preventDefault();
      const k = cam.current, r = (box.current as HTMLDivElement).getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey) { if (Math.abs(e.deltaY) > 2) zoomTo(zoom + (e.deltaY < 0 ? 1 : -1), p.x, p.y); return; } // a trackpad pinch arrives as ctrl+wheel
      const unit = e.deltaMode === 1 ? 32 : 1; // a mouse wheel counts in lines
      k.x -= e.deltaX * unit; k.y -= e.deltaY * unit;
      if (!queued.current) queued.current = requestAnimationFrame(() => { queued.current = 0; paint(); });
    };
  }, [zoom, zoomTo, paint]);
  useEffect(() => {
    const el = surface.current, root = document.documentElement;
    if (!el) return;
    const on = (e: WheelEvent) => wheel.current(e);
    el.addEventListener("wheel", on, { passive: false });
    const before = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = "hidden"; root.style.overscrollBehavior = "none";
    window.scrollTo(0, 0);
    const pin = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
    window.addEventListener("scroll", pin);
    return () => { window.removeEventListener("scroll", pin); el.removeEventListener("wheel", on); root.style.overflow = before.overflow; root.style.overscrollBehavior = before.overscroll; };
  }, [screen]);
  const onKey = (e: React.KeyboardEvent) => {
    const by = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (by) { e.preventDefault(); if (calm.current) { cam.current.x += by[0] * stepX; cam.current.y += by[1] * stepY; paint(); } else { cam.current.vx = by[0] * stepX * 0.07; cam.current.vy = by[1] * stepY * 0.07; coast(); } }
    else if (e.key === "+" || e.key === "=") zoomTo(zoom + 1); else if (e.key === "-") zoomTo(zoom - 1);
  };

  const cells = useMemo(() => {
    const out: { c: number; r: number; cell: Cell }[] = [];
    for (let r = win.r0; r <= win.r1; r++) for (let c = win.c0; c <= win.c1; c++) out.push({ c, r, cell: cellAt(c, r) });
    return out;
  }, [win, cellAt]);
  const openCell = useCallback((c: number, r: number) => { if (!dragged.current) setOpen({ c, r }); }, []);

  // The opened card, and its neighbours along the row for the arrows and the swipe.
  const shown = open ? cellAt(open.c, open.r) : null, style = shown?.kind === "style" ? shown.s : null;
  useEffect(() => {
    if (!open) return;
    for (const by of [-1, 1]) for (let step = 1; step <= world.cols; step++) { const cell = cellAt(open.c + by * step, open.r); if (cell?.kind === "style") { warm(cell.s.thumbnail_url, phone ? 750 : 1080); break; } }
  }, [open, world, cellAt, phone]);
  const turn = useCallback((by: number) => {
    if (!open) return;
    for (let step = 1; step <= world.cols; step++) { const c = open.c + by * step; if (cellAt(c, open.r)?.kind === "style") { bring(c, open.r); setOpen({ c, r: open.r }); return; } }
  }, [open, world, cellAt, bring]);

  const tab = (value: Mode, label: string, off = false) => <button type="button" disabled={off} aria-pressed={mode === value} onClick={() => setMode(value)} className={`shrink-0 cursor-pointer whitespace-nowrap px-3 py-1.5 text-[12.5px] disabled:cursor-default disabled:opacity-40 ${mode === value ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground"}`}>{label}</button>;
  const glass = "bg-background/70 shadow-[0_8px_30px_-12px_rgba(30,35,45,0.4)] backdrop-blur-xl backdrop-saturate-150";

  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div ref={box} data-canvas onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }} style={{ background: GROUND }} className={`relative h-[calc(100dvh-65px)] w-full select-none overflow-hidden`}>
      <h1 className="sr-only">Explore the library</h1>
      <div role="application" aria-label="The sheet. Drag or use the arrow keys to move across it; plus and minus change how much you see." tabIndex={0} onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }} onKeyDown={onKey} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={(e) => { if (e.pointerType === "mouse") { cam.current.px = -1; cam.current.py = -1; paint(); } }} ref={surface}
        className="absolute inset-0 cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--ramune)] active:cursor-grabbing">
        <div ref={layer} className="absolute left-0 top-0 will-change-transform">
          <Sheet hold={hold} cells={cells} w={w} h={h} stepX={stepX} stepY={stepY} lit={lit} onOpen={openCell} />
        </div>
        <div ref={glare} aria-hidden className="canvas-glare" />
      </div>

      <div ref={head} className="pointer-events-none absolute inset-x-0 top-2 z-[35] flex flex-col items-center gap-2 px-2 md:top-3 md:px-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto [scrollbar-width:none] md:justify-center">
          <div role="group" aria-label="Show" className={`flex shrink-0 ${glass}`}>
            {([["language", "Design languages"], ["art_style", "Art styles"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={kinds[k]} onClick={() => setKinds((now) => { const next = { ...now, [k]: !now[k] }; return next.language || next.art_style ? next : { language: k !== "language", art_style: k !== "art_style" }; })}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[12.5px] ${kinds[k] ? "text-foreground" : "text-foreground/40"}`}>
                <span aria-hidden className="inline-block h-2 w-2" style={{ background: kinds[k] ? "var(--foreground)" : "transparent", boxShadow: "inset 0 0 0 1.5px currentColor" }} />{label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Sort the sheet" className={`flex shrink-0 ${glass}`}>{tab("colour", "By colour")}{tab("family", "By family")}{tab("fit", "By fit", !topFit)}</div>
        </div>
        {ask.words ? <QueryLine words={ask.words} busy={ask.state === "asking"} moved={ask.moved} phone={phone} glass={glass} onRefine={(say) => void ask.refine(say, kinds)} onClear={() => { ask.clear(); setTray(false); }} onShow={topFit ? () => setTray(true) : undefined} /> : null}
      </div>
      <div className={`absolute bottom-[8.5rem] left-3 z-20 flex flex-col md:bottom-6 md:left-6 ${glass}`}>
        <button type="button" onClick={() => zoomTo(zoom + 1)} disabled={zoom === 2} aria-label="Closer" className="h-10 w-10 cursor-pointer text-[18px] disabled:opacity-30">+</button>
        <button type="button" onClick={() => zoomTo(zoom - 1)} disabled={zoom === 0} aria-label="Further" className="h-10 w-10 cursor-pointer text-[18px] disabled:opacity-30">−</button>
      </div>

      {style && open ? <Viewer key={style.id} style={style} family={style.family ? familyOf.get(style.family) ?? null : null} fit={ask.fits?.get(style.id) ?? null} judging={ask.state === "asking"} phone={phone} onTurn={turn} onClose={() => setOpen(null)} /> : null}
      {tray && ask.fits && !open ? <Tray fits={ask.fits} byId={byId} judging={ask.state === "asking"} phone={phone} onOpen={(id) => { setTray(false); goTo(id); }} onClose={() => setTray(false)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={goTo} byId={byId} lit={lit ? lit.size : null} kinds={kinds} quiet />
    </div>
  );
}

const MARK: Record<string, string> = { what: "var(--yuzu)", who: "var(--sakura)", feel: "var(--ramune)" };
const CHANGES = ["warmer", "quieter", "bolder", "more playful", "darker", "more editorial"];

/** The asker's own words, set large, with the telling ones under a highlighter: what it is, who it is for, how it
 *  should feel. Neighbouring words with the same job share one stroke. Beneath, the answer can be refined in words. */
function QueryLine({ words, busy, moved, phone, glass, onRefine, onClear, onShow }: { words: Word[]; busy: boolean; moved: { trait: string; from: number; to: number }[]; phone: boolean; glass: string; onRefine: (say: string) => void; onClear: () => void; onShow?: () => void }) {
  const [say, setSay] = useState("");
  // Runs of words that share a role, so a phrase is marked as one.
  const runs: { role: Word["role"]; text: string }[] = [];
  for (const w of words) { const last = runs[runs.length - 1]; if (last && last.role === w.role) last.text += ` ${w.text}`; else runs.push({ role: w.role, text: w.text }); }
  return (
    <div className={`query-line pointer-events-auto flex w-full max-w-[60rem] flex-col items-center gap-2 px-3 py-2.5 text-center md:px-8 md:py-5 ${glass}`}>
      <p aria-live="polite" className="font-display font-bold leading-[1.18] tracking-[-0.03em]" style={{ fontSize: phone ? (words.length > 9 ? 17 : 21) : words.length > 14 ? 30 : words.length > 7 ? 40 : 52, opacity: busy ? 0.75 : 1 }}>
        {runs.map((run, i) => <span key={i}>{i > 0 ? " " : ""}{run.role ? <mark className="query-mark" style={{ ["--mark" as string]: MARK[run.role] }}>{run.text}</mark> : run.text}</span>)}
      </p>
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:justify-center [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        {moved.slice(0, phone ? 3 : 5).map((mv) => <span key={mv.trait} className="bg-foreground px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-background">{mv.to > mv.from ? "+" : "−"} {mv.trait}</span>)}
        {CHANGES.map((c) => <button key={c} type="button" disabled={busy} onClick={() => onRefine(c)} className="cursor-pointer bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] px-2.5 py-1 text-[12.5px] hover:bg-[color-mix(in_srgb,var(--foreground)_13%,transparent)] disabled:opacity-40">{c}</button>)}
        <form onSubmit={(e) => { e.preventDefault(); if (say.trim()) { onRefine(say); setSay(""); } }} className="flex">
          <label htmlFor="refine" className="sr-only">Refine the answer</label>
          <input id="refine" value={say} onChange={(e) => setSay(e.target.value)} maxLength={120} autoComplete="off" placeholder="refine in your words" className="w-[10.5rem] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] px-2.5 py-1 text-[16px] outline-none placeholder:text-foreground/45 md:text-[12.5px]" />
        </form>
        {onShow ? <button type="button" onClick={onShow} className="cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/60 hover:text-foreground">Results</button> : null}
        <button type="button" onClick={onClear} className="cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/60 hover:text-foreground">Clear</button>
      </div>
    </div>
  );
}

/** The answer, brought to the middle: the fitting styles as large stamps that land one after another over the
 *  quietened sheet. No coloured rules; how well each fits is said in small type under its name. */
function Tray({ fits, byId, judging, phone, onOpen, onClose }: { fits: Map<string, Fit>; byId: Map<string, AtlasStyle>; judging: boolean; phone: boolean; onOpen: (id: string) => void; onClose: () => void }) {
  const hand = [...fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank).slice(0, phone ? 8 : 10);
  // Two rows on a desk, one swiping row on a phone, sized to the room between the sentence and the ask.
  const headH = Number.parseFloat(getComputedStyle(document.querySelector("[data-canvas]") ?? document.body).getPropertyValue("--head")) || 170;
  const room = window.innerHeight - 65 - headH - 20 - 128 - 56;
  const w = Math.max(96, Math.min(phone ? 200 : 184, Math.round((phone ? room - 30 : room / 2 - 40) / RATIO))), h = Math.round(w * RATIO);
  return (
    <div className="viewer-veil absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[color-mix(in_srgb,var(--background)_60%,transparent)] px-3 pb-32 backdrop-blur-md" style={{ paddingTop: "calc(var(--head, 170px) + 20px)" }} onClick={onClose}>
      <ul onClick={(e) => e.stopPropagation()} className={phone ? "flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-8 py-4 [scrollbar-width:none]" : "flex max-w-[64rem] flex-wrap items-start justify-center gap-x-5 gap-y-5"}>
        {hand.map(([id, fit], i) => { const s = byId.get(id)!; return (
          <li key={id} className="tray-card shrink-0 snap-center" style={{ animationDelay: `${i * 55}ms`, ["--tilt" as string]: `${((i * 37) % 7) - 3}deg` }}>
            <button type="button" onClick={() => onOpen(id)} aria-label={s.name} className="block cursor-pointer text-center">
              <Stamp src={s.thumbnail_url} ink={s.ink} w={w} h={h} label={s.name} fast={384} />
              <span className="mt-2 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/65">{fit.strange ? "A wild card" : fitWord(fit, judging)}</span>
            </button>
          </li>
        ); })}
      </ul>
      <button type="button" onClick={onClose} className="shrink-0 cursor-pointer bg-foreground px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-background">See them on the sheet</button>
    </div>
  );
}

/** A stamp opened: the entry's pictures at their own shape, the main one large, on a veil of the entry's ink.
 *  The picture is the way in (it is a link to the entry's page), as is the wide button under it. What the sheet
 *  already loaded is shown at once, soft, while the large picture arrives over it. */
function Viewer({ style, family, fit, judging, phone, onTurn, onClose }: { style: AtlasStyle; family: Family | null; fit: Fit | null; judging: boolean; phone: boolean; onTurn: (by: number) => void; onClose: () => void }) {
  const root = useRef<HTMLDivElement | null>(null);
  const swipe = useRef<{ x: number } | null>(null);
  const pictures = useMemo(() => (style.pictures.length > 0 ? style.pictures : style.thumbnail_url ? [style.thumbnail_url] : []), [style]);
  const [at, setAt] = useState(0);
  const [shape, setShape] = useState<number | null>(null);
  const main = pictures[at] ?? null, big = phone ? 750 : 1080;
  // A modal: focus moves in when it opens, stays in while it is open, and goes back where it was when it closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab" && root.current) {
        const stops = [...root.current.querySelectorAll<HTMLElement>("a[href], button")], first = stops[0], last = stops[stops.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } else if (!root.current.contains(document.activeElement)) { e.preventDefault(); first?.focus(); }
        return;
      }
      if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") onTurn(1); else if (e.key === "ArrowLeft") onTurn(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, onTurn]);
  // The other pictures are fetched while the first is looked at, so stepping through them is instant.
  useEffect(() => { for (const p of pictures.slice(1, 4)) { const img = new Image(); img.src = quick(p, big); } }, [pictures, big]);

  // The room for the picture: what is left of the screen after the words and the button; the picture keeps its own shape inside it.
  const roomW = phone ? window.innerWidth - 32 : Math.min(window.innerWidth * 0.62, 1100), roomH = (window.innerHeight - 65) * (phone ? 0.46 : 0.62);
  const ratio = shape ?? 1.5, w = Math.round(Math.min(roomW, roomH * ratio)), h = Math.round(w / ratio);
  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={style.name} className="viewer-veil absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-6 backdrop-blur-2xl backdrop-saturate-150" style={{ background: `color-mix(in srgb, ${style.ink ?? "#888"} 34%, color-mix(in srgb, var(--background) 78%, transparent))` }}
      onClick={onClose} onPointerDown={(e) => { swipe.current = { x: e.clientX }; }} onPointerUp={(e) => { const d = swipe.current ? e.clientX - swipe.current.x : 0; swipe.current = null; if (Math.abs(d) > 70) { e.stopPropagation(); onTurn(d < 0 ? 1 : -1); } }}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 cursor-pointer bg-background/70 p-2.5 backdrop-blur-md"><X size={18} /></button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onTurn(-1); }} aria-label="Previous" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-background/70 p-3 backdrop-blur-md max-md:hidden"><ArrowLeft size={18} /></button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onTurn(1); }} aria-label="Next" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-background/70 p-3 backdrop-blur-md max-md:hidden"><ArrowRight size={18} /></button>

      {main ? (
        <Link href={style.href} onClick={(e) => e.stopPropagation()} aria-label={`Open ${style.name}`} className="viewer-print group relative block shrink-0 bg-[#fbf9f4] p-2 shadow-[0_30px_70px_-24px_rgba(20,25,40,0.6)] md:p-3" style={{ width: w + (phone ? 16 : 24) }}>
          {/* The small picture the sheet already has, stretched soft, holds the place while the large one loads over it. */}
          <span className="relative block overflow-hidden" style={{ width: w, height: h, backgroundImage: `url("${quick(main, 256)}")`, backgroundSize: "cover", backgroundColor: style.ink ?? undefined }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={main} src={quick(main, big)} alt={style.name} decoding="async" draggable={false} onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth > 0) setShape(i.naturalWidth / i.naturalHeight); i.style.opacity = "1"; }} className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300" />
          </span>
          <span className="pointer-events-none absolute bottom-4 right-4 bg-foreground px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-md:hidden">Open</span>
        </Link>
      ) : null}

      {pictures.length > 1 ? (
        <ul onClick={(e) => e.stopPropagation()} className="flex max-w-full shrink-0 gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
          {pictures.map((p, i) => (
            <li key={p} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <button type="button" onClick={() => { setShape(null); setAt(i); }} aria-label={`Picture ${i + 1} of ${pictures.length}`} aria-pressed={i === at} className="block cursor-pointer bg-[#fbf9f4] p-1 shadow-[0_6px_14px_-8px_rgba(20,25,40,0.6)]" style={{ opacity: i === at ? 1 : 0.62 }}><img src={quick(p, 128)} alt="" loading="lazy" className="block h-12 w-auto md:h-14" /></button>
            </li>
          ))}
        </ul>
      ) : null}

      <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-[460px] shrink-0 flex-col items-center gap-1.5 text-center">
        <h2 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] md:text-[30px]">{style.name}</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/70">{style.kind === "language" ? "Design language" : "Art style"}{family ? ` · ${family.label}` : ""}{fit ? <span className="font-bold" style={{ color: fit.strange ? "var(--sakura)" : "var(--ramune)" }}> · {fitWord(fit, judging)}</span> : null}</p>
        {style.traits.length > 0 ? <p className="text-[13.5px] leading-snug text-foreground/75">{style.traits.slice(0, 5).map((t) => TRAIT.get(t) ?? t).join(" · ")}</p> : null}
        <div className="mt-2 flex w-full items-stretch gap-2">
          <button type="button" onClick={() => onTurn(-1)} aria-label="Previous" className="cursor-pointer bg-background/70 px-4 backdrop-blur-md md:hidden"><ArrowLeft size={18} /></button>
          <Link href={style.href} className="flex-1 bg-foreground px-7 py-4 text-center font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background">Open {style.kind === "language" ? "language" : "art style"}</Link>
          <button type="button" onClick={() => onTurn(1)} aria-label="Next" className="cursor-pointer bg-background/70 px-4 backdrop-blur-md md:hidden"><ArrowRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}
