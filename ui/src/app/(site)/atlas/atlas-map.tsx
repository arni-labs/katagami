"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { GalleryImage } from "@/components/gallery-image";
import { Marker } from "@/components/page-hero";
import { usePanZoom, usePrefersReducedMotion } from "@/components/encyclopedia/use-pan-zoom";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";

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
const CARD_PX_WIDE = 124; // a card's width on screen while the paper is zoomed out
const CARD_PX_NARROW = 80; // on a phone, so the first view holds more than a handful
const CARD_GAP = 10;
// Past the zoom where every card has room (about 0.94) cards grow with the paper:
// that is the closer look. The zoom stops where a card is about 210px wide.
const MAX_ZOOM = 1.6;
const TRUE_SIZE_ZOOM = CARD_PX_WIDE / 132 + 0.02; // where the counter-scale reaches 1

// A pan or zoom changes the camera sixty times a second. A tile depends on none
// of it — its counter-scale comes from one CSS variable on the paper — so it is
// memoised and the pictures stay put while the paper moves.
const Tile = memo(function Tile({ style: s, dim, rank, pressed, hidden, familyLabel, still, delay, leaving, onOpen }: { style: AtlasStyle; dim: boolean; rank: number; pressed: boolean; hidden: number; familyLabel: string | null; still: boolean; delay: number; leaving: boolean; onOpen: (s: AtlasStyle) => void }) {
  return (
    <div
      className="absolute"
      style={{ left: s.x * PAPER - TILE_W / 2, top: s.y * PAPER - TILE_H / 2, width: TILE_W, zIndex: rank, transform: "scale(var(--f))", transformOrigin: "50% 42%" }}
    >
      {/* The arrival animation lives on its own wrapper: a finished animation
          holds its last frame over inline styles, and on the button it pinned
          opacity at 1 (no dimming) and transform at none (no hover lift). */}
      <div className={still ? "" : leaving ? "atlas-leave" : "atlas-pop"} style={{ animationDelay: still || leaving ? undefined : `${delay}ms` }}>
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
          <span className="absolute -top-2.5 left-2 whitespace-nowrap bg-[var(--yuzu)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-black">
            {familyLabel}
          </span>
        ) : null}
      </button>
      </div>
    </div>
  );
});

// A direction the encyclopedia names and nobody here has made work for yet.
// Drawn as a sheet still on the press: halftone where the picture will be.
const HoleTile = memo(function HoleTile({ hole: h, dim, pressed, still, delay, leaving, onOpen }: { hole: AtlasHole; dim: boolean; pressed: boolean; still: boolean; delay: number; leaving: boolean; onOpen: (h: AtlasHole) => void }) {
  return (
    <div className="absolute" style={{ left: h.x * PAPER - TILE_W / 2, top: h.y * PAPER - TILE_H / 2, width: TILE_W, zIndex: pressed ? 4 : 0, transform: "scale(var(--f))", transformOrigin: "50% 42%" }}>
      <div className={still ? "" : leaving ? "atlas-leave" : "atlas-pop"} style={{ animationDelay: still || leaving ? undefined : `${delay}ms` }}>
        <button
          type="button"
          onClick={() => onOpen(h)}
          aria-label={`${h.name}, coming soon`}
          aria-pressed={pressed}
          className="atlas-card relative block w-full cursor-pointer bg-[color-mix(in_srgb,var(--card)_82%,transparent)] p-0 text-left shadow-[0_1px_0_rgba(30,35,45,0.04),0_6px_18px_-12px_rgba(30,35,45,0.35)]"
          style={{ opacity: dim ? 0.18 : 1 }}
        >
          <span className="relative block w-full overflow-hidden" style={{ height: TILE_H }}>
            <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: "var(--sakura)", opacity: 0.55 }} />
            <span className="absolute bottom-2 left-2 -rotate-3 bg-[var(--sakura)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white">Coming soon</span>
          </span>
          <span className="block truncate px-2 pb-1.5 pt-1.5 font-display text-[14.5px] font-bold leading-tight tracking-[-0.01em] text-foreground/80">{h.name}</span>
        </button>
      </div>
    </div>
  );
});

type Kind = "" | "language" | "art_style" | "soon";
const KINDS: [Kind, string][] = [["", "All"], ["language", "Design languages"], ["art_style", "Art styles"], ["soon", "Coming soon"]];

