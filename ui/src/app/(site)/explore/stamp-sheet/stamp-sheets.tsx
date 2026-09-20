"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AskDock, StyleCard, hueOf, useAsk, useScreen, type Family, type Fit } from "../shared";
import { flow } from "../river/course";
import { Stamp } from "../stamp";

// The library as sheets of stamps: a sheet for every family, a stamp for every
// style, blanks marked "soon" for directions nobody has made yet. Stamps on a
// sheet touch, so their half holes meet as the perforation between them. An
// answer tears its stamps off their sheets and drops them on the desk.

type SheetOf = { id: string; label: string; stamps: AtlasStyle[]; soon: AtlasHole[] };
const tilt = (id: string) => { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return ((h % 1000) / 1000 - 0.5) * 14; };

const Sheets = memo(function Sheets({ sheets, w, h, cols, lit, torn, openId, onOpen, hold }: { sheets: SheetOf[]; w: number; h: number; cols: number; lit: Set<string> | null; torn: Set<string> | null; openId: string | null; onOpen: (id: string) => void; hold: (id: string, el: HTMLElement | null) => void }) {
  return (
    <>
      {sheets.map((sheet) => (
        <section key={sheet.id} aria-label={sheet.label} className="mb-6 break-inside-avoid md:mb-8" style={{ width: cols * w + 20 }}>
          <div className="bg-[#efe9db] p-[10px] shadow-[0_10px_30px_-16px_rgba(30,35,45,0.45)] dark:bg-[#d9d3c5]">
            <h2 className="mb-2 flex items-baseline justify-between px-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-black/75">{sheet.label}<span className="font-normal">{sheet.stamps.length}</span></h2>
            <ul className="flex flex-wrap" style={{ width: cols * w }}>
              {sheet.stamps.map((s) => (
                <li key={s.id} ref={(el) => hold(s.id, el)} style={{ width: w, height: h }}>
                  {/* A torn stamp leaves its place on the sheet empty. */}
                  {torn?.has(s.id) ? <span aria-hidden className="block h-full w-full bg-black/[0.07]" /> : (
                    <button type="button" onClick={() => onOpen(s.id)} aria-label={s.name} title={s.name} className="sheet-stamp block cursor-pointer" style={{ opacity: lit && !lit.has(s.id) ? 0.3 : 1, outline: openId === s.id ? "2px solid #000" : undefined, outlineOffset: -2 }}>
                      <Stamp src={s.thumbnail_url} ink={s.ink} w={w} h={h} label={w >= 56 ? s.name : undefined} sizes="128px" flat />
                    </button>
                  )}
                </li>
              ))}
              {sheet.soon.map((hole) => <li key={hole.id} title={`${hole.name}: coming soon`} style={{ width: w, height: h, opacity: lit ? 0.3 : 1 }}><Stamp src={null} ink={null} w={w} h={h} label={w >= 56 ? "Soon" : undefined} soon flat /></li>)}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
});

export function StampSheets({ styles, families, holes }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const spots = useRef(new Map<string, HTMLElement>());
  const [openId, setOpenId] = useState<string | null>(null);
  const [hue, setHue] = useState("");
  const ask = useAsk();
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const w = phone ? 54 : 58, h = Math.round(w * 1.22), cols = phone ? 6 : 5;

  const sheets = useMemo(() => {
    const ordered = flow(styles, families), out: SheetOf[] = [], singles: AtlasStyle[] = [];
    for (const s of ordered) {
      const f = s.family ? familyOf.get(s.family) : undefined;
      if (!f) { singles.push(s); continue; }
      const sheet = out.find((o) => o.id === f.id);
      if (sheet) sheet.stamps.push(s); else out.push({ id: f.id, label: f.label, stamps: [s], soon: holes.filter((hole) => Math.hypot(hole.x - f.x, hole.y - f.y) < 0.07).slice(0, 4) });
    }
    if (singles.length > 0) out.push({ id: "singles", label: "Singles", stamps: singles, soon: [] });
    return out;
  }, [styles, families, holes, familyOf]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);
  const torn = useMemo(() => (ask.fits ? new Set([...ask.fits.keys()].filter((id) => byId.has(id))) : null), [ask.fits, byId]);
  const desk = useMemo(() => (ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank) : []), [ask.fits, byId]);

  const hold = useCallback((id: string, el: HTMLElement | null) => { if (el) spots.current.set(id, el); else spots.current.delete(id); }, []);
  const goTo = useCallback((id: string) => { setOpenId(id); spots.current.get(id)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, []);
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (desk.length > 0) scroller.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [desk.length]);

  const open = openId ? byId.get(openId) ?? null : null;
  const score = (f: Fit) => (f.fit === null ? "" : String(Math.round(f.fit * 100)));
  if (!screen) return <div className="h-[calc(100dvh-65px)] w-full" aria-busy="true" />;
  return (
    <div className="relative h-[calc(100dvh-65px)] w-full overflow-hidden">
      <h1 className="sr-only">Explore the library</h1>
      <div ref={scroller} className="h-full w-full overflow-y-auto overflow-x-hidden px-3 pb-44 pt-10 md:px-8" style={{ overscrollBehavior: "contain" }}>
        <p className="absolute left-4 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:left-8"><span className="text-foreground">{styles.length}</span> stamps on {sheets.length} sheets</p>
        {desk.length > 0 ? (
          <section aria-label="Torn off for you" className="mb-8">
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="text-foreground">{desk.length}</span> torn off for “{ask.answer?.query}”</h2>
            <ul className="flex gap-4 overflow-x-auto px-2 pb-5 pt-2 [scrollbar-width:none] md:flex-wrap md:gap-5 md:overflow-visible">
              {desk.map(([id, f]) => { const s = byId.get(id)!; return (
                <li key={id} className="desk-stamp shrink-0" style={{ transform: `rotate(${tilt(id)}deg)` }}>
                  <button type="button" onClick={() => setOpenId(id)} aria-label={s.name} className="block cursor-pointer drop-shadow-[0_8px_10px_rgba(30,35,45,0.35)]" style={{ outline: `2px solid var(${f.strange ? "--sakura" : "--ramune"})`, outlineOffset: 3 }}>
                    <Stamp src={s.thumbnail_url} ink={s.ink} w={phone ? 104 : 124} h={phone ? 126 : 150} label={s.name} value={score(f)} sizes="160px" />
                  </button>
                </li>
              ); })}
            </ul>
          </section>
        ) : null}
        <div className="md:[column-gap:32px]" style={phone ? undefined : { columnWidth: cols * w + 20 }}>
          <Sheets sheets={sheets} w={w} h={h} cols={cols} lit={lit} torn={torn} openId={openId} onOpen={setOpenId} hold={hold} />
        </div>
      </div>
      {open ? <StyleCard style={open} family={open.family ? familyOf.get(open.family) ?? null : null} fit={ask.fits?.get(open.id) ?? null} judging={ask.state === "asking"} byId={byId} onGo={goTo} onClose={() => setOpenId(null)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={setOpenId} byId={byId} lit={lit ? lit.size : null} />
    </div>
  );
}
