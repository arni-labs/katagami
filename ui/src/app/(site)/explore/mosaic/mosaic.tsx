"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AskDock, fitWord, hueOf, useAsk, useScreen, type Family, type Fit, type Kinds } from "../shared";
import { flow } from "../river/course";
import { paperDrawn, quick } from "../stamp";
import { Card, SKINS, SKIN_NAME, SkinContext, type Skin } from "../card";

// The library as an endless sheet of stamps. The sheet wraps in both directions,
// so you can pan for ever and come round again; drag (or scroll) to pan, with
// momentum, and pinch or press + and − to take in more or fewer at once. Only
// the stamps on screen exist. How the sheet is sorted is the picture it makes:
// by colour it is a spectrum, by family a quilt, by fit a bloom round the best
// answer. Each stamp is a small card that leans toward the light and takes a
// highlight from it; the light is the pointer, or the way you are moving.

type Mode = "colour" | "family" | "fit" | "trait" | "plot";
type Axes = { x: string; y?: string; reverse?: boolean; labels: string[] };
const TRAIT_AT = new Map(STYLE_DNA_QUESTIONS.map((q, i) => [q.id, i]));
const valueOf = (s: AtlasStyle, trait: string) => (s.dna ? (s.dna[TRAIT_AT.get(trait) ?? -1] ?? 50) : 50);
type Cell = { kind: "style"; s: AtlasStyle } | { kind: "ghost"; n: number; src: string | null } | null;

const TRAIT = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));
// How wide a stamp is *is* the zoom, and it is one number anywhere between the ends rather than three stops. The
// gap and the stride are shares of that width, so the sheet has the same shape at every size — which is what lets
// a zoom be a scale on one layer instead of a new size for every stamp. A sheet opens at `mid`, nearer on a phone.
const SPAN = { phone: { mid: 74, max: 216 }, desk: { mid: 96, max: 256 } };
// The tones a held-back card is washed in. Chosen by position so a sheet of them says how much there is and nothing
// about what any of it is.
const GHOST_INK = ["#d9d6cf", "#dcdad4", "#d3d0c9", "#e0ddd6", "#d6d3cc"];
const RATIO = 1.2, GAP_R = 10 / 96; // the gap at the size a sheet opens at is the 10px it always was
const SX = 1 + GAP_R, SY = RATIO + GAP_R; // one stamp's stride across and down, as a share of its width
// How far out you can go: far enough to take the library in at once, but never so far that the sheet is thousands
// of stamps. Past a couple of thousand the browser spends longer arranging them than drawing them, which is the
// lag this screen was fixed for once already.
const CROWD = 1600;
const farOf = (phone: boolean, w: number, h: number) => Math.max(phone ? 18 : 20, Math.round(Math.sqrt((w * h) / (CROWD * SX * SY))));
// The sheet is laid out at one of a ladder of widths and scaled the rest of the way, so a zoom moves one transform
// rather than re-sizing every stamp — and the stamp paper, which is drawn to a bitmap once per size it is asked
// for, is drawn once per rung rather than once a frame. A rung is a fifth wider than the one below, so nothing on
// screen is ever more than about a seventh off the size it was drawn at, which is under what the eye picks up on
// paper and grain. How much nearer one press of + or − takes you is a stop, about five of them end to end.
const RUNG = 1.32, STOP = 1.7;
const rungOf = (cw: number, span: { min: number; max: number }) =>
  Math.max(span.min, Math.min(span.max, Math.round(span.min * RUNG ** Math.round(Math.log(cw / span.min) / Math.log(RUNG)))));