export function AtlasMap({ styles, families, holes, unplaced, sample }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[]; unplaced: number; sample: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { viewportRef, camera, animate, dragging, draggingRef, handlers, zoomStep, zoomAbout, glide, guardWheel } = usePanZoom({ x: 0, y: 0, k: 0.2 }, MAX_ZOOM, 0.08);
  const [kind, setKind] = useState<Kind>("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [find, setFind] = useState("");
  const [owner, setOwner] = useState(false);
  const framed = useRef(false);
  const [narrow, setNarrow] = useState(false);
  const cardPx = narrow ? CARD_PX_NARROW : CARD_PX_WIDE;

  // The encyclopedia is the owner's for now: everyone sees a direction, only the owner can open its cell.
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setOwner(Boolean(me?.owner)))
      .catch(() => undefined);
  }, []);

  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const holeById = useMemo(() => new Map(holes.map((h) => [h.id, h])), [holes]);
  const focus = focusId ? byId.get(focusId) ?? null : null;
  const focusHole = focusId ? holeById.get(focusId) ?? null : null;
  // A hole's neighbours are the made work nearest it on the paper, among what this viewer may see.
  const holeNear = useMemo(() => {
    if (!focusHole) return [];
    return [...styles].sort((a, b) => Math.hypot(a.x - focusHole.x, a.y - focusHole.y) - Math.hypot(b.x - focusHole.x, b.y - focusHole.y)).slice(0, 5);
  }, [focusHole, styles]);
  const lit = useMemo(() => {
    if (focus) return new Set([focus.id, ...focus.neighbors.map((n) => n.id)]);
    if (focusHole) return new Set([focusHole.id, ...holeNear.map((s) => s.id)]);
    return null;
  }, [focus, focusHole, holeNear]);
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
  // (the member it is named after, else the one nearest its centre; biggest
  // families first), then the styles that stand alone, then family members by
  // how central they are. Directions still to come take whatever room is left.
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
    const f = Math.max(1, cardPx / (TILE_W * k));
    const w = (TILE_W * f + CARD_GAP / k) / PAPER;
    const h = ((TILE_H + 30) * f + CARD_GAP / k) / PAPER;
    const spots: { id: string; x: number; y: number }[] = [];
    const placed: AtlasStyle[] = [];
    const soon: AtlasHole[] = [];
    // Whatever has no room is tucked behind the card in its way, and that card
    // says how many it is holding.
    const tucked = new Map<string, number>();
    const forced = new Set(lit ?? []);
    const take = (item: { id: string; x: number; y: number }) => {
      const inWay = forced.has(item.id) ? undefined : spots.find((o) => Math.abs(o.x - item.x) < w && Math.abs(o.y - item.y) < h);
      if (inWay) { tucked.set(inWay.id, (tucked.get(inWay.id) ?? 0) + 1); return false; }
      spots.push(item);
      return true;
    };
    const wantStyle = (s: AtlasStyle) => kind === "" || kind === s.kind || forced.has(s.id);
    const seen = new Set<string>();
    // The focused item and its neighbours are always on the paper.
    for (const s of [...styles.filter((x) => forced.has(x.id)), ...order.list]) {
      if (seen.has(s.id) || !wantStyle(s)) continue;
      seen.add(s.id);
      if (take(s)) placed.push(s);
    }
    if (kind === "" || kind === "soon") {
      for (const hole of [...holes.filter((x) => forced.has(x.id)), ...holes]) {
        if (seen.has(hole.id)) continue;
        seen.add(hole.id);
        if (take(hole)) soon.push(hole);
      }
    }
    return { placed, soon, tucked };
  }, [step, order, styles, holes, kind, lit, cardPx]);

  // A card that loses its room leaves over a moment rather than vanishing.
  const lastShown = useRef<{ styles: AtlasStyle[]; holes: AtlasHole[] }>({ styles: [], holes: [] });
  const [leaving, setLeaving] = useState<{ styles: AtlasStyle[]; holes: AtlasHole[] }>({ styles: [], holes: [] });
  useEffect(() => {
    const now = new Set([...shown.placed.map((s) => s.id), ...shown.soon.map((h) => h.id)]);
    const gone = { styles: lastShown.current.styles.filter((s) => !now.has(s.id)), holes: lastShown.current.holes.filter((h) => !now.has(h.id)) };
    lastShown.current = { styles: shown.placed, holes: shown.soon };
    if (reduced || gone.styles.length + gone.holes.length === 0) return;
    setLeaving(gone);
    const timer = window.setTimeout(() => setLeaving({ styles: [], holes: [] }), 220);
    return () => window.clearTimeout(timer);
  }, [shown, reduced]);

  // Frame every style inside what the chrome leaves free: on a phone the find
  // bar and filters are a band across the top, and a fit that ignored it put
  // the northernmost cards underneath it.
  const fitAll = useCallback(() => {
    const el = viewportRef.current;
    if (!el || styles.length === 0) return;
    const phone = el.clientWidth < 640;
    const inset = phone ? { top: 132, right: 12, bottom: 16, left: 12 } : { top: 28, right: 40, bottom: 28, left: 40 };
    const card = phone ? CARD_PX_NARROW : CARD_PX_WIDE;
    const xs = styles.map((s) => s.x * PAPER);
    const ys = styles.map((s) => s.y * PAPER);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Cards hold their screen size, so the room they need is in screen pixels, not world units.
    const w = el.clientWidth - inset.left - inset.right - card;
    const h = el.clientHeight - inset.top - inset.bottom - card;
    // The paper is square and screens are not: a strict fit leaves a phone half
    // empty. Open a little past it — the map fills the screen, its edges are a
    // short drag away, and Fit always comes back here.
    const contain = Math.min(w / Math.max(x1 - x0, 1), h / Math.max(y1 - y0, 1));
    const cover = Math.max(w / Math.max(x1 - x0, 1), h / Math.max(y1 - y0, 1));
    const k = Math.min(1, Math.max(0.05, Math.min(cover, contain * (phone ? 2.2 : 1.5))));
    glide({ k, x: inset.left + card / 2 + (w - (x1 - x0) * k) / 2 - x0 * k, y: inset.top + card / 2 + (h - (y1 - y0) * k) / 2 - y0 * k });
  }, [viewportRef, styles, glide]);

  const attach = useCallback((el: HTMLDivElement | null) => {
    viewportRef.current = el;
    guardWheel(el);
    if (el) setNarrow(el.clientWidth < 640);
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
  const glideTo = useCallback((wx: number, wy: number, k: number, screen?: { x: number; y: number }) => {
    const el = viewportRef.current;
    if (!el) return;
    const kk = Math.min(k, MAX_ZOOM);
    glide({ k: kk, x: (screen?.x ?? el.clientWidth / 2) - wx * kk, y: (screen?.y ?? el.clientHeight / 2) - wy * kk });
  }, [viewportRef, glide]);
  const litRef = useRef(lit);
  useEffect(() => { litRef.current = lit; }, [lit]);
  const tuckedRef = useRef(shown.tucked);
  useEffect(() => { tuckedRef.current = shown.tucked; }, [shown]);

  /** Bring an item to the middle of what the sheet leaves free, close enough to read. */
  const focusOn = useCallback((item: { id: string; x: number; y: number }) => {
    setFocusId(item.id);
    const el = viewportRef.current;
    const wide = el ? el.clientWidth >= 640 : true;
    const screen = el ? (wide ? { x: (el.clientWidth - 364) / 2, y: el.clientHeight / 2 } : { x: el.clientWidth / 2, y: el.clientHeight * 0.28 }) : undefined;
    // Close enough that cards are at their true size: the layout guarantees no
    // two overlap there, so the focused item and its neighbours all read clean.
    glideTo(item.x * PAPER, item.y * PAPER, Math.max(zoomNow.current, TRUE_SIZE_ZOOM), screen);
  }, [viewportRef, glideTo]);

  const open = useCallback((s: { id: string; x: number; y: number }) => {
    if (draggingRef.current) return;
    // A card with others tucked behind it opens them first, as a cluster does
    // on a map; once it stands alone, a press opens the item itself. A
    // neighbour of the focused item was asked for by name: it opens regardless.
    if ((tuckedRef.current.get(s.id) ?? 0) > 0 && zoomNow.current < MAX_ZOOM - 0.05 && !litRef.current?.has(s.id)) {
      glideTo(s.x * PAPER, s.y * PAPER, zoomNow.current * 2);
      return;
    }
    focusOn(s);
  }, [draggingRef, glideTo, focusOn]);

  const found = useMemo(() => {
    const q = find.trim().toLowerCase();
    if (q.length < 2) return [];
    const all = [...styles.map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y, soon: false })), ...holes.map((h) => ({ id: h.id, name: h.name, x: h.x, y: h.y, soon: true }))];
    return all.filter((i) => i.name.toLowerCase().includes(q)).sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name)).slice(0, 6);
  }, [find, styles, holes]);

  const factor = Math.max(1, cardPx / (TILE_W * camera.k));

  if (styles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="font-display text-[40px] font-bold tracking-[-0.03em]">The <Marker color="ramune">atlas</Marker></h1>
        <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">No style in view has a place on the map yet.</p>
      </div>
    );
  }

  const lines = focus
    ? focus.neighbors.flatMap((n) => { const to = byId.get(n.id); return to ? [{ id: n.id, from: focus, to, weight: n.similarity }] : []; })
    : focusHole
      ? holeNear.map((to) => ({ id: to.id, from: focusHole, to, weight: 0.5 }))
      : [];
  const sheetOpen = Boolean(focus || focusHole);

  return (
    <div className="relative h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full overflow-hidden md:h-[calc(100dvh-65px)]">
      <div
        ref={attach}
        className="absolute inset-0 select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ramune)]"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab", overscrollBehavior: "none" }}
        tabIndex={0}
        role="application"
        aria-label="Library atlas. Drag to pan, scroll or pinch to zoom, press a card to open it or to see what is tucked behind it."
        onKeyDown={(e) => {
          if (e.key === "Escape") setFocusId(null);
          else if (e.key === "+" || e.key === "=") zoomStep(1);
          else if (e.key === "-" || e.key === "_") zoomStep(-1);
          else if (e.key === "0") { setFocusId(null); fitAll(); }
        }}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          const box = e.currentTarget.getBoundingClientRect();
          zoomAbout(1.8, e.clientX - box.left, e.clientY - box.top, true);
        }}
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
          {lines.map((l) => {
            const x1 = l.from.x * PAPER, y1 = l.from.y * PAPER, x2 = l.to.x * PAPER, y2 = l.to.y * PAPER;
            return <span key={`line-${l.id}`} aria-hidden className="pointer-events-none absolute origin-left bg-[var(--ramune)]" style={{ left: x1, top: y1, width: Math.hypot(x2 - x1, y2 - y1), height: 2 / camera.k, opacity: 0.25 + l.weight * 0.6, transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)` }} />;
          })}
          {shown.soon.map((h, i) => (
            <HoleTile key={h.id} hole={h} dim={Boolean(lit && !lit.has(h.id))} pressed={focusId === h.id} still={reduced} delay={Math.min(i * 5, 240)} leaving={false} onOpen={open} />
          ))}
          {leaving.holes.map((h) => <HoleTile key={`gone-${h.id}`} hole={h} dim={false} pressed={false} still={false} delay={0} leaving onOpen={open} />)}
          {shown.placed.map((s, i) => {
            const tucked = shown.tucked.get(s.id) ?? 0;
            const fam = tucked > 0 && order.leads.has(s.id) ? families.find((f) => f.id === s.family) : null;
            return (
              <Tile key={s.id} style={s} dim={Boolean(lit && !lit.has(s.id))} rank={focusId === s.id ? 4 : lit?.has(s.id) ? 3 : order.leads.has(s.id) ? 2 : 1} pressed={focusId === s.id} hidden={tucked} familyLabel={tucked > 0 ? `${fam ? `${fam.label} ` : ""}+${tucked}` : null} still={reduced} delay={Math.min(i * 6, 240)} leaving={false} onOpen={open} />
            );
          })}
          {leaving.styles.map((s) => <Tile key={`gone-${s.id}`} style={s} dim={false} rank={0} pressed={false} hidden={0} familyLabel={null} still={false} delay={0} leaving onOpen={open} />)}
        </div>
      </div>

      {/* Top bar: on a phone a band of paper across the top; on a wide screen it floats over the map's corner. */}
      <div className={`absolute inset-x-0 top-0 z-10 bg-background/92 px-4 pb-3 pt-3 shadow-[0_1px_0_rgba(30,35,45,0.05)] sm:inset-x-auto sm:left-8 sm:top-8 sm:w-[23rem] sm:bg-transparent sm:p-0 sm:shadow-none ${sheetOpen ? "max-sm:hidden" : ""}`}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground max-sm:hidden">Atlas</p>
        <h1 className="mt-1 font-display text-[36px] font-bold leading-tight tracking-[-0.03em] max-sm:sr-only">The <Marker color="ramune">atlas</Marker></h1>
        <div className="relative sm:mt-5">
          <label htmlFor="atlas-find" className="sr-only">Find a style or a direction on the map</label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="atlas-find"
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && found[0]) { focusOn(found[0]); setFind(""); e.currentTarget.blur(); } }}
            placeholder="Find on the map"
            autoComplete="off"
            className="sticker-card w-full py-2.5 pl-9 pr-3 text-[16px] outline-none placeholder:text-muted-foreground focus-visible:shadow-[var(--shadow-card-hover)]"
          />
          {found.length > 0 ? (
            <ul className="sticker-card absolute inset-x-0 top-full z-20 mt-1 bg-background py-1">
              {found.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => { focusOn(item); setFind(""); }} className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-left text-[16px] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                    <span className="truncate">{item.name}</span>
                    {item.soon ? <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sakura)]">coming soon</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div role="group" aria-label="Show" className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
          {KINDS.filter(([value]) => value !== "soon" || holes.length > 0).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`sticker-card shrink-0 cursor-pointer px-3 py-1.5 text-[14.5px] ${kind === value ? "bg-[var(--yuzu)] text-black" : ""}`}>{label}</button>
          ))}
          {sample ? <Link href="/signin" className="ink-underline shrink-0 self-center px-1 text-[14.5px] sm:hidden">Sign in for all</Link> : null}
        </div>
      </div>

      <div className={`absolute bottom-6 left-4 z-10 flex flex-col gap-2 sm:left-8 ${sheetOpen ? "max-sm:hidden" : ""}`}>
        <button type="button" onClick={() => zoomStep(1)} aria-label="Zoom in" className="sticker-card h-11 w-11 cursor-pointer text-[20px]">+</button>
        <button type="button" onClick={() => zoomStep(-1)} aria-label="Zoom out" className="sticker-card h-11 w-11 cursor-pointer text-[20px]">−</button>
        <button type="button" onClick={() => { setFocusId(null); fitAll(); }} aria-label="Fit the whole map" className="sticker-card h-11 cursor-pointer px-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em]">Fit</button>
      </div>

      <p className={`pointer-events-none absolute bottom-6 right-4 z-10 max-w-[62%] max-sm:hidden bg-background/90 px-3 py-2 text-right text-[14.5px] leading-snug text-muted-foreground sm:right-8 sm:max-w-xs ${sheetOpen ? "max-sm:hidden" : ""}`}>
        <span className="max-sm:hidden">{styles.length} styles in {families.length} families{holes.length > 0 ? `, and ${holes.length} directions still to come` : ""}. Near means alike; distances are a reading, not a measure.{unplaced > 0 ? ` ${unplaced} newer styles are not placed yet.` : ""}{" "}</span>
        {sample ? <span className="max-sm:hidden">This is the visitor shelf — </span> : null}
        {sample ? <Link href="/signin" className="ink-underline pointer-events-auto text-foreground">sign in for all</Link> : null}
      </p>

      {focus || focusHole ? (
        <aside aria-label={(focus ?? focusHole)!.name} className="atlas-sheet absolute inset-x-0 bottom-0 z-20 max-h-[48%] overflow-y-auto bg-background px-5 pb-8 pt-7 shadow-[var(--shadow-card-hover)] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:max-h-[calc(100%-48px)] sm:w-[340px]" style={{ overscrollBehavior: "contain" }}>
          <button type="button" onClick={() => setFocusId(null)} aria-label="Close" className="absolute right-3 top-3 cursor-pointer p-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
          {focus ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{focus.kind === "language" ? "Design language" : "Art style"}</p>
              <h2 className="mt-2 pr-8 font-display text-[24px] font-bold leading-tight tracking-[-0.02em]">{focus.name}</h2>
              <Link href={focus.href} className="mt-4 inline-block bg-foreground px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background">Open</Link>
              <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nearest</h3>
              {focus.neighbors.length === 0 ? <p className="mt-3 text-[17px] text-muted-foreground">Nothing in view is close to this one.</p> : (
                <ul className="mt-3 flex flex-col gap-2.5">
                  {focus.neighbors.map((n) => { const s = byId.get(n.id); return s ? <li key={n.id}><button type="button" onClick={() => focusOn(s)} className="ink-underline cursor-pointer text-left text-[17px]">{s.name}</button></li> : null; })}
                </ul>
              )}
              {farthest && farthest.id !== focus.id ? (
                <>
                  <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Farthest from it</h3>
                  <button type="button" onClick={() => focusOn(farthest)} className="ink-underline mt-3 cursor-pointer text-left text-[17px]">{farthest.name}</button>
                </>
              ) : null}
            </>
          ) : focusHole ? (
            <>
              <p className="inline-block -rotate-2 bg-[var(--sakura)] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white">Coming soon</p>
              <h2 className="mt-3 pr-8 font-display text-[24px] font-bold leading-tight tracking-[-0.02em]">{focusHole.name}</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">{focusHole.description}</p>
              <p className="mt-4 text-[14.5px] leading-snug text-muted-foreground">A direction the encyclopedia names. Nothing in the library has been made for it yet.</p>
              {owner ? <Link href={`/encyclopedia?cell=${encodeURIComponent(focusHole.id)}`} className="ink-underline mt-4 inline-block text-[17px]">Open in the encyclopedia</Link> : null}
              <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nearest made work</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {holeNear.map((s) => <li key={s.id}><button type="button" onClick={() => focusOn(s)} className="ink-underline cursor-pointer text-left text-[17px]">{s.name}</button></li>)}
              </ul>
            </>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
