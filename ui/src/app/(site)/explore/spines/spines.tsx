"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasStyle } from "@/lib/catalog";
import { FitPicture } from "../../atlas/fit-picture";
import { AskDock, NEUTRAL_INK, fitWord, hueOf, useAsk, useScreen, type Family, type Fit } from "../shared";
import { flow } from "../river/course";
import { Spine, cloth, girth, stature } from "../spine";

// One long shelf. Spines stand in one order, like beside like, grouped by family
// with a little air between groups. A pulled spine turns in place to face you,
// and its neighbours make room; the styles that fit a question stand taller. The
// strip under the shelf is the whole of it, in its inks, to scrub along.

const TRAIT = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));

type Group = { family: Family | null; books: AtlasStyle[] };

/** A spine turned to face you: the cover, in the book's own cloth. */
function Cover({ style, h, fit, judging, onClose }: { style: AtlasStyle; h: number; fit: Fit | null; judging: boolean; onClose: () => void }) {
  const { bg, fg } = cloth(style.ink), pic = Math.round(h * 0.5);
  return (
    <div className="spine-cover relative flex shrink-0 flex-col overflow-hidden p-3 shadow-[0_18px_40px_-18px_rgba(30,35,45,0.6)]" style={{ width: Math.round(h * 0.78), height: h, background: bg, color: fg }}>
      <button type="button" onClick={onClose} className="flex justify-center bg-[#f7f3ea] p-2" aria-label={`Put ${style.name} back`}><FitPicture key={style.id} src={style.thumbnail_url} height={pic} maxWidth={Math.round(h * 0.78) - 40} sizes="320px" /></button>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">{style.kind === "language" ? "Design language" : "Art style"}</p>
      <h2 className="font-display text-[18px] font-bold leading-tight tracking-[-0.02em]">{style.name}</h2>
      {fit ? <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]">{fitWord(fit, judging)}</p> : null}
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug opacity-80">{style.traits.slice(0, 4).map((t) => TRAIT.get(t) ?? t).join(" · ")}</p>
      <Link href={style.href} className="mt-auto block px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ background: fg, color: bg }}>Open</Link>
    </div>
  );
}

const Shelf = memo(function Shelf({ groups, h, phone, lit, fits, openId, judging, onOpen, onClose, hold }: { groups: Group[]; h: number; phone: boolean; lit: Set<string> | null; fits: Map<string, Fit> | null; openId: string | null; judging: boolean; onOpen: (id: string) => void; onClose: () => void; hold: (id: string, el: HTMLDivElement | null) => void }) {
  return (
    <>
      {groups.map((g, i) => (
        <div key={`${g.family?.id ?? "alone"}-${i}`} className="flex shrink-0 flex-col">
          <div className="flex items-end gap-px" style={{ height: h + 30 }}>
            {g.books.map((s) => (
              <div key={s.id} ref={(el) => hold(s.id, el)} className="flex items-end">
                {openId === s.id ? <Cover style={s} h={h + 24} fit={fits?.get(s.id) ?? null} judging={judging} onClose={onClose} /> : <Spine style={s} w={girth(s.id, phone ? 20 : 24, phone ? 30 : 40)} h={stature(s.id, h * 0.78, h * 0.97)} tall={fits?.has(s.id) ? 24 : 0} fit={fits?.get(s.id) ?? null} dim={Boolean(lit && !lit.has(s.id))} onOpen={onOpen} />}
              </div>
            ))}
          </div>
          <div className="h-[14px] bg-[color-mix(in_srgb,var(--foreground)_9%,var(--background))] shadow-[0_6px_10px_-6px_rgba(30,35,45,0.35)]" />
          <p className="mt-2 whitespace-nowrap font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-foreground/75">{g.family ? <>{g.family.label} <span className="font-normal text-muted-foreground">{g.books.length}</span></> : " "}</p>
        </div>
      ))}
    </>
  );
});

