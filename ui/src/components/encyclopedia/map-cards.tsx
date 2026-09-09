"use client";

import { memo, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { CellManifestation, EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { MAP_INK, MAP_LABEL } from "@/lib/encyclopedia-graph";
import { inkChipStyle, Tape } from "./chrome";
import { cellFaces, cellMaterial, SET_EYEBROW, SET_INK, type CellFace } from "./material";
import { HUB_H, HUB_W, NAME_W, plateBox, SAT_W, type SatelliteNode } from "./graph-layout";

// The nodes on the map. A plate is a cell. How much of it is drawn depends on
// how big it prints on screen — its own size, not the camera's zoom alone, so
// a small narrower cell beside a large one shows less until the reader comes
// in on it. Far out it is its picture and its name; closer the picture says
// where it came from; close in the card carries the eyebrow, the scope, the
// material and the caption. A satellite is one manifestation: a small
// thumbnail joined to its cell by a dotted line, opening the record's page. A
// hub is a category: the entry to one map, with the faces of its most
// prominent cells.

export type Lod = "picture" | "named" | "reading";

/** What is drawn on a card that prints at `ek` of its designed size. */
export function lodFor(ek: number): Lod {
  if (ek < 0.32) return "picture";
  if (ek < 0.72) return "named";
  return "reading";
}

const PAPER = "var(--washi)";

/** A type size in card units that comes out at `px` on screen, between a
 *  floor and a ceiling in card units: counter-scaling, so a name reads at
 *  every zoom the card is drawn at without turning into a poster. */
function screenPx(px: number, ek: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, px / Math.max(0.01, ek)));
}

export function Eyebrow({ ink, children, className = "", style }: { ink: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`block font-mono text-[7.5px] font-bold uppercase tracking-[0.14em] ${className}`} style={{ color: `color-mix(in oklch, ${ink} 78%, var(--foreground))`, ...style }}>
      {children}
    </span>
  );
}

/** A passage on a strip of paper. */
export function PaperStrip({ text, className = "", lines = 8, style }: { text: string; className?: string; lines?: number; style?: CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden px-3 py-2.5 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--yuzu) 7%, var(--washi))",
        boxShadow: "var(--shadow-sticker)",
        backgroundImage: "repeating-linear-gradient(180deg, transparent 0 19px, color-mix(in srgb, var(--foreground) 6%, transparent) 19px 20px)",
        backgroundPosition: "0 8px",
        ...style,
      }}
    >
      <p className="font-sans text-[12px] italic leading-[20px] text-foreground" style={{ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {text}
      </p>
    </div>
  );
}

export function Swatches({ colors, className = "", style }: { colors: string[]; className?: string; style?: CSSProperties }) {
  return (
    <div className={`flex ${className}`} style={{ boxShadow: "var(--shadow-sticker)", ...style }}>
      {colors.slice(0, 8).map((hex, i) => (
        <span key={`${hex}-${i}`} className="h-full flex-1" style={{ background: hex }} title={hex} />
      ))}
    </div>
  );
}

/** A name set to fit its card: one shared ceiling so the field is set at one
 *  size, and a per-name guard so a long word is never broken across lines. */
function nameFitSize(name: string, ek: number, max = 30): number {
  const longest = Math.max(4, ...name.split(/\s+/).map((word) => word.length));
  const wordFits = (NAME_W - 26) / (longest * 0.56);
  return Math.max(12, Math.min(max, wordFits, screenPx(12, ek, 12, max)));
}

/** The face a cell is showing, and a way to step past one that will not load.
 *  A 404 asset would otherwise leave the browser's broken-image chrome on the
 *  paper; instead the cell turns the next face it honestly has, and the
 *  caption under it follows, so the card never credits a picture it is not
 *  showing. */
export function useCellFace(cell: EncyclopediaCell): { face: CellFace; onImageError: () => void } {
  const faces = useMemo(() => cellFaces(cell), [cell]);
  // The step is remembered per cell and reset during render when the cell
  // changes, so a fresh cell is never painted as already broken.
  const [step, setStep] = useState({ id: cell.id, at: 0 });
  const at = step.id === cell.id ? step.at : 0;
  if (step.id !== cell.id) setStep({ id: cell.id, at: 0 });
  return {
    face: faces[Math.min(at, faces.length - 1)],
    onImageError: () => setStep((s) => (s.id === cell.id ? { id: s.id, at: Math.min(s.at + 1, faces.length - 1) } : s)),
  };
}

