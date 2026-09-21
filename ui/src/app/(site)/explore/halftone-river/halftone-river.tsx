"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasStyle } from "@/lib/catalog";
import { AskDock, NEUTRAL_INK, StyleCard, hueOf, isDark, useAsk, useScreen, type Family } from "../shared";
import { course, flow } from "../river/course";
import { Stamp } from "../stamp";

// The river, drawn as a halftone. Far from where you look a style is a dot of its
// ink; closer it is a small stamp; under the pointer it is a stamp large enough to
// read. Only the stamps near the pointer exist as elements, so the river can carry
// thousands: everything else is one canvas.

const rand = (i: number, salt: number) => { const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

export function HalftoneRiver({ styles, families }: { styles: AtlasStyle[]; families: Family[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const scroller = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(0);
  const [near, setNear] = useState<{ x: number; y: number; items: { i: number; m: number }[] }>({ x: 0, y: 0, items: [] });
  const [openId, setOpenId] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const [theme, setTheme] = useState(0);
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const ordered = useMemo(() => flow(styles, families), [styles, families]);
  const spot = useMemo(() => new Map(ordered.map((s, i) => [s.id, i])), [ordered]);
  const dot = phone ? 15 : 22, lanes = phone ? 7 : 6;
  const lay = useMemo(() => (width ? course(ordered.length, width, dot, phone ? 3 : 5, lanes, phone ? 0 : Math.max(0, (width - 1080) / 2)) : null), [ordered.length, width, dot, phone, lanes]);
  const reach = phone ? 118 : 190, big = phone ? 86 : 112;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    const themed = new MutationObserver(() => setTheme((n) => n + 1));
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { watch.disconnect(); themed.disconnect(); };
  }, [screen]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  // A style is a stamp once it would be big enough to carry a picture; until then it stays a dot.
  const swell = useCallback((d: number) => (d >= reach ? 0 : Math.cos((d / reach) * (Math.PI / 2)) ** 2), [reach]);
  const stampAt = useCallback((d: number) => dot + (big - dot) * swell(d) ** 2 >= 30, [dot, big, swell]);
  // ---- the look: where it is, which slots it resolves, and the canvas around it
  const focus = useRef({ x: -9999, y: -9999 });
  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || !lay) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = width, h = lay.height;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = isDark() ? "screen" : "multiply";
    const { x: fx, y: fy } = focus.current;
    ordered.forEach((s, i) => {
      const p = lay.slots[i], d = Math.hypot(p.x - fx, p.y - fy);
      if (stampAt(d)) return; // a stamp stands here instead
      const on = !lit || lit.has(s.id), fit = ask.fits?.get(s.id);
      g.fillStyle = s.ink ?? NEUTRAL_INK;
      g.globalAlpha = on ? 0.4 : 0.1;
      for (let k = 0; k < 3; k++) { const a = rand(i, k) * 6.283, r = dot * (0.5 + rand(i, k + 5) * 0.5); g.beginPath(); g.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1 + rand(i, k + 9) * 1.6, 0, 6.283); g.fill(); }
      g.globalAlpha = on ? 0.95 : 0.22;
      g.beginPath(); g.arc(p.x, p.y, (dot / 2) * (fit ? 1.5 : on ? 0.72 + rand(i, 1) * 0.3 : 0.5), 0, 6.283); g.fill();
    });
    g.globalAlpha = 1;
  }, [lay, ordered, lit, ask.fits, width, dot, stampAt]);

  const frame = useRef(0);
  const look = useCallback((x: number, y: number) => {
    focus.current = { x, y };
    if (frame.current || !lay) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { x: fx, y: fy } = focus.current, items: { i: number; m: number }[] = [];
      lay.slots.forEach((p, i) => { const d = Math.hypot(p.x - fx, p.y - fy); if (stampAt(d)) items.push({ i, m: swell(d) }); });
      setNear({ x: fx, y: fy, items });
      draw();
    });
  }, [lay, draw, swell, stampAt]);
  useEffect(() => { const f = requestAnimationFrame(draw); return () => cancelAnimationFrame(f); }, [draw, theme]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // On a phone the look rides down the middle of what is on screen.
  const ride = useCallback(() => {
    const el = scroller.current;
    if (!el || !lay || lay.slots.length === 0 || !phone) return;
    const y = el.scrollTop + el.clientHeight * 0.4, band = lay.slots.filter((p) => Math.abs(p.y - y) < lay.turn);
    const t = ((el.scrollTop / Math.max(1, lay.height - el.clientHeight)) * 3) % 1; // sweeps across as the page moves
    const xs = band.map((p) => p.x), x0 = Math.min(...xs, width / 2), x1 = Math.max(...xs, width / 2);
    look(Math.min(width - 70, Math.max(70, x0 + (x1 - x0) * (t < 0.5 ? t * 2 : 2 - t * 2))), y);
  }, [lay, phone, width, look]);
  useEffect(() => { const f = requestAnimationFrame(() => { if (phone) ride(); else if (lay) look(width * 0.42, lay.top + lay.half * 0.2); }); return () => cancelAnimationFrame(f); }, [ride, phone, lay, look, width]);

  const goTo = useCallback((id: string) => {
    const i = spot.get(id), el = scroller.current;
    if (i === undefined || !lay || !el) return;
    setOpenId(id);
    el.scrollTo({ top: Math.max(0, lay.slots[i].y - el.clientHeight * 0.4), behavior: "smooth" });
    look(lay.slots[i].x, lay.slots[i].y);
  }, [spot, lay, look]);
  const led = useRef("");
  useEffect(() => {
    const first = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
    const key = first ? first + ask.answer?.query : "";
    if (!first || led.current === key) return;
    const f = requestAnimationFrame(() => { led.current = key; const i = spot.get(first), el = scroller.current; if (i !== undefined && lay && el) { el.scrollTo({ top: Math.max(0, lay.slots[i].y - el.clientHeight * 0.4), behavior: "smooth" }); look(lay.slots[i].x, lay.slots[i].y); } });
    return () => cancelAnimationFrame(f);
  }, [ask.fits, ask.answer, byId, spot, lay, look]);

  const banks = useMemo(() => {
    if (!lay) return [];
    const out: { f: Family; x: number; y: number }[] = [];
    let last = "";
    ordered.forEach((s, i) => {
      if (!s.family || s.family === last) return;
      last = s.family;
      const f = familyOf.get(s.family), p = lay.slots[i];
      if (!f || f.count < (phone ? 9 : 6)) return;
      const y = lay.top + Math.round((p.y - lay.top) / (lay.turn * 2)) * lay.turn * 2 - lay.half - 15;
      if (!out.some((o) => o.y === y && Math.abs(o.x - p.x) < f.label.length * 7 + 30)) out.push({ f, x: p.x, y });
    });
    return out;
  }, [lay, ordered, familyOf, phone]);

  const open = openId ? byId.get(openId) ?? null : null;

  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div className="relative h-[calc(100dvh-65px)] w-full overflow-hidden">
      <h1 className="sr-only">Explore the library</h1>
      <div ref={scroller} onScroll={ride} className="h-full w-full overflow-y-auto overflow-x-hidden" style={{ overscrollBehavior: "contain" }}
        onPointerMove={(e) => { if (e.pointerType !== "mouse" || !scroller.current) return; const r = scroller.current.getBoundingClientRect(); look(e.clientX - r.left, e.clientY - r.top + scroller.current.scrollTop); }}>
        <div className="relative" style={{ height: lay?.height ?? 0 }}>
          <canvas ref={canvas} aria-hidden className="absolute left-0 top-0" style={{ width, height: lay?.height ?? 0 }} />
          <p className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:left-6 md:top-4"><span className="text-foreground">{styles.length}</span> styles, like beside like</p>
          {banks.map(({ f, x, y }) => <span key={f.id} aria-hidden className="explore-halo pointer-events-none absolute z-[5] -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-foreground/75" style={{ left: Math.min(Math.max(x, 70), width - 90), top: y, opacity: lit ? 0.3 : 1 }}>{f.label}</span>)}
          {lay ? near.items.map(({ i, m }) => {
            const s = ordered[i], p = lay.slots[i], fit = ask.fits?.get(s.id);
            // Small stamps at the rim, a readable one under the pointer; pushed outward so the big ones have room.
            const size = Math.round(dot + (big - dot) * m * m), d = Math.hypot(p.x - near.x, p.y - near.y) || 1, out = d * 1.9 * m;
            const x = p.x + ((p.x - near.x) / d) * out, y = p.y + ((p.y - near.y) / d) * out, named = size > 64;
            return (
              <button key={s.id} type="button" onClick={() => setOpenId(s.id)} aria-label={s.name} className="absolute block cursor-pointer" style={{ left: x - size / 2, top: y - (size * 1.18) / 2, zIndex: 10 + Math.round(m * 60), opacity: lit && !lit.has(s.id) ? 0.35 : 1, filter: `drop-shadow(0 ${1 + m * 5}px ${2 + m * 9}px rgba(30,35,45,${0.18 + m * 0.2}))`, outline: fit && size > 40 ? `2px solid var(${fit.strange ? "--sakura" : "--ramune"})` : undefined, outlineOffset: 2 }}>
                <Stamp src={s.thumbnail_url} ink={s.ink} w={size} h={Math.round(size * 1.18)} label={named ? s.name : undefined} sizes="128px" />
              </button>
            );
          }) : null}
        </div>
      </div>
      {open ? <StyleCard style={open} family={open.family ? familyOf.get(open.family) ?? null : null} fit={ask.fits?.get(open.id) ?? null} judging={ask.state === "asking"} byId={byId} onGo={goTo} onClose={() => setOpenId(null)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={goTo} byId={byId} lit={lit ? lit.size : null} />
    </div>
  );
}