export function Spines({ styles, families }: { styles: AtlasStyle[]; families: Family[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const scroller = useRef<HTMLDivElement | null>(null);
  const strip = useRef<HTMLCanvasElement | null>(null);
  const windowEl = useRef<HTMLSpanElement | null>(null);
  const spots = useRef(new Map<string, HTMLDivElement>());
  const [room, setRoom] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const ordered = useMemo(() => flow(styles, families), [styles, families]);
  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const s of ordered) {
      const f = s.family ? familyOf.get(s.family) ?? null : null, last = out[out.length - 1];
      if (last && last.family?.id === f?.id) last.books.push(s); else out.push({ family: f, books: [s] });
    }
    return out;
  }, [ordered, familyOf]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setRoom(el.clientHeight);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);
  const h = Math.max(150, Math.min(phone ? 250 : 330, room - (phone ? 250 : 270)));

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  const hold = useCallback((id: string, el: HTMLDivElement | null) => { if (el) spots.current.set(id, el); else spots.current.delete(id); }, []);
  const bring = useCallback((id: string) => spots.current.get(id)?.scrollIntoView({ inline: "center", block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), []);
  const pull = useCallback((id: string) => { setOpenId(id); requestAnimationFrame(() => bring(id)); }, [bring]);
  const close = useCallback(() => setOpenId(null), []);
  const led = useRef("");
  useEffect(() => {
    const first = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
    const key = first ? first + ask.answer?.query : "";
    if (!first || led.current === key) return;
    const f = requestAnimationFrame(() => { led.current = key; pull(first); });
    return () => cancelAnimationFrame(f);
  }, [ask.fits, ask.answer, byId, pull]);

  // The strip: the whole shelf in its inks, in order; the window is what is on screen.
  useEffect(() => {
    const c = strip.current;
    if (!c) return;
    const w = c.clientWidth, hh = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = hh * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    ordered.forEach((s, i) => { g.globalAlpha = !lit || lit.has(s.id) ? 1 : 0.18; g.fillStyle = s.ink ?? NEUTRAL_INK; g.fillRect((i / ordered.length) * w, lit?.has(s.id) ? 0 : 3, Math.max(1, w / ordered.length), lit?.has(s.id) ? hh : hh - 6); });
  }, [ordered, lit, room]);
  const track = useCallback(() => {
    const el = scroller.current;
    if (!el || !windowEl.current) return;
    windowEl.current.style.left = `${(el.scrollLeft / el.scrollWidth) * 100}%`;
    windowEl.current.style.width = `${(el.clientWidth / el.scrollWidth) * 100}%`;
  }, []);
  useEffect(() => { const f = requestAnimationFrame(track); return () => cancelAnimationFrame(f); }, [track, room, openId]);
  const scrub = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el || (e.type === "pointermove" && e.buttons === 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.scrollLeft = ((e.clientX - r.left) / r.width) * el.scrollWidth - el.clientWidth / 2;
  };

  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div className="relative h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden md:h-[calc(100dvh-65px)]">
      <h1 className="sr-only">Explore the library</h1>
      <p className="absolute left-4 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:left-8"><span className="text-foreground">{styles.length}</span> styles on one shelf</p>
      <div ref={scroller} id="shelf" onScroll={track} onWheel={(e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && scroller.current) scroller.current.scrollLeft += e.deltaY; }}
        className="flex h-full w-full items-start gap-5 overflow-x-auto overflow-y-hidden px-6 pt-12 [scrollbar-width:none] md:gap-8 md:px-12 md:pt-16" style={{ overscrollBehaviorX: "contain" }}>
        <Shelf groups={groups} h={h} phone={phone} lit={lit} fits={ask.fits} openId={openId} judging={ask.state === "asking"} onOpen={pull} onClose={close} hold={hold} />
      </div>
      <div tabIndex={0} role="scrollbar" aria-label="The whole shelf" aria-controls="shelf" aria-orientation="horizontal" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}
        onKeyDown={(e) => { const el = scroller.current; if (!el) return; const by = { ArrowRight: 120, ArrowLeft: -120, PageDown: el.clientWidth * 0.9, PageUp: -el.clientWidth * 0.9, Home: -el.scrollWidth, End: el.scrollWidth }[e.key]; if (by === undefined) return; e.preventDefault(); el.scrollLeft += by; }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }} onPointerMove={scrub}
        className="absolute inset-x-4 z-20 h-4 cursor-ew-resize touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] md:inset-x-12" style={{ bottom: phone ? 132 : 138 }}>
        <canvas ref={strip} aria-hidden className="h-full w-full" />
        <span ref={windowEl} aria-hidden className="pointer-events-none absolute inset-y-[-2px] shadow-[0_0_0_2px_var(--foreground)]" style={{ left: 0, width: "10%" }} />
      </div>
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={pull} byId={byId} lit={lit ? lit.size : null} />
    </div>
  );
}