/** React attaches `onError` when it mounts the element, so a picture that
 *  already 404'd while the HTML was parsing never fires one — and React does
 *  not re-check an image it finds already broken. A finished image with no
 *  intrinsic width is a failed image, so every picture below is also asked
 *  that question the moment its element exists. Without this the fallbacks
 *  only caught pictures that failed after hydration, which is nearly none of
 *  them. */
export function brokenOnArrival(img: HTMLImageElement | null, onFail: () => void): void {
  if (img && img.complete && img.naturalWidth === 0) onFail();
}

/** Whether the picture at `src` failed to load, and a way to say it did. The
 *  latch resets during render when `src` changes: a new picture starts out
 *  assumed good. */
export function useLoadFailure(src: string | undefined): [boolean, () => void] {
  const [latch, setLatch] = useState({ src, failed: false });
  if (latch.src !== src) setLatch({ src, failed: false });
  return [latch.src === src && latch.failed, () => setLatch({ src, failed: true })];
}

/** What a face is and where it comes from, printed on the face. A picture on
 *  a cell is never the cell's own unless a study says so; most pictures on
 *  the map belong to a record the cell names, and this is where the map says
 *  which. Sized to read at the zoom the card is drawn at. */
function FaceOrigin({ face, ek }: { face: CellFace; ek: number }) {
  if (face.kind === "name") return null;
  const record = face.source === "record";
  return (
    <span
      className="absolute left-0 top-0 z-[1] block max-w-full truncate px-1.5 py-[3px] font-mono font-bold uppercase leading-none tracking-[0.12em]"
      style={{ ...inkChipStyle(face.ink, record ? 26 : 18), fontSize: screenPx(7.5, ek, 7.5, 16) }}
      title={face.caption}
    >
      {face.eyebrow}
      {record ? <span className="font-normal normal-case tracking-normal"> · {face.title}</span> : null}
    </span>
  );
}

/** The face a cell turns to the map: its picture when it has one, otherwise
 *  the material it does have. Only a cell with no material at all shows its
 *  name alone, so the far field reads as material rather than as empty
 *  frames. `fill` puts the face in the card's flexible middle, where it takes
 *  whatever height is left rather than setting its own from an aspect ratio. */
function Face({ face, lod, ek, name, fill, onImageError }: { face: CellFace; lod: Lod; ek: number; name: string; fill?: boolean; onImageError: () => void }) {
  const shape: CSSProperties = fill ? { height: "100%" } : { aspectRatio: "4 / 3" };
  // Far out a record's picture carries a thin bar in its set's ink along the
  // top, so even a thumbnail-sized card is not mistaken for a study.
  const bar = face.kind !== "name" && face.source === "record" && lod === "picture"
    ? <span aria-hidden className="absolute inset-x-0 top-0 z-[1] block" style={{ height: screenPx(3, ek, 3, 12), background: face.ink }} />
    : null;
  const origin = lod === "picture" ? null : <FaceOrigin face={face} ek={ek} />;
  if (face.kind === "image") {
    return (
      <span className="relative block overflow-hidden" style={shape}>
        {bar}{origin}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={(el) => brokenOnArrival(el, onImageError)} src={face.url} alt={face.alt} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={onImageError} />
      </span>
    );
  }
  if (face.kind === "palette") {
    return <span className="relative block" style={shape}>{bar}{origin}<Swatches colors={face.swatches} className="h-full" /></span>;
  }
  if (face.kind === "passage") {
    return <span className="relative block" style={shape}>{bar}{origin}<PaperStrip text={face.text} className="flex h-full items-center" lines={lod === "reading" ? 7 : 9} /></span>;
  }
  // Nothing but a name and a scope. Close in, the name and the scope are
  // already in the card's header and the caption underneath says no material
  // has been made, so the face has nothing left to add and stands down.
  if (lod === "reading") return null;
  return (
    <span className="flex h-full flex-col justify-center px-3 py-3 text-left" style={{ minHeight: 72 }}>
      {lod === "named" ? <Eyebrow ink={face.ink} style={{ fontSize: screenPx(8.5, ek, 9, 16) }}>{face.eyebrow}</Eyebrow> : null}
      <span className={`${lod === "named" ? "mt-1" : ""} line-clamp-3 font-display font-semibold leading-[1.06] tracking-[-0.01em] text-foreground`} style={{ fontSize: nameFitSize(name, ek) }}>
        {name}
      </span>
    </span>
  );
}

