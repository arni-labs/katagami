"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import type { EncyclopediaCell } from "@/lib/encyclopedia";
import type { GraphIndex } from "@/lib/encyclopedia-graph";
import { Tape } from "./chrome";
import { cellMaterial, excerpt, type CellMaterial } from "./material";
import { FOCUS_W, NEIGHBOUR_W, type PlacedCard } from "./focus-layout";

// The two cards on the map. The focused cell is a large specimen sheet that
// holds its real material: a picture, a passage set on a paper strip, a
// palette as swatches, and a dashed "named cell" for a narrower cell with no
// material yet. A neighbour is a small sheet with one piece of material and
// a mono eyebrow, or its name and scope when it has none.

const PAPER = "var(--washi)";

export function Eyebrow({ ink, children, className = "" }: { ink: string; children: ReactNode; className?: string }) {
  return (
    <span className={`block font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${className}`} style={{ color: `color-mix(in oklch, ${ink} 78%, var(--foreground))` }}>
      {children}
    </span>
  );
}

/** A passage on a strip of paper — the writing counterpart of a study plate. */
export function PaperStrip({ text, className = "", lines = 8 }: { text: string; className?: string; lines?: number }) {
  return (
    <div
      className={`relative overflow-hidden px-4 py-3 ${className}`}
      style={{
        background: "color-mix(in srgb, var(--yuzu) 7%, var(--washi))",
        boxShadow: "var(--shadow-sticker)",
        backgroundImage: "repeating-linear-gradient(180deg, transparent 0 25px, color-mix(in srgb, var(--foreground) 6%, transparent) 25px 26px)",
        backgroundPosition: "0 10px",
      }}
    >
      <p className="font-sans text-[14.5px] italic leading-[26px] text-foreground" style={{ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {text}
      </p>
    </div>
  );
}

export function Swatches({ colors, className = "" }: { colors: string[]; className?: string }) {
  return (
    <div className={`flex ${className}`} style={{ boxShadow: "var(--shadow-sticker)" }}>
      {colors.slice(0, 8).map((hex, i) => (
        <span key={`${hex}-${i}`} className="h-full flex-1" style={{ background: hex }} title={hex} />
      ))}
    </div>
  );
}

/** The dashed placeholder for a cell that has a name and a scope, nothing more. */
export function NamedCell({ cell, onClick, className = "", style }: { cell: EncyclopediaCell; onClick?: () => void; className?: string; style?: CSSProperties }) {
  const body = (
    <>
      <Eyebrow ink="var(--ramune)">Named cell</Eyebrow>
      <span className="mt-2 block font-display text-[16px] font-bold leading-tight tracking-[-0.02em] text-foreground">{cell.name}</span>
      {cell.description ? <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{cell.description}</span> : null}
    </>
  );
  const frame = `block text-left px-4 py-4 ${className}`;
  const dashed: CSSProperties = { outline: "2px dashed color-mix(in oklch, var(--ramune) 65%, transparent)", outlineOffset: -2, ...style };
  return onClick ? (
    <button type="button" onClick={onClick} className={`${frame} focus-visible:outline-solid`} style={dashed}>{body}</button>
  ) : (
    <div className={frame} style={dashed}>{body}</div>
  );
}

function StatusNote({ status }: { status?: string }) {
  if (!status) return null;
  const label = status === "UnderReview" ? "under review" : status.toLowerCase();
  return <span className="text-muted-foreground/80"> · {label}</span>;
}

export function FocusCard({
  card,
  index,
  material,
  onOpen,
  onFocus,
  cardRef,
  lod,
  k,
}: {
  card: PlacedCard;
  index: GraphIndex;
  material: CellMaterial;
  onOpen: () => void;
  onFocus: (id: string) => void;
  cardRef: Ref<HTMLDivElement>;
  lod: "full" | "compact";
  k: number;
}) {
  const { cell } = card;
  const namedNarrower = index.childrenOf(cell.id).find((kid) => cellMaterial(kid).nameOnly);
  const second = !material.text && !material.palette ? material.secondImage : null;
  const twoColumns = Boolean(material.image && (material.text || material.palette || namedNarrower || second));
  return (
    <div
      ref={cardRef}
      className="absolute"
      style={{ left: card.x, top: card.y, width: FOCUS_W, background: PAPER, boxShadow: "var(--shadow-card-hover)", outline: "2px solid color-mix(in oklch, var(--ramune) 70%, transparent)", outlineOffset: -2 }}
      data-card="focus"
    >
      <Tape ink="var(--ramune)" className="-top-2 left-7" rotate={-3} width={64} />
      <div className="px-6 pb-6 pt-6">
        <button type="button" onClick={onOpen} className="block text-left font-display font-bold leading-[1.05] tracking-[-0.02em] text-foreground hover:underline hover:decoration-[var(--yuzu)] hover:decoration-[4px] hover:underline-offset-[4px]" style={{ fontSize: lod === "compact" ? Math.min(44, Math.max(24, 20 / k)) : 24 }}>
          {cell.name}
        </button>
        {lod === "compact" ? (
          <p className="mt-3 leading-snug text-muted-foreground" style={{ fontSize: Math.min(30, Math.max(15, 13 / k)) }}>{cell.description || "A name and a scope."}</p>
        ) : material.nameOnly ? (
          <div className="mt-4">
            <p className="text-[16px] leading-relaxed text-foreground">{cell.description || "A name and a scope. No description has been written yet."}</p>
            <div className="mt-5 px-4 py-4" style={{ outline: "2px dashed color-mix(in oklch, var(--ramune) 65%, transparent)", outlineOffset: -2 }}>
              <Eyebrow ink="var(--ramune)">Name only</Eyebrow>
              <p className="mt-1.5 text-[14px] leading-snug text-muted-foreground">No study, no made thing points here yet. The cell is a region on the map waiting for material.</p>
            </div>
          </div>
        ) : (
          <div className={`mt-4 grid gap-5 ${twoColumns ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-1"}`}>
            {material.image ? (
              <figure className="min-w-0">
                <a href={material.image.href ?? undefined} target={material.image.href ? "_blank" : undefined} rel="noreferrer" className="block" onClick={(e) => { if (!material.image?.href) e.preventDefault(); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={material.image.url} alt={material.image.alt} className="block w-full object-cover" style={{ aspectRatio: twoColumns ? "3 / 4" : "16 / 10", boxShadow: "var(--shadow-sticker)" }} loading="lazy" draggable={false} />
                </a>
                <figcaption className="mt-2.5">
                  <Eyebrow ink={material.image.ink}>{material.image.eyebrow}</Eyebrow>
                  <span className="mt-1 block text-[14px] leading-snug text-foreground">{material.image.title}<StatusNote status={material.image.status} /></span>
                  {material.image.note ? <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{material.image.note}</span> : null}
                </figcaption>
              </figure>
            ) : null}
            <div className="flex min-w-0 flex-col gap-5">
              {second ? (
                <figure className="min-w-0">
                  <a href={second.href ?? undefined} target={second.href ? "_blank" : undefined} rel="noreferrer" className="block" onClick={(e) => { if (!second.href) e.preventDefault(); }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={second.url} alt={second.alt} className="block w-full object-cover" style={{ aspectRatio: "3 / 4", boxShadow: "var(--shadow-sticker)" }} loading="lazy" draggable={false} />
                  </a>
                  <figcaption className="mt-2.5">
                    <Eyebrow ink={second.ink}>{second.eyebrow}</Eyebrow>
                    <span className="mt-1 block text-[14px] leading-snug text-foreground">{second.title}<StatusNote status={second.status} /></span>
                    {second.note ? <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{second.note}</span> : null}
                  </figcaption>
                </figure>
              ) : null}
              {material.text ? (
                <div>
                  <Eyebrow ink={material.text.ink}>{material.text.eyebrow}</Eyebrow>
                  <span className="mt-1 block font-display text-[16px] font-bold leading-tight tracking-[-0.02em] text-foreground">{material.text.title}</span>
                  {material.text.note ? <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{material.text.note}</span> : null}
                  <PaperStrip text={material.text.text} className="mt-2.5" lines={twoColumns ? 7 : 6} />
                </div>
              ) : null}
              {material.palette ? (
                <div>
                  <Eyebrow ink={material.palette.ink}>{material.palette.eyebrow}</Eyebrow>
                  <span className="mt-1 block text-[14px] leading-snug text-foreground">{material.palette.title}<StatusNote status={material.palette.status} /></span>
                  <Swatches colors={material.palette.swatches} className="mt-2 h-11" />
                  {material.palette.note ? <span className="mt-1 block text-[12.5px] text-muted-foreground">{material.palette.note}</span> : null}
                </div>
              ) : null}
              {namedNarrower ? <NamedCell cell={namedNarrower} onClick={() => onFocus(namedNarrower.id)} /> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NeighbourCard({
  card,
  material,
  onFocus,
  cardRef,
  lod,
  fixedSize,
  dimmed,
  k,
}: {
  card: PlacedCard;
  material: CellMaterial;
  onFocus: () => void;
  cardRef: Ref<HTMLButtonElement>;
  lod: "full" | "compact";
  /** Measured full size, held while compact so the layout does not shift. */
  fixedSize?: { w: number; h: number };
  dimmed: boolean;
  /** Camera scale, for counter-scaling compact names. */
  k: number;
}) {
  const { cell } = card;
  const piece = material.image ?? material.text ?? material.palette;
  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onFocus}
      aria-label={`${cell.name}, ${card.word}. Focus this cell.`}
      className="absolute block text-left transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ left: card.x, top: card.y, width: NEIGHBOUR_W, background: PAPER, boxShadow: "var(--shadow-card)", opacity: dimmed ? 0.35 : 1, ...(lod === "compact" && fixedSize ? { height: fixedSize.h } : {}) }}
      data-card={card.role}
    >
      {lod === "compact" ? (
        <span className="flex h-full flex-col justify-center px-4 py-4">
          {/* Names grow as the camera pulls back, so the map stays readable. */}
          <span className="block font-display font-bold leading-[1.05] tracking-[-0.02em] text-foreground" style={{ fontSize: Math.min(34, Math.max(17, 14 / k)) }}>{cell.name}</span>
        </span>
      ) : (
        <span className="block px-4 pb-4 pt-4">
          <span className="block font-display text-[16px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">{cell.name}</span>
          {piece ? (
            <span className="mt-3 block">
              {material.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={material.image.url} alt={material.image.alt} className="block w-full object-cover" style={{ aspectRatio: "4 / 3", boxShadow: "var(--shadow-sticker)" }} loading="lazy" draggable={false} />
              ) : material.text ? (
                <PaperStrip text={excerpt(material.text.text, 160)} lines={4} />
              ) : material.palette ? (
                <Swatches colors={material.palette.swatches} className="h-9" />
              ) : null}
              <Eyebrow ink={piece.ink} className="mt-2.5">{piece.eyebrow}</Eyebrow>
              <span className="mt-1 block text-[13.5px] leading-snug text-foreground">{piece.title}</span>
              {piece.note ? <span className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-muted-foreground">{piece.note}</span> : null}
            </span>
          ) : (
            <span className="mt-2 line-clamp-4 text-[13.5px] leading-snug text-muted-foreground">{cell.description || "A name and a scope."}</span>
          )}
        </span>
      )}
    </button>
  );
}
