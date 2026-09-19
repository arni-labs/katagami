"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { GalleryImage } from "@/components/gallery-image";
import { Marker } from "@/components/page-hero";
import { usePanZoom, usePrefersReducedMotion } from "@/components/encyclopedia/use-pan-zoom";
import type { AtlasStyle } from "@/lib/catalog";

type Family = { id: string; label: string; count: number; x: number; y: number };

// The layout is 0..1; the paper is this many world pixels across, which leaves
// a tile's width between most neighbours at the fitted zoom.
const PAPER = 5200;
const TILE_W = 132;
const TILE_H = 84;
const FAMILY_INKS = ["var(--sakura)", "var(--ramune)", "var(--yuzu)"];

// Like a map: a card keeps about the same size on screen at every zoom, so only
// as many are drawn as fit without covering one another. Zoom in and the ones
// that were hidden behind a family's lead card have room, and pop out.
const CARD_PX = 124; // a card's width on screen while the paper is zoomed out
const CARD_GAP = 10;
// Past the zoom where every card has room (about 0.94) cards grow with the paper:
// that is the closer look. The zoom stops where a card is about 210px wide.
const MAX_ZOOM = 1.6;

// A pan or zoom changes the camera sixty times a second. A tile depends on none
// of it — its counter-scale comes from one CSS variable on the paper — so it is
// memoised and the pictures stay put while the paper moves.
const Tile = memo(function Tile({ style: s, dim, rank, pressed, hidden, familyLabel, still, delay, onOpen }: { style: AtlasStyle; dim: boolean; rank: number; pressed: boolean; hidden: number; familyLabel: string | null; still: boolean; delay: number; onOpen: (s: AtlasStyle) => void }) {
  return (
    <div
      className="absolute"
      style={{ left: s.x * PAPER - TILE_W / 2, top: s.y * PAPER - TILE_H / 2, width: TILE_W, zIndex: rank, transform: "scale(var(--f))", transformOrigin: "50% 42%" }}
    >
      {/* The arrival animation lives on its own wrapper: a finished animation
          holds its last frame over inline styles, and on the button it pinned
          opacity at 1 (no dimming) and transform at none (no hover lift). */}
      <div className={still ? "" : "atlas-pop"} style={{ animationDelay: still ? undefined : `${delay}ms` }}>
      <button
        type="button"
        onClick={() => onOpen(s)}
        aria-label={`${s.name}, ${s.kind === "language" ? "design language" : "art style"}${hidden > 0 ? `, with ${hidden} more behind it` : ""}`}
        aria-pressed={hidden > 0 ? undefined : pressed}
        className="atlas-card sticker-card relative block w-full cursor-pointer p-0 text-left"
        style={{ opacity: dim ? 0.18 : 1, boxShadow: hidden > 0 ? "6px 6px 0 0 color-mix(in srgb, var(--foreground) 7%, var(--card)), 12px 12px 0 0 color-mix(in srgb, var(--foreground) 4%, var(--card)), var(--shadow-card)" : undefined }}
      >
        <span className="relative block w-full overflow-hidden bg-muted" style={{ height: TILE_H }}>
          {s.thumbnail_url ? <GalleryImage src={s.thumbnail_url} alt="" sizes="160px" className="object-cover" /> : null}
        </span>
        <span className="block truncate px-2 pb-1.5 pt-1.5 font-display text-[14.5px] font-bold leading-tight tracking-[-0.01em]">{s.name}</span>
        {familyLabel ? (
          <span className="absolute -top-2.5 left-2 bg-[var(--yuzu)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-black">
            {familyLabel}
          </span>
        ) : null}
      </button>
      </div>
    </div>
  );
});