const CHIP = "pointer-events-auto inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 font-mono font-bold uppercase leading-none tracking-[0.12em] shadow-[var(--shadow-sticker)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]";

/** The control that opens a node's narrower cells onto the paper and folds
 *  them away, and the one that asks for the next group. The same pair sits on
 *  a cell and on a category node: expansion is one idea wherever it appears. */
function ExpandChips({ id, total, open, hidden, ek, ink, onToggle, onMore, word }: { id: string; total: number; open: boolean; hidden: number; ek: number; ink: string; onToggle: (id: string) => void; onMore: (id: string) => void; word: string }) {
  if (!total) return null;
  const size = screenPx(8, ek, 8, 16);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <span className="flex flex-wrap items-center gap-1" onClick={stop}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className={CHIP}
        style={open ? { background: "var(--yuzu)", color: "var(--sumi)", fontSize: size } : { ...inkChipStyle(ink, 16), fontSize: size }}
        title={open ? `Fold the ${word} of this cell away` : `Open the ${total} ${word} on the map`}
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        {open ? `${total - hidden} of ${total} ${word}` : `${total} ${word}`}
      </button>
      {open && hidden > 0 ? (
        <button type="button" onClick={() => onMore(id)} className={CHIP} style={{ ...inkChipStyle(ink, 16), fontSize: size }} title={`Open the next ${Math.min(10, hidden)} of ${hidden} more`}>
          +{Math.min(10, hidden)} more
        </button>
      ) : null}
    </span>
  );
}

/** A cell on the map. The card is exactly the box the layout reserved for it —
 *  same width, same height, nothing spilling out. The zoom layer changes what
 *  is inside the box, never how much room the card takes. */
