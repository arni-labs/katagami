"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { FitPicture } from "../../atlas/fit-picture";
import { GlassLens } from "./glass-lens";
import { AskDock, NEUTRAL_INK, StyleCard, hueOf, isDark, useAsk, useScreen, type Family } from "../shared";

// The library as one halftone. Every style is a dot in the colour its artwork
// reads as, placed where the atlas put it, so likeness shows as continents of
// colour. Dots are drawn once to a canvas; the lens is the only thing that
// moves, and it shows the nearest styles as pictures, the nearest largest.

const RING = [{ n: 1, at: 0, h: 90 }, { n: 6, at: 0.6, h: 49 }, { n: 12, at: 0.855, h: 30 }]; // slots as a share of the lens radius
const SHOWN = RING.reduce((sum, r) => sum + r.n, 0);

// A steady pseudo-random number per (index, salt): the field must not shimmer between draws.
/** An ink a little more saturated than measured: a mean of pixels is always duller than the print it came from. */
function vivid(ink: string | null): string {
  if (!ink) return NEUTRAL_INK;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
  const mean = (r + g + b) / 3;
  return `rgb(${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(mean + (v - mean) * 1.45)))).join(",")})`;
}
const rand = (i: number, salt: number) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

export function HalftoneField({ styles, families, holes }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const box = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const lensEl = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [near, setNear] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const [touched, setTouched] = useState(false);
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const reduced = useRef(false);
  const [theme, setTheme] = useState(0); // bumped when the page changes theme: the inks blend differently on a dark ground

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    const themed = new MutationObserver(() => setTheme((n) => n + 1));
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { watch.disconnect(); themed.disconnect(); };
  }, [screen]);

  // The atlas square, fitted to whatever room there is (a tall phone stretches it; dots do not mind).
  const R = Math.round(Math.min(phone ? 136 : 184, size.w * 0.44));
  const dockRoom = phone ? 172 : 128; // the lens never slides under the ask
  const place = useCallback((x: number, y: number) => {
    const mx = phone ? 22 : 64, top = phone ? 34 : 44, bottom = phone ? 128 : 140;
    return { x: mx + x * (size.w - mx * 2), y: top + y * (size.h - top - bottom) };
  }, [size, phone]);
  const dots = useMemo(() => styles.map((s) => ({ s, ...place(s.x, s.y) })), [styles, place]);

  // Which dots are lit: an answer's fits, or a colour.
  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  // ---- the halftone, drawn once per change --------------------------------
  useEffect(() => {
    const c = canvas.current;
    if (!c || size.w === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size.w * dpr; c.height = size.h * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size.w, size.h);
    const dark = isDark();
    g.globalCompositeOperation = dark ? "screen" : "multiply"; // inks overprint, as on a riso
    const base = phone ? 4.4 : 6.2;
    // Directions still to come: the faint grain the made work sits in.
    g.fillStyle = dark ? "rgba(255,255,255,0.10)" : "rgba(20,25,35,0.10)";
    holes.forEach((h) => { const p = place(h.x, h.y); g.beginPath(); g.arc(p.x, p.y, 1.5, 0, Math.PI * 2); g.fill(); });
    dots.forEach(({ s, x, y }, i) => {
      const on = !lit || lit.has(s.id);
      const fit = ask.fits?.get(s.id);
      const r = fit ? base + 3 + (fit.fit ?? 0.5) * 9 : on ? base * (0.8 + rand(i, 1) * 0.5) : base * 0.5;
      g.fillStyle = vivid(s.ink);
      // Satellites: smaller dots of the same ink around each style give the field its tone.
      g.globalAlpha = on ? 0.5 : 0.2;
      for (let k = 0; k < 7; k++) {
        const a = rand(i, k + 2) * Math.PI * 2, d = (phone ? 9 : 12) + rand(i, k + 11) * (phone ? 16 : 26);
        g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rand(i, k + 23) * (phone ? 1.8 : 2.6), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = on ? 0.92 : 0.32;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    g.globalAlpha = 1;
  }, [dots, holes, lit, ask.fits, size, phone, place, theme]);

  // ---- the lens -----------------------------------------------------------
  const at = useRef({ x: 0, y: 0, tx: 0, ty: 0, run: 0 });
  const nearKey = useRef("");
  const look = useCallback((x: number, y: number) => {
    // The nineteen nearest, kept in a short sorted list as the dots go by: no sort of the whole library per pointer event.
    const ranked: { id: string; a: number; d: number }[] = [];
    for (const dot of dots) {
      const d = (dot.x - x) ** 2 + (dot.y - y) ** 2;
      if (ranked.length === SHOWN && d >= ranked[SHOWN - 1].d) continue;
      let at = ranked.length;
      while (at > 0 && ranked[at - 1].d > d) at--;
      ranked.splice(at, 0, { id: dot.s.id, a: Math.atan2(dot.y - y, dot.x - x), d });
      if (ranked.length > SHOWN) ranked.pop();
    }
    // Each ring keeps its members in the order they sit around the lens point, so a picture is on the side its dot is on.
    const out: string[] = [];
    let from = 0;
    for (const ring of RING) {
      const part = ranked.slice(from, from + ring.n);
      if (ring.n > 1) part.sort((p, q) => p.a - q.a);
      out.push(...part.map((p) => p.id));
      from += ring.n;
    }
    const key = out.join();
    if (key !== nearKey.current) { nearKey.current = key; setNear(out); }
  }, [dots]);
  const moveTo = useCallback((x: number, y: number, glide: boolean) => {
    const a = at.current;
    a.tx = Math.min(size.w - R - 6, Math.max(R + 6, x));
    a.ty = Math.min(size.h - dockRoom - R - 6, Math.max(R + 6, y));
    const paint = () => {
      const el = lensEl.current;
      if (!el) return;
      el.style.transform = `translate3d(${a.x - R}px, ${a.y - R}px, 0)`;
      // The glass answers to movement: its highlights swing to face the way it is travelling, and the
      // light on the prints inside leads the same way. At rest the light comes from the upper left.
      const vx = a.tx - a.x, vy = a.ty - a.y, speed = Math.hypot(vx, vy);
      if (speed > 0.6) el.style.setProperty("--la", (Math.atan2(vy, vx) * (180 / Math.PI) - 118).toFixed(0));
      el.style.setProperty("--lx", (-R * 0.55 + vx * 5).toFixed(0)); el.style.setProperty("--ly", (-R * 0.6 + vy * 5).toFixed(0));
    };
    if (!glide || reduced.current) { a.x = a.tx; a.y = a.ty; paint(); look(Math.min(size.w, Math.max(0, x)), Math.min(size.h, Math.max(0, y))); return; }
    look(Math.min(size.w, Math.max(0, x)), Math.min(size.h, Math.max(0, y)));
    if (a.run) return;
    const step = () => {
      a.x += (a.tx - a.x) * 0.22; a.y += (a.ty - a.y) * 0.22;
      paint();
      a.run = Math.abs(a.tx - a.x) + Math.abs(a.ty - a.y) > 0.4 ? requestAnimationFrame(step) : 0;
    };
    a.run = requestAnimationFrame(step);
  }, [size, R, dockRoom, look]);
  useEffect(() => () => cancelAnimationFrame(at.current.run), []);

  // Open on the middle of the field, so the first thing seen is the lens at work.
  const opened = useRef(false);
  useEffect(() => {
    if (size.w === 0 || dots.length === 0) return;
    // A resize keeps the lens where it was looking, clamped to the new room.
    if (opened.current) { const frame = requestAnimationFrame(() => moveTo(at.current.tx, at.current.ty, false)); return () => cancelAnimationFrame(frame); }
    // On the next frame: the lens reads the laid-out field, and an effect is no place to set state.
    const frame = requestAnimationFrame(() => {
      opened.current = true;
      at.current.x = size.w / 2; at.current.y = size.h * 0.4;
      moveTo(size.w / 2, size.h * 0.4, false);
    });
    return () => cancelAnimationFrame(frame);
  }, [size, dots, moveTo]);

  const flyTo = useCallback((id: string) => {
    const d = dots.find((p) => p.s.id === id);
    if (!d) return;
    setLocked(true); setOpenId(id); moveTo(d.x, d.y, true);
  }, [dots, moveTo]);
  // An answer takes the lens to its best fit.
  const led = useRef("");
  useEffect(() => {
    const first = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
    if (!first || led.current === first + ask.answer?.query) return;
    const d = dots.find((p) => p.s.id === first);
    if (!d) return;
    const frame = requestAnimationFrame(() => { led.current = first + ask.answer?.query; setLocked(true); moveTo(d.x, d.y, true); });
    return () => cancelAnimationFrame(frame);
  }, [ask.fits, ask.answer, byId, dots, moveTo]);

  const pointer = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, touch: e.pointerType !== "mouse" };
  };
  const dragging = useRef(false);
  const onMove = (e: React.PointerEvent) => {
    const p = pointer(e);
    if (p.touch) { if (dragging.current) moveTo(p.x, p.y - R - 28, true); return; } // the lens rides above the finger
    if (!locked) moveTo(p.x, p.y, true);
    else if (lensEl.current) { lensEl.current.style.setProperty("--lx", (p.x - at.current.x).toFixed(0)); lensEl.current.style.setProperty("--ly", (p.y - at.current.y).toFixed(0)); } // pinned: the pointer is the light
  };
  const onDown = (e: React.PointerEvent) => {
    const p = pointer(e);
    setTouched(true);
    if (p.touch) { dragging.current = true; setLocked(true); setOpenId(null); e.currentTarget.setPointerCapture(e.pointerId); moveTo(p.x, p.y - R - 28, true); return; }
    // A click pins the lens so its pictures can be reached; a click on the field lets it go again.
    if (locked) { setLocked(false); setOpenId(null); moveTo(p.x, p.y, true); } else { setLocked(true); if (near[0]) setOpenId(near[0]); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const by = { ArrowLeft: [-28, 0], ArrowRight: [28, 0], ArrowUp: [0, -28], ArrowDown: [0, 28] }[e.key];
    if (by) { e.preventDefault(); setTouched(true); setLocked(true); moveTo(at.current.tx + by[0], at.current.ty + by[1], true); }
    else if (e.key === "Enter" && near[0]) { setLocked(true); setOpenId(near[0]); }
    else if (e.key === "Escape") { setLocked(false); setOpenId(null); }
  };

  const labels = useMemo(() => {
    const kept: { f: Family; x: number; y: number; w: number }[] = [];
    for (const f of families) {
      if (f.count < (phone ? 9 : 5)) continue;
      const p = place(f.x, f.y), w = f.label.length * 6.6 + 12;
      if (kept.some((o) => Math.abs(o.x - p.x) < (o.w + w) / 2 + 8 && Math.abs(o.y - p.y) < 20)) continue;
      kept.push({ f, x: p.x, y: p.y, w });
    }
    return kept;
  }, [families, place, phone]);

  const open = openId ? byId.get(openId) ?? null : null;
  const named = byId.get(hover ?? near[0] ?? "");
  const slots = useMemo(() => RING.flatMap((ring) => Array.from({ length: ring.n }, (_, k) => {
    // Rings start at the left (-π) because members are sorted by atan2, which starts there.
    const a = -Math.PI + (k + 0.5) * ((Math.PI * 2) / ring.n);
    return { x: ring.n === 1 ? 0 : Math.cos(a) * ring.at * R, y: ring.n === 1 ? 0 : Math.sin(a) * ring.at * R, h: Math.round(ring.h * (R / 184)) };
  })), [R]);

  if (!screen) return <div className="h-[calc(100dvh-var(--site-header))] w-full" aria-busy="true" />;
  return (
    <div ref={box} className="relative h-[calc(100dvh-var(--site-header))] w-full select-none overflow-hidden">
      <h1 className="sr-only">Explore the library</h1>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" style={{ width: size.w, height: size.h }} />
      <div role="application" aria-label="The field. Arrow keys move the lens; Enter opens the nearest style." tabIndex={0} onKeyDown={onKey} className="absolute inset-0 touch-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--ramune)]" onPointerMove={onMove} onPointerDown={onDown} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }} style={{ cursor: locked ? "default" : "none" }} />
      {labels.map(({ f, x, y }) => (
        <span key={f.id} aria-hidden className="explore-halo pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/80 transition-opacity duration-300" style={{ left: x, top: y, opacity: lit ? 0.25 : 1 }}>{f.label}</span>
      ))}
      <p className="pointer-events-none absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:left-6 md:top-4"><span className="text-foreground">{styles.length}</span> styles · {holes.length} to come</p>

      <div ref={lensEl} className="absolute left-0 top-0 will-change-transform" style={{ width: R * 2, height: R * 2, pointerEvents: "none" }}>
        <GlassLens radius={R}>
        {near.map((id, i) => {
          const s = byId.get(id), slot = slots[i];
          if (!s || !slot) return null;
          const fit = ask.fits?.get(id);
          return (
            <button key={id} type="button" aria-label={s.name} onClick={() => { setLocked(true); setOpenId(id); }} onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover(null)} onFocus={() => { setLocked(true); setHover(id); }} onBlur={() => setHover(null)}
              className="explore-lens-item absolute cursor-pointer" style={{ pointerEvents: locked ? "auto" : "none", left: R + slot.x, top: R + slot.y - (i === 0 ? 8 : 0), transform: "translate(-50%, -50%)", opacity: lit && !lit.has(id) ? 0.35 : 1, outline: openId === id ? "2px solid var(--foreground)" : undefined, outlineOffset: 2 }}>
              {/* A print mounted on the glass: it takes the lens's light, from where it sits in it. */}
              <span className="lens-print lit" style={{ ["--cx" as string]: Math.round(slot.x), ["--cy" as string]: Math.round(slot.y) }}>
                <FitPicture src={s.thumbnail_url} height={slot.h - 6} maxWidth={Math.round(slot.h * 1.34) - 6} sizes={i === 0 ? "256px" : "128px"} />
              </span>
              {fit ? <span aria-hidden className="absolute inset-x-0 -bottom-1.5 h-[3px]" style={{ background: fit.strange ? "var(--sakura)" : "var(--ramune)" }} /> : null}
            </button>
          );
        })}
        {named ? <p aria-live="polite" className="pointer-events-none absolute inset-x-0 z-10 text-center text-[12.5px] font-semibold leading-tight" style={{ top: R + slots[0].h / 2 + 1 }}><span className="glass-chip inline-block px-2 py-1">{named.name}</span></p> : null}
        </GlassLens>
      </div>

      {!touched ? <p aria-hidden className="explore-halo pointer-events-none absolute inset-x-0 bottom-[7.5rem] text-center text-[12.5px] text-muted-foreground md:bottom-auto md:top-4">{phone ? "Drag across the field" : "Move to look · click to hold the lens"}</p> : null}
      {open ? <StyleCard style={open} family={open.family ? familyOf.get(open.family) ?? null : null} fit={ask.fits?.get(open.id) ?? null} judging={ask.state === "asking"} byId={byId} onGo={flyTo} onClose={() => setOpenId(null)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={flyTo} byId={byId} lit={lit ? lit.size : null} />
      {/* The field is a picture; this is the same library for a reader that cannot see it. */}
      <ul className="sr-only">{styles.map((s) => <li key={s.id}><Link href={s.href} tabIndex={-1}>{s.name}</Link></li>)}</ul>
    </div>
  );
}
