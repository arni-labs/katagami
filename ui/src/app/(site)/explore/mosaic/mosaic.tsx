"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasStyle } from "@/lib/catalog";
import { AskDock, StyleCard, hueOf, useAsk, useScreen, type Family, type Fit } from "../shared";
import { flow } from "../river/course";
import { Stamp } from "../stamp";

// The whole library as one sheet of stamps on one screen. How the sheet is sorted
// is the picture it makes: by colour it is a spectrum (each stamp veiled in its own ink until you come close), by family a quilt, by fit
// a bloom from the middle. Stamps slide to their new places when the sort changes,
// and swell toward the pointer so any of them can be read.

type Mode = "colour" | "family" | "fit";
type Cell = { x: number; y: number };

const hsl = (ink: string | null) => {
  if (!ink) return { h: 0, s: 0, l: 0.6 };
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const h = d === 0 ? 0 : (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};

type SheetProps = { veil: number; styles: AtlasStyle[]; place: Map<string, Cell>; w: number; h: number; lit: Set<string> | null; fits: Map<string, Fit> | null; openId: string | null; hold: (id: string, el: HTMLSpanElement | null) => void; onOpen: (id: string) => void; onNear: (id: string) => void };
// Hundreds of stamps: drawn when the sort or the light changes, never as the pointer moves.
const Sheet = memo(function Sheet({ veil, styles, place, w, h, lit, fits, openId, hold, onOpen, onNear }: SheetProps) {
  return (
    <>
      {styles.map((s, i) => {
        const p = place.get(s.id), fit = fits?.get(s.id);
        if (!p) return null;
        return (
          <button key={s.id} type="button" onClick={() => onOpen(s.id)} onFocus={() => onNear(s.id)} aria-label={s.name} data-id={s.id} className="mosaic-stamp absolute left-0 top-0 block cursor-pointer" style={{ width: w, height: h, transform: `translate(${p.x}px, ${p.y}px)`, transitionDelay: `${(i % 23) * 9}ms`, opacity: lit && !lit.has(s.id) ? 0.22 : 1 }}>
            <span ref={(el) => hold(s.id, el)} className="mosaic-swell block" style={{ outline: openId === s.id ? "2px solid var(--foreground)" : fit ? `2px solid var(${fit.strange ? "--sakura" : "--ramune"})` : undefined, outlineOffset: 1 }}>
              <Stamp src={s.thumbnail_url} ink={s.ink} w={w} h={h} sizes="128px" veil={veil} />
            </span>
          </button>
        );
      })}
    </>
  );
});

export function Mosaic({ styles, families }: { styles: AtlasStyle[]; families: Family[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const box = useRef<HTMLDivElement | null>(null);
  const inner = useRef(new Map<string, HTMLSpanElement>());
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<Mode>("colour");
  const [openId, setOpenId] = useState<string | null>(null);
  const [named, setNamed] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);

  // The sheet is sized so the whole library fits the room above the ask.
  const grid = useMemo(() => {
    const n = Math.max(1, styles.length), padX = phone ? 8 : 28, top = phone ? 46 : 56, bottom = phone ? 132 : 138, ratio = 1.16;
    const availW = size.w - padX * 2, availH = size.h - top - bottom;
    if (availW <= 0 || availH <= 0) return null;
    let w = Math.floor(Math.sqrt((availW * availH) / (n * ratio))), cols = 1, rows = 1;
    for (; w > 6; w--) { cols = Math.floor(availW / w); rows = Math.ceil(n / cols); if (rows * Math.round(w * ratio) <= availH) break; }
    const h = Math.round(w * ratio), gap = w > 24 ? 2 : 1;
    return { w: w - gap, h: h - gap, cols, rows, x0: padX + (availW - cols * w) / 2, y0: top + (availH - rows * h) / 2, stepX: w, stepY: h };
  }, [size, styles.length, phone]);

  const topFit = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
  // An answer re-sorts the sheet by fit; clearing it goes back to colour.
  const [seenFit, setSeenFit] = useState<string | undefined>(undefined);
  if (seenFit !== topFit) { setSeenFit(topFit); setMode(topFit ? "fit" : mode === "fit" ? "colour" : mode); }

  const place = useMemo(() => {
    const out = new Map<string, Cell>();
    if (!grid) return out;
    const at = (col: number, row: number): Cell => ({ x: grid.x0 + col * grid.stepX, y: grid.y0 + row * grid.stepY });
    if (mode === "colour") {
      // Columns run through the hues, each column from light to dark; the greys close the sheet.
      const tone = styles.map((s) => ({ s, c: hsl(s.ink) }));
      const grey = tone.filter((t) => t.c.s < 0.22), hued = tone.filter((t) => t.c.s >= 0.22).sort((a, b) => ((a.c.h + 30) % 360) - ((b.c.h + 30) % 360));
      const all = [...hued, ...grey.sort((a, b) => b.c.l - a.c.l)];
      for (let col = 0; col * grid.rows < all.length; col++) all.slice(col * grid.rows, (col + 1) * grid.rows).sort((a, b) => b.c.l - a.c.l).forEach((t, row) => out.set(t.s.id, at(col, row)));
    } else if (mode === "family") {
      flow(styles, families).forEach((s, i) => out.set(s.id, at(i % grid.cols, Math.floor(i / grid.cols))));
    } else {
      // The fits bloom from the middle, best first; the rest follow by how near they sit to the best on the atlas.
      const lead = topFit ? byId.get(topFit) : undefined;
      const rank = (s: AtlasStyle) => ask.fits?.get(s.id)?.rank ?? 1000 + (lead ? Math.hypot(s.x - lead.x, s.y - lead.y) * 1000 : 0);
      const cells = Array.from({ length: grid.cols * grid.rows }, (_, k) => ({ col: k % grid.cols, row: Math.floor(k / grid.cols) })).sort((a, b) => Math.hypot((a.col - (grid.cols - 1) / 2) * grid.stepX, (a.row - (grid.rows - 1) / 2) * grid.stepY) - Math.hypot((b.col - (grid.cols - 1) / 2) * grid.stepX, (b.row - (grid.rows - 1) / 2) * grid.stepY));
      [...styles].sort((a, b) => rank(a) - rank(b)).forEach((s, i) => { const c = cells[i]; if (c) out.set(s.id, at(c.col, c.row)); });
    }
    return out;
  }, [grid, mode, styles, families, ask.fits, topFit, byId]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  // ---- the swell --------------------------------------------------------------
  const swollen = useRef(new Set<string>());
  const swell = useCallback((px: number, py: number) => {
    if (!grid) return;
    const reach = Math.max(phone ? 96 : 150, grid.w * 3.4), grow = Math.max(1.4, (phone ? 84 : 118) / grid.w - 1);
    const now = new Set<string>();
    let nearest: string | null = null, nearestD = Infinity;
    for (const [id, p] of place) {
      const cx = p.x + grid.w / 2, cy = p.y + grid.h / 2;
      if (Math.abs(cx - px) > reach || Math.abs(cy - py) > reach) continue;
      const d = Math.hypot(cx - px, cy - py);
      if (d > reach) continue;
      const el = inner.current.get(id);
      if (!el) continue;
      const m = Math.cos((d / reach) * (Math.PI / 2)) ** 2, out = d * Math.max(1.7, grow * 0.85) * m; // the more a stamp grows, the more room its neighbours make
      el.style.setProperty("--veil", String(Math.max(0, 1 - m * 1.6))); // the picture comes through as a stamp grows
      el.style.transform = `translate(${((cx - px) / (d || 1)) * out}px, ${((cy - py) / (d || 1)) * out}px) scale(${1 + m * m * grow})`;
      (el.parentElement as HTMLElement).style.zIndex = String(10 + Math.round(m * 60));
      now.add(id);
      if (d < nearestD) { nearestD = d; nearest = id; }
    }
    for (const id of swollen.current) if (!now.has(id)) { const el = inner.current.get(id); if (el) { el.style.transform = ""; el.style.removeProperty("--veil"); (el.parentElement as HTMLElement).style.zIndex = ""; } }
    swollen.current = now;
    setNamed((was) => (was === nearest ? was : nearest));
  }, [grid, place, phone]);
  const hold = useCallback((id: string, el: HTMLSpanElement | null) => { if (el) inner.current.set(id, el); else inner.current.delete(id); }, []);
  const nearId = useCallback((id: string) => { const p = place.get(id); if (p && grid) swell(p.x + grid.w / 2, p.y + grid.h / 2); }, [place, grid, swell]);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" && e.buttons === 0 && e.pressure === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    swell(e.clientX - r.left, e.clientY - r.top - (e.pointerType === "mouse" ? 0 : 56)); // above the finger, where it can be seen
  };
  const goTo = useCallback((id: string) => { setOpenId(id); nearId(id); }, [nearId]);

  const name = named ? byId.get(named) : null, nameAt = named ? place.get(named) : null;
  const tab = (value: Mode, label: string, off = false) => (
    <button type="button" disabled={off} aria-pressed={mode === value} onClick={() => setMode(value)} className={`cursor-pointer px-3 py-1.5 text-[12.5px] disabled:cursor-default disabled:opacity-40 ${mode === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div ref={box} className="relative h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full select-none overflow-hidden md:h-[calc(100dvh-65px)]">
      <h1 className="sr-only">Explore the library</h1>
      <div className="absolute inset-0 touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(e) => { if (e.pointerType === "mouse") swell(-9999, -9999); }}>
        {grid ? <Sheet veil={mode === "colour" ? 0.82 : 0} styles={styles} place={place} w={grid.w} h={grid.h} lit={lit} fits={ask.fits} openId={openId} hold={hold} onOpen={setOpenId} onNear={nearId} /> : null}
        {name && nameAt && grid ? <p aria-hidden className="pointer-events-none absolute z-[90] -translate-x-1/2 whitespace-nowrap bg-foreground px-1.5 py-0.5 text-[12px] font-semibold text-background" style={{ left: Math.min(Math.max(nameAt.x + grid.w / 2, 60), size.w - 60), top: nameAt.y + grid.h / 2 + (phone ? 50 : 72) }}>{name.name}</p> : null}
      </div>
      <div className="absolute inset-x-0 top-2.5 z-20 flex items-center justify-center gap-3 px-3">
        <div role="group" aria-label="Sort the sheet" className="flex bg-[color-mix(in_srgb,var(--foreground)_6%,var(--background))]">{tab("colour", "By colour")}{tab("family", "By family")}{tab("fit", "By fit", !topFit)}</div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground max-md:hidden"><span className="text-foreground">{styles.length}</span> styles</p>
      </div>
      {open(openId, byId) ? <StyleCard style={open(openId, byId)!} family={familyOf.get(open(openId, byId)!.family ?? "") ?? null} fit={ask.fits?.get(openId ?? "") ?? null} judging={ask.state === "asking"} byId={byId} onGo={goTo} onClose={() => setOpenId(null)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={goTo} byId={byId} lit={lit ? lit.size : null} />
    </div>
  );
}

const open = (id: string | null, byId: Map<string, AtlasStyle>) => (id ? byId.get(id) ?? null : null);
