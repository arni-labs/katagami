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

// A pan or zoom changes the camera sixty times a second; a tile depends on none
// of it, so it is memoised and the 457 pictures stay put while the paper moves.
const Tile = memo(function Tile({ style: s, dim, rank, pressed, named, still, onOpen }: { style: AtlasStyle; dim: boolean; rank: number; pressed: boolean; named: boolean; still: boolean; onOpen: (s: AtlasStyle) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(s)}
      aria-label={`${s.name}, ${s.kind === "language" ? "design language" : "art style"}`}
      aria-pressed={pressed}
      className="sticker-card absolute block cursor-pointer overflow-hidden p-0 text-left"
      style={{ left: s.x * PAPER - TILE_W / 2, top: s.y * PAPER - TILE_H / 2, width: TILE_W, opacity: dim ? 0.18 : 1, zIndex: rank, transition: still ? undefined : "opacity 200ms" }}
    >
      <span className="relative block w-full bg-muted" style={{ height: TILE_H }}>
        {s.thumbnail_url ? <GalleryImage src={s.thumbnail_url} alt="" sizes="132px" className="object-cover" /> : null}
      </span>
      {named ? <span className="block truncate px-2 py-1.5 font-display text-[14.5px] font-bold leading-tight tracking-[-0.01em]">{s.name}</span> : null}
    </button>
  );
});

export function AtlasMap({ styles, families, unplaced, sample }: { styles: AtlasStyle[]; families: Family[]; unplaced: number; sample: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { viewportRef, camera, animate, dragging, draggingRef, handlers, zoomStep, fit, centerOn, guardWheel } = usePanZoom({ x: 0, y: 0, k: 0.2 }, 2.4, 0.08);
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
  const open = useCallback((s: AtlasStyle) => {
    if (draggingRef.current) return;
    setFocusId(s.id);
    const el = viewportRef.current;
    const wide = el ? el.clientWidth >= 640 : true;
    // The sheet covers the right 340px on a wide screen and the lower part of
    // a narrow one; the focused style is centred in what is left.
    const screen = el ? (wide ? { x: (el.clientWidth - 364) / 2, y: el.clientHeight / 2 } : { x: el.clientWidth / 2, y: el.clientHeight * 0.3 }) : undefined;
    centerOn(s.x * PAPER, s.y * PAPER, Math.max(zoomNow.current, wide ? 0.9 : 0.7), screen);
  }, [draggingRef, centerOn, viewportRef]);

  // Far out, a tile is a swatch of its picture; close in, it carries its name.
  const named = camera.k >= 0.55;

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
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`, transformOrigin: "0 0", transition: animate && !reduced ? "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined, willChange: "transform" }}
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
          {styles.map((s) => (
            <Tile key={s.id} style={s} dim={Boolean((kind && s.kind !== kind) || (lit && !lit.has(s.id)))} rank={focusId === s.id ? 3 : lit?.has(s.id) ? 2 : 1} pressed={focusId === s.id} named={named} still={reduced} onOpen={open} />
          ))}
          {families.map((f) => (
            <span key={`label-${f.id}`} className="pointer-events-none absolute z-[4] -translate-x-1/2 whitespace-nowrap bg-background px-2 py-1 font-mono font-bold uppercase tracking-[0.16em] text-foreground shadow-[var(--shadow-card)]" style={{ left: f.x * PAPER, top: f.y * PAPER - TILE_H - 8, fontSize: Math.min(15 / camera.k, 64), opacity: lit ? 0.2 : named ? 0.55 : 1 }}>
              {f.label} · {f.count}
            </span>
          ))}
        </div>
      </div>

      <div className={`pointer-events-none absolute left-4 top-6 z-10 max-w-md sm:left-8 sm:top-8 ${focus ? "max-sm:hidden" : ""}`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Atlas</p>
        <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-[-0.03em] sm:text-[36px]">The <Marker color="ramune">atlas</Marker></h1>
        <div role="group" aria-label="Show" className="pointer-events-auto mt-4 flex flex-wrap gap-2">
          {([["", "All"], ["language", "Design languages"], ["art_style", "Art styles"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`sticker-card cursor-pointer px-3 py-1.5 text-[14.5px] ${kind === value ? "bg-[var(--yuzu)] text-black" : ""}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-2 sm:left-8">
        <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="sticker-card h-10 w-10 cursor-pointer text-[20px]">+</button>
        <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="sticker-card h-10 w-10 cursor-pointer text-[20px]">−</button>
        <button type="button" onClick={() => { setFocusId(null); fitAll(); }} className="sticker-card cursor-pointer px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em]">Fit</button>
      </div>

      <p className={`pointer-events-none absolute bottom-6 right-4 z-10 max-w-[60%] text-right text-[14.5px] leading-snug text-muted-foreground sm:right-8 sm:max-w-xs ${focus ? "max-sm:hidden" : ""}`}>
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
