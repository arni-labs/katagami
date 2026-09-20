"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";
import type { AtlasStyle } from "@/lib/catalog";
import { AskDock, NEUTRAL_INK, StyleCard, hueOf, useAsk, useScreen, type Family, type Fit } from "../shared";

// The library as one river. Styles are put in a single order where like sits
// beside like (family by family, along the atlas), then laid as tiles in lanes
// down a serpentine: straight runs joined by U-turns. Each lane steps at its own
// pace, so the inside of a bend carries fewer tiles than the outside and none
// overlap. Tiles turn with the flow and stand upright as they grow toward the
// pointer; on a phone the swell rides down the river as you scroll.

type Slot = { x: number; y: number; a: number; s: number; k: number };
const LIT = 1.32; // a lit tile stands a little proud of the river

/** One order for the whole library: a walk through the families by nearness, each family walked along the way to the next. */
function flow(styles: AtlasStyle[], families: Family[]): AtlasStyle[] {
  const left = [...families];
  const tour: Family[] = [];
  let at = left.sort((a, b) => a.x + a.y - (b.x + b.y)).shift();
  while (at) {
    tour.push(at);
    const here = at;
    left.sort((a, b) => Math.hypot(a.x - here.x, a.y - here.y) - Math.hypot(b.x - here.x, b.y - here.y));
    at = left.shift();
  }
  const out: AtlasStyle[] = [];
  tour.forEach((f, i) => {
    const prev = tour[i - 1] ?? f, next = tour[i + 1] ?? f;
    const dx = next.x - prev.x || 1, dy = next.y - prev.y;
    out.push(...styles.filter((s) => s.family === f.id).sort((a, b) => a.x * dx + a.y * dy - (b.x * dx + b.y * dy)));
  });
  // A style with no family joins the river beside whatever it sits nearest on the atlas.
  const named = new Set(tour.map((f) => f.id));
  for (const s of styles.filter((x) => !x.family || !named.has(x.family))) {
    let best = -1, bestD = Infinity;
    out.forEach((o, i) => { const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bestD) { bestD = d; best = i; } });
    out.splice(best + 1, 0, s);
  }
  return out;
}

/** The serpentine's tile slots, in flow order. `s` is how far down the river a slot is, measured along the middle. */
function course(count: number, width: number, tile: number, gap: number, wanted: number) {
  const pitch = tile + gap, phone = width < 750, margin = phone ? 8 : 56, slack = phone ? 30 : 44;
  // As many lanes as leave a straight run at least a tile long: a narrow phone carries three, not four.
  let lanes = wanted;
  const room = (n: number) => width - 2 * margin - 2 * ((n * pitch) / 2 + (n * pitch) / 2 + slack);
  while (lanes > 2 && room(lanes) < pitch) lanes--;
  const half = (lanes * pitch) / 2, turn = half + slack; // the middle lane's turning radius: the inside lane still has room to turn
  const run = Math.max(pitch, room(lanes));
  const leg = run + Math.PI * turn, x0 = margin + half + turn, top = half + (phone ? 46 : 60);
  const slots: Slot[] = [];
  for (let legNo = 0; slots.length < count + lanes * 4 && legNo < 2000; legNo++) {
    const dir = legNo % 2 === 0 ? 1 : -1, y = top + legNo * turn * 2;
    for (let lane = 0; lane < lanes; lane++) {
      const off = (lane - (lanes - 1) / 2) * pitch; // + is below the middle on a rightward run
      // Slots share a stretch evenly, never closer than a tile and its gap, so a run meets its turn without a pinch.
      const along = Math.max(1, Math.floor(run / pitch)), step = run / along;
      // The first run starts at the page's edge, not where a turn would have put it.
      const lead = legNo === 0 ? Math.floor((x0 - margin - pitch / 2) / step) : 0;
      for (let k = -Math.max(0, lead); k < along; k++) { const d = (k + 0.5) * step; slots.push({ x: dir === 1 ? x0 + d : x0 + run - d, y: y + off * dir, a: 0, s: legNo * leg + d, k: 1 }); }
      // The U-turn: a half circle about a point level with the next run's start. Tiles turn with
      // the flow, so it is their inner edges that would touch first: the count is taken there.
      // Neighbours in the next lane sit at other angles, and two squares turned against each other need
      // more room than two that are square-on: in a turn a tile is drawn just small enough (`k`) to clear any of them.
      const r = turn - off, n = Math.max(1, Math.floor((Math.PI * (r - tile / 2)) / (tile + 1)));
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) / n) * Math.PI, cx = dir === 1 ? x0 + run : x0, cy = y + turn;
        slots.push({ x: cx + dir * Math.sin(t) * r, y: cy - Math.cos(t) * r, a: dir * t, s: legNo * leg + run + t * turn, k: Math.min(1, pitch / (tile * (0.5 + Math.SQRT1_2))) });
      }
    }
  }
  slots.sort((p, q) => p.s - q.s);
  const used = slots.slice(0, count);
  return { slots: used, height: used.reduce((low, p) => Math.max(low, p.y), 0) + half + 200, leg, turn, half, top };
}