function PlateCard({
  cell,
  x,
  y,
  level,
  scale,
  k,
  focused,
  dimmed,
  dimTo = 0.35,
  narrower,
  open,
  hidden,
  onFocus,
  onToggleOpen,
  onMore,
  onDragStart,
  alsoOn,
  filtered,
}: {
  cell: EncyclopediaCell;
  x: number;
  y: number;
  /** Which layer of the map this cell is on, and what share of full size it
   *  therefore draws at. The card is always built at full size and scaled, so
   *  its type and spacing come down with it and a cell on a lower layer is the
   *  same object seen from further away. */
  level: number;
  scale: number;
  k: number;
  focused: boolean;
  dimmed: boolean;
  /** How far back a dimmed card steps. Never so far that it cannot be read. */
  dimTo?: number;
  /** How many narrower cells this cell has, whether they are open on the
   *  paper, and how many of them are not shown yet. */
  narrower: number;
  open: boolean;
  hidden: number;
  /** Take the cell id, so one handler serves every card on the paper and a
   *  card is not re-rendered merely because its parent made a new closure. */
  onFocus: (id: string) => void;
  onToggleOpen: (id: string) => void;
  onMore: (id: string) => void;
  /** Pick the card up and move it, with everything open under it. */
  onDragStart: (id: string, event: React.PointerEvent) => void;
  /** The maps this cell belongs to besides the one it is drawn in. A cell in
   *  the writing cluster that is also art carries an art mark, so the two
   *  maps are visibly joined wherever a cell belongs to both. */
  alsoOn: MapName[];
  /** The map the reader has filtered to, if any: the mark for that map is
   *  raised so the filtered cells stand out in the other cluster. */
  filtered: MapName | null;
}) {
  const { face, onImageError } = useCellFace(cell);
  const full = plateBox(cell);
  const box = { w: full.w * scale, h: full.h * scale };
  // How big the card prints on screen, as a share of its designed size. This,
  // not the camera alone, decides how much of the card is drawn.
  const ek = k * scale;
  const lod = lodFor(ek);
  const material = cellMaterial(cell);
  const reading = lod === "reading";
  const studyText = reading && material.text?.source === "study" ? material.text : null;
  const studyPalette = reading && material.palette?.source === "study" ? material.palette : null;
  const hasFace = !(reading && face.kind === "name");
  const ink = face.ink;
  return (
    <div
      className="group/plate absolute hover:z-[3]"
      style={{
        left: x - box.w / 2,
        top: y - box.h / 2,
        width: full.w,
        height: full.h,
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: "0 0",
        opacity: dimmed ? dimTo : 1,
        // The card in focus stays the most readable thing on the paper.
        zIndex: focused ? 4 : 2,
        transition: "opacity 200ms",
      }}
      data-plate={cell.id}
      data-level={level}
      data-lod={lod}
      onPointerDown={(e) => onDragStart(cell.id, e)}
    >
      {focused ? <Tape ink="var(--ramune)" className="-top-2 left-5 z-[5]" rotate={-3} width={58} /> : null}
      {/* The mark for the other maps this cell sits on: a corner of the other
          map's ink, named at readable sizes. Raised when that map is the one
          filtered to, so the reader finds the art cells that live among the
          writing ones. */}
      {alsoOn.map((m, i) => (
        <span
          key={m}
          aria-label={`Also on the ${MAP_LABEL[m]} map`}
          title={`Also on the ${MAP_LABEL[m]} map`}
          className="pointer-events-none absolute z-[5] flex items-center gap-1 font-mono font-bold uppercase leading-none tracking-[0.12em]"
          style={{ right: -4, top: 8 + i * screenPx(13, ek, 13, 28), fontSize: screenPx(7, ek, 7, 16), padding: `${screenPx(2, ek, 2, 5)}px ${screenPx(5, ek, 5, 10)}px`, background: filtered === m ? MAP_INK[m] : `color-mix(in srgb, ${MAP_INK[m]} 22%, var(--washi))`, color: filtered === m ? "var(--washi)" : `color-mix(in oklch, ${MAP_INK[m]} 72%, var(--foreground))`, boxShadow: "var(--shadow-sticker)", transform: "rotate(1.5deg)" }}
        >
          {lod === "picture" ? "" : MAP_LABEL[m]}
          {lod === "picture" ? <span className="block" style={{ width: screenPx(6, ek, 6, 14), height: screenPx(6, ek, 6, 14) }} /> : null}
        </span>
      ))}
      <button
        type="button"
        onClick={() => onFocus(cell.id)}
        aria-label={`${cell.name}. Focus this cell.`}
        aria-current={focused ? "true" : undefined}
        className="flex h-full w-full flex-col text-left transition-[box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
        style={{
          // The reservation is the card. Anything the content does inside
          // stays inside; nothing can reach a neighbouring plate.
          overflow: "hidden",
          background: PAPER,
          boxShadow: focused ? "var(--shadow-card-hover)" : "var(--shadow-card)",
          outline: focused ? "2px solid color-mix(in oklch, var(--ramune) 70%, transparent)" : undefined,
          outlineOffset: -2,
          padding: lod === "picture" ? 5 : lod === "named" ? 7 : 12,
        }}
      >
        {reading ? (
          <span className="block shrink-0">
            <span className="flex items-center gap-2 font-mono text-[7.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>
              {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
              <span className="text-muted-foreground">· {cell.state === "Draft" ? "proposed" : cell.state.toLowerCase()}</span>
            </span>
            <span className="mt-1 line-clamp-2 font-display text-[14px] font-semibold leading-[1.1] tracking-[-0.01em] text-foreground">{cell.name}</span>
            <span className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{cell.description || "A name and a scope."}</span>
          </span>
        ) : null}
        {/* The flexible middle: the picture and any study the cell carries
            share whatever height the header and the caption leave. */}
        {hasFace || studyText || studyPalette ? (
          <span className={`flex min-h-0 flex-1 flex-col ${reading ? "mt-2 gap-2" : ""}`}>
            {hasFace ? <span className="block min-h-0" style={{ flex: studyText ? "3 1 0%" : "1 1 0%" }}><Face face={face} lod={lod} ek={ek} name={cell.name} fill onImageError={onImageError} /></span> : null}
            {studyText ? <span className="block min-h-0 overflow-hidden" style={{ flex: "2 1 0%" }}><PaperStrip text={studyText.text} lines={5} className="h-full" /></span> : null}
            {studyPalette ? <Swatches colors={studyPalette.swatches} className="h-7 shrink-0" /> : null}
          </span>
        ) : null}
        {reading ? (
          <span className="mt-1.5 block shrink-0 truncate font-mono text-[7px] uppercase leading-snug tracking-[0.1em] text-muted-foreground">{face.caption}</span>
        ) : null}
        {lod !== "reading" && face.kind !== "name" ? (
          // The name under the picture, counter-scaled so it reads at every
          // zoom the card is drawn at. Far out this is what the field says.
          <span className="mt-1 block shrink-0 truncate font-display font-semibold leading-[1.05] tracking-[-0.01em] text-foreground" style={{ fontSize: nameFitSize(cell.name, ek, lod === "picture" ? 34 : 18) }}>{cell.name}</span>
        ) : null}
        {reading && narrower ? <span className="block h-7 shrink-0" /> : null}
      </button>
      {/* The expansion controls sit on the card, not beside it: a cell says
          on its face how much sits under it and opens it from there. Too small
          to hit at picture size, where the sheet carries the same controls. */}
      {narrower && lod !== "picture" ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 flex justify-end">
          <ExpandChips id={cell.id} total={narrower} open={open} hidden={hidden} ek={ek} ink={ink} onToggle={onToggleOpen} onMore={onMore} word="narrower" />
        </span>
      ) : null}
    </div>
  );
}

