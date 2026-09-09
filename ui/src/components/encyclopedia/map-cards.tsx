"use client";

import { memo, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { CellManifestation, EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { MAP_INK, MAP_LABEL } from "@/lib/encyclopedia-graph";
import { inkChipStyle, Tape } from "./chrome";
import { cellFaces, cellMaterial, SET_EYEBROW, SET_INK, type CellFace } from "./material";
import { HUB_H, HUB_W, MORE_W, NAME_W, plateBox, RECORD_CARD_W, SAT_W, type MoreNode, type SatelliteNode } from "./graph-layout";
import { BATCH, hubKey } from "./expansion";
import { ArrowUpRight } from "lucide-react";

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

/** The face a cell turns to the map: its picture when it has one, otherwise
 *  the material it does have. Only a cell with no material at all shows its
 *  name alone, so the far field reads as material rather than as empty
 *  frames. `fill` puts the face in the card's flexible middle, where it takes
 *  whatever height is left rather than setting its own from an aspect ratio. */
function Face({ face, lod, ek, name, fill, onImageError }: { face: CellFace; lod: Lod; ek: number; name: string; fill?: boolean; onImageError: () => void }) {
  const shape: CSSProperties = fill ? { height: "100%" } : { aspectRatio: "4 / 3" };
  // The picture is a visual reference for the cell and nothing on it says
  // where it came from: the sheet carries that. Rita, 2026-09-09.
  if (face.kind === "image") {
    return (
      <span className="relative block overflow-hidden" style={shape}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={(el) => brokenOnArrival(el, onImageError)} src={face.url} alt={face.alt} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={onImageError} />
      </span>
    );
  }
  if (face.kind === "palette") {
    return <span className="relative block" style={shape}><Swatches colors={face.swatches} className="h-full" /></span>;
  }
  if (face.kind === "passage") {
    return <span className="relative block" style={shape}><PaperStrip text={face.text} className="flex h-full items-center" lines={lod === "reading" ? 7 : 9} /></span>;
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
  onFocus,
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
  /** Take the cell id, so one handler serves every card on the paper and a
   *  card is not re-rendered merely because its parent made a new closure.
   *  A click focuses the cell and opens its narrower cells; a second click
   *  on the cell in focus folds them. */
  onFocus: (id: string) => void;
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
  return (
    <div
      className="group/plate absolute"
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
        {lod !== "reading" && face.kind !== "name" ? (
          // The name under the picture, counter-scaled so it reads at every
          // zoom the card is drawn at. Far out this is what the field says.
          <span className="mt-1 block shrink-0 truncate font-display font-semibold leading-[1.05] tracking-[-0.01em] text-foreground" style={{ fontSize: nameFitSize(cell.name, ek, lod === "picture" ? 34 : 18) }}>{cell.name}</span>
        ) : null}
      </button>
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
  /** Open the map's top-level cells onto the paper, or fold them away. */
  onToggle: (key: string) => void;
  /** Pick the node up and move it, with the whole cluster. */
  onDragStart: (key: string, event: React.PointerEvent) => void;
}) {
  const key = hubKey(map);
  const title = MAP_LABEL[map];
  return (
    <div
      className="absolute"
      style={{ left: x - HUB_W / 2, top: y - HUB_H / 2, width: HUB_W, height: HUB_H, zIndex: 2, opacity: dimmed ? 0.35 : 1, transition: "opacity 200ms" }}
      data-hub={map}
      onPointerDown={(e) => onDragStart(key, e)}
    >
      <Tape ink={ink} className="-top-2 left-6 z-[5]" rotate={-4} width={64} />
      <button
        type="button"
        onClick={() => onToggle(key)}
        aria-expanded={open}
        aria-label={`${title}: ${count} cells, ${roots} at the top. ${open ? "Fold" : "Open"} the map.`}
        className="flex h-full w-full flex-col overflow-hidden p-3 text-left"
        style={{ background: PAPER, boxShadow: open ? "var(--shadow-card-hover)" : "var(--shadow-card)" }}
      >
        <span className="block shrink-0">
          <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.16em]" style={{ color: `color-mix(in oklch, ${ink} 78%, var(--foreground))` }}>Map · {count} cells</span>
          <span className="mt-0.5 block font-display font-semibold leading-[1] tracking-[-0.02em] text-foreground" style={{ fontSize: screenPx(17, k, 28, 100) }}>{title}</span>
        </span>
        <span className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-1.5">
          {faces.map((f) => (
            <span key={f.id} className="relative block min-h-0 overflow-hidden" title={f.name}>
              <HubTile face={f.face} name={f.name} ink={ink} />
            </span>
          ))}
          {faces.length === 0 ? <span className="col-span-2 flex items-center justify-center font-sans text-[13px] text-muted-foreground">No cells on this map yet.</span> : null}
        </span>
        <span className="mt-2 block shrink-0 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{roots - hidden} of {roots} open</span>
      </button>
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
  detail,
  onFocusCell,
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
  /** Open the node into its card, or fold it back to a node. The record's
   *  own page is a button on the card, never the node itself. */
  onOpen: (node: SatelliteNode) => void;
  /** Pick the node up and move it on its own. */
  onDragStart: (id: string, event: React.PointerEvent) => void;
  /** Present when the node is opened into its card: what the card says
   *  beyond the record, and which way it grows — away from the cell. */
  detail?: { cellName: string; explanation: string; alsoNamed: Array<{ id: string; name: string }>; grow: { x: 1 | -1; y: 1 | -1 } };
  onFocusCell?: (id: string) => void;
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

  // What the node is, under it, always: a square alone says nothing, and a
  // reader has to know an art style from a writing style before opening it.
  // The name joins it once the node prints big enough, or when its cell is in
  // focus.
  const setWord = <span className="mt-0.5 block whitespace-nowrap text-center font-mono font-bold uppercase leading-none tracking-[0.12em]" style={{ fontSize: screenPx(7, effectiveK, 7, 11), color: `color-mix(in oklch, ${ink} 78%, var(--foreground))` }}>{SET_EYEBROW[node.set]}</span>;
  const named = labelled || effectiveK >= 0.72;
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
  if (detail) {
    // The node opened into its card. It grows away from the cell from the
    // node's own spot, so the corner nearest the cell stays where the node
    // was and the dotted line still lands on it.
    const w = RECORD_CARD_W;
    const half = (size * scale) / 2;
    // Anchored by the corner nearest the cell. Growing up means the card's
    // bottom edge sits where the node's bottom edge was; the scaled layer
    // has no height, so "bottom" is measured from y = 0.
    const down = detail.grow.y > 0;
    const left = detail.grow.x > 0 ? node.x - half : node.x + half - w * scale;
    const anchor = down ? { top: node.y - half } : { bottom: -(node.y + half) };
    return (
      <div
        className="absolute z-[6] flex flex-col bg-[var(--washi)] shadow-[var(--shadow-card-hover)]"
        style={{ left, ...anchor, width: w, transform: `scale(${scale})`, transformOrigin: down ? "0 0" : "0 100%", opacity: dimmed ? dimTo : 1 }}
        data-record-card={node.id}
        onPointerDown={(e) => onDragStart(node.id, e)}
        onClick={() => onOpen(node)}
        role="group"
        aria-label={`${SET_EYEBROW[node.set]}: ${name}, opened. Click to fold.`}
        title="Click to fold"
      >
        <span aria-hidden className="washi-tape pointer-events-none -top-1.5 left-4 z-[2]" style={{ ["--strip-ink" as string]: ink, transform: "rotate(-4deg)", width: 44 }} />
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(node); }} aria-label="Fold this record back to a node" title="Fold" className="absolute right-1 top-1 z-[2] grid h-6 w-6 place-items-center bg-[var(--washi)] font-mono text-[14px] font-bold text-foreground shadow-[var(--shadow-sticker)]">−</button>
        {record ? <span className="block aspect-[4/3] w-full overflow-hidden">{thumb}</span> : null}
        <span className="block px-3 pb-3 pt-2.5">
          <span className="inline-block px-1.5 py-[3px] font-mono text-[7.5px] font-bold uppercase leading-none tracking-[0.14em]" style={inkChipStyle(ink, 24)}>{SET_EYEBROW[node.set]}{record ? ` · ${record.status === "UnderReview" ? "under review" : record.status.toLowerCase()}` : ""}</span>
          <span className="mt-1.5 block font-display text-[14px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">{name}</span>
          {record?.line ? <span className="mt-1 block text-[10.5px] leading-snug text-muted-foreground">{record.line}</span> : null}
          <span className="mt-2 block text-[10.5px] leading-snug text-foreground">
            <span className="font-mono text-[7.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Why {detail.cellName} names it · </span>
            {detail.explanation}
          </span>
          {detail.alsoNamed.length ? (
            <span className="mt-1.5 block text-[10.5px] leading-snug text-muted-foreground">
              Also named by{" "}
              {detail.alsoNamed.map((c, j) => (
                <span key={c.id}>{j > 0 ? ", " : ""}<button type="button" onClick={(e) => { e.stopPropagation(); onFocusCell?.(c.id); }} className="text-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[2px]">{c.name}</button></span>
              ))}
            </span>
          ) : null}
          {record ? (
            <a href={record.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2.5 flex h-7 items-center justify-between bg-foreground px-2.5 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-background">
              Open {SET_EYEBROW[node.set].toLowerCase()} page <ArrowUpRight size={12} aria-hidden />
            </a>
          ) : null}
        </span>
      </div>
    );
  }
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
      <span className="relative block overflow-hidden bg-[var(--washi)] p-[3px] shadow-[var(--shadow-sticker)]" style={{ width: size, height: size, boxShadow: `var(--shadow-sticker), inset 0 -3px 0 ${ink}` }}>
        {thumb}
        {also ? <span className="absolute bottom-0 right-0 bg-[var(--washi)] px-1 font-mono text-[9px] font-bold tabular-nums leading-[14px] text-foreground" aria-hidden>+{also}</span> : null}
      </span>
      <span className="block w-[132px] -translate-x-[38px] text-center">
        {setWord}
        {named ? <span className="block truncate font-sans font-medium leading-tight text-foreground" style={{ fontSize: labelSize }}>{name}</span> : null}
      </span>
    </button>
  );
}

/** Cards are memoised because the camera lives in state: without this every
 *  pointermove during a drag reconciled every card on the paper, which is what
 *  held a phone at nineteen frames a second over seven hundred cells and at
 *  two over five thousand. Panning changes neither `k` nor any card's props,
 *  so a drag now costs one transform and no card work at all. */
/** The node that opens the next group of a node's narrower cells. It stands
 *  where those cells will go, so opening it fills its own place. */
function MoreNodeCard({ node, k, onMore, onDragStart }: { node: MoreNode; k: number; onMore: (key: string) => void; onDragStart: (key: string, event: React.PointerEvent) => void }) {
  const ek = k * node.scale;
  const size = MORE_W;
  return (
    <button
      type="button"
      onClick={() => onMore(node.key)}
      // Picking the node up moves the branch it belongs to, and the release
      // is not a click: the map guards that in `onMore`.
      onPointerDown={(e) => onDragStart(node.key, e)}
      aria-label={`Open the next ${Math.min(BATCH, node.count)} of ${node.count} more cells`}
      title={`${node.count} more`}
      className="absolute grid place-items-center bg-[var(--washi)] font-mono font-bold tabular-nums text-foreground shadow-[var(--shadow-sticker)] hover:z-[3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
      style={{ left: node.x - (size * node.scale) / 2, top: node.y - (size * node.scale) / 2, width: size, height: size, transform: node.scale === 1 ? undefined : `scale(${node.scale})`, transformOrigin: "0 0", fontSize: screenPx(11, ek, 12, 26), zIndex: 1 }}
      data-more={node.key}
    >
      +{node.count}
    </button>
  );
}

export const Plate = memo(PlateCard);
export const More = memo(MoreNodeCard);
export const Satellite = memo(SatelliteNodeCard);
export const Hub = memo(HubCard);
