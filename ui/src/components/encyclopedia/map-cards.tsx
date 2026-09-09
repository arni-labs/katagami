"use client";

import { memo, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { CellManifestation, EncyclopediaCell } from "@/lib/encyclopedia";
import { MAP_LABEL } from "@/lib/encyclopedia-graph";
import { Tape } from "./chrome";
import { cellFaces, cellMaterial, SET_EYEBROW, SET_INK, type CellFace } from "./material";
import { NAME_W, plateBox, SAT_W, type SatelliteNode } from "./graph-layout";

// The nodes on the map. A plate is a cell: zoomed out it is its picture
// (the field reads as pictures); zooming in adds words progressively — the
// name, then the eyebrow and scope, then the caption saying where the picture
// comes from. A satellite is one manifestation: a small thumbnail joined to
// its cell by a dotted line, opening the record's own page.

export type Lod = "picture" | "named" | "reading";

export function lodFor(k: number): Lod {
  if (k < 0.32) return "picture";
  if (k < 0.72) return "named";
  return "reading";
}

const PAPER = "var(--washi)";

export function Eyebrow({ ink, children, className = "", style }: { ink: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`block font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${className}`} style={{ color: `color-mix(in oklch, ${ink} 78%, var(--foreground))`, ...style }}>
      {children}
    </span>
  );
}