/** The entry to one map: a category node at the middle of its region. It shows
 *  the faces of the map's most prominent cells so the node is a picture of
 *  what is there, not a label floating over it, and it carries the controls
 *  that open the map's top-level cells onto the paper in groups. */
function HubCard({
  map,
  x,
  y,
  count,
  roots,
  open,
  hidden,
  faces,
  k,
  ink,
  dimmed,
  onToggle,
  onMore,
  onFit,
  onDragStart,
}: {
  map: MapName;
  x: number;
  y: number;
  /** Every cell on this map, and how many sit at the top of it. */
  count: number;
  roots: number;
  open: boolean;
  hidden: number;
  /** The faces of the map's most prominent cells, up to four. */
  faces: Array<{ id: string; name: string; face: CellFace }>;
  k: number;
  ink: string;
  dimmed: boolean;
  onToggle: (key: string) => void;
  onMore: (key: string) => void;
  /** Frame this map's open cells. */
  onFit: (map: MapName) => void;
  /** Pick the node up and move it, with the whole cluster. */
  onDragStart: (key: string, event: React.PointerEvent) => void;
}) {
  const key = `map:${map}`;
  const title = MAP_LABEL[map];
  return (
    <div
      className="absolute hover:z-[3]"
      style={{ left: x - HUB_W / 2, top: y - HUB_H / 2, width: HUB_W, height: HUB_H, zIndex: 2, opacity: dimmed ? 0.35 : 1, transition: "opacity 200ms" }}
      data-hub={map}
      onPointerDown={(e) => onDragStart(key, e)}
    >
      <Tape ink={ink} className="-top-2 left-6 z-[5]" rotate={-4} width={64} />
      <div className="flex h-full w-full flex-col overflow-hidden p-3" style={{ background: PAPER, boxShadow: "var(--shadow-card)" }}>
        <button type="button" onClick={() => onFit(map)} className="block shrink-0 text-left" title={`Frame the ${title.toLowerCase()} map`}>
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: `color-mix(in oklch, ${ink} 78%, var(--foreground))` }}>Map · {count} cells</span>
          <span className="mt-0.5 block font-display font-semibold leading-[1] tracking-[-0.02em] text-foreground" style={{ fontSize: screenPx(17, k, 28, 100) }}>{title}</span>
        </button>
        <span className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-1.5">
          {faces.map((f) => (
            <span key={f.id} className="relative block min-h-0 overflow-hidden" title={f.name}>
              <HubTile face={f.face} name={f.name} ink={ink} />
            </span>
          ))}
          {faces.length === 0 ? <span className="col-span-2 flex items-center justify-center font-sans text-[13px] text-muted-foreground">No cells on this map yet.</span> : null}
        </span>
        <span className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-1">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{roots} at the top</span>
          <ExpandChips id={key} total={roots} open={open} hidden={hidden} ek={k} ink={ink} onToggle={onToggle} onMore={onMore} word="open" />
        </span>
      </div>
    </div>
  );
}