// How far the drawn width may stretch off the laid-out one before the sheet is worth re-laying. While the fingers
// are moving it may stretch a good way further, because re-laying every stamp costs a frame and nobody reads paper
// grain mid-pinch — what you see then is a picture being sized, which is what it should look like. A moment after
// the gesture stops it settles onto its rung and comes back crisp.
const HOLD = { lo: 0.885, hi: 1.13 }, MOVING = { lo: 0.6, hi: 1.7 }, FORCED = { lo: 0.42, hi: 2.4 }, SETTLE = 150;
// Every card short of the opened entry draws from the same resize. A picture is then fetched and shrunk once for
// the whole page: the canvas at any zoom, the results and the trays all read the one warm copy. 384 is the width
// the largest of them wanted anyway: a 148px card on a 2x screen, or a 112px one on a phone's 3x.
const NEAR = 384;
const GROUND = "color-mix(in srgb, var(--foreground) 15%, var(--background))"; // the desk the stamps lie on
const HUE_ANGLE: Record<string, number> = { red: 0, orange: 28, yellow: 52, green: 120, teal: 172, blue: 222, violet: 275, pink: 325 };
/** A steady four-figure number for an entry, for the skins that print a code. */
const codeOf = (id: string) => { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return `KG ${String(h % 10000).padStart(4, "0")}`; };
const mod = (n: number, m: number) => ((n % m) + m) % m;
const tone = (ink: string | null) => {
  if (!ink) return { h: 0, s: 0, l: 0.6 };
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  return { h: d === 0 ? 0 : (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};

// The large picture is asked for before it is needed: when a card is pointed at or pressed, and for the cards either
// side of an open one. By the time the view opens, it is usually already here.
const warmed = new Set<string>();
function warm(src: string | null | undefined, width: 750 | 1080) {
  if (!src || warmed.has(src)) return;
  warmed.add(src);
  const img = new Image(); img.decoding = "async"; img.src = quick(src, width);
}

type CellProps = { onGhost: () => void; eager: boolean; c: number; r: number; cell: Cell; w: number; h: number; stepX: number; stepY: number; dim: boolean; hold: (key: string, el: HTMLElement | null) => void; onOpen: (c: number, r: number) => void };
// One stamp on the sheet, keyed by its slot in a recycling pool (see Sheet): when the window slides, the stamp
// that left one edge is handed the place that arrived at the other, which is an update, not a mount. Memoised on plain values, so when the window of visible cells slides by a row
// only the new row is drawn: the stamps already there are left alone.
const CellView = memo(function CellView({ onGhost, eager, c, r, cell, w, h, stepX, stepY, dim, hold, onOpen }: CellProps) {
  if (!cell) return null;
  const x = c * stepX, y = r * stepY, key = `${c},${r}`;
  // A style a visitor is not being shown keeps a place on the sheet without giving anything away: paper and a wash
  // of neutral ink picked by where the card sits, never by the style. Pressing one is the only thing that asks.
  if (cell.kind === "ghost") return (
    <span ref={(el) => hold(key, el)} className="absolute left-0 top-0 block" style={{ transform: `translate(${x}px, ${y}px)`, opacity: dim ? 0.12 : 1 }}>
      <button type="button" onClick={onGhost} aria-label="Sign in to see this one" className="kghost block cursor-pointer">
        <Card src={cell.src} ink={GHOST_INK[cell.n % GHOST_INK.length]} w={w} h={h} fast={NEAR} />
      </button>
    </span>
  );
  const s = cell.s;
  return (
    <button ref={(el) => hold(key, el)} type="button" onPointerEnter={(e) => { if (e.pointerType === "mouse") warm(s.picture, 1080); }} onPointerDown={() => warm(s.picture, w < 60 ? 750 : window.innerWidth < 768 ? 750 : 1080)} onClick={() => onOpen(c, r)} aria-label={s.name} className="absolute left-0 top-0 block cursor-pointer" style={{ transform: `translate(${x}px, ${y}px)`, opacity: dim ? 0.2 : 1, }}>
      <Card src={s.picture} spare={s.thumbnail_url} ink={s.ink} w={w} h={h} label={w > 66 ? s.name : undefined} code={codeOf(s.id)} fast={NEAR} eager={eager} />
    </button>
  );
});

type SheetProps = { onGhost: () => void; eager: Set<string>; hold: (key: string, el: HTMLElement | null) => void; cells: { c: number; r: number; cell: Cell }[]; w: number; h: number; stepX: number; stepY: number; lit: Set<string> | null; onOpen: (c: number, r: number) => void };
const Sheet = memo(function Sheet({ onGhost, eager, hold, cells, w, h, stepX, stepY, lit, onOpen }: SheetProps) {
  return (
    <>
      {cells.map(({ c, r, cell }) => {
        const id = cell?.kind === "style" ? cell.s.id : "";
        // The pool is wider than any window the sheet allows (see CROWD), so no two places on screen share a slot.
        return <CellView key={`${mod(c, 128)},${mod(r, 96)}`} onGhost={onGhost} eager={eager.has(`${c},${r}`)} c={c} r={r} cell={cell} w={w} h={h} stepX={stepX} stepY={stepY} dim={Boolean(lit && (!id || !lit.has(id)))} hold={hold} onOpen={onOpen} />;
      })}
    </>
  );
});

export function Mosaic({ styles: all, families, whole, ghosts = [] }: { styles: AtlasStyle[]; families: Family[]; holes?: AtlasHole[]; /** How many styles the whole library holds, when this sheet is only part of it. */ whole: number | null; /** The pictures of the styles a visitor is not shown, and nothing else of them. */ ghosts?: string[] }) {
  const screen = useScreen();
  const phone = screen === "phone";
  const box = useRef<HTMLDivElement | null>(null);
  const surface = useRef<HTMLDivElement | null>(null);
  // How much of the top the controls and the sentence take, for whatever is laid out beneath them.
  const head = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = head.current, root = box.current;
    if (!el || !root) return;
    const watch = new ResizeObserver(() => root.style.setProperty("--head", `${Math.round(el.getBoundingClientRect().height)}px`));
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);
  const layer = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The width the sheet is laid out at. What is drawn is the camera's width (cam.cw), which moves freely; this
  // follows it a rung at a time, and the difference is taken up by a scale on the one layer the stamps sit in.
  const [rung, setRung] = useState(SPAN.desk.mid);
  const [ends, setEnds] = useState({ near: false, far: false }); // whether + or − has anywhere left to go
  const [mode, setMode] = useState<Mode>("colour");
  const [win, setWin] = useState({ c0: 0, c1: 0, r0: 0, r1: 0 });
  // The opened card is held by which style it is, never by the place it was sitting in. A place is not an identity
  // here: the sheet re-sorts under an open card (a new answer, another ordering, a kind switched off) and whoever
  // lands on those coordinates would become the card, which is how asking a card a question used to hand back a
  // different style.
  const [open, setOpen] = useState<string | null>(null);
  // What was just said back about the open card, kept apart from the wall's own line so neither answers for the other.
  const [aside, setAside] = useState<string[]>([]);
  const [hue, setHue] = useState("");
  const ask = useAsk();
  // Design languages and art styles, both by default; pressing one turns it off or on, and the last one on stays on.
  const [kinds, setKinds] = useState<Kinds>({ language: true, art_style: true });
  const [tray, setTray] = useState(false);
  const [axes, setAxes] = useState<Axes | null>(null);
  const [narrow, setNarrow] = useState<{ trait: string; label: string } | null>(null);
  // Which material the cards are made of: six to judge between, kept in the address so each can be linked to.
  const [skin, setSkin] = useState<Skin>("stamp");
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("skin"); if (s && (SKINS as readonly string[]).includes(s)) requestAnimationFrame(() => setSkin(s as Skin)); }, []);
  const pickSkin = (s: Skin) => { setSkin(s); const url = new URL(window.location.href); if (s === "stamp") url.searchParams.delete("skin"); else url.searchParams.set("skin", s); window.history.replaceState(null, "", url); };
  const styles = useMemo(() => all.filter((s) => kinds[s.kind]), [all, kinds]);
  const byId = useMemo(() => new Map(styles.map((s) => [s.id, s])), [styles]);
  const byAny = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]); // a style named in words is found whatever the filter
  const familyOf = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const span = useMemo(() => ({ min: farOf(phone, size.w || 1440, size.h || 900), max: SPAN[phone ? "phone" : "desk"].max }), [phone, size]);
  const w = rung, h = Math.round(rung * RATIO), stepX = rung * SX, stepY = rung * SY;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [screen]);

  const topFit = ask.fits ? [...ask.fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank)[0]?.[0] : undefined;
  const [seenFit, setSeenFit] = useState<string | undefined>(undefined);
  if (seenFit !== topFit) { setSeenFit(topFit); setMode(topFit ? "fit" : mode === "fit" ? "colour" : mode); setTray(Boolean(topFit)); }

  // ---- the world: one wrapping grid, filled according to the sort ------------
  const world = useMemo(() => {
    const n = styles.length, cols = Math.max(4, Math.ceil(Math.sqrt(n * 1.5))), rows = Math.max(3, Math.ceil(n / cols));
    const grid: Cell[] = Array.from({ length: cols * rows }, () => null);
    const put = (c: number, r: number, s: AtlasStyle) => { grid[r * cols + c] = { kind: "style", s }; };
    const bloom = (order: AtlasStyle[]) => {
      const spots = Array.from({ length: cols * rows }, (_, k) => ({ c: k % cols, r: Math.floor(k / cols) })).sort((a, b) => Math.hypot(a.c - (cols - 1) / 2, (a.r - (rows - 1) / 2) * RATIO) - Math.hypot(b.c - (cols - 1) / 2, (b.r - (rows - 1) / 2) * RATIO));
      order.forEach((s, i) => { const at = spots[i]; if (at) put(at.c, at.r, s); });
    };
    if (hue && !ask.fits) {
      // A picked colour gathers in the middle, its most saturated first; the rest ring it by how far their hue is from it.
      const want = HUE_ANGLE[hue], all = styles.map((s) => ({ s, t: tone(s.ink), mine: hueOf(s.ink) === hue }));
      const far = (h: number) => (want === undefined ? 0 : Math.min(Math.abs(h - want), 360 - Math.abs(h - want)));
      bloom(all.sort((a, b) => Number(b.mine) - Number(a.mine) || (a.mine ? b.t.s - a.t.s : (a.t.s < 0.22 ? 400 : far(a.t.h)) - (b.t.s < 0.22 ? 400 : far(b.t.h)))).map((v) => v.s));
    } else if (mode === "colour") {
      // Columns run through the hues, each from light to dark; the greys close the sheet.
      const all = styles.map((s) => ({ s, t: tone(s.ink) }));
      const ordered = [...all.filter((x) => x.t.s >= 0.22).sort((a, b) => ((a.t.h + 30) % 360) - ((b.t.h + 30) % 360)), ...all.filter((x) => x.t.s < 0.22).sort((a, b) => b.t.l - a.t.l)];
      for (let c = 0; c * rows < ordered.length; c++) ordered.slice(c * rows, (c + 1) * rows).sort((a, b) => b.t.l - a.t.l).forEach((x, r) => put(c, r, x.s));
    } else if (mode === "trait" && axes) {
      // The wall's width is the trait: least at the left, most at the right (or the reverse), a column at a time.
      const order = [...styles].sort((a, b) => (valueOf(a, axes.x) - valueOf(b, axes.x)) * (axes.reverse ? -1 : 1));
      const per = Math.ceil(order.length / cols);
      order.forEach((s, i) => put(Math.min(cols - 1, Math.floor(i / per)), i % per, s));
    } else if (mode === "plot" && axes?.y) {
      // Two traits as the wall's two axes. Each style goes to the free place nearest its own point, so none overlap.
      const taken = new Set<number>();
      for (const s of [...styles].sort((a, b) => valueOf(b, axes.x) + valueOf(b, axes.y!) - valueOf(a, axes.x) - valueOf(a, axes.y!))) {
        const tx = (valueOf(s, axes.x) / 100) * (cols - 1), ty = (1 - valueOf(s, axes.y) / 100) * (rows - 1);
        let bestAt = -1, bestD = Infinity;
        for (let k = 0; k < cols * rows; k++) { if (taken.has(k)) continue; const d = (k % cols - tx) ** 2 + ((Math.floor(k / cols) - ty) * RATIO) ** 2; if (d < bestD) { bestD = d; bestAt = k; } }
        if (bestAt >= 0) { taken.add(bestAt); put(bestAt % cols, Math.floor(bestAt / cols), s); }
      }
    } else if (mode === "family") {
      flow(styles, families).forEach((s, i) => put(i % cols, Math.floor(i / cols), s));
    } else {
      // The fits bloom from the middle, best first; the rest follow by how near they sit to the best on the atlas.
      const lead = topFit ? byId.get(topFit) : undefined;
      const rank = (s: AtlasStyle) => ask.fits?.get(s.id)?.rank ?? 1000 + (lead ? Math.hypot(s.x - lead.x, s.y - lead.y) * 1000 : 0);
      bloom([...styles].sort((p, q) => rank(p) - rank(q)));
    }
    // A visitor sees part of the library. Their styles keep the arrangement the sort gave them, drawn onto a rounded
    // diamond in the middle of a sheet as large as the whole library, and the edge frays out into the rest of the
    // library, greyed. Every place that is not one of theirs is a greyed card, so there is no hole between the two.
    const unseen = Math.max(0, (whole ?? 0) - styles.length);
    let outCols = cols, outRows = rows, out = grid;
    if (unseen > 0) {
      const n = styles.length, total = n + unseen;
      // How far the shape reaches, in cells, so it holds n and looks round on screen (a row is RATIO taller).
      const rx = Math.sqrt((n * RATIO) / 2.9) + 1, ry = rx / RATIO;
      outCols = Math.max(Math.ceil(rx * 2) + 8, Math.ceil(Math.sqrt(total * 1.5)));
      outRows = Math.max(Math.ceil(ry * 2) + 8, Math.ceil(total / outCols));
      const mid = { c: (outCols - 1) / 2, r: (outRows - 1) / 2 };
      out = Array.from({ length: outCols * outRows }, () => null);
      const hash = (k: number) => { let x = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
      // The places a visitor's styles take: the n nearest the middle by a norm between a diamond and a circle, measured
      // on screen (a row is RATIO taller). A little noise on each place's distance only decides things at the rim,
      // where it frays the edge into the grey around it; further in, every place is taken, so there are no holes.
      const E = 1.6;
      const slots = Array.from({ length: outCols * outRows }, (_, at) => {
        const x = at % outCols - mid.c, y = (Math.floor(at / outCols) - mid.r) * RATIO;
        return { at, score: (Math.abs(x) ** E + Math.abs(y) ** E) ** (1 / E) + (hash(at) - 0.5) * 2.4 };
      }).sort((a, b) => a.score - b.score).slice(0, n).map((s) => s.at).sort((a, b) => a - b);
      // The sort's own square is read in reading order onto those places in reading order, so what sat left of what,
      // and above what, still does: colour still runs across and light to dark still runs down.
      const order = grid.filter((cell): cell is NonNullable<Cell> => Boolean(cell));
      slots.forEach((at, k) => { if (order[k]) out[at] = order[k]; });
      // There are more grey places than grey styles, so some come round twice; picked by place rather than in turn,
      // so a repeat lands somewhere else on the sheet instead of beside its twin.
      for (let at = 0; at < out.length; at++) if (!out[at]) out[at] = { kind: "ghost", n: at, src: ghosts.length > 0 ? ghosts[Math.floor(hash(at + 101) * ghosts.length)] : null };
    }
    const where = new Map<string, { c: number; r: number }>();
    out.forEach((cell, i) => { if (cell?.kind === "style") where.set(cell.s.id, { c: i % outCols, r: Math.floor(i / outCols) }); });
    return { cols: outCols, rows: outRows, grid: out, where };
  }, [styles, families, whole, ghosts, mode, hue, ask.fits, topFit, byId, axes]);
  const cellAt = useCallback((c: number, r: number) => world.grid[mod(r, world.rows) * world.cols + mod(c, world.cols)], [world]);

  const lit = useMemo(() => {
    if (ask.fits) return new Set([...ask.fits.keys()].filter((id) => byId.has(id)));
    if (hue) return new Set(styles.filter((s) => hueOf(s.ink) === hue).map((s) => s.id));
    return null;
  }, [ask.fits, hue, styles, byId]);
  // "only the dark ones": of what is lit, or of the whole wall when nothing is.
  const litNow = useMemo(() => {
    if (!narrow) return lit;
    const from = lit ? [...lit] : styles.map((s) => s.id);
    const of = (id: string) => { const s = byId.get(id); return s ? valueOf(s, narrow.trait) : -1; };
    const kept = from.filter((id) => byId.has(id) && of(id) >= 58);
    // Asking for only the dark ones of ten warm answers used to leave an empty wall, which says nothing and looks
    // broken. There is always an answer nearest to what was asked for: when too few clear the mark, the darkest of
    // what is there stands in, in order.
    if (kept.length >= 4) return new Set(kept);
    return new Set([...from].filter((id) => byId.has(id)).sort((x, y) => of(y) - of(x)).slice(0, Math.min(8, from.length)));
  }, [lit, narrow, byId, styles]);

  // ---- the camera: an offset that never stops at an edge, and a light ---------
  const cam = useRef({ x: 0, y: 0, vx: 0, vy: 0, cw: SPAN.desk.mid, px: -1, py: -1, run: 0, drag: null as null | { x: number; y: number; t: number; far: number }, pinch: 0, mx: 0, my: 0 });
  const calm = useRef(false);
  useEffect(() => { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); const read = () => { calm.current = q.matches; }; read(); q.addEventListener("change", read); return () => q.removeEventListener("change", read); }, []);
  const winRef = useRef({ c0: 0, c1: 0, r0: 0, r1: 0 });
  const glare = useRef<HTMLDivElement | null>(null);
  const held = useRef(new Map<string, HTMLElement>());
  const lit_ = useRef(new Set<string>());
  // What the sheet is laid out at *now*, as opposed to what React has been asked to lay it out at. The two differ
  // for the frame between asking and the DOM being there, and painting the new scale before the new sizes arrive
  // would show as a jolt, so the transform follows this and it is only moved once the layout has landed.
  const lay = useRef({ rung: SPAN.desk.mid, stepX: SPAN.desk.mid * SX, stepY: SPAN.desk.mid * SY });
  const hold = useCallback((key: string, el: HTMLElement | null) => { if (el) held.current.set(key, el); else held.current.delete(key); }, []);
  const paint = useCallback(() => {
    const k = cam.current, el = layer.current, g = lay.current;
    if (!el || size.w === 0) return;
    // The stamps are laid out at the rung and taken the rest of the way by this scale, so any width between rungs
    // costs one transform on one layer: no stamp is re-sized, no paper is re-drawn, nothing re-renders.
    const f = k.cw / g.rung;
    el.style.transform = `translate3d(${k.x}px, ${k.y}px, 0) scale(${f.toFixed(4)})`;
    // One glare for the whole sheet, sliding at a fraction of the pan so it reads as light, not as print.
    // Moved by transform alone (the compositor's job, no repaint), wrapping within the pattern's repeat.
    if (glare.current) glare.current.style.transform = `translate3d(${((k.x * 0.35) % (size.w * 1.5)).toFixed(1)}px, ${((k.y * 0.2) % (size.h * 1.5)).toFixed(1)}px, 0)`;
    // Only the cards round the pointer lean to it and take its highlight; the rest lie flat. Far enough out a stamp
    // is a tile of ink with nothing to lean, so the light is not looked for at all.
    const near = new Set<string>();
    if (k.px >= 0 && k.cw >= 30) {
      // The light is in the sheet's own units, as the cards' places are.
      const lx = (k.px - k.x + k.vx * 6) / f, ly = (k.py - k.y + k.vy * 6) / f, reach = g.stepX * 1.7;
      for (let r = Math.floor((ly - reach) / g.stepY); r <= Math.floor((ly + reach) / g.stepY); r++) for (let c = Math.floor((lx - reach) / g.stepX); c <= Math.floor((lx + reach) / g.stepX); c++) {
        const key = `${c},${r}`, card = held.current.get(key);
        if (!card) continue;
        near.add(key);
        card.classList.add("lit-on");
        card.style.setProperty("--lx", lx.toFixed(0)); card.style.setProperty("--ly", ly.toFixed(0));
        card.style.setProperty("--cx", String(c * g.stepX + g.stepX / 2)); card.style.setProperty("--cy", String(r * g.stepY + g.stepY / 2));
      }
    }
    for (const key of lit_.current) if (!near.has(key)) held.current.get(key)?.classList.remove("lit-on");
    lit_.current = near;
    // Which places are on screen is the one thing the rung cannot change: a stamp's stride on screen is its drawn
    // width and nothing else, so the window is read straight off that and holds steady as the rung moves under it.
    const sx = k.cw * SX, sy = k.cw * SY;
    const c0 = Math.floor(-k.x / sx) - 1, r0 = Math.floor(-k.y / sy) - 1, c1 = c0 + Math.ceil(size.w / sx) + 2, r1 = r0 + Math.ceil(size.h / sy) + 2;
    const now = winRef.current;
    if (now.c0 !== c0 || now.c1 !== c1 || now.r0 !== r0 || now.r1 !== r1) { winRef.current = { c0, c1, r0, r1 }; setWin({ c0, c1, r0, r1 }); }
  }, [size]);
  const coast = useCallback(() => {
    const k = cam.current;
    // Asked for less motion: nothing glides. A flick stops where it was let go; a jump (see bring) lands at once.
    if (calm.current) { k.vx = 0; k.vy = 0; paint(); return; }
    if (k.run) return;
    const step = () => {
      k.x += k.vx; k.y += k.vy; k.vx *= 0.94; k.vy *= 0.94;
      paint();
      k.run = Math.abs(k.vx) + Math.abs(k.vy) > 0.15 ? requestAnimationFrame(step) : 0;
      if (!k.run) { k.vx = 0; k.vy = 0; paint(); }
    };
    k.run = requestAnimationFrame(step);
  }, [paint]);
  // The transform is written the moment the new sizes are in the DOM and before the browser draws, so the scale
  // and the layout it is scaling are never a frame out of step.
  useLayoutEffect(() => { lay.current = { rung, stepX: rung * SX, stepY: rung * SY }; paint(); }, [rung, paint]);
  useEffect(() => { const k = cam.current; return () => cancelAnimationFrame(k.run); }, []);

  /** Glide until a cell sits in the middle of the room left by the ask. */
  const bring = useCallback((c: number, r: number) => {
    const k = cam.current, sx = k.cw * SX, sy = k.cw * SY;
    // The nearest copy of that cell on the wrapping sheet.
    const wantX = size.w / 2 - (c + 0.5) * sx, wantY = (size.h - 120) / 2 - (r + 0.5) * sy, spanX = world.cols * sx, spanY = world.rows * sy;
    const dx = wantX - k.x - Math.round((wantX - k.x) / spanX) * spanX, dy = wantY - k.y - Math.round((wantY - k.y) / spanY) * spanY;
    if (calm.current) { k.x += dx; k.y += dy; k.vx = 0; k.vy = 0; paint(); return; }
    k.vx = dx * 0.064; k.vy = dy * 0.064; // what a 0.94 decay carries just that far
    coast();
  }, [size, world, coast, paint]);
  const goTo = useCallback((id: string) => { const at = world.where.get(id); if (at) { bring(at.c, at.r); setOpen(id); setAside([]); } }, [world, bring]);
  // A new sort or a new answer brings its centre (or its best fit) into view.
  const led = useRef("");
  useEffect(() => {
    const key = `${mode}|${topFit ?? ""}|${hue}|${axes?.x ?? ""}${axes?.y ?? ""}${axes?.reverse ? "r" : ""}`;
    if (led.current === key || size.w === 0) return;
    const f = requestAnimationFrame(() => { led.current = key; const at = topFit && mode === "fit" ? world.where.get(topFit) : undefined; bring(at?.c ?? Math.floor(world.cols / 2), at?.r ?? Math.floor(world.rows / 2)); });
    return () => cancelAnimationFrame(f);
  }, [mode, topFit, hue, axes, size.w, world, bring]);

  // A sheet opens at the width it has always opened at, which is nearer on a phone than on a desk.
  const started = useRef(false);
  useEffect(() => {
    if (!screen || started.current) return;
    started.current = true;
    const mid = SPAN[phone ? "phone" : "desk"].mid;
    cam.current.cw = mid; setRung(mid);
  }, [screen, phone]);
  // A smaller window cannot hold as much of the sheet: what is drawn comes back inside what this one allows.
  useEffect(() => {
    const k = cam.current, cw = Math.max(span.min, Math.min(span.max, k.cw));
    if (cw === k.cw) return;
    k.cw = cw; setRung(rungOf(cw, span));
  }, [span]);

  // The laid-out width follows what is drawn a rung at a time, and only once the scale has stretched far enough off
  // it to be worth a relayout — and only once that rung's paper has been drawn to a bitmap, because putting a sheet
  // of stamps on an undrawn paper means rasterising a blurred SVG once per stamp, which is the one thing this
  // screen already learned not to do. Past FORCED it goes anyway: a stretch that far looks broken.
  const settling = useRef(0);
  const follow = useCallback((cw: number, moving: boolean) => {
    const at = lay.current.rung, want = rungOf(cw, span), off = cw / at;
    if (want !== at) {
      const band = moving ? MOVING : HOLD;
      if (off > FORCED.hi || off < FORCED.lo) setRung(want);
      else if ((off > band.hi || off < band.lo) && paperDrawn(want, Math.round(want * RATIO))) setRung(want);
    }
    window.clearTimeout(settling.current);
    if (moving) settling.current = window.setTimeout(() => follow(cam.current.cw, false), SETTLE);
  }, [span]);

  /** Take the sheet to this stamp width, leaving whatever is at (ax, ay) where it is. */
  const zoomAt = useCallback((next: number, ax = size.w / 2, ay = size.h / 2) => {
    const k = cam.current, cw = Math.max(span.min, Math.min(span.max, next));
    if (Math.abs(cw - k.cw) < 0.002) return;
    // The point under the pointer (or between the fingers) stays under it.
    const f = cw / k.cw;
    k.x = ax - (ax - k.x) * f; k.y = ay - (ay - k.y) * f; k.cw = cw;
    paint();
    follow(cw, true);
    setEnds((was) => { const now = { near: cw >= span.max - 0.5, far: cw <= span.min + 0.5 }; return was.near === now.near && was.far === now.far ? was : now; });
  }, [paint, span, size, follow]);
  useEffect(() => () => window.clearTimeout(settling.current), []);
  // Every width the sheet can be laid out at is only a dozen papers, so they are all drawn while nothing else is
  // going on — nearest to hand first, one to a spare moment. A zoom then never waits on one.
  useEffect(() => {
    if (size.w === 0) return;
    const ladder: number[] = [];
    for (let v = span.min; ladder.length < 40; v = Math.round(v * RUNG)) { ladder.push(Math.min(v, span.max)); if (v >= span.max) break; }
    const here = cam.current.cw;
    ladder.sort((a, b) => Math.abs(a - here) - Math.abs(b - here));
    let at = 0, id = 0;
    const draw = () => {
      const v = ladder[at++];
      if (v === undefined) return;
      paperDrawn(v, Math.round(v * RATIO));
      id = window.requestIdleCallback?.(draw) ?? window.setTimeout(draw, 80);
    };
    id = window.requestIdleCallback?.(draw) ?? window.setTimeout(draw, 400);
    return () => { window.cancelIdleCallback?.(id); window.clearTimeout(id); };
  }, [span, size.w]);

  // The buttons, the + and − keys and the typed "closer": a stop away, eased, rather than arriving all at once.
  const zrun = useRef(0);
  useEffect(() => () => cancelAnimationFrame(zrun.current), []);
  const glide = useCallback((target: number, ax = size.w / 2, ay = size.h / 2) => {
    cancelAnimationFrame(zrun.current); zrun.current = 0;
    const k = cam.current, want = Math.max(span.min, Math.min(span.max, target)), from = k.cw;
    if (Math.abs(want - from) < 0.01) return;
    // Asked for less motion: the new width arrives at once, as a flick stops where it was let go.
    if (calm.current) { zoomAt(want, ax, ay); return; }
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 280), e = 1 - (1 - p) ** 3;
      zoomAt(from * (want / from) ** e, ax, ay); // a share of the width at a time, so the growth reads as even
      zrun.current = p < 1 ? requestAnimationFrame(step) : 0;
    };
    zrun.current = requestAnimationFrame(step);
  }, [zoomAt, span, size]);
  const stopGlide = () => { cancelAnimationFrame(zrun.current); zrun.current = 0; };

  const queued = useRef(0);
  useEffect(() => () => cancelAnimationFrame(queued.current), []);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const at = (e: React.PointerEvent | React.WheelEvent) => { const r = (box.current as HTMLDivElement).getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => {
    const p = at(e), k = cam.current;
    pts.current.set(e.pointerId, p);
    if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; k.pinch = Math.hypot(a.x - b.x, a.y - b.y); k.mx = (a.x + b.x) / 2; k.my = (a.y + b.y) / 2; k.drag = null; stopGlide(); return; }
    cancelAnimationFrame(k.run); k.run = 0; k.vx = 0; k.vy = 0;
    stopGlide();
    k.drag = { x: p.x, y: p.y, t: performance.now(), far: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = at(e), k = cam.current;
    k.px = p.x; k.py = p.y;
    if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, p);
    if (pts.current.size === 2 && k.pinch) {
      // Two fingers size the sheet and move it at once: what is between them stays between them, however they go.
      const [a, b] = [...pts.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      k.x += mx - k.mx; k.y += my - k.my; k.mx = mx; k.my = my;
      if (d > 4 && Math.abs(d - k.pinch) > 0.4) { zoomAt(k.cw * (d / k.pinch), mx, my); k.pinch = d; }
      else if (!queued.current) queued.current = requestAnimationFrame(() => { queued.current = 0; paint(); });
      return;
    }
    if (k.drag) {
      const now = performance.now(), dt = Math.max(1, now - k.drag.t), dx = p.x - k.drag.x, dy = p.y - k.drag.y;
      k.x += dx; k.y += dy; k.vx = k.vx * 0.5 + (dx / dt) * 8; k.vy = k.vy * 0.5 + (dy / dt) * 8;
      k.drag = { x: p.x, y: p.y, t: now, far: k.drag.far + Math.abs(dx) + Math.abs(dy) };
      if (k.drag.far > 6) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!queued.current) queued.current = requestAnimationFrame(() => { queued.current = 0; paint(); }); // once a frame, however many events arrive
  };
  const dragged = useRef(false);
  const onUp = (e: React.PointerEvent) => {
    const k = cam.current;
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) k.pinch = 0;
    dragged.current = (k.drag?.far ?? 0) > 6;
    k.drag = null;
    if (e.pointerType !== "mouse") { k.px = -1; k.py = -1; }
    coast();
  };
  // The canvas is the page: the document does not scroll under it (so the site's footer is simply never reached
  // here), and the wheel belongs to the canvas. React's wheel listener is passive and cannot say so, hence a native one.
  const wheel = useRef<(e: WheelEvent) => void>(() => undefined);
  useEffect(() => {
    wheel.current = (e: WheelEvent) => {
      e.preventDefault();
      const k = cam.current, r = (box.current as HTMLDivElement).getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top };
      // A trackpad pinch arrives as ctrl+wheel, a few counts at a time: each one is a share of the width, so the
      // sheet grows evenly however far in it already is. A mouse wheel held with ctrl sends a whole notch at once,
      // hence the cap — a notch should be a step, not a leap.
      if (e.ctrlKey) { stopGlide(); zoomAt(cam.current.cw * Math.exp(-Math.max(-40, Math.min(40, e.deltaY)) * 0.01), p.x, p.y); return; }
      const unit = e.deltaMode === 1 ? 32 : 1; // a mouse wheel counts in lines
      k.x -= e.deltaX * unit; k.y -= e.deltaY * unit;
      if (!queued.current) queued.current = requestAnimationFrame(() => { queued.current = 0; paint(); });
    };
  }, [zoomAt, paint]);
  useEffect(() => {
    const el = surface.current, root = document.documentElement;
    if (!el) return;
    const on = (e: WheelEvent) => wheel.current(e);
    el.addEventListener("wheel", on, { passive: false });
    const before = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = "hidden"; root.style.overscrollBehavior = "none";
    window.scrollTo(0, 0);
    const pin = () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); };
    window.addEventListener("scroll", pin);
    return () => { window.removeEventListener("scroll", pin); el.removeEventListener("wheel", on); root.style.overflow = before.overflow; root.style.overscrollBehavior = before.overscroll; };
  }, [screen]);
  const onKey = (e: React.KeyboardEvent) => {
    const by = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    const k = cam.current, sx = k.cw * SX, sy = k.cw * SY;
    if (by) { e.preventDefault(); if (calm.current) { k.x += by[0] * sx; k.y += by[1] * sy; paint(); } else { k.vx = by[0] * sx * 0.07; k.vy = by[1] * sy * 0.07; coast(); } }
    else if (e.key === "+" || e.key === "=") glide(k.cw * STOP); else if (e.key === "-") glide(k.cw / STOP);
  };

  const cells = useMemo(() => {
    const out: { c: number; r: number; cell: Cell }[] = [];
    for (let r = win.r0; r <= win.r1; r++) for (let c = win.c0; c <= win.c1; c++) out.push({ c, r, cell: cellAt(c, r) });
    return out;
  }, [win, cellAt]);
  // The middle of the screen is asked for first and without waiting its turn, so the view fills from the centre out
  // rather than all at once; the rest follow as the browser gets to them. Only places that carry a picture are
  // counted: a plot leaves most of its grid empty, and an empty place would otherwise spend one of the twelve.
  const eager = useMemo(() => {
    const cx = (win.c0 + win.c1) / 2, cy = (win.r0 + win.r1) / 2;
    return new Set(cells
      .filter(({ cell }) => cell?.kind === "style" && cell.s.picture)
      .map(({ c, r }) => ({ key: `${c},${r}`, d: Math.hypot(c - cx, (r - cy) * RATIO) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 12)
      .map((x) => x.key));
  }, [win, cells]);
  // A place that is still to be filled is a label, not an entry: opening one left the page believing a card was up.
  const openCell = useCallback((c: number, r: number) => { if (dragged.current) return; const cell = cellAt(c, r); if (cell?.kind === "style") { setOpen(cell.s.id); setAside([]); } }, [cellAt]);

  // The opened card, and where it currently sits for the arrows and the swipe.
  const style = open ? byAny.get(open) ?? null : null;
  const spot = open ? world.where.get(open) : undefined;
  useEffect(() => {
    if (!spot) return;
    for (const by of [-1, 1]) for (let step = 1; step <= world.cols; step++) { const cell = cellAt(spot.c + by * step, spot.r); if (cell?.kind === "style") { warm(cell.s.picture, phone ? 750 : 1080); break; } }
  }, [spot, world, cellAt, phone]);
  const turn = useCallback((by: number) => {
    if (!spot) return;
    for (let step = 1; step <= world.cols; step++) { const c = spot.c + by * step; const cell = cellAt(c, spot.r); if (cell?.kind === "style") { bring(c, spot.r); setOpen(cell.s.id); return; } }
  }, [spot, world, cellAt, bring]);

  // ---- operated in words ------------------------------------------------------
  // What is typed is first read as what the person wants this screen to do (api/explore/command): it may be an
  // ordinary question, or it may be "only art styles, by family, zoomed out", "compare Hertz and Lido", "more like
  // Reticle", "make them slides". The page performs the actions it is handed; it has no other interface for them.
  // What was last done is said about the wall, so an open card hides the line rather than forgetting it: the wall is
  // still arranged that way behind the card, and Undo, which the line carries, has to come back when the card closes.
  const [did, setDid] = useState<string[]>([]);
  const [gate, setGate] = useState(false);
  const openGate = useCallback(() => setGate(true), []);
  const [verdict, setVerdict] = useState<{ id: string; q: string; suits: number; helps: string[]; hurts: string[] } | null>(null);
  // The shortlist outlives the question: it is kept on this device.
  const [pins, setPins] = useState<string[]>([]);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("katagami-shortlist") ?? "[]"); if (Array.isArray(saved)) requestAnimationFrame(() => setPins(saved.filter((x) => typeof x === "string").slice(0, 24))); } catch { /* none kept */ } }, []);
  const pin = useCallback((ids: string[]) => setPins((now) => { const next = [...new Set([...now, ...ids])].slice(0, 24); try { localStorage.setItem("katagami-shortlist", JSON.stringify(next)); } catch { /* private window */ } return next; }), []);
  const unpin = useCallback((id: string) => setPins((now) => { const next = now.filter((x) => x !== id); try { localStorage.setItem("katagami-shortlist", JSON.stringify(next)); } catch { /* private window */ } return next; }), []);
  const commandTurn = useRef(0);
  // One step back: what the screen was before the last thing typed.
  const before = useRef<null | { kinds: Kinds; mode: Mode; hue: string; skin: Skin; cw: number; pair: string[] | null; axes: Axes | null; narrow: { trait: string; label: string } | null }>(null);
  const [canUndo, setCanUndo] = useState(false);
  const reset = useCallback(() => {
    commandTurn.current++;
    before.current = null; setCanUndo(false);
    setDid([]); setAside([]); setPair(null); setAxes(null); setNarrow(null); setMode("colour"); setVerdict(null); setOpen(null); setTray(false);
  }, []);
  const undo = () => { const b = before.current; if (!b) return; commandTurn.current++; /* a reading still on its way must not re-apply what was just undone */ setKinds(b.kinds); setMode(b.mode); setHue(b.hue); pickSkin(b.skin); glide(b.cw); setPair(b.pair); setAxes(b.axes); setNarrow(b.narrow); before.current = null; setCanUndo(false); setDid(["Undone"]); };
  const [pair, setPair] = useState<string[] | null>(null);
  const command = useCallback(async (text: string) => {
    const q = text.trim();
    if (q.length < 2) return;
    const mine = ++commandTurn.current; // a reading that comes back after a newer command was typed is dropped
    // A described product needs no reading: a long sentence with none of the words that operate the screen goes
    // straight to the search, so the common case costs one step, not two.
    const operates = /\b(only|just|sort|sorted|order|arrange|compare|like|pin|zoom|bigger|smaller|closer|further|against|versus|vs|undo|reset|clear|start over|cards?|stamps?|swatch|stencil|proof|everything|all)\b/i.test(q) || /^\s*(from\s+)?\w+\s+to\s+\w+\s*$/i.test(q);
    if (!open && !ask.answer && !operates && q.split(/\s+/).length >= 3) { before.current = null; setCanUndo(false); setPair(null); setHue(""); setDid([]); void ask.ask(q, kinds); return; }
    // With an answer on screen, a short change with none of the operating words is a refinement: straight to it.
    if (!open && ask.answer && !operates && q.split(/\s+/).length <= 6 && !/\b(app|site|website|dashboard|page|brand|poster|for an?|for the)\b/i.test(q)) { setTray(true); setDid(["Refined"]); void ask.refine(q, kinds); return; }
    const openId = open ?? "";
    // The wall's line and the card's line are separate: with a card up, what is said back is said about the card.
    const say = openId ? setAside : setDid;
    say(["…"]);
    before.current = { kinds, mode, hue, skin, cw: cam.current.cw, pair, axes, narrow };
    setCanUndo(true);
    const ranked = ask.fits ? [...ask.fits.entries()].filter(([id]) => byAny.has(id)).sort((a, b) => a[1].rank - b[1].rank).map(([id]) => id) : [];
    // Words that point at the screen ("this", "the top two") are resolved here, where the screen is known.
    const count = ({ one: 1, two: 2, three: 3, four: 4, five: 5 } as Record<string, number>)[(q.toLowerCase().match(/\b(one|two|three|four|five)\b/) ?? [])[1] ?? ""] ?? 0;
    if (/\bcompare\b/i.test(q) && /\btop\b/i.test(q) && ranked.length >= 2) { setPair(ranked.slice(0, Math.max(2, Math.min(3, count || 2)))); setTray(false); setOpen(null); setAside([]); setDid([`Comparing the top ${Math.max(2, Math.min(3, count || 2))}`]); ask.setQuery(""); return; }
    if (openId && /\b(more )?like (this|it)\b/i.test(q)) { const from = byAny.get(openId)!; setOpen(null); setAside([]); ask.setQuery(`like ${from.name}`); void ask.ask(`something like ${from.name}: ${from.traits.slice(0, 8).join(", ")}`, kinds); setDid([`Like ${from.name}`]); return; }
    if (openId && /\bpin (this|it)\b/i.test(q)) { pin([openId]); setAside(["Pinned"]); ask.setQuery(""); return; }
    let actions: { do: string; [k: string]: unknown }[] = [{ do: "ask", q }];
    try {
      const res = await fetch(`/api/explore/command?${new URLSearchParams({ q, answer: ask.answer ? "1" : "0", ...(openId ? { open: openId, kind: byAny.get(openId)?.kind ?? "language" } : {}) })}`);
      const body = await res.json();
      if (res.ok && Array.isArray(body.actions) && body.actions.length > 0) actions = body.actions;
    } catch { /* the ordinary question is the fallback */ }
    if (mine !== commandTurn.current) return;
    const said: string[] = [];
    let nextKinds = kinds;
    // An open card is put away on purpose, by whatever replaces it with a new answer, and never as a side effect.
    let put = false;
    const putAway = () => { if (openId) { setOpen(null); setVerdict(null); setAside([]); put = true; } };
    for (const a of actions) {
      if (a.do === "reset") { putAway(); ask.clear(); setHue(""); setPair(null); setAxes(null); setNarrow(null); setTray(false); setKinds({ language: true, art_style: true }); setMode("colour"); said.push("Cleared"); }
      else if (a.do === "kinds") { nextKinds = { language: Boolean(a.language), art_style: Boolean(a.art_style) }; setKinds(nextKinds); said.push(nextKinds.language && nextKinds.art_style ? "Everything" : nextKinds.language ? "Design languages only" : "Art styles only"); }
      else if (a.do === "sort") { setMode(a.by === "family" ? "family" : "colour"); said.push(`Sorted by ${a.by}`); }
      else if (a.do === "colour") { if (ask.answer) ask.clear(); setHue(String(a.hue)); said.push(`${a.hue} gathered`); }
      else if (a.do === "skin") { pickSkin(a.skin as Skin); said.push(`Cards: ${SKIN_NAME[a.skin as Skin]}`); }
      else if (a.do === "zoom") { glide(cam.current.cw * STOP ** Number(a.by)); said.push(Number(a.by) > 0 ? "Closer" : "Further"); }
      else if (a.do === "compare") { putAway(); nextKinds = { language: true, art_style: true }; setKinds(nextKinds); setPair(a.ids as string[]); setTray(false); said.push(`Comparing ${(a.names as string[]).join(" and ")}`); }
      else if (a.do === "like") { const from = byAny.get(String(a.id)); if (from) { putAway(); nextKinds = { language: true, art_style: true }; setKinds(nextKinds); setPair(null); ask.setQuery(`like ${from.name}`); void ask.ask(`something like ${from.name}: ${from.traits.slice(0, 8).join(", ")}`, nextKinds); said.push(`Like ${from.name}`); } }
      else if (a.do === "arrange") { setAxes({ x: String(a.trait), reverse: Boolean(a.reverse), labels: [String(a.label)] }); setMode("trait"); setTray(false); setPair(null); said.push(`Arranged by ${a.label}`); }
      else if (a.do === "plot") { setAxes({ x: String(a.x), y: String(a.y), labels: a.labels as string[] }); setMode("plot"); setTray(false); setPair(null); said.push(`${(a.labels as string[])[0]} against ${(a.labels as string[])[1]}`); }
      else if (a.do === "narrow") {
        const trait = String(a.trait), from = litNow ? [...litNow] : styles.map((s) => s.id);
        const enough = from.filter((id) => { const s = byId.get(id); return s ? valueOf(s, trait) >= 58 : false; }).length >= 4;
        setNarrow({ trait, label: String(a.label) }); setTray(false);
        said.push(enough ? `Only ${a.label}` : `Nearest to ${a.label}`);
      }
      else if (a.do === "pin") { const ids = openId ? [openId] : ranked.slice(0, Number(a.n) || 3); if (ids.length > 0) { pin(ids); said.push(`Pinned ${ids.length}`); } else said.push("Nothing to pin yet"); }
      else if (a.do === "judge") { setVerdict({ id: String(a.id), q, suits: Number(a.suits), helps: (a.helps as string[]) ?? [], hurts: (a.hurts as string[]) ?? [] }); said.push("Judged"); }
      else if (a.do === "refine") { void ask.refine(String(a.say), nextKinds); said.push("Refined"); }
      // Nothing placed. Beside an open card that is an honest dead end, and the card stays where it is: a search
      // run here would close over the very thing the question was about and answer with somebody else.
      else if (a.do === "cannot" && openId) { said.push("Not something this one can answer"); ask.setQuery(""); }
      else if (a.do === "cannot") { said.push("Can't do that here"); said.push("Searched the library for it instead"); setPair(null); setHue(""); void ask.ask(q, nextKinds); }
      else { putAway(); setPair(null); setHue(""); void ask.ask(q, nextKinds); if (openId) said.push("Searched the library"); }
    }
    if (openId && !put) setAside(said); else { setAside([]); setDid(said); }
    if (said.length > 0 && !actions.some((a) => ["ask", "refine", "like"].includes(a.do))) ask.setQuery("");
  }, [ask, kinds, byAny, glide, mode, hue, skin, pair, axes, narrow, litNow, styles, byId, open, pin]);

  const tab = (value: Mode, label: string, off = false) => <button type="button" disabled={off} aria-pressed={mode === value} onClick={() => { setAxes(null); setMode(value); }} className={`shrink-0 cursor-pointer whitespace-nowrap px-3 py-1.5 text-[12.5px] disabled:cursor-default disabled:opacity-40 ${mode === value ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground"}`}>{label}</button>;
  const glass = "bg-background/70 shadow-[0_8px_30px_-12px_rgba(30,35,45,0.4)] backdrop-blur-xl backdrop-saturate-150";

  if (!screen) return <div className="h-[calc(100dvh-var(--site-header))] w-full" aria-busy="true" />;
  return (
    <SkinContext.Provider value={skin}>
    <div ref={box} data-canvas onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }} style={{ background: GROUND }} className={`relative h-[calc(100dvh-var(--site-header))] w-full select-none overflow-hidden`}>
      <h1 className="sr-only">Explore the library</h1>
      <div role="application" aria-label="The sheet. Drag or use the arrow keys to move across it; plus and minus change how much you see." tabIndex={0} onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }} onKeyDown={onKey} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={(e) => { if (e.pointerType === "mouse") { cam.current.px = -1; cam.current.py = -1; paint(); } }} ref={surface}
        className="absolute inset-0 cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--ramune)] active:cursor-grabbing">
        {/* The sheet's own corner is what the scale grows from, so a stamp's place on it is its place times the width. */}
        <div ref={layer} style={{ transformOrigin: "0 0" }} className="absolute left-0 top-0 will-change-transform">
          <Sheet onGhost={openGate} eager={eager} hold={hold} cells={cells} w={w} h={h} stepX={stepX} stepY={stepY} lit={litNow} onOpen={openCell} />
        </div>
        <div ref={glare} aria-hidden className="canvas-glare" />
      </div>

      <div ref={head} className="pointer-events-none absolute inset-x-0 top-2 z-[35] flex flex-col items-center gap-2 px-2 md:top-3 md:px-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto [scrollbar-width:none] md:justify-center">
          <div role="group" aria-label="Show" className={`flex shrink-0 ${glass}`}>
            {([["language", "Design languages"], ["art_style", "Art styles"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={kinds[k]} onClick={() => setKinds((now) => { const next = { ...now, [k]: !now[k] }; return next.language || next.art_style ? next : { language: k !== "language", art_style: k !== "art_style" }; })}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[12.5px] ${kinds[k] ? "text-foreground" : "text-foreground/40"}`}>
                <span aria-hidden className="inline-block h-2 w-2" style={{ background: kinds[k] ? "var(--foreground)" : "transparent", boxShadow: "inset 0 0 0 1.5px currentColor" }} />{label}
              </button>
            ))}
          </div>
          {topFit && !tray ? <button type="button" onClick={() => setTray(true)} className={`shrink-0 cursor-pointer whitespace-nowrap px-3 py-1.5 text-[12.5px] ${glass}`}>Results</button> : null}
          <div role="group" aria-label="Sort the sheet" className={`flex shrink-0 ${glass}`}>{tab("colour", "By colour")}{tab("family", "By family")}{tab("fit", "By fit", !topFit)}</div>
        </div>
      </div>
      <div className={`absolute bottom-[8.5rem] left-3 z-20 flex flex-col md:bottom-6 md:left-6 ${glass}`}>
        <button type="button" onClick={() => glide(cam.current.cw * STOP)} disabled={ends.near} aria-label="Closer" className="h-10 w-10 cursor-pointer text-[18px] disabled:opacity-30">+</button>
        <button type="button" onClick={() => glide(cam.current.cw / STOP)} disabled={ends.far} aria-label="Further" className="h-10 w-10 cursor-pointer text-[18px] disabled:opacity-30">−</button>
      </div>

      {gate && whole !== null ? <Gate onClose={() => setGate(false)} /> : null}
      {style ? <Viewer key={style.id} style={style} family={style.family ? familyOf.get(style.family) ?? null : null} fit={ask.fits?.get(style.id) ?? null} judging={ask.state === "asking"} phone={phone} onTurn={turn} onClose={() => { setOpen(null); setVerdict(null); setAside([]); }} verdict={verdict && verdict.id === style.id ? verdict : null} pinned={pins.includes(style.id)} onPin={() => (pins.includes(style.id) ? unpin(style.id) : pin([style.id]))} /> : null}
      {axes && (mode === "trait" || mode === "plot") ? (
        <p className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${glass}`} style={{ top: "calc(var(--head, 60px) + 14px)" }}>
          {mode === "plot" ? <>{axes.labels[0]} → <span className="mx-1.5 opacity-40">·</span> {axes.labels[1]} ↑</> : <>{axes.reverse ? "most" : "least"} {axes.labels[0]} → {axes.reverse ? "least" : "most"}</>}
        </p>
      ) : null}
      {pins.length > 0 && !open ? (
        <aside aria-label="Shortlist" className={`absolute right-3 z-[34] flex max-h-[60%] w-[5.5rem] flex-col gap-2 overflow-y-auto p-2 md:right-5 ${glass}`} style={{ top: "calc(var(--head, 60px) + 14px)" }}>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/60">Shortlist {pins.length}</p>
          {pins.map((id) => { const s = byAny.get(id); return s ? (
            <div key={id} className="group relative">
              <button type="button" onClick={() => goTo(id)} aria-label={s.name} title={s.name} className="block cursor-pointer"><Card src={s.picture} spare={s.thumbnail_url} ink={s.ink} w={72} h={72} fast={NEAR} /></button>
              <button type="button" onClick={() => unpin(id)} aria-label={`Remove ${s.name}`} className="absolute -right-1 -top-1 cursor-pointer bg-foreground px-1 text-[10px] leading-4 text-background opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">×</button>
            </div>
          ) : null; })}
        </aside>
      ) : null}
      {pair ? <Compare ids={pair} byId={byAny} familyOf={familyOf} phone={phone} onOpen={(id) => { setPair(null); goTo(id); }} onClose={() => setPair(null)} /> : null}
      {ask.state === "asking" && !ask.fits && !open && !pair ? (
        <div aria-hidden className="viewer-veil absolute inset-0 z-30 flex items-center justify-center bg-[color-mix(in_srgb,var(--background)_60%,transparent)] px-3 backdrop-blur-md" style={{ paddingTop: "calc(var(--head, 60px) + 16px)", paddingBottom: "calc(var(--dock-h, 150px) + 12px)" }}>
          {/* The wait is a sheet being franked: blank stamps laid down one after another, each taking the postmark
              as it lands, over and over until the answer comes back. */}
          <div className="flex flex-col items-center gap-7">
            <ul className="flex items-end" style={{ gap: phone ? 10 : 16 }}>
              {Array.from({ length: phone ? 3 : 5 }, (_, i) => (
                <li key={i} className="franking relative" style={{ animationDelay: `${i * 260}ms`, ["--turn" as string]: `${((i % 3) - 1) * 2.4}deg` }}>
                  <Card src={null} ink="color-mix(in srgb, var(--foreground) 7%, var(--background))" w={phone ? 74 : 104} h={phone ? 89 : 125} />
                  <svg aria-hidden viewBox="0 0 100 100" className="postmark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: phone ? 54 : 76, animationDelay: `${i * 260 + 150}ms` }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--foreground)" strokeWidth="5" strokeDasharray="7 9" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="27" fill="none" stroke="var(--foreground)" strokeWidth="3.5" />
                  </svg>
                </li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/45">Reading the library</p>
          </div>
        </div>
      ) : null}
      {tray && ask.fits && !open && !pair ? <Tray want={ask.answer?.want ?? null} fits={ask.fits} byId={byId} judging={ask.state === "asking"} phone={phone} onOpen={(id) => { setTray(false); goTo(id); }} onClose={() => setTray(false)} /> : null}
      <AskDock ask={ask} hue={hue} onHue={setHue} onGo={goTo} byId={byId} lit={litNow ? litNow.size : null} kinds={kinds} quiet compact={phone && Boolean(open)} card={Boolean(open)} onSubmit={command} note={open ? aside : did} onUndo={canUndo && !open ? undo : undefined} onClear={reset} hints={open ? ["would this suit a bank?", "more like this", "pin this"] : ask.answer ? ["warmer", "quieter", "less corporate", "only the dark ones"] : ["a calm booking app for an island ferry", "dark to light", "only the dark ones"]} />
    </div>
    </SkinContext.Provider>
  );
}

const TRAIT_LABEL = new Map(STYLE_DNA_QUESTIONS.map((q) => [q.id, q.label]));

/** Styles named in a sentence, set side by side: what they share, and what is each one's own. */
function Compare({ ids, byId, familyOf, phone, onOpen, onClose }: { ids: string[]; byId: Map<string, AtlasStyle>; familyOf: Map<string, Family>; phone: boolean; onOpen: (id: string) => void; onClose: () => void }) {
  const styles = ids.map((id) => byId.get(id)).filter((s): s is AtlasStyle => Boolean(s)).slice(0, phone ? 2 : 3);
  const shared = styles.length > 1 ? styles[0].traits.filter((t) => styles.every((s) => s.traits.includes(t))) : [];
  const w = phone ? 150 : 300, h = Math.round(w * 0.72);
  return (
    <div className="viewer-veil absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-[color-mix(in_srgb,var(--background)_70%,transparent)] px-3 backdrop-blur-md" style={{ paddingTop: "calc(var(--head, 60px) + 16px)", paddingBottom: "calc(var(--dock-h, 150px) + 12px)" }} onClick={onClose}>
      {shared.length > 0 ? <p onClick={(e) => e.stopPropagation()} className="max-w-xl text-center text-[13.5px] text-foreground/75"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">Both </span>{shared.slice(0, 6).map((t) => TRAIT_LABEL.get(t) ?? t).join(" · ")}</p> : null}
      <ul onClick={(e) => e.stopPropagation()} className="flex items-start justify-center gap-4 md:gap-10">
        {styles.map((s, i) => (
          <li key={s.id} className="tray-card flex flex-col items-center gap-2 text-center" style={{ animationDelay: `${i * 90}ms`, ["--tilt" as string]: `${i % 2 ? 1.5 : -1.5}deg`, width: w + 40 }}>
            <button type="button" onClick={() => onOpen(s.id)} aria-label={s.name} className="block cursor-pointer"><Card src={s.picture} spare={s.thumbnail_url} ink={s.ink} w={w} h={h} windowed label={s.name} code={codeOf(s.id)} fast={750} /></button>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/60">{s.kind === "language" ? "Design language" : "Art style"}{s.family && familyOf.get(s.family) ? ` · ${familyOf.get(s.family)!.label}` : ""}</p>
            <p className="text-[13px] leading-snug text-foreground/80"><span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/55">Its own </span>{s.traits.filter((t) => !shared.includes(t)).slice(0, 5).map((t) => TRAIT_LABEL.get(t) ?? t).join(" · ") || "—"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The answer, brought to the middle: the fitting styles as large stamps that land one after another over the
 *  quietened sheet. No coloured rules; how well each fits is said in small type under its name. */
function Tray({ fits, byId, judging, phone, want, onOpen, onClose }: { want: Record<string, number> | null; fits: Map<string, Fit>; byId: Map<string, AtlasStyle>; judging: boolean; phone: boolean; onOpen: (id: string) => void; onClose: () => void }) {
  const hand = [...fits.entries()].filter(([id]) => byId.has(id)).sort((a, b) => a[1].rank - b[1].rank).slice(0, phone ? 8 : 10);
  // Two rows on a desk, one swiping row on a phone, sized to the room between the sentence and the ask.
  const headH = Number.parseFloat(getComputedStyle(document.querySelector("[data-canvas]") ?? document.body).getPropertyValue("--head")) || 170;
  const dockH = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 170;
  const room = window.innerHeight - 65 - headH - 16 - dockH - 12 - 60;
  const w = Math.max(96, Math.min(phone ? 200 : 184, Math.round((phone ? room - 30 : room / 2 - 40) / RATIO))), h = Math.round(w * RATIO);
  return (
    <div className="viewer-veil absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[color-mix(in_srgb,var(--background)_60%,transparent)] px-3 backdrop-blur-md" style={{ paddingTop: "calc(var(--head, 60px) + 16px)", paddingBottom: "calc(var(--dock-h, 150px) + 12px)" }} onClick={onClose}>
      <ul onClick={(e) => e.stopPropagation()} className={phone ? "flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-8 py-4 [scrollbar-width:none]" : "flex max-w-[64rem] flex-wrap items-start justify-center gap-x-5 gap-y-5"}>
        {hand.map(([id, fit], i) => { const s = byId.get(id)!; return (
          <li key={id} className="tray-card shrink-0 snap-center" style={{ animationDelay: `${i * 55}ms`, ["--tilt" as string]: `${((i * 37) % 7) - 3}deg` }}>
            <button type="button" onClick={() => onOpen(id)} aria-label={s.name} className="block cursor-pointer text-center">
              <Card src={s.picture} spare={s.thumbnail_url} ink={s.ink} w={w} h={h} label={s.name} code={codeOf(s.id)} fast={NEAR} />
              <span className="mt-2 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/65">{fit.strange ? "A wild card" : fitWord(fit, judging)}</span>
              {/* Why: what was asked for that this one measurably has. */}
              {want ? <span className="mx-auto mt-0.5 block truncate text-[11.5px] text-foreground/60" style={{ maxWidth: w }}>{STYLE_DNA_QUESTIONS.filter((q) => (want[q.id] ?? 0) >= 0.62 && valueOf(s, q.id) >= 58).sort((a, b) => (want[b.id] ?? 0) - (want[a.id] ?? 0)).slice(0, 3).map((q) => q.label).join(" · ")}</span> : null}
            </button>
          </li>
        ); })}
      </ul>
      <button type="button" onClick={onClose} className="shrink-0 cursor-pointer bg-foreground px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-background">See them on the sheet</button>
    </div>
  );
}

/** Each picture's own shape (width over height), read from its small copy, which is usually already in the cache. */
function useShapes(pictures: string[], spare: string | null) {
  const [shapes, setShapes] = useState<Record<string, number>>({});
  const [dead, setDead] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let live = true;
    // A picture whose file is gone is measured from the spare the card will actually draw, or the whole entry is
    // laid out for a shape nothing on it has.
    for (const p of pictures) {
      const img = new Image();
      img.onload = () => { if (live && img.naturalWidth > 0) setShapes((now) => (now[p] ? now : { ...now, [p]: img.naturalWidth / img.naturalHeight })); };
      img.onerror = () => {
        if (!live) return;
        setDead((now) => (now.has(p) ? now : new Set(now).add(p)));
        if (spare && img.src !== quick(spare, NEAR)) img.src = quick(spare, NEAR);
      };
      img.src = quick(p, NEAR);
    }
    return () => { live = false; };
  }, [pictures, spare]);
  return { shapes, dead };
}

// Prints dropped on a table: where each one lands (its centre, as a share of the table), how wide it is (as a share
// of the table's width), how it is turned, and which lies on top. The first picture leads; the rest overlap its edges.
/** What pressing a greyed card opens: one line and one way in, a sheet up from the bottom on a phone and a card
 *  in the middle on a desk. */
function Gate({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      // The keyboard stays inside while it is up, so tabbing cannot wander back onto the sheet behind it.
      if (e.key !== "Tab" || !box.current) return;
      const able = box.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (able.length === 0) return;
      const first = able[0], last = able[able.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    };
    document.addEventListener("keydown", key);
    box.current?.querySelector<HTMLElement>("a[href]")?.focus();
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Sign in to see the full library" onClick={onClose}
      className="absolute inset-0 z-[60] flex items-end justify-center bg-[color-mix(in_srgb,var(--foreground)_24%,transparent)] px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0">
      <div ref={box} onClick={(e) => e.stopPropagation()} className="gate-card w-full max-w-[22rem] bg-background px-6 pb-6 pt-7 shadow-[0_24px_70px_-24px_rgba(20,24,34,0.55)] sm:px-7 sm:pb-7">
        <h2 className="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em]">Sign in to see the full library</h2>
        <Link href="/signin" className="mt-6 block bg-foreground px-6 py-4 text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background">Sign in with Google</Link>
        <button type="button" onClick={onClose} className="mt-2 w-full cursor-pointer py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/55 hover:text-foreground">Not now</button>
      </div>
    </div>
  );
}

const TABLE: { x: number; y: number; s: number; r: number; z: number }[][] = [
  [{ x: 0.5, y: 0.5, s: 0.62, r: -1.5, z: 1 }],
  [{ x: 0.37, y: 0.47, s: 0.54, r: -3, z: 1 }, { x: 0.74, y: 0.6, s: 0.4, r: 4.5, z: 2 }],
  [{ x: 0.37, y: 0.45, s: 0.52, r: -3, z: 2 }, { x: 0.76, y: 0.32, s: 0.35, r: 5, z: 1 }, { x: 0.7, y: 0.76, s: 0.36, r: -2.5, z: 3 }],
  [{ x: 0.36, y: 0.44, s: 0.5, r: -3, z: 2 }, { x: 0.75, y: 0.27, s: 0.32, r: 4.5, z: 1 }, { x: 0.82, y: 0.68, s: 0.3, r: -5, z: 3 }, { x: 0.55, y: 0.8, s: 0.29, r: 3, z: 4 }],
  [{ x: 0.4, y: 0.42, s: 0.48, r: -2.5, z: 3 }, { x: 0.78, y: 0.26, s: 0.3, r: 5, z: 1 }, { x: 0.84, y: 0.68, s: 0.28, r: -5, z: 4 }, { x: 0.57, y: 0.81, s: 0.27, r: 3, z: 5 }, { x: 0.12, y: 0.78, s: 0.24, r: -7, z: 2 }],
  [{ x: 0.42, y: 0.44, s: 0.46, r: -2.5, z: 3 }, { x: 0.79, y: 0.27, s: 0.28, r: 5, z: 1 }, { x: 0.85, y: 0.7, s: 0.27, r: -5, z: 4 }, { x: 0.58, y: 0.82, s: 0.26, r: 3, z: 5 }, { x: 0.13, y: 0.76, s: 0.24, r: -7, z: 2 }, { x: 0.1, y: 0.24, s: 0.2, r: 6, z: 1 }],
];
/** Each picture's window size and place on a table of the given size; tall pictures are narrowed so none towers over the rest. */
function scatter(ratios: number[], width: number, height: number) {
  const spots = TABLE[Math.min(ratios.length, TABLE.length) - 1] ?? [];
  const laid = ratios.slice(0, spots.length).map((ratio, i) => {
    const spot = spots[i];
    let w = spot.s * width * Math.min(1, Math.sqrt(ratio / 1.4)), h = w / ratio;
    const tallest = height * (i === 0 ? 0.86 : 0.5);
    if (h > tallest) { h = tallest; w = h * ratio; }
    return { ...spot, w, h, cx: spot.x * width, cy: spot.y * height };
  });
  // Whatever the shapes turned out to be, the whole spread is brought inside the table (with room for the paper
  // round each print, its turn and its hover), so nothing reaches the name beneath or the header above.
  const pad = 30, x0 = Math.min(...laid.map((p) => p.cx - p.w / 2)) - pad, x1 = Math.max(...laid.map((p) => p.cx + p.w / 2)) + pad, y0 = Math.min(...laid.map((p) => p.cy - p.h / 2)) - pad, y1 = Math.max(...laid.map((p) => p.cy + p.h / 2)) + pad;
  const k = Math.min(1, width / (x1 - x0), height / (y1 - y0)), ox = (width - (x1 - x0) * k) / 2 - x0 * k, oy = (height - (y1 - y0) * k) / 2 - y0 * k;
  return laid.map((p) => ({ ...p, w: p.w * k, h: p.h * k, left: p.cx * k + ox, top: p.cy * k + oy }));
}

/** A stamp opened: the entry's pictures at their own shape, the main one large, on a veil of the entry's ink.
 *  The picture is the way in (it is a link to the entry's page), as is the wide button under it. What the sheet
 *  already loaded is shown at once, soft, while the large picture arrives over it. */
function Viewer({ style, family, fit, judging, phone, onTurn, onClose, verdict, pinned, onPin }: { style: AtlasStyle; family: Family | null; fit: Fit | null; judging: boolean; phone: boolean; onTurn: (by: number) => void; onClose: () => void; verdict: { q: string; suits: number; helps: string[]; hurts: string[] } | null; pinned: boolean; onPin: () => void }) {
  const root = useRef<HTMLDivElement | null>(null);
  const swipe = useRef<{ x: number } | null>(null);
  const held = useMemo(() => (style.pictures.length > 0 ? style.pictures : style.picture ? [style.picture] : []), [style]);
  const [at, setAt] = useState(0);
  const { shapes, dead } = useShapes(held, style.thumbnail_url);
  // A picture whose file is gone draws the entry's thumbnail instead, so an entry whose references are all gone was
  // four cards of the same picture. Only the pictures that are really there are shown, and the thumbnail stands in
  // once for all of them rather than once each.
  const pictures = useMemo(() => {
    const alive = held.filter((p) => !dead.has(p));
    if (alive.length > 0) return alive;
    return style.thumbnail_url ? [style.thumbnail_url] : held.slice(0, 1);
  }, [held, dead, style.thumbnail_url]);
  // The thing people come for: the art style's prompt, or the language's DESIGN.md, on the clipboard in one press.
  const [copied, setCopied] = useState<"" | "copying" | "done" | "failed">("");
  const copy = async () => {
    setCopied("copying");
    try {
      const text = style.kind === "art_style" ? await fetch(`/api/explore/recipe?id=${encodeURIComponent(style.id)}`).then((r) => (r.ok ? (r.json() as Promise<{ text?: string }>) : { text: "" })).then((j) => j.text) : await fetch(`${style.href}/DESIGN.md`).then((r) => (r.ok ? r.text() : ""));
      if (!text) throw new Error("nothing to copy");
      await navigator.clipboard.writeText(text);
      setCopied("done");
    } catch { setCopied("failed"); }
    window.setTimeout(() => setCopied(""), 2200);
  };
  const main = pictures[Math.min(at, pictures.length - 1)] ?? null, big = phone ? 750 : 1080;
  // A modal: focus moves in when it opens, stays in while it is open, and goes back where it was when it closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLElement>("[data-open]")?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab" && root.current) {
        const stops = [...root.current.querySelectorAll<HTMLElement>("a[href], button")], first = stops[0], last = stops[stops.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } else if (!root.current.contains(document.activeElement)) { e.preventDefault(); first?.focus(); }
        return;
      }
      const typing = (e.target as HTMLElement | null)?.tagName === "TEXTAREA" || (e.target as HTMLElement | null)?.tagName === "INPUT";
      if (e.key === "Escape") onClose(); else if (!typing && e.key === "ArrowRight") onTurn(1); else if (!typing && e.key === "ArrowLeft") onTurn(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, onTurn]);
  // The other pictures are fetched while the first is looked at, so stepping through them is instant.
  useEffect(() => { for (const p of pictures.slice(1, 4)) { const img = new Image(); img.src = quick(p, big); } }, [pictures, big]);

  // Desk: every picture at once, as stamps of different sizes arranged like prints on a table. Phone: one at a time.
  const roomW0 = phone ? window.innerWidth - 56 : Math.min(window.innerWidth * 0.66, 1040), dockH = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 170;
  // What is left between the header and the ask bar, less the name, the traits, a verdict and the button.
  const roomH = Math.max(200, window.innerHeight - 65 - dockH - (phone ? 250 : 230) - (verdict ? 96 : 0));
  const roomW = Math.min(roomW0, roomH * 2.1); // a short table is also a narrower one, so the prints keep their proportions
  const shown = phone ? (main ? [main] : []) : pictures;
  const placed = scatter(shown.map((p) => shapes[p] ?? 1.5), roomW, roomH);
  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label={style.name} className="viewer-veil absolute inset-0 z-40 flex flex-col items-center gap-4 [justify-content:safe_center] overflow-y-auto px-4 pt-16 backdrop-blur-2xl md:pt-6 backdrop-saturate-150" style={{ background: `color-mix(in srgb, ${style.ink ?? "#888"} 34%, color-mix(in srgb, var(--background) 78%, transparent))`, paddingBottom: "calc(var(--dock-h, 150px) + 16px)" }}
      onClick={onClose} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--lx", String(Math.round((e.clientX - r.left - r.width / 2) * 1.6))); e.currentTarget.style.setProperty("--ly", String(Math.round((e.clientY - r.top - r.height * 0.4) * 1.6))); }} onPointerDown={(e) => { swipe.current = { x: e.clientX }; }} onPointerUp={(e) => { const d = swipe.current ? e.clientX - swipe.current.x : 0; swipe.current = null; if (Math.abs(d) > 70) { e.stopPropagation(); onTurn(d < 0 ? 1 : -1); } }}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 cursor-pointer bg-background/70 p-2.5 backdrop-blur-md"><X size={18} /></button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onTurn(-1); }} aria-label="Previous" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-background/70 p-3 backdrop-blur-md max-md:hidden"><ArrowLeft size={18} /></button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onTurn(1); }} aria-label="Next" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer bg-background/70 p-3 backdrop-blur-md max-md:hidden"><ArrowRight size={18} /></button>

      {/* The same stamps as on the sheet, grown: each is cut to its picture's own shape, leans to the pointer and takes
          its light, and is a way into the entry. */}
      {phone && main ? (
        // A phone shows one picture at a time, as one large stamp carrying the entry's name.
        <Link href={style.href} onClick={(e) => e.stopPropagation()} aria-label={`Open ${style.name}`} className="lit-big book-open block shrink-0 outline-none">
          <Card key={main} src={main} spare={style.thumbnail_url} ink={style.ink} w={roomW} h={Math.min(roomH, roomW / (shapes[main] ?? 1.5))} windowed label={style.name} value={pictures.length > 1 ? `${at + 1}/${pictures.length}` : undefined} fast={750} under={quick(main, NEAR)} lit={{ x: 0, y: 0 }} />
        </Link>
      ) : null}
      {phone ? null : (
      <div onClick={(e) => e.stopPropagation()} className="lit-big relative shrink-0" style={{ width: roomW, height: roomH }}>
        {shown.slice(0, placed.length).map((p, i) => {
          const at = placed[i];
          return (
            <Link key={p} href={style.href} aria-label={`Open ${style.name}`} className="collage-print absolute block outline-none" style={{ left: at.left, top: at.top, zIndex: at.z, ["--tilt" as string]: `${at.r}deg`, animationDelay: `${i * 80}ms` }}>
              <Card src={p} spare={style.thumbnail_url} ink={style.ink} w={at.w} h={at.h} windowed fast={phone ? 750 : i === 0 ? 1080 : 750} under={quick(p, NEAR)} lit={{ x: at.left - roomW / 2, y: at.top - roomH / 2 }} />
            </Link>
          );
        })}
      </div>
      )}

      {phone && pictures.length > 1 ? (
        <ul onClick={(e) => e.stopPropagation()} className="flex max-w-full shrink-0 items-end gap-3 overflow-x-auto px-2 pb-2 pt-1 [scrollbar-width:none]">
          {pictures.map((p, i) => (
            <li key={p} className="shrink-0">
              {/* A print in the strip keeps its own shape, as the large one above it does. A square cut a portrait
                  off at the chin and took the sides off a landscape, which read as damage rather than as a thumbnail. */}
              <button type="button" onClick={() => setAt(i)} aria-label={`Picture ${i + 1} of ${pictures.length}`} aria-pressed={i === at} className="block cursor-pointer" style={{ opacity: i === at ? 1 : 0.65 }}><Card src={p} spare={style.thumbnail_url} ink={style.ink} w={Math.round(54 * Math.min(1.9, Math.max(0.62, shapes[p] ?? 1.5)))} h={54} fast={NEAR} /></button>
            </li>
          ))}
        </ul>
      ) : null}

      <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-[460px] shrink-0 flex-col items-center gap-1.5 text-center">
        <h2 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] max-md:sr-only md:text-[30px]">{style.name}</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/70">{style.kind === "language" ? "Design language" : "Art style"}{family ? ` · ${family.label}` : ""}{fit ? <span className="font-bold" style={{ color: fit.strange ? "var(--sakura)" : "var(--ramune)" }}> · {fitWord(fit, judging)}</span> : null}</p>
        {style.traits.length > 0 ? <p className="text-[13.5px] leading-snug text-foreground/75">{style.traits.slice(0, 5).map((t) => TRAIT.get(t) ?? t).join(" · ")}</p> : null}
        {verdict ? (
          <div aria-live="polite" className="mt-1 w-full bg-background/80 px-4 py-3 text-left backdrop-blur-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/60">“{verdict.q}”</p>
            <p className="mt-1 font-display text-[19px] font-bold tracking-[-0.02em]">{verdict.suits >= 0.72 ? "Yes, a good fit" : verdict.suits >= 0.5 ? "It could work" : verdict.suits >= 0.3 ? "A stretch" : "Probably not"} <span className="font-mono text-[11px] font-normal text-foreground/55">{Math.round(verdict.suits * 100)}</span></p>
            {verdict.helps.length > 0 ? <p className="mt-1 text-[13px] text-foreground/80"><span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/55">For it </span>{verdict.helps.join(" · ")}</p> : null}
            {verdict.hurts.length > 0 ? <p className="text-[13px] text-foreground/80"><span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/55">Against </span>{verdict.hurts.join(" · ")}</p> : null}
          </div>
        ) : null}
        <div className="mt-2 flex w-full items-stretch gap-2">
          <button type="button" onClick={() => onTurn(-1)} aria-label="Previous" className="cursor-pointer bg-background/70 px-4 backdrop-blur-md md:hidden"><ArrowLeft size={18} /></button>
          <button type="button" data-open onClick={copy} disabled={copied === "copying"} className="flex-1 cursor-pointer bg-foreground px-6 py-4 text-center font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background disabled:opacity-60">{copied === "done" ? "Copied" : copied === "failed" ? "Could not copy" : style.kind === "art_style" ? "Copy prompt" : "Copy DESIGN.md"}</button>
          <Link href={style.href} className="flex items-center bg-background/70 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-md hover:bg-background">Open</Link>
          <button type="button" onClick={onPin} aria-pressed={pinned} className="cursor-pointer bg-background/70 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-md">{pinned ? "Pinned" : "Pin"}</button>
          <button type="button" onClick={() => onTurn(1)} aria-label="Next" className="cursor-pointer bg-background/70 px-4 backdrop-blur-md md:hidden"><ArrowRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}