type TileProps = { ordered: AtlasStyle[]; slots: Slot[]; tile: number; lit: Set<string> | null; fits: Map<string, Fit> | null; openId: string | null; lift: number; hold: (id: string, el: HTMLButtonElement | null) => void; onOpen: (id: string) => void; onNear: (x: number, y: number) => void };
// The tiles are the heavy part (hundreds of pictures). They depend on nothing that changes as the
// page scrolls or the pointer moves, so they are drawn once and the swell moves them by hand.
const Tiles = memo(function Tiles({ ordered, slots, tile, lit, fits, openId, lift, hold, onOpen, onNear }: TileProps) {
  return (
    <>
      {ordered.map((s, i) => {
        const p = slots[i], fit = fits?.get(s.id);
        if (!p) return null;
        return (
          <button key={s.id} type="button" ref={(el) => hold(s.id, el)} onClick={() => onOpen(s.id)} onFocus={() => onNear(p.x, p.y)} aria-label={s.name}
            className="river-tile absolute block cursor-pointer overflow-hidden bg-muted [&_img]:object-cover" style={{ left: p.x - tile / 2, top: p.y - tile / 2, width: tile, height: tile, transform: `rotate(${p.a}rad) scale(${lit?.has(s.id) ? lift : p.k})`, zIndex: lit?.has(s.id) ? 8 : undefined, background: s.ink ?? undefined, opacity: lit && !lit.has(s.id) ? 0.3 : 1, outline: openId === s.id ? "2px solid var(--foreground)" : fit ? `2px solid var(${fit.strange ? "--sakura" : "--ramune"})` : undefined, outlineOffset: 1 }}>
            {s.thumbnail_url ? <GalleryImage src={s.thumbnail_url} alt="" sizes="128px" className="object-cover" /> : null}
          </button>
        );
      })}
    </>
  );
});