function HubTile({ face, name, ink }: { face: CellFace; name: string; ink: string }) {
  const [failed, markFailed] = useLoadFailure(face.kind === "image" ? face.url : undefined);
  if (face.kind === "image" && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={(el) => brokenOnArrival(el, markFailed)} src={face.url} alt={face.alt} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={markFailed} />;
  }
  if (face.kind === "palette") return <Swatches colors={face.swatches} className="h-full" />;
  if (face.kind === "passage") return <PaperStrip text={face.text} lines={4} className="h-full !px-2 !py-1.5 [&_p]:text-[9px] [&_p]:leading-[13px]" />;
  return (
    <span className="flex h-full w-full items-end p-2" style={{ background: `color-mix(in srgb, ${ink} 10%, var(--washi))` }}>
      <span className="line-clamp-2 font-display text-[12px] font-semibold leading-[1.1] tracking-[-0.01em] text-foreground">{name}</span>
    </span>
  );
}

/** One node on the paper: a manifestation record joined to its cell by a
 *  dotted line and opening that record's page, or the control that opens the
 *  cell's remaining records onto the map and folds them away again. */
function SatelliteNodeCard({
  node,
  manifestation,
  k,
  dimmed,
  dimTo = 0.35,
  labelled,
  also,
  onToggle,
  onOpen,
  onDragStart,
}: {
  node: SatelliteNode;
  manifestation: CellManifestation | null;
  k: number;
  dimmed: boolean;
  /** How far back a dimmed node steps. */
  dimTo?: number;
  /** Names are drawn only around the cell in focus. Every satellite naming
   *  itself at once buried the map under overlapping labels. */
  labelled: boolean;
  /** How many other cells on the paper name this same record. The node is
   *  drawn once and joined to each of them. */
  also?: number;
  /** Open this cell's remaining records onto the map, or fold them away.
   *  Takes the cell id for the same reason `Plate.onFocus` does. */
  onToggle: (cellId: string) => void;
  /** Open the record's card beside the node. The record's own page is a
   *  button on that card, not the node itself. */
  onOpen: (node: SatelliteNode) => void;
  /** Pick the node up and move it on its own. */
  onDragStart: (id: string, event: React.PointerEvent) => void;
}) {
  const record = manifestation?.record ?? null;
  const ink = SET_INK[node.set];
  const size = SAT_W;
  // A record of a deep cell is as small as the cell is, and its label with it.
  const scale = node.scale;
  // A record's thumbnail can 404. When it does the satellite shows the next
  // face the record has rather than a broken-image box.
  const [imageFailed, markImageFailed] = useLoadFailure(record?.image);
  const thumb = record?.image && !imageFailed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={(el) => brokenOnArrival(el, markImageFailed)} src={record.image} alt={record.name} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={markImageFailed} />
  ) : record?.swatches?.length ? (
    <Swatches colors={record.swatches} className="h-full" />
  ) : record?.excerpt ? (
    <PaperStrip text={record.excerpt} lines={3} className="h-full !px-2 !py-1.5 [&_p]:text-[8px] [&_p]:leading-[12px]" />
  ) : (
    <span className="block h-full w-full" style={{ background: `color-mix(in srgb, ${ink} 12%, var(--washi))` }} />
  );
  const common = "absolute block text-left transition-opacity duration-200 hover:z-[3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]";
  const style: CSSProperties = {
    left: node.x - (size * scale) / 2,
    top: node.y - (size * scale) / 2,
    width: size,
    opacity: dimmed ? dimTo : 1,
    zIndex: 1,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: "0 0",
  };
  // Type counter-scales against the camera and against the cell's own level,
  // so a label reads the same whatever level it belongs to.
  const effectiveK = k * scale;
  const labelSize = screenPx(8, effectiveK, 8, 12);

  if (node.role === "more") {
    // The ring holds eight; the rest are real records, and this opens them onto
    // the paper as nodes of their own rather than standing in for them.
    const label = `Open the other ${node.more} records this cell names on the map`;
    return (
      <button type="button" onClick={() => onToggle(node.cellId)} onPointerDown={(e) => onDragStart(node.id, e)} title={label} aria-label={label} aria-expanded={false} className={common} style={style}>
        <span className="grid place-items-center bg-[var(--washi)] font-mono font-bold tabular-nums text-foreground shadow-[var(--shadow-sticker)]" style={{ width: size, height: size, fontSize: screenPx(11, effectiveK, 12, 22) }}>+{node.more}</span>
        {labelled ? <span className="mt-1 block text-center font-mono uppercase tracking-[0.12em] text-muted-foreground" style={{ fontSize: labelSize }}>open all</span> : null}
      </button>
    );
  }
  if (node.role === "fold") {
    const label = `Fold the ${node.more} records of this cell back into one node`;
    return (
      <button type="button" onClick={() => onToggle(node.cellId)} onPointerDown={(e) => onDragStart(node.id, e)} title={label} aria-label={label} aria-expanded className={common} style={{ ...style, zIndex: 4 }}>
        <span className="grid place-items-center font-mono font-bold text-foreground shadow-[var(--shadow-sticker)]" style={{ width: size, height: size, background: "color-mix(in srgb, var(--yuzu) 42%, var(--washi))", fontSize: screenPx(13, effectiveK, 14, 26) }}>−</span>
        {labelled ? <span className="mt-1 block text-center font-mono uppercase tracking-[0.12em] text-muted-foreground" style={{ fontSize: labelSize }}>fold</span> : null}
      </button>
    );
  }
  // A read that failed is not an absent record: say which one happened.
  const name = record?.name ?? (manifestation?.unread ? "Record could not be read" : "Record not found");
  const title = also ? `${SET_EYEBROW[node.set]}: ${name}. Also named by ${also} other ${also === 1 ? "cell" : "cells"} on the map.` : `${SET_EYEBROW[node.set]}: ${name}.`;
  return (
    <button
      type="button"
      aria-label={`${title} Read the record.`}
      title={title}
      className={common}
      style={style}
      onPointerDown={(e) => onDragStart(node.id, e)}
      onClick={() => onOpen(node)}
    >
      <span className="relative block overflow-hidden bg-[var(--washi)] p-[3px] shadow-[var(--shadow-sticker)]" style={{ width: size, height: size }}>
        {thumb}
        {also ? <span className="absolute bottom-0 right-0 bg-[var(--washi)] px-1 font-mono text-[9px] font-bold tabular-nums leading-[14px] text-foreground" aria-hidden>+{also}</span> : null}
      </span>
      {labelled ? (
        // The set names the connection, so it sits at the satellite end of the
        // dotted line where there is room for it; the line itself is only a
        // few dozen pixels long once the satellite hugs its cell.
        <span className="mt-1 block w-[132px] -translate-x-[38px] text-center">
          <Eyebrow ink={ink} style={{ fontSize: screenPx(7.5, effectiveK, 8, 11) }}>{SET_EYEBROW[node.set]}</Eyebrow>
          <span className="block truncate font-sans font-medium leading-tight text-foreground" style={{ fontSize: labelSize }}>{name}</span>
        </span>
      ) : null}
    </button>
  );
}

/** Cards are memoised because the camera lives in state: without this every
 *  pointermove during a drag reconciled every card on the paper, which is what
 *  held a phone at nineteen frames a second over seven hundred cells and at
 *  two over five thousand. Panning changes neither `k` nor any card's props,
 *  so a drag now costs one transform and no card work at all. */
export const Plate = memo(PlateCard);
export const Satellite = memo(SatelliteNodeCard);
export const Hub = memo(HubCard);