export function AtlasMap({ styles, families, unplaced, sample }: { styles: AtlasStyle[]; families: Family[]; unplaced: number; sample: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { viewportRef, camera, animate, dragging, draggingRef, handlers, zoomStep, fit, centerOn, glide, guardWheel } = usePanZoom({ x: 0, y: 0, k: 0.2 }, MAX_ZOOM, 0.08);
  const [kind, setKind] = useState<"" | "language" | "art_style">("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const framed = useRef(false);

  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const focus = focusId ? byId.get(focusId) ?? null : null;
  const lit = useMemo(() => (focus ? new Set([focus.id, ...focus.neighbors.map((n) => n.id)]) : null), [focus]);
  // The style least like the focused one that is still on the map: the far shore.
  const farthest = useMemo(() => {
    if (!focus) return null;
    let best: AtlasStyle | null = null;
    let far = -1;
    for (const s of styles) {
      const d = (s.x - focus.x) ** 2 + (s.y - focus.y) ** 2;
      if (d > far) { far = d; best = s; }
    }
    return best;
  }, [focus, styles]);

  // Who is drawn first when there is not room for everyone: each family's lead
  // (the member nearest its centre, biggest families first), then the styles
  // that stand alone, then family members by how central they are.
  const order = useMemo(() => {
    const centre = new Map(families.map((f) => [f.id, f]));
    const size = new Map(families.map((f) => [f.id, f.count]));
    const dist = (s: AtlasStyle) => { const c = s.family ? centre.get(s.family) : null; return c ? Math.hypot(s.x - c.x, s.y - c.y) : 0; };
    const byFamily = new Map<string, AtlasStyle[]>();
    const alone: AtlasStyle[] = [];
    for (const s of styles) {
      if (s.family && centre.has(s.family)) byFamily.set(s.family, [...(byFamily.get(s.family) ?? []), s]);
      else alone.push(s);
    }
    const leads: AtlasStyle[] = [];
    const rest: { s: AtlasStyle; rank: number }[] = [];
    for (const [id, members] of [...byFamily.entries()].sort((a, b) => (size.get(b[0]) ?? 0) - (size.get(a[0]) ?? 0))) {
      // The family is named after one of its members; when that member is in
      // view it leads, so the label and the card agree.
      const named = centre.get(id)?.label;
      members.sort((a, b) => Number(b.name === named) - Number(a.name === named) || dist(a) - dist(b));
      leads.push(members[0]);
      members.slice(1).forEach((s, i) => rest.push({ s, rank: i }));
    }
    rest.sort((a, b) => a.rank - b.rank);
    return { list: [...leads, ...alone, ...rest.map((r) => r.s)], leads: new Set(leads.map((s) => s.id)) };
  }, [styles, families]);

  // Zoom in steps: the set is recomputed when the zoom crosses a step, not on
  // every frame of a pinch.
  const step = Math.round(Math.log(Math.max(camera.k, 0.01)) / Math.log(1.18));
  const shown = useMemo(() => {
    const k = 1.18 ** step;
    const f = Math.max(1, CARD_PX / (TILE_W * k));
    const w = (TILE_W * f + CARD_GAP / k) / PAPER;
    const h = ((TILE_H + 30) * f + CARD_GAP / k) / PAPER;
    const placed: AtlasStyle[] = [];
    const ids = new Set<string>();
    // A style with no room is tucked behind the card that is in its way, and
    // that card says how many it is holding.
    const tucked = new Map<string, number>();
    // The focused style and its neighbours are always on the paper.
    const first = lit ? styles.filter((s) => lit.has(s.id)) : [];
    for (const s of [...first, ...order.list]) {
      if (ids.has(s.id) || (kind && s.kind !== kind)) continue;
      const inWay = first.includes(s) ? undefined : placed.find((o) => Math.abs(o.x - s.x) < w && Math.abs(o.y - s.y) < h);
      if (!inWay) { placed.push(s); ids.add(s.id); }
      else tucked.set(inWay.id, (tucked.get(inWay.id) ?? 0) + 1);
    }
    return { placed, ids, tucked };
  }, [step, order, styles, kind, lit]);

  const fitAll = useCallback(() => {
    fit(styles.map((s) => ({ x: s.x * PAPER - TILE_W / 2, y: s.y * PAPER - TILE_H / 2, w: TILE_W, h: TILE_H })), 48, 1);
  }, [fit, styles]);

  const attach = useCallback((el: HTMLDivElement | null) => {
    viewportRef.current = el;
    guardWheel(el);
    if (el && !framed.current && styles.length > 0) {
      framed.current = true;
      fitAll();
    }
  }, [viewportRef, guardWheel, fitAll, styles.length]);

  // The map is the page: the document must not scroll under it.
  useEffect(() => {
    const root = document.documentElement;
    const before = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    return () => { root.style.overflow = before.overflow; root.style.overscrollBehavior = before.overscroll; };
  }, []);

  const zoomNow = useRef(camera.k);
  useEffect(() => { zoomNow.current = camera.k; }, [camera.k]);
  const glideTo = useCallback((wx: number, wy: number, k: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const kk = Math.min(k, MAX_ZOOM);
    glide({ k: kk, x: el.clientWidth / 2 - wx * kk, y: el.clientHeight / 2 - wy * kk });
  }, [viewportRef, glide]);
  // A neighbour of the focused style was asked for by name: it opens, stack or not.
  const litRef = useRef(lit);
  useEffect(() => { litRef.current = lit; }, [lit]);
  const tuckedRef = useRef(shown.tucked);
  useEffect(() => { tuckedRef.current = shown.tucked; }, [shown]);
  const open = useCallback((s: AtlasStyle) => {
    if (draggingRef.current) return;
    // A card with others tucked behind it opens them first, as a cluster does
    // on a map; once it stands alone, a press opens the style itself.
    if ((tuckedRef.current.get(s.id) ?? 0) > 0 && zoomNow.current < MAX_ZOOM - 0.05 && !litRef.current?.has(s.id)) {
      // Twice as close, on the card pressed: always progress, however wide the family lies.
      glideTo(s.x * PAPER, s.y * PAPER, zoomNow.current * 2);
      return;
    }
    setFocusId(s.id);
    const el = viewportRef.current;
    const wide = el ? el.clientWidth >= 640 : true;
    // The sheet covers the right 340px on a wide screen and the lower part of
    // a narrow one; the focused style is centred in what is left.
    const screen = el ? (wide ? { x: (el.clientWidth - 364) / 2, y: el.clientHeight / 2 } : { x: el.clientWidth / 2, y: el.clientHeight * 0.3 }) : undefined;
    centerOn(s.x * PAPER, s.y * PAPER, Math.max(zoomNow.current, wide ? 0.9 : 0.7), screen);
  }, [draggingRef, centerOn, viewportRef, order, glideTo]);

  const factor = Math.max(1, CARD_PX / (TILE_W * camera.k));

  if (styles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="font-display text-[40px] font-bold tracking-[-0.03em]">The <Marker color="ramune">atlas</Marker></h1>
        <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">No style in view has a place on the map yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden md:h-[calc(100dvh-65px)]">
      <div
        ref={attach}
        className="absolute inset-0 select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ramune)]"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab", overscrollBehavior: "none" }}
        tabIndex={0}
        role="application"
        aria-label="Library atlas. Drag to pan, scroll to zoom, choose a style to see what is near it."
        onKeyDown={(e) => { if (e.key === "Escape") setFocusId(null); }}
        onScroll={(e) => { e.currentTarget.scrollTop = 0; e.currentTarget.scrollLeft = 0; }}
        {...handlers}
      >
        <div
          className="absolute left-0 top-0 h-0 w-0"
          style={{ ["--f" as string]: factor, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`, transformOrigin: "0 0", transition: animate && !reduced ? "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined, willChange: "transform" }}
        >
          {families.map((f, i) => (
            <span key={`wash-${f.id}`} aria-hidden className="halftone-wash pointer-events-none absolute" style={{ left: f.x * PAPER - 300, top: f.y * PAPER - 230, width: 600, height: 460, ["--wash-ink" as string]: FAMILY_INKS[i % 3], opacity: lit ? 0.08 : 0.26 }} />
          ))}
          {focus
            ? focus.neighbors.map((n) => {
                const to = byId.get(n.id);
                if (!to) return null;
                const x1 = focus.x * PAPER, y1 = focus.y * PAPER, x2 = to.x * PAPER, y2 = to.y * PAPER;
                const len = Math.hypot(x2 - x1, y2 - y1);
                return <span key={`line-${n.id}`} aria-hidden className="pointer-events-none absolute origin-left bg-[var(--ramune)]" style={{ left: x1, top: y1, width: len, height: 2 / camera.k, opacity: 0.25 + n.similarity * 0.6, transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)` }} />;
              })
            : null}
          {shown.placed.map((s, i) => {
            const tucked = shown.tucked.get(s.id) ?? 0;
            const fam = tucked > 0 && order.leads.has(s.id) ? families.find((f) => f.id === s.family) : null;
            return (
              <Tile key={s.id} style={s} dim={Boolean(lit && !lit.has(s.id))} rank={focusId === s.id ? 4 : lit?.has(s.id) ? 3 : order.leads.has(s.id) ? 2 : 1} pressed={focusId === s.id} hidden={tucked} familyLabel={tucked > 0 ? `${fam ? `${fam.label} ` : ""}+${tucked}` : null} still={reduced} delay={Math.min(i * 6, 240)} onOpen={open} />
            );
          })}
        </div>
      </div>

      <div className={`pointer-events-none absolute left-0 top-0 z-10 max-w-md bg-background/90 px-4 pb-3 pt-6 sm:left-8 sm:top-8 sm:bg-transparent sm:p-0 ${focus ? "max-sm:hidden" : ""}`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Atlas</p>
        <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-[-0.03em] sm:text-[36px]">The <Marker color="ramune">atlas</Marker></h1>
        <div role="group" aria-label="Show" className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          {([["", "All"], ["language", "Design languages"], ["art_style", "Art styles"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`sticker-card cursor-pointer px-3 py-1.5 text-[14.5px] ${kind === value ? "bg-[var(--yuzu)] text-black" : ""}`}>{label}</button>
          ))}
        </div>
        <p className="pointer-events-auto mt-3 text-[14.5px] text-muted-foreground sm:hidden">
          {styles.length} styles · zoom in for more{sample ? " · " : ""}
          {sample ? <Link href="/signin" className="ink-underline text-foreground">sign in for all</Link> : null}
        </p>
      </div>

      <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-2 sm:left-8">
        <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="sticker-card h-10 w-10 cursor-pointer text-[20px]">+</button>
        <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="sticker-card h-10 w-10 cursor-pointer text-[20px]">−</button>
        <button type="button" onClick={() => { setFocusId(null); fitAll(); }} className="sticker-card cursor-pointer px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em]">Fit</button>
      </div>

      <p className={`pointer-events-none absolute bottom-6 right-4 z-10 max-w-[60%] bg-background/90 max-sm:hidden px-3 py-2 text-right text-[14.5px] leading-snug text-muted-foreground sm:right-8 sm:max-w-xs ${focus ? "max-sm:hidden" : ""}`}>
        {styles.length} styles in {families.length} families. Near means alike; distances are a reading, not a measure.
        {unplaced > 0 ? ` ${unplaced} newer styles are not placed yet.` : ""}
        {sample ? " This is the visitor shelf — " : ""}
        {sample ? <Link href="/signin" className="ink-underline pointer-events-auto text-foreground">sign in for the whole library</Link> : null}
      </p>

      {focus ? (
        <aside aria-label={focus.name} className="absolute inset-x-0 bottom-0 z-20 max-h-[46%] overflow-y-auto bg-background px-5 pb-8 pt-7 shadow-[var(--shadow-card-hover)] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:max-h-[calc(100%-48px)] sm:w-[340px]" style={{ overscrollBehavior: "contain" }}>
          <button type="button" onClick={() => setFocusId(null)} aria-label="Close" className="absolute right-4 top-4 cursor-pointer p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{focus.kind === "language" ? "Design language" : "Art style"}</p>
          <h2 className="mt-2 font-display text-[24px] font-bold leading-tight tracking-[-0.02em]">{focus.name}</h2>
          <Link href={focus.href} className="mt-4 inline-block bg-foreground px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background">Open</Link>
          <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nearest</h3>
          {focus.neighbors.length === 0 ? <p className="mt-3 text-[17px] text-muted-foreground">Nothing in view is close to this one.</p> : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {focus.neighbors.map((n) => {
                const s = byId.get(n.id);
                return s ? (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(s)} className="ink-underline cursor-pointer text-left text-[17px]">{s.name}</button>
                  </li>
                ) : null;
              })}
            </ul>
          )}
          {farthest && farthest.id !== focus.id ? (
            <>
              <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Farthest from it</h3>
              <button type="button" onClick={() => open(farthest)} className="ink-underline mt-3 cursor-pointer text-left text-[17px]">{farthest.name}</button>
            </>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