export function River({ styles, families }: { styles: AtlasStyle[]; families: Family[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const scroller = useRef<HTMLDivElement | null>(null);
  const strip = useRef<HTMLCanvasElement | null>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const [width, setWidth] = useState(0);
  const windowEl = useRef<HTMLSpanElement | null>(null);
  const bar = useRef<HTMLDivElement | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const [named, setNamed] = useState<string | null>(null);
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const ordered = useMemo(() => flow(styles, families), [styles, families]);
  const tile = phone ? 30 : 46, gap = phone ? 3 : 4, lanes = phone ? 4 : 5;
  // The scrubber keeps a strip of the right edge to itself.
  const lay = useMemo(() => (width ? course(ordered.length, width - (phone ? 18 : 30), tile, gap, lanes) : null), [ordered.length, width, phone, tile, gap, lanes]);
  const spot = useMemo(() => new Map(ordered.map((s, i) => [s.id, i])), [ordered]);
  const hold = useCallback((id: string, el: HTMLButtonElement | null) => { if (el) tiles.current.set(id, el); else tiles.current.delete(id); }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  // Slots bucketed by place, so the swell looks only at the tiles around the pointer however long the river grows.
  const CELL = 160;
  const grid = useMemo(() => {
    const cells = new Map<string, number[]>();
    lay?.slots.forEach((p, i) => { const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`; const cell = cells.get(key); if (cell) cell.push(i); else cells.set(key, [i]); });
    return cells;
  }, [lay]);
  const litRef = useRef(lit);
  useEffect(() => { litRef.current = lit; }, [lit]);

  // ---- the swell ------------------------------------------------------------
  const swollen = useRef(new Set<string>());
  const swell = useCallback((px: number, py: number) => {
    if (!lay) return;
    const reach = phone ? 84 : 150, grow = phone ? 1.5 : 1.7;
    const now = new Set<string>();
    let nearest: string | null = null, nearestD = Infinity;
    const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    const around = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].flatMap((dy) => grid.get(`${cx + dx},${cy + dy}`) ?? []));
    around.forEach((i) => {
      const s = ordered[i], p = lay.slots[i], d = Math.hypot(p.x - px, p.y - py);
      if (d > reach) return;
      const el = tiles.current.get(s.id);
      if (!el) return;
      const m = Math.cos((d / reach) * (Math.PI / 2)) ** 2; // 1 under the pointer, 0 at the rim
      // A fisheye: tiles are pushed out from the pointer in step with how much the ones inside them have grown.
      const out = d * 1.5 * m;
      el.style.transform = `translate(${((p.x - px) / (d || 1)) * out}px, ${((p.y - py) / (d || 1)) * out}px) rotate(${p.a * (1 - m)}rad) scale(${Math.max(litRef.current?.has(s.id) ? LIT : p.k, p.k + m * m * grow)})`;
      el.style.zIndex = String(10 + Math.round(m * 50));
      now.add(s.id);
      if (d < nearestD) { nearestD = d; nearest = s.id; }
    });
    for (const id of swollen.current) if (!now.has(id)) { const el = tiles.current.get(id), p = lay.slots[spot.get(id) ?? 0]; if (el) { el.style.transform = `rotate(${p.a}rad) scale(${litRef.current?.has(id) ? LIT : p.k})`; el.style.zIndex = ""; } }
    swollen.current = now;
    setNamed((was) => (was === nearest ? was : nearest));
  }, [lay, ordered, spot, phone, grid]);

  // On a phone there is no pointer to follow: the swell travels down the middle of the river as the page scrolls.
  const ride = useCallback(() => {
    const el = scroller.current;
    if (!el || !lay || lay.slots.length === 0) return;
    // The scrubber's window is moved by hand: state here would redraw the page on every scroll event.
    if (windowEl.current) { windowEl.current.style.top = `${(el.scrollTop / lay.height) * 100}%`; windowEl.current.style.height = `${Math.min(100, (el.clientHeight / lay.height) * 100)}%`; }
    bar.current?.setAttribute("aria-valuenow", String(Math.round((el.scrollTop / Math.max(1, lay.height - el.clientHeight)) * 100)));
    if (!phone) return;
    const y = el.scrollTop + el.clientHeight * 0.42;
    const s = Math.max(0, ((y - lay.slots[0].y + lay.turn) / (lay.turn * 2)) * lay.leg - lay.leg / 2);
    // Slots are in flow order: find the one at `s` by halving, then the nearest to it that a grown tile fits on screen at.
    let lo = 0, hi = lay.slots.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (lay.slots[mid].s < s) lo = mid + 1; else hi = mid; }
    let best = lo;
    const inside = (p: Slot | undefined) => p !== undefined && p.x > 64 && p.x < width - 84;
    for (let step = 0; step < 40 && !inside(lay.slots[best]); step++) best = inside(lay.slots[lo + step]) ? lo + step : inside(lay.slots[lo - step]) ? lo - step : best;
    swell(lay.slots[best].x, lay.slots[best].y);
  }, [lay, phone, swell, width]);
  useEffect(() => { const frame = requestAnimationFrame(ride); return () => cancelAnimationFrame(frame); }, [ride]);

  const goTo = useCallback((id: string) => {
    const i = spot.get(id), el = scroller.current;
    if (i === undefined || !lay || !el) return;
    setOpenId(id);
    el.scrollTo({ top: Math.max(0, lay.slots[i].y - el.clientHeight * 0.4), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [spot, lay]);
  // An answer takes the river to its best fit.
  const led = useRef("");
  useEffect(() => {
    const first = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
    const key = first ? first + ask.answer?.query : "";
    if (!first || led.current === key) return;
    led.current = key;
    const i = spot.get(first), el = scroller.current;
    if (i !== undefined && lay && el) el.scrollTo({ top: Math.max(0, lay.slots[i].y - el.clientHeight * 0.4), behavior: "smooth" });
  }, [ask.fits, ask.answer, byId, spot, lay]);

  // ---- the scrubber: the whole river as a strip of its inks -----------------
  useEffect(() => {
    const c = strip.current;
    if (!c || !lay) return;
    const h = c.clientHeight, w = c.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    ordered.forEach((s, i) => {
      const on = !lit || lit.has(s.id);
      g.globalAlpha = on ? 1 : 0.18;
      g.fillStyle = s.ink ?? NEUTRAL_INK;
      g.fillRect(lit?.has(s.id) ? 0 : 3, (lay.slots[i].y / lay.height) * h, lit?.has(s.id) ? w : w - 6, Math.max(1.5, (tile / lay.height) * h * 0.9));
    });
  }, [ordered, lay, lit, tile]);
  const scrub = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el || !lay || (e.type === "pointermove" && e.buttons === 0)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.scrollTop = ((e.clientY - rect.top) / rect.height) * lay.height - el.clientHeight / 2;
  };

  // A family is named on the bank where its stretch begins.
  const banks = useMemo(() => {
    if (!lay) return [];
    const out: { f: Family; x: number; y: number }[] = [];
    let last = "";
    ordered.forEach((s, i) => {
      if (!s.family || s.family === last) return;
      last = s.family;
      const f = familyOf.get(s.family), p = lay.slots[i];
      if (!f || f.count < (phone ? 8 : 5)) return;
      // Over the run it starts on, just clear of the outer lane.
      const y = lay.top + Math.round((p.y - lay.top) / (lay.turn * 2)) * lay.turn * 2 - lay.half - 15;
      if (!out.some((o) => o.y === y && Math.abs(o.x - p.x) < f.label.length * 7 + 30)) out.push({ f, x: p.x, y });
    });
    return out;
  }, [lay, ordered, familyOf, phone]);

  const open = openId ? byId.get(openId) ?? null : null;
  const name = named ? byId.get(named) : null, nameAt = named && lay ? lay.slots[spot.get(named) ?? 0] : null;

  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div className="relative h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden md:h-[calc(100dvh-65px)]">
      <h1 className="sr-only">Explore the library</h1>
      <div ref={scroller} id="river" onScroll={ride} className="h-full w-full overflow-y-auto overflow-x-hidden pr-5 md:pr-8" style={{ overscrollBehavior: "contain" }}
        onPointerMove={(e) => { if (e.pointerType !== "mouse" || !scroller.current) return; const r = scroller.current.getBoundingClientRect(); swell(e.clientX - r.left, e.clientY - r.top + scroller.current.scrollTop); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") swell(-9999, -9999); }}>
        <div className="relative" style={{ height: lay?.height ?? 0 }}>
          <p className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:left-6 md:top-4"><span className="text-foreground">{styles.length}</span> styles, like beside like</p>
          {banks.map(({ f, x, y }) => <span key={f.id} aria-hidden className="explore-halo pointer-events-none absolute z-[5] -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-foreground/75" style={{ left: Math.min(Math.max(x, 70), width - 90), top: y, opacity: lit ? 0.3 : 1 }}>{f.label}</span>)}
          {lay ? <Tiles ordered={ordered} slots={lay.slots} tile={tile} lit={lit} fits={ask.fits} openId={openId} lift={LIT} hold={hold} onOpen={setOpenId} onNear={swell} /> : null}
          {name && nameAt ? <p aria-hidden className="pointer-events-none absolute z-[70] -translate-x-1/2 whitespace-nowrap bg-foreground px-1.5 py-0.5 text-[12px] font-semibold text-background" style={{ left: Math.min(Math.max(nameAt.x, 60), width - 80), top: nameAt.y + (tile * (1 + (phone ? 1.5 : 1.7))) / 2 + 8 }}>{name.name}</p> : null}
        </div>
      </div>

      <div ref={bar} tabIndex={0} className="absolute bottom-3 right-1 top-3 z-20 w-4 cursor-ns-resize touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] md:right-2 md:w-5" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }} onPointerMove={scrub}
        onKeyDown={(e) => { const el = scroller.current; if (!el || !lay) return; const by = { ArrowDown: 80, ArrowUp: -80, PageDown: el.clientHeight * 0.9, PageUp: -el.clientHeight * 0.9, Home: -lay.height, End: lay.height }[e.key]; if (by === undefined) return; e.preventDefault(); el.scrollTop += by; }}
        role="scrollbar" aria-label="The whole river" aria-controls="river" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} aria-orientation="vertical">
        <canvas ref={strip} aria-hidden className="h-full w-full" />
        <span ref={windowEl} aria-hidden className="pointer-events-none absolute inset-x-[-2px] shadow-[0_0_0_2px_var(--foreground)]" style={{ top: 0, height: "20%" }} />
      </div>

      {open ? <StyleCard style={open} family={open.family ? familyOf.get(open.family) ?? null : null} fit={ask.fits?.get(open.id) ?? null} judging={ask.state === "asking"} byId={byId} onGo={goTo} onClose={() => setOpenId(null)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={goTo} byId={byId} lit={lit ? lit.size : null} />
    </div>
  );
}
