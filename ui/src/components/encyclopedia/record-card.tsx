"use client";

import { ArrowUpRight, X } from "lucide-react";
import type { CellManifestation, EncyclopediaCell } from "@/lib/encyclopedia";
import type { GraphIndex } from "@/lib/encyclopedia-graph";
import { inkChipStyle } from "./chrome";
import { SET_EYEBROW, SET_INK } from "./material";
import { brokenOnArrival, PaperStrip, Swatches, useLoadFailure } from "./map-cards";

// A record, read where it is. Clicking a record node on the map used to leave
// the encyclopedia for the record's own page; now it opens this card beside
// the node — what the record is, why the cell names it, which other cells
// name it — and the page is one deliberate step further, in a new tab.

const CARD_W = 264;

function Picture({ record }: { record: NonNullable<CellManifestation["record"]> }) {
  const [failed, markFailed] = useLoadFailure(record.image);
  if (record.image && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={(el) => brokenOnArrival(el, markFailed)} src={record.image} alt={record.name} className="block aspect-[4/3] w-full object-cover" onError={markFailed} draggable={false} />;
  }
  if (record.swatches?.length) return <Swatches colors={record.swatches} className="h-14" />;
  if (record.excerpt) return <PaperStrip text={record.excerpt} lines={6} />;
  return null;
}

export function RecordCard({
  manifestation,
  cell,
  index,
  at,
  cellAt,
  room,
  onClose,
  onFocusCell,
}: {
  manifestation: CellManifestation;
  /** The cell whose node was clicked. */
  cell: EncyclopediaCell;
  index: GraphIndex;
  /** Where the node is on screen, and how big. */
  at: { x: number; y: number; size: number };
  /** Where the node's cell is on screen, so the card opens on the side away
   *  from it and never covers the card the record hangs from. */
  cellAt: { x: number; y: number };
  /** The viewport, so the card stays inside it. */
  room: { w: number; h: number };
  onClose: () => void;
  onFocusCell: (id: string) => void;
}) {
  const record = manifestation.record;
  const ink = SET_INK[manifestation.entitySet];
  const also = index.ownersOf(manifestation.entitySet, manifestation.entityId).filter((c) => c.id !== cell.id);
  // Beside the node, on the side away from its cell when that side has room,
  // otherwise the other side; never off the viewport.
  const gap = 10;
  const rightOf = at.x + at.size / 2 + gap;
  const leftOf = at.x - at.size / 2 - gap - CARD_W;
  const fitsRight = rightOf + CARD_W <= room.w - 8;
  const fitsLeft = leftOf >= 8;
  const preferRight = at.x >= cellAt.x;
  const left = preferRight ? (fitsRight ? rightOf : fitsLeft ? leftOf : Math.max(8, room.w - 8 - CARD_W)) : (fitsLeft ? leftOf : fitsRight ? rightOf : 8);
  const top = Math.max(8, Math.min(room.h - 8 - 360, at.y - 40));
  return (
    <div
      role="dialog"
      aria-label={record ? `${SET_EYEBROW[manifestation.entitySet]}: ${record.name}` : "Record"}
      className="absolute z-30 flex flex-col bg-[var(--washi)] shadow-[var(--shadow-card-hover)]"
      style={{ left, top, width: CARD_W }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <span aria-hidden className="washi-tape pointer-events-none -top-1.5 left-4" style={{ ["--strip-ink" as string]: ink, transform: "rotate(-4deg)", width: 44 }} />
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center bg-[var(--washi)] text-foreground"><X size={12} /></button>
      {record ? <Picture record={record} /> : null}
      <div className="px-3 pb-3 pt-2.5">
        <span className="inline-block px-1.5 py-[3px] font-mono text-[7.5px] font-bold uppercase leading-none tracking-[0.14em]" style={inkChipStyle(ink, 24)}>{SET_EYEBROW[manifestation.entitySet]}{record ? ` · ${record.status === "UnderReview" ? "under review" : record.status.toLowerCase()}` : ""}</span>
        <h3 className="mt-1.5 font-display text-[14px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">{record?.name ?? (manifestation.unread ? "Record could not be read" : "Record not found")}</h3>
        {record?.line ? <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">{record.line}</p> : null}
        <p className="mt-2 text-[10.5px] leading-snug text-foreground">
          <span className="font-mono text-[7.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Why {cell.name} names it · </span>
          {manifestation.explanation}
        </p>
        {also.length ? (
          <p className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground">
            Also named by{" "}
            {also.map((c, j) => (
              <span key={c.id}>{j > 0 ? ", " : ""}<button type="button" onClick={() => onFocusCell(c.id)} className="text-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[2px]">{c.name}</button></span>
            ))}
          </p>
        ) : null}
        {record ? (
          <a href={record.href} target="_blank" rel="noreferrer" className="mt-2.5 flex h-7 items-center justify-between bg-foreground px-2.5 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-background">
            Open {SET_EYEBROW[manifestation.entitySet].toLowerCase()} page <ArrowUpRight size={12} aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
