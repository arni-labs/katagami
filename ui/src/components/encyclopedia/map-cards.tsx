"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
 *  frames. */
function Face({ face, lod, k, name, onImageError }: { face: CellFace; lod: Lod; k: number; name: string; onImageError: () => void }) {
  const box = lod === "reading" ? "mt-3" : "";
  const ratio = lod === "reading" ? "4 / 3" : "1 / 1";
  if (face.kind === "image") {
    return (
      <span className={`relative block overflow-hidden ${box}`} style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={face.url} alt={face.alt} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={onImageError} />
      </span>
    );
  }
  if (face.kind === "palette") {
    return <Swatches colors={face.swatches} className={box} style={{ aspectRatio: ratio }} />;
  }
  if (face.kind === "passage") {
    return (
      <PaperStrip
        text={face.text}
        className={`${box} flex items-center`}
        lines={lod === "reading" ? 7 : 9}
        style={{ aspectRatio: ratio }}
      />
    );
  }
  // Nothing but a name and a scope. Far out the plate IS the name; close in
  // the name is already in the plate's header, so all that is left to say is
  // that no material has been made yet.
  if (lod === "reading") {
    return (
      <span className="mt-3 block px-3 py-2.5" style={{ outline: `2px dashed color-mix(in oklch, ${face.ink} 45%, transparent)`, outlineOffset: -2 }}>
        <Eyebrow ink={face.ink} style={{ fontSize: 10 }}>{face.eyebrow}</Eyebrow>
        <span className="mt-1 block text-[16px] leading-snug text-muted-foreground">{face.note}</span>
      </span>
    );
  }
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

/** A cell on the map. Fixed width; the height grows with the zoom layer. */
export function Plate({
  cell,
  x,
  y,
  lod,
  k,
  focused,
  dimmed,
  onFocus,
}: {
  cell: EncyclopediaCell;
  x: number;
  y: number;
  lod: Lod;
  k: number;
  focused: boolean;
  dimmed: boolean;
  onFocus: () => void;
}) {
  const { face, onImageError } = useCellFace(cell);
  const box = plateBox(cell);
  const material = cellMaterial(cell);
  const studyText = material.text?.source === "study" ? material.text : null;
  const studyPalette = material.palette?.source === "study" ? material.palette : null;
  // Names counter-scale so they read at every zoom the layer is shown at.
  const nameSize = lod === "reading" ? 22 : Math.min(110, Math.max(20, 15 / k));
  return (
    <button
      type="button"
      onClick={onFocus}
      aria-label={`${cell.name}. Focus this cell.`}
      aria-current={focused ? "true" : undefined}
      className="absolute block text-left transition-[opacity,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]"
      style={{
        left: x - box.w / 2,
        top: y - box.h / 2,
        width: box.w,
        background: PAPER,
        boxShadow: focused ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        outline: focused ? "2px solid color-mix(in oklch, var(--ramune) 70%, transparent)" : undefined,
        outlineOffset: -2,
        opacity: dimmed ? 0.3 : 1,
        padding: lod === "picture" ? 6 : lod === "named" ? 8 : 16,
        zIndex: focused ? 3 : 2,
      }}
      data-plate={cell.id}
    >
      {focused ? <Tape ink="var(--ramune)" className="-top-2 left-5" rotate={-3} width={58} /> : null}
      {lod === "reading" ? (
        <span className="block">
          <span className="flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>
            {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
            <span className="text-muted-foreground">· {cell.state === "Draft" ? "proposed" : cell.state.toLowerCase()}</span>
          </span>
          <span className="mt-1.5 block font-display font-bold leading-[1.05] tracking-[-0.02em] text-foreground" style={{ fontSize: nameSize }}>{cell.name}</span>
          {cell.description ? <span className="mt-2 line-clamp-3 text-[16px] leading-snug text-muted-foreground">{cell.description}</span> : <span className="mt-2 block text-[16px] leading-snug text-muted-foreground">A name and a scope.</span>}
        </span>
      ) : null}
      <Face face={face} lod={lod} k={k} name={cell.name} onImageError={onImageError} />
      {lod === "reading" ? (
        <span className="mt-2 block font-mono text-[9.5px] uppercase leading-snug tracking-[0.12em] text-muted-foreground">{face.caption}</span>
      ) : null}
      {lod === "reading" && studyText ? <PaperStrip text={studyText.text} className="mt-3" lines={5} /> : null}
      {lod === "reading" && studyPalette ? <Swatches colors={studyPalette.swatches} className="mt-3 h-9" /> : null}
      {lod === "named" && face.kind !== "name" ? (
        <span className="mt-2 block truncate font-display font-bold leading-[1.05] tracking-[-0.02em] text-foreground" style={{ fontSize: Math.min(40, nameSize) }}>{cell.name}</span>
      ) : null}
    </button>
  );
}

/** One manifestation, joined to its cell. Opens the record's own page. */
export function Satellite({
  node,
  manifestation,
  k,
  dimmed,
  labelled,
  onMore,
}: {
  node: SatelliteNode;
  manifestation: CellManifestation | null;
  k: number;
  dimmed: boolean;
  /** Names are drawn only around the cell in focus. Every satellite naming
   *  itself at once buried the map under overlapping labels. */
  labelled: boolean;
  onMore: () => void;
}) {
  const record = manifestation?.record ?? null;
  const ink = SET_INK[node.set];
  const size = SAT_W;
  // A record's thumbnail can 404. When it does the satellite shows the next
  // face the record has rather than a broken-image box.
  const [imageFailed, markImageFailed] = useLoadFailure(record?.image);
  const thumb = record?.image && !imageFailed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={record.image} alt={record.name} className="block h-full w-full object-cover" loading="lazy" draggable={false} onError={markImageFailed} />
  ) : record?.swatches?.length ? (
    <Swatches colors={record.swatches} className="h-full" />
  ) : record?.excerpt ? (
    <PaperStrip text={record.excerpt} lines={3} className="h-full !px-2 !py-1.5 [&_p]:text-[8px] [&_p]:leading-[12px]" />
  ) : (
    <span className="block h-full w-full" style={{ background: `color-mix(in srgb, ${ink} 12%, var(--washi))` }} />
  );
  const common = "absolute block text-left transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)]";
  const style: CSSProperties = { left: node.x - size / 2, top: node.y - size / 2, width: size, opacity: dimmed ? 0.3 : 1, zIndex: 1 };
  const labelSize = Math.min(14, Math.max(9, 9 / k));

  if (node.index === -1) {
    // The ring holds what fits; the rest are real records the sheet lists in
    // full, so this node opens that list rather than standing for nothing.
    return (
      <button type="button" onClick={onMore} title={`Open the other ${node.more} records this cell names`} aria-label={`Open the other ${node.more} records this cell names`} className={common} style={style}>
        <span className="grid place-items-center bg-[var(--washi)] font-mono font-bold tabular-nums text-foreground shadow-[var(--shadow-sticker)]" style={{ width: size, height: size, fontSize: Math.min(22, Math.max(12, 11 / k)) }}>+{node.more}</span>
        {labelled ? <span className="mt-1 block text-center font-mono uppercase tracking-[0.12em] text-muted-foreground" style={{ fontSize: labelSize }}>open all</span> : null}
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
          <Eyebrow ink={ink} style={{ fontSize: Math.min(11, Math.max(8, 7.5 / k)) }}>{SET_EYEBROW[node.set]}</Eyebrow>
          <span className="block truncate font-sans font-semibold leading-tight text-foreground" style={{ fontSize: labelSize }}>{name}</span>
        </span>
      ) : null}
    </a>
  );
}
