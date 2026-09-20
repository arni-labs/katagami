"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasStyle } from "@/lib/catalog";
import { AskDock, hueOf, useAsk, useScreen, type Family, type Fit } from "../shared";
import { flow } from "../river/course";
import { Book, Spine, girth, stature } from "../spine";

// A library wall. Every style is a spine in its own ink, shelved in one order
// where like sits beside like, so the wall drifts from colour to colour. A
// family is named on the shelf edge where it starts. Pull a book and it opens.

type Row = { books: { s: AtlasStyle; w: number; h: number }[]; labels: { x: number; text: string }[] };

const Wall = memo(function Wall({ rows, shelfH, lit, fits, onOpen, hold }: { rows: Row[]; shelfH: number; lit: Set<string> | null; fits: Map<string, Fit> | null; onOpen: (id: string) => void; hold: (id: string, el: HTMLDivElement | null) => void }) {
  return (
    <>
      {rows.map((row, r) => (
        <div key={r} className="relative">
          <div className="flex items-end gap-px px-3 md:px-8" style={{ height: shelfH }}>
            {row.books.map(({ s, w, h }) => <div key={s.id} ref={(el) => hold(s.id, el)} className="flex items-end"><Spine style={s} w={w} h={h} fit={fits?.get(s.id) ?? null} dim={Boolean(lit && !lit.has(s.id))} onOpen={onOpen} /></div>)}
          </div>
          {/* The shelf: a board with its own shadow, and the families named on its edge like brass labels. */}
          <div className="relative h-[18px] bg-[color-mix(in_srgb,var(--foreground)_9%,var(--background))] shadow-[0_6px_10px_-6px_rgba(30,35,45,0.35)]">
            {row.labels.map((l) => <span key={l.text + l.x} className="absolute top-[3px] whitespace-nowrap bg-[#d9c48a] px-1.5 font-mono text-[8.5px] font-bold uppercase leading-[12px] tracking-[0.12em] text-black/80" style={{ left: l.x }}>{l.text}</span>)}
          </div>
        </div>
      ))}
    </>
  );
});

export function Stacks({ styles, families }: { styles: AtlasStyle[]; families: Family[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const scroller = useRef<HTMLDivElement | null>(null);
  const spots = useRef(new Map<string, HTMLDivElement>());
  const [width, setWidth] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const ordered = useMemo(() => flow(styles, families), [styles, families]);
  const shelfH = phone ? 132 : 186;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);

  // Books go on a shelf until it is full, then the next shelf starts.
  const rows = useMemo(() => {
    const out: Row[] = [];
    if (!width) return out;
    const pad = phone ? 12 : 32, room = width - pad * 2;
    let row: Row = { books: [], labels: [] }, used = 0, last = "";
    for (const s of ordered) {
      const w = girth(s.id, phone ? 13 : 17, phone ? 21 : 30), h = stature(s.id, shelfH * 0.72, shelfH * 0.96);
      if (used + w + 1 > room) { out.push(row); row = { books: [], labels: [] }; used = 0; }
      if (s.family && s.family !== last) {
        last = s.family;
        const f = familyOf.get(s.family);
        if (f && f.count >= 4 && !row.labels.some((l) => pad + used - l.x < l.text.length * 6.4 + 22)) row.labels.push({ x: pad + used, text: f.label });
      }
      row.books.push({ s, w, h });
      used += w + 1;
    }
    if (row.books.length > 0) out.push(row);
    return out;
  }, [ordered, width, phone, shelfH, familyOf]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);

  const hold = useCallback((id: string, el: HTMLDivElement | null) => { if (el) spots.current.set(id, el); else spots.current.delete(id); }, []);
  const bring = useCallback((id: string) => spots.current.get(id)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), []);
  const goTo = useCallback((id: string) => { setOpenId(id); bring(id); }, [bring]);
  // An answer takes the wall to the shelf its best fit stands on.
  const led = useRef("");
  useEffect(() => {
    const first = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
    const key = first ? first + ask.answer?.query : "";
    if (!first || led.current === key) return;
    const f = requestAnimationFrame(() => { led.current = key; bring(first); });
    return () => cancelAnimationFrame(f);
  }, [ask.fits, ask.answer, byId, bring]);

  const open = openId ? byId.get(openId) ?? null : null;
  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div className="relative h-[calc(100dvh-65px)] w-full overflow-hidden">
      <h1 className="sr-only">Explore the library</h1>
      <div ref={scroller} className="h-full w-full overflow-y-auto overflow-x-hidden pb-44 pt-9" style={{ overscrollBehavior: "contain" }}>
        <p className="absolute left-4 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:left-8"><span className="text-foreground">{styles.length}</span> styles on {rows.length} shelves</p>
        <Wall rows={rows} shelfH={shelfH} lit={lit} fits={ask.fits} onOpen={setOpenId} hold={hold} />
      </div>
      {open ? <Book style={open} family={open.family ? familyOf.get(open.family) ?? null : null} fit={ask.fits?.get(open.id) ?? null} judging={ask.state === "asking"} byId={byId} onGo={goTo} onClose={() => setOpenId(null)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={goTo} byId={byId} lit={lit ? lit.size : null} />
    </div>
  );
}