/** A passage on a strip of paper. */
export function PaperStrip({ text, className = "", lines = 8, style }: { text: string; className?: string; lines?: number; style?: CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden px-4 py-3 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--yuzu) 7%, var(--washi))",
        boxShadow: "var(--shadow-sticker)",
        backgroundImage: "repeating-linear-gradient(180deg, transparent 0 25px, color-mix(in srgb, var(--foreground) 6%, transparent) 25px 26px)",
        backgroundPosition: "0 10px",
        ...style,
      }}
    >
      <p className="font-sans text-[16px] italic leading-[26px] text-foreground" style={{ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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

/** A named cell's name counter-scales so it stays legible as the map pulls
 *  back. Two limits keep the field from turning into a ransom note: one
 *  ceiling shared by every card, so names are set at one size rather than
 *  each at its own, and a per-name guard so a long word is never broken
 *  across lines. */
const NAME_MAX = 34;

function nameFitSize(name: string, k: number): number {
  const longest = Math.max(4, ...name.split(/\s+/).map((word) => word.length));
  const wordFits = (NAME_W - 26) / (longest * 0.56);
  return Math.max(18, Math.min(NAME_MAX, wordFits, 14 / k));
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
 *  the material it does have. Only a cell with no material at all shows the
 *  dashed name box, so the far field reads as material rather than as empty
 *  frames.
 *
 *  `fill` puts the face in the card's flexible middle, where it takes whatever
 *  height is left rather than setting its own from an aspect ratio. That is
 *  what keeps the card inside the box the layout reserved for it. */
function Face({ face, lod, k, name, fill, onImageError }: { face: CellFace; lod: Lod; k: number; name: string; fill?: boolean; onImageError: () => void }) {
  const shape: CSSProperties = fill ? { height: "100%" } : { aspectRatio: lod === "reading" ? "4 / 3" : "1 / 1" };
  if (face.kind === "image") {
    return (
      <span className="relative block overflow-hidden" style={shape}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={(el) => brokenOnArrival(el, onImageError)} src={face.url} alt={face.alt} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={onImageError} />
      </span>
    );
  }
  if (face.kind === "palette") {
    return <Swatches colors={face.swatches} style={shape} />;
  }
  if (face.kind === "passage") {
    return <PaperStrip text={face.text} className="flex items-center" lines={lod === "reading" ? 7 : 9} style={shape} />;
  }
  // Nothing but a name and a scope. Close in, the name and the scope are
  // already in the card's header and the caption underneath says no material
  // has been made, so the face has nothing left to add and stands down.
  if (lod === "reading") return null;
  // Far out the card is nothing but the name on paper. No dashed frame here:
  // ninety of them at once would spend the whole accent budget on emptiness,
  // and a cell with no picture already looks like one.
  return (
    <span className="flex h-full flex-col justify-center px-3 py-3 text-left" style={{ minHeight: 96 }}>
      {lod === "named" ? <Eyebrow ink={face.ink} style={{ fontSize: Math.min(16, Math.max(9, 5 / k)) }}>{face.eyebrow}</Eyebrow> : null}
      <span
        className={`${lod === "named" ? "mt-1.5" : ""} line-clamp-3 font-display font-bold leading-[1.04] tracking-[-0.02em] text-foreground`}
        style={{ fontSize: nameFitSize(name, k) }}
      >
        {name}
      </span>
    </span>
  );
}

/** A cell on the map. The card is exactly the box the layout reserved for it —
 *  same width, same height, nothing spilling out. The zoom layer changes what
 *  is inside the box, never how much room the card takes: the header and the
 *  caption are set, and the picture takes whatever height is left over. A long
 *  scope and a study on the same cell used to push a reading-mode card a
 *  hundred and eighty pixels past its reservation and over its neighbour. */
function PlateCard({
  cell,
  x,
  y,
  level,
  scale,
  lod,
  k,
  focused,
  dimmed,
  dimTo = 0.3,
  onFocus,
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
  lod: Lod;
  k: number;
  focused: boolean;
  dimmed: boolean;
  /** How far back a dimmed card steps. A hint at the reading layer, much
   *  deeper behind an opened cell so its ring reads as one object. */
  dimTo?: number;
  /** Takes the cell id, so one handler serves every card on the paper and a
   *  card is not re-rendered merely because its parent made a new closure. */
  onFocus: (id: string) => void;
}) {
  const { face, onImageError } = useCellFace(cell);
  // The card is laid out at full size; `scale` puts it on the paper at the
  // size its level draws at. The layout reserved exactly this box.
  const full = plateBox(cell);
  const box = { w: full.w * scale, h: full.h * scale };
  const material = cellMaterial(cell);
  const reading = lod === "reading";
  const studyText = reading && material.text?.source === "study" ? material.text : null;
  const studyPalette = reading && material.palette?.source === "study" ? material.palette : null;
  const hasFace = !(reading && face.kind === "name");
  // Names counter-scale so they read at every zoom the layer is shown at.
  const nameSize = reading ? 22 : Math.min(110, Math.max(20, 15 / k));
  return (
    <button
      type="button"
      onClick={() => onFocus(cell.id)}
      aria-label={`${cell.name}. Focus this cell.`}
      aria-current={focused ? "true" : undefined}
      className="absolute flex flex-col text-left transition-[opacity,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
      style={{
        left: x - box.w / 2,
        top: y - box.h / 2,
        width: full.w,
        height: full.h,
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: "0 0",
        marginLeft: scale === 1 ? undefined : 0,
        // The reservation is the card. Anything the content does inside stays
        // inside; nothing can reach a neighbouring plate.
        overflow: "hidden",
        background: PAPER,
        boxShadow: focused ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        outline: focused ? "2px solid color-mix(in oklch, var(--ramune) 70%, transparent)" : undefined,
        outlineOffset: -2,
        opacity: dimmed ? dimTo : 1,
        padding: lod === "picture" ? 6 : lod === "named" ? 8 : 16,
        // Above the paper scrim an opened cell lays over its neighbours, so
        // the card the ring belongs to stays the most readable thing on screen.
        zIndex: focused ? 4 : 2,
      }}
      data-plate={cell.id}
      data-level={level}
    >
      {focused ? <Tape ink="var(--ramune)" className="-top-2 left-5" rotate={-3} width={58} /> : null}
      {reading ? (
        <span className="block shrink-0">
          <span className="flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>
            {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
            <span className="text-muted-foreground">· {cell.state === "Draft" ? "proposed" : cell.state.toLowerCase()}</span>
          </span>
          <span className="mt-1.5 line-clamp-2 font-display font-bold leading-[1.05] tracking-[-0.02em] text-foreground" style={{ fontSize: nameSize }}>{cell.name}</span>
          <span className="mt-2 line-clamp-2 text-[16px] leading-snug text-muted-foreground">{cell.description || "A name and a scope."}</span>
        </span>
      ) : null}
      {/* The flexible middle: the picture and any study the cell carries share
          whatever height the header and the caption leave, in that order of
          priority. Every one of them is bounded, so none can grow the card. */}
      {hasFace || studyText || studyPalette ? (
        <span className={`flex min-h-0 flex-1 flex-col ${reading ? "mt-3 gap-3" : ""}`}>
          {hasFace ? <span className="block min-h-0" style={{ flex: studyText ? "3 1 0%" : "1 1 0%" }}><Face face={face} lod={lod} k={k} name={cell.name} fill onImageError={onImageError} /></span> : null}
          {studyText ? <span className="block min-h-0 overflow-hidden" style={{ flex: "2 1 0%" }}><PaperStrip text={studyText.text} lines={5} className="h-full" /></span> : null}
          {studyPalette ? <Swatches colors={studyPalette.swatches} className="h-9 shrink-0" /> : null}
        </span>
      ) : null}
      {reading ? (
        <span className="mt-2 block shrink-0 font-mono text-[9.5px] uppercase leading-snug tracking-[0.12em] text-muted-foreground">{face.caption}</span>
      ) : null}
      {lod === "named" && face.kind !== "name" ? (
        <span className="mt-2 block shrink-0 truncate font-display font-bold leading-[1.05] tracking-[-0.02em] text-foreground" style={{ fontSize: Math.min(40, nameSize) }}>{cell.name}</span>
      ) : null}
    </button>
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
  dimTo = 0.3,
  labelled,
  onToggle,
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
  /** Open this cell's remaining records onto the map, or fold them away.
   *  Takes the cell id for the same reason `Plate.onFocus` does. */
  onToggle: (cellId: string) => void;
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
  const common = "absolute block text-left transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]";
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
  const labelSize = Math.min(14, Math.max(9, 9 / effectiveK));

  if (node.role === "more") {
    // The ring holds eight; the rest are real records, and this opens them onto
    // the paper as nodes of their own rather than standing in for them.
    const label = `Open the other ${node.more} records this cell names on the map`;
    return (
      <button type="button" onClick={() => onToggle(node.cellId)} title={label} aria-label={label} aria-expanded={false} className={common} style={style}>
        <span className="grid place-items-center bg-[var(--washi)] font-mono font-bold tabular-nums text-foreground shadow-[var(--shadow-sticker)]" style={{ width: size, height: size, fontSize: Math.min(22, Math.max(12, 11 / effectiveK)) }}>+{node.more}</span>
        {labelled ? <span className="mt-1 block text-center font-mono uppercase tracking-[0.12em] text-muted-foreground" style={{ fontSize: labelSize }}>open all</span> : null}
      </button>
    );
  }
  if (node.role === "fold") {
    const label = `Fold the ${node.more} records of this cell back into one node`;
    return (
      <button type="button" onClick={() => onToggle(node.cellId)} title={label} aria-label={label} aria-expanded className={common} style={{ ...style, zIndex: 4 }}>
        <span className="grid place-items-center font-mono font-bold text-foreground shadow-[var(--shadow-sticker)]" style={{ width: size, height: size, background: "color-mix(in srgb, var(--yuzu) 42%, var(--washi))", fontSize: Math.min(26, Math.max(14, 13 / effectiveK)) }}>−</span>
        {labelled ? <span className="mt-1 block text-center font-mono uppercase tracking-[0.12em] text-muted-foreground" style={{ fontSize: labelSize }}>fold</span> : null}
      </button>
    );
  }
  // A read that failed is not an absent record: say which one happened.
  const name = record?.name ?? (manifestation?.unread ? "Record could not be read" : "Record not found");
  return (
    <a
      href={record?.href}
      target={record ? "_blank" : undefined}
      rel="noreferrer"
      aria-label={`${SET_EYEBROW[node.set]}: ${name}. Open the record.`}
      className={common}
      style={style}
      onClick={(e) => { if (!record) e.preventDefault(); }}
    >
      <span className="block overflow-hidden bg-[var(--washi)] p-[3px] shadow-[var(--shadow-sticker)]" style={{ width: size, height: size }}>{thumb}</span>
      {labelled ? (
        // The set names the connection, so it sits at the satellite end of the
        // dotted line where there is room for it; the line itself is only a
        // few dozen pixels long once the satellite hugs its cell.
        <span className="mt-1 block w-[132px] -translate-x-[38px] text-center">
          <Eyebrow ink={ink} style={{ fontSize: Math.min(11, Math.max(8, 7.5 / effectiveK)) }}>{SET_EYEBROW[node.set]}</Eyebrow>
          <span className="block truncate font-sans font-semibold leading-tight text-foreground" style={{ fontSize: labelSize }}>{name}</span>
        </span>
      ) : null}
    </a>
  );
}

/** Cards are memoised because the camera lives in state: without this every
 *  pointermove during a drag reconciled every card on the paper, which is what
 *  held a phone at nineteen frames a second over seven hundred cells and at
 *  two over five thousand. Panning changes neither `k` nor any card's props,
 *  so a drag now costs one transform and no card work at all. */
export const Plate = memo(PlateCard);
export const Satellite = memo(SatelliteNodeCard);
