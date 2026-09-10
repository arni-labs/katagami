"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, X } from "lucide-react";
import type { CellManifestation, EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import { GraphIndex, MAP_LABEL, MAP_NAMES_ORDER, relationInk } from "@/lib/encyclopedia-graph";
import { InkStamp, ProvenanceStamp, RELATION_INK_VAR, inkChipStyle } from "./chrome";
import { SET_INK, SET_SHORT, type CellFace } from "./material";
import { brokenOnArrival, Eyebrow, PaperStrip, Swatches, useCellFace, useLoadFailure } from "./map-cards";
import { useWindowedList } from "./windowed-list";

// The cell sheet beside the map (a bottom sheet on phones, and the body of a
// cell page in the phone browser). Title, the PROPOSED CELL and provenance
// stamps, the scope, then three tabs: Material (made things, narrower cells, a
// source snippet), Connections, Notes.
//
// The sheet is set small — 12px prose, 12.5px headings — because it sits
// beside an information-dense canvas and Rita asked for compact type here
// (2026-09-09); the 17px floor the design contract puts on body text is for
// pages, not for this working panel. The mono lines are metadata — eyebrows,
// stamps, counts — and stay smaller still.

export type SheetTab = "material" | "connections" | "notes";

const STATE_LABEL: Record<string, string> = {
  Draft: "Proposed cell",
  ValidatingDocument: "Validating",
  Archived: "Archived cell",
  Published: "Published cell",
};

function Row({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const className = "group flex w-full items-center gap-2.5 py-2 text-left";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
        <ArrowUpRight size={13} className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
      <ArrowRight size={13} className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

function Thumb({ manifestation }: { manifestation: CellManifestation }) {
  const record = manifestation.record;
  // A thumbnail that 404s falls through to the record's next face instead of
  // leaving a broken-image box in the list.
  const [imageFailed, markImageFailed] = useLoadFailure(record?.image);
  const frame = "block h-[44px] w-[44px] shrink-0 overflow-hidden";
  if (!record) return <span className={frame} style={{ background: "color-mix(in srgb, var(--graphite) 10%, var(--washi))", boxShadow: "var(--shadow-sticker)" }} />;
  if (record.image && !imageFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={(el) => brokenOnArrival(el, markImageFailed)} src={record.image} alt="" className={`${frame} object-cover`} style={{ boxShadow: "var(--shadow-sticker)" }} loading="lazy" onError={markImageFailed} />;
  }
  if (record.excerpt) return <span className={frame}><PaperStrip text={record.excerpt} lines={3} className="h-full !px-2 !py-1.5 [&_p]:text-[8.5px] [&_p]:leading-[13px]" /></span>;
  if (record.swatches?.length) return <span className={frame}><Swatches colors={record.swatches} className="h-full" /></span>;
  return <span className={frame} style={{ background: `color-mix(in srgb, ${SET_INK[record.set]} 10%, var(--washi))` }} />;
}

function Divider() {
  return <span aria-hidden className="sticker-perforation my-3 block" />;
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-[12.5px] font-semibold tracking-[-0.01em]">{children}</h3>;
}

function Manifestations({ cell, index, expandKey, onFocus }: { cell: EncyclopediaCell; index: GraphIndex; expandKey: number; onFocus: (id: string) => void }) {
  // A new cell opens folded; the "+N" node on the map bumps `expandKey` and
  // opens the list in full. The records past the ring are on the cell, and
  // this is where they are all reachable — the node must never read as "the
  // rest are not there". Both resets happen during render rather than in an
  // effect, so the list is never painted folded for a frame first.
  const [opened, setOpened] = useState({ id: cell.id, key: expandKey, all: expandKey > 0 });
  const current = opened.id === cell.id && opened.key === expandKey
    ? opened
    : { id: cell.id, key: expandKey, all: opened.key !== expandKey && expandKey > 0 };
  if (current !== opened) setOpened(current);
  const all = current.all;
  const setAll = (next: boolean) => setOpened({ id: cell.id, key: expandKey, all: next });
  const shown = all ? cell.manifestations : cell.manifestations.slice(0, 6);
  if (!cell.manifestations.length) {
    return (
      <>
        <Heading>Manifestations</Heading>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">No Katagami record expresses this cell yet. An empty seat is a real finding: a region with no made work.</p>
      </>
    );
  }
  return (
    <>
      <Heading>Manifestations <span className="font-mono text-[9px] font-normal tracking-[0.14em] text-muted-foreground tabular-nums">{cell.manifestations.length}</span></Heading>
      <ul className="mt-1">
        {shown.map((m, i) => {
          const record = m.record;
          // The same record is often named by several cells — Aquatint,
          // Lithography and Ukiyo-e share one — so the row says which, and
          // each is one tap away. A reader who saw the same thumbnail on two
          // cards learns here that it is one record, not two.
          const also = index.ownersOf(m.entitySet, m.entityId).filter((c) => c.id !== cell.id);
          return (
            <li key={`${m.entitySet}:${m.entityId}`}>
              {i > 0 ? <span aria-hidden className="sticker-perforation block" /> : null}
              <Row href={record?.href}>
                <span className="w-14 shrink-0 self-start pt-1">
                  <Eyebrow ink={SET_INK[m.entitySet]}>{SET_SHORT[m.entitySet]}</Eyebrow>
                </span>
                <Thumb manifestation={m} />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[12px] font-medium leading-snug text-foreground">{record?.name ?? (m.unread ? "Record could not be read" : "Record not found")}</span>
                  <span className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{record ? m.explanation : m.unread ? `The read for ${m.entityId} failed. Reload to try it again.` : m.entityId}</span>
                  {record ? <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground/80">{record.status === "UnderReview" ? "under review" : record.status.toLowerCase()}</span> : null}
                </span>
              </Row>
              {also.length ? (
                <p className="-mt-1 mb-2 pl-14 font-sans text-[10.5px] leading-snug text-muted-foreground">
                  Also named by{" "}
                  {also.map((c, j) => (
                    <span key={c.id}>
                      {j > 0 ? ", " : ""}
                      <button type="button" onClick={() => onFocus(c.id)} className="text-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px]">{c.name}</button>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {cell.manifestations.length > 6 ? (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground">
          {all ? "Fewer" : `All ${cell.manifestations.length}`}
        </button>
      ) : null}
    </>
  );
}

/** A cell's face at thumbnail size. The face and its fallback belong to the
 *  row, so the picture and the label it is credited with never disagree. */
export function CellThumb({ face, onImageError, size }: { face: CellFace; onImageError: () => void; size: number }) {
  const frame = "block shrink-0";
  const box = { width: size, height: size };
  if (face.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={(el) => brokenOnArrival(el, onImageError)} src={face.url} alt="" className={`${frame} object-cover`} style={{ ...box, boxShadow: "var(--shadow-sticker)" }} loading="lazy" onError={onImageError} />;
  }
  if (face.kind === "passage") {
    return <span className={`${frame} overflow-hidden`} style={box}><PaperStrip text={face.text} lines={3} className="h-full !px-2 !py-1.5 [&_p]:text-[8px] [&_p]:leading-[12px]" /></span>;
  }
  if (face.kind === "palette") {
    return <span className={frame} style={box}><Swatches colors={face.swatches} className="h-full" /></span>;
  }
  // Nothing made for this cell yet. Plain tinted paper, the same answer the
  // map gives: a column of dashed empty frames spends the whole accent budget
  // on emptiness, and most cells in the library are in this state.
  return <span className={frame} style={{ ...box, background: `color-mix(in srgb, ${face.ink} 10%, var(--washi))`, boxShadow: "var(--shadow-sticker)" }} />;
}

function NarrowerRow({ kid, onFocus }: { kid: EncyclopediaCell; onFocus: (id: string) => void }) {
  const { face, onImageError } = useCellFace(kid);
  return (
    <li>
      <Row onClick={() => onFocus(kid.id)}>
        <CellThumb face={face} onImageError={onImageError} size={34} />
        <span className="min-w-0 flex-1">
          <Eyebrow ink={face.ink}>{face.eyebrow}</Eyebrow>
          <span className="mt-0.5 block font-sans text-[12px] font-medium leading-snug text-foreground">{kid.name}</span>
          <span className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{kid.description || "A name and a scope."}</span>
        </span>
      </Row>
    </li>
  );
}

function Narrower({ cell, index, onFocus, expansion }: { cell: EncyclopediaCell; index: GraphIndex; onFocus: (id: string) => void; expansion?: SheetExpansion }) {
  const kids = index.orderedChildren(cell.id);
  return (
    <>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <Heading>Narrower cells <span className="font-mono text-[9px] font-normal tracking-[0.14em] text-muted-foreground tabular-nums">{kids.length}</span></Heading>
        {kids.length && expansion ? (
          <button type="button" onClick={() => expansion.onToggle(cell.id)} aria-expanded={expansion.open} className="px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em]" style={expansion.open ? { background: "var(--yuzu)", color: "var(--sumi)" } : inkChipStyle("var(--ramune)")}>
            {expansion.open ? "Fold on the map" : "Open on the map"}
          </button>
        ) : null}
      </span>
      {kids.length ? (
        <ul className="mt-1">
          {kids.map((kid) => <NarrowerRow key={kid.id} kid={kid} onFocus={onFocus} />)}
        </ul>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">Nothing narrower under this cell yet.</p>
      )}
    </>
  );
}

function SourceRow({ source }: { source: EncyclopediaCell["sources"][number] }) {
  let host = "";
  try { host = new URL(source.url).hostname.replace(/^www\./, ""); } catch { host = source.url; }
  return (
    <div className="flex gap-3">
      <BookOpen size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-relaxed text-foreground"><em>{source.title}</em>. <span className="text-muted-foreground">{host}</span></p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {source.verifiedBy ? (
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: "color-mix(in oklch, var(--ramune) 72%, var(--foreground))" }}>Verified by {source.verifiedBy} · {source.verifiedOn}</span>
          ) : (
            <>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">Unverified</span>
              <span className="group/verify relative">
                <button type="button" disabled aria-disabled="true" aria-describedby={`verify-${source.id}`} className="cursor-not-allowed px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] opacity-60" style={inkChipStyle("var(--ramune)")}>Verify</button>
                <span id={`verify-${source.id}`} role="tooltip" className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-64 bg-[var(--foreground)] px-3 py-2.5 text-[11px] leading-snug text-[var(--background)] opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover/verify:opacity-100 group-focus-within/verify:opacity-100">
                  Verification is coming. Opening the source and recording who checked it will land here.
                </span>
              </span>
            </>
          )}
          <a href={source.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-sans text-[11px] font-medium" style={{ color: "color-mix(in oklch, var(--ramune) 80%, var(--foreground))" }}>
            View source <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}

function CellRow({ cell, word, explanation, ink, onFocus }: { cell: EncyclopediaCell; word: string; explanation: string; ink: string; onFocus: (id: string) => void }) {
  return (
    <li>
      <Row onClick={() => onFocus(cell.id)}>
        <span className="min-w-0 flex-1">
          <Eyebrow ink={ink}>{word}</Eyebrow>
          <span className="mt-0.5 block font-sans text-[12px] font-medium leading-snug text-foreground">{cell.name}</span>
          {explanation ? <span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">{explanation}</span> : null}
        </span>
      </Row>
    </li>
  );
}

/** Whether the cell's narrower cells are open on the map, and the way to open
 *  or fold them from the sheet. Absent in the phone browser, which has no map
 *  on screen to open them onto. */
export interface SheetExpansion {
  open: boolean;
  onToggle: (id: string) => void;
}

export function SheetBody({ cell, index, tab, onTab, onFocus, expandKey = 0, expansion }: { cell: EncyclopediaCell; index: GraphIndex; tab: SheetTab; onTab: (tab: SheetTab) => void; onFocus: (id: string) => void; expandKey?: number; expansion?: SheetExpansion }) {
  const far = index.farJump(cell.id);
  const tabs: Array<{ id: SheetTab; label: string }> = [
    { id: "material", label: "Material" },
    { id: "connections", label: "Connections" },
    { id: "notes", label: "Notes" },
  ];
  return (
    <>
      <div role="tablist" aria-label="Cell sheet" className="mt-4 flex items-end gap-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`relative pb-1.5 font-sans text-[11.5px] ${tab === t.id ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {tab === t.id ? <span aria-hidden className="absolute inset-x-0 bottom-0 block h-[2px]" style={{ background: "var(--yuzu)" }} /> : null}
          </button>
        ))}
      </div>
      <span aria-hidden className="sticker-perforation block" />

      {tab === "material" ? (
        <div className="pt-4">
          <Manifestations cell={cell} index={index} expandKey={expandKey} onFocus={onFocus} />
          <Divider />
          <Narrower cell={cell} index={index} onFocus={onFocus} expansion={expansion} />
          <Divider />
          <Heading>Source snippet</Heading>
          <div className="mt-3">
            {cell.sources[0] ? <SourceRow source={cell.sources[0]} /> : <p className="text-[12px] leading-relaxed text-muted-foreground">No source. {cell.provenance.note ?? "Written from model training data."}</p>}
          </div>
        </div>
      ) : null}

      {tab === "connections" ? (
        <div className="pt-4">
          <Heading>Broader</Heading>
          {cell.broader.length ? (
            <ul className="mt-1">
              {cell.broader.map((link) => {
                const target = index.byId.get(link.cellId);
                return target ? <CellRow key={link.cellId} cell={target} word="broader" explanation={link.explanation} ink="var(--graphite)" onFocus={onFocus} /> : <li key={link.cellId} className="py-3 text-[12px] text-muted-foreground"><span className="font-mono text-[12px]">{link.cellId}</span> is not in the library yet.</li>;
              })}
            </ul>
          ) : <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">A top-level cell: nothing broader above it.</p>}
          <Divider />
          <Heading>Narrower</Heading>
          {index.childrenOf(cell.id).length ? (
            <ul className="mt-1">
              {index.childrenOf(cell.id).map((kid) => <CellRow key={kid.id} cell={kid} word="narrower cell" explanation={kid.broader.find((b) => b.cellId === cell.id)?.explanation ?? ""} ink="var(--graphite)" onFocus={onFocus} />)}
            </ul>
          ) : <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">Nothing narrower yet.</p>}
          <Divider />
          <Heading>Relations</Heading>
          {index.neighbours(cell.id).filter((n) => n.via !== "broader" && n.via !== "narrower").length ? (
            <ul className="mt-1">
              {index.neighbours(cell.id).filter((n) => n.via !== "broader" && n.via !== "narrower").map((n) => <CellRow key={n.cell.id} cell={n.cell} word={n.via} explanation={n.explanation} ink={RELATION_INK_VAR[relationInk(n.via)]} onFocus={onFocus} />)}
            </ul>
          ) : <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">No typed relations recorded.</p>}
          <Divider />
          <Heading>Jump far</Heading>
          {far ? (
            <button type="button" onClick={() => onFocus(far.cell.id)} className="mt-3 block w-full text-left" style={{ background: "color-mix(in srgb, var(--sakura) 7%, var(--washi))", boxShadow: "var(--shadow-card)" }}>
              <span className="block p-3">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-[12.5px] font-semibold tracking-[-0.01em]">{far.cell.name}</span>
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">{far.hops} hops</span>
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">{far.path.map((id) => index.byId.get(id)?.name ?? id).join(" → ")}</span>
              </span>
            </button>
          ) : <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">Everything reachable is within one hop.</p>}
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="pt-4">
          <Heading>Provenance</Heading>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ProvenanceStamp basis={cell.provenance.basis} compact /><InkStamp ink="var(--graphite)" tilt={1} compact>{cell.state || "Draft"}</InkStamp></div>
          {cell.provenance.note ? <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{cell.provenance.note}</p> : null}
          <Divider />
          <Heading>Sources <span className="font-mono text-[9px] font-normal tracking-[0.14em] text-muted-foreground tabular-nums">{cell.sources.filter((s) => s.verifiedBy).length}/{cell.sources.length} verified</span></Heading>
          {cell.sources.length ? <div className="mt-3 grid gap-5">{cell.sources.map((s) => <SourceRow key={s.id} source={s} />)}</div> : <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">No sources yet.</p>}
          <Divider />
          <Heading>Maps</Heading>
          <ul className="mt-2 grid gap-2.5">
            {cell.maps.map((m) => (
              <li key={m.map}>
                <span className="font-sans text-[12px] font-medium">{MAP_LABEL[m.map]}</span>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{m.explanation}</p>
              </li>
            ))}
          </ul>
          {cell.questions.length ? (
            <>
              <Divider />
              <Heading>Open questions</Heading>
              <ul className="mt-2 grid gap-1.5">{cell.questions.map((q) => <li key={q} className="text-[12px] leading-relaxed text-foreground/85">{q}</li>)}</ul>
            </>
          ) : null}
          <p className="mt-6 font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground/70 break-all">cell · {cell.id}</p>
        </div>
      ) : null}
    </>
  );
}

export function SheetTitle({ cell, size = "lg" }: { cell: EncyclopediaCell; size?: "lg" | "md" }) {
  return (
    <>
      <h2 className={`font-display font-semibold leading-[1.05] tracking-[-0.02em] ${size === "lg" ? "text-[20px]" : "text-[17px]"}`}>
        <span className="relative inline-block">
          {cell.name}
          <span aria-hidden className="absolute -bottom-0.5 left-0 h-[3px] w-full" style={{ background: "var(--yuzu)", opacity: 0.8, mixBlendMode: "var(--ink-blend)" as never, transform: "rotate(-0.4deg)" }} />
        </span>
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>{STATE_LABEL[cell.state] ?? cell.state}</span>
        <ProvenanceStamp basis={cell.provenance.basis} tilt={-1} compact />
      </div>
    </>
  );
}

export function OpenCellButton({ cell }: { cell: EncyclopediaCell }) {
  return (
    <a
      href={`/encyclopedia?cell=${encodeURIComponent(cell.id)}`}
      target="_blank"
      rel="noreferrer"
      className="mt-4 flex h-8 items-center justify-between bg-foreground px-3 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] hover:rotate-[-0.5deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0"
    >
      Open cell <ArrowUpRight size={13} aria-hidden />
    </a>
  );
}

export function CloseButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close" className={`grid h-9 w-9 place-items-center text-foreground hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] ${className}`}>
      <X size={20} />
    </button>
  );
}

function IndexRow({ cell, onFocus, height }: { cell: EncyclopediaCell; onFocus: (id: string) => void; height: number }) {
  const { face, onImageError } = useCellFace(cell);
  return (
    <button type="button" onClick={() => onFocus(cell.id)} className="group flex w-full items-center gap-4 text-left" style={{ height }}>
      <CellThumb face={face} onImageError={onImageError} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-[12px] font-medium leading-snug text-foreground">{cell.name}</span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-snug text-muted-foreground">{cell.description || "A name and a scope."}</span>
      </span>
      <ArrowRight size={13} className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

/** One row's height in the index. Fixed, so the list can be windowed: the
 *  index is as long as the library, and drawing a row and a thumbnail for
 *  every cell is what made opening the sheet cost more the bigger the
 *  encyclopedia got. */
const INDEX_ROW_H = 52;

/** The sheet with nothing in focus: an index of every cell, by map, each with
 *  its picture. Picking one focuses it on the map.
 *
 *  The maps are one flat list with headings in it rather than four lists, so
 *  one window covers the whole index however the cells are distributed. */
export function IndexSheet({ index, onFocus, scrollRef }: { index: GraphIndex; onFocus: (id: string) => void; scrollRef: React.RefObject<HTMLElement | null> }) {
  const cells = index.graph.cells;
  const rows = useMemo(() => {
    const out: Array<{ kind: "heading"; map: MapName; count: number } | { kind: "cell"; cell: EncyclopediaCell }> = [];
    for (const map of MAP_NAMES_ORDER) {
      const members = cells.filter((c) => index.primaryMap(c) === map);
      if (!members.length) continue;
      out.push({ kind: "heading", map, count: members.length });
      for (const cell of members) out.push({ kind: "cell", cell });
    }
    return out;
  }, [cells, index]);
  const { window: win } = useWindowedList(rows.length, INDEX_ROW_H, scrollRef);
  return (
    <div className="mt-2">
      <h2 className="font-display text-[20px] font-semibold leading-[1.05] tracking-[-0.02em]">
        <span className="relative inline-block">
          {cells.length} cells
          <span aria-hidden className="absolute -bottom-0.5 left-0 h-[3px] w-full" style={{ background: "var(--yuzu)", opacity: 0.8, mixBlendMode: "var(--ink-blend)" as never, transform: "rotate(-0.4deg)" }} />
        </span>
      </h2>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">The map shows what you open: a category node opens its first cells, a cell opens its narrower cells, and a click on an open cell folds them. Pick a cell here to put it on the paper and read it.</p>
      <div className="mt-4" style={{ height: rows.length * INDEX_ROW_H }}>
        <div style={{ transform: `translateY(${win.offsetTop}px)` }}>
          {rows.slice(win.from, win.to).map((row) =>
            row.kind === "heading" ? (
              <div key={`h-${row.map}`} className="flex items-end pb-2" style={{ height: INDEX_ROW_H }}>
                <Heading>{MAP_LABEL[row.map]} <span className="font-mono text-[9px] font-normal tracking-[0.14em] text-muted-foreground tabular-nums">{row.count}</span></Heading>
              </div>
            ) : (
              <IndexRow key={row.cell.id} cell={row.cell} onFocus={onFocus} height={INDEX_ROW_H} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
