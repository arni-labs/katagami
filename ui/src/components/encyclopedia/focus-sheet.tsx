"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, X } from "lucide-react";
import type { CellManifestation, EncyclopediaCell } from "@/lib/encyclopedia";
import { GraphIndex, MAP_LABEL, relationInk } from "@/lib/encyclopedia-graph";
import { InkStamp, ProvenanceStamp, RELATION_INK_VAR, inkChipStyle } from "./chrome";
import { cellMaterial, SET_INK, SET_SHORT } from "./material";
import { Eyebrow, PaperStrip, Swatches } from "./map-cards";

// The cell sheet beside the map (a bottom sheet on phones). Title, the
// PROPOSED CELL and provenance stamps, the scope, then three tabs: Material
// (made things, narrower cells, a source snippet), Connections, Notes.

export type SheetTab = "material" | "connections" | "notes";

const STATE_LABEL: Record<string, string> = {
  Draft: "Proposed cell",
  ValidatingDocument: "Validating",
  Archived: "Archived cell",
  Published: "Published cell",
};

function Row({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const className = "group flex w-full items-center gap-4 py-3.5 text-left";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
        <ArrowUpRight size={18} className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
      <ArrowRight size={18} className="ml-auto shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

function Thumb({ manifestation }: { manifestation: CellManifestation }) {
  const record = manifestation.record;
  const frame = "block h-[76px] w-[76px] shrink-0 overflow-hidden";
  if (!record) return <span className={frame} style={{ outline: "2px dashed color-mix(in oklch, var(--graphite) 45%, transparent)", outlineOffset: -2 }} />;
  if (record.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={record.image} alt="" className={`${frame} object-cover`} style={{ boxShadow: "var(--shadow-sticker)" }} loading="lazy" />;
  }
  if (record.excerpt) return <span className={frame}><PaperStrip text={record.excerpt} lines={3} className="h-full !px-2 !py-1.5 [&_p]:text-[8.5px] [&_p]:leading-[13px]" /></span>;
  if (record.swatches?.length) return <span className={frame}><Swatches colors={record.swatches} className="h-full" /></span>;
  return <span className={frame} style={{ background: `color-mix(in srgb, ${SET_INK[record.set]} 10%, var(--washi))` }} />;
}

function Divider() {
  return <span aria-hidden className="sticker-perforation my-4 block" />;
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-[19px] font-bold tracking-[-0.02em]">{children}</h3>;
}

function Manifestations({ cell }: { cell: EncyclopediaCell }) {
  const [all, setAll] = useState(false);
  const shown = all ? cell.manifestations : cell.manifestations.slice(0, 6);
  if (!cell.manifestations.length) {
    return (
      <>
        <Heading>Manifestations</Heading>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">No Katagami record expresses this cell yet. An empty seat is a real finding: a region with no made work.</p>
      </>
    );
  }
  return (
    <>
      <Heading>Manifestations</Heading>
      <ul className="mt-1 divide-y divide-transparent">
        {shown.map((m) => {
          const record = m.record;
          return (
            <li key={`${m.entitySet}:${m.entityId}`} className="[&+&]:shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]">
              <Row href={record?.href}>
                <span className="w-16 shrink-0 self-start pt-1">
                  <Eyebrow ink={SET_INK[m.entitySet]}>{SET_SHORT[m.entitySet]}</Eyebrow>
                </span>
                <Thumb manifestation={m} />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[15.5px] font-semibold leading-snug text-foreground">{record?.name ?? "Record not found"}</span>
                  <span className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-muted-foreground">{record ? (record.line || m.explanation) : m.entityId}</span>
                  {record ? <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/80">{record.status === "UnderReview" ? "under review" : record.status.toLowerCase()}</span> : null}
                </span>
              </Row>
            </li>
          );
        })}
      </ul>
      {cell.manifestations.length > 6 ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground">
          {all ? "Fewer" : `All ${cell.manifestations.length}`}
        </button>
      ) : null}
    </>
  );
}

function Narrower({ cell, index, onFocus }: { cell: EncyclopediaCell; index: GraphIndex; onFocus: (id: string) => void }) {
  const kids = index.childrenOf(cell.id);
  return (
    <>
      <Heading>Narrower cells</Heading>
      {kids.length ? (
        <ul className="mt-1">
          {kids.map((kid) => {
            const m = cellMaterial(kid);
            const piece = m.image ?? m.text ?? m.palette;
            return (
              <li key={kid.id}>
                <Row onClick={() => onFocus(kid.id)}>
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image.url} alt="" className="block h-[64px] w-[64px] shrink-0 object-cover" style={{ boxShadow: "var(--shadow-sticker)" }} loading="lazy" />
                  ) : m.text ? (
                    <span className="block h-[64px] w-[64px] shrink-0 overflow-hidden"><PaperStrip text={m.text.text} lines={3} className="h-full !px-2 !py-1.5 [&_p]:text-[8px] [&_p]:leading-[12px]" /></span>
                  ) : m.palette ? (
                    <span className="block h-[64px] w-[64px] shrink-0"><Swatches colors={m.palette.swatches} className="h-full" /></span>
                  ) : (
                    <span className="block h-[64px] w-[64px] shrink-0" style={{ outline: "2px dashed color-mix(in oklch, var(--ramune) 60%, transparent)", outlineOffset: -2 }} />
                  )}
                  <span className="min-w-0 flex-1">
                    <Eyebrow ink={piece ? piece.ink : "var(--ramune)"}>{piece ? piece.eyebrow : "Name only"}</Eyebrow>
                    <span className="mt-0.5 block font-sans text-[15.5px] font-semibold leading-snug text-foreground">{kid.name}</span>
                    <span className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-muted-foreground">{kid.description || "A name and a scope."}</span>
                  </span>
                </Row>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Nothing narrower under this cell yet.</p>
      )}
    </>
  );
}

function SourceRow({ source }: { source: EncyclopediaCell["sources"][number] }) {
  let host = "";
  try { host = new URL(source.url).hostname.replace(/^www\./, ""); } catch { host = source.url; }
  return (
    <div className="flex gap-3">
      <BookOpen size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-relaxed text-foreground"><em>{source.title}</em>. <span className="text-muted-foreground">{host}</span></p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {source.verifiedBy ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "color-mix(in oklch, var(--ramune) 72%, var(--foreground))" }}>Verified by {source.verifiedBy} · {source.verifiedOn}</span>
          ) : (
            <>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Unverified</span>
              <span className="group/verify relative">
                <button type="button" disabled aria-disabled="true" aria-describedby={`verify-${source.id}`} className="cursor-not-allowed px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-60" style={inkChipStyle("var(--ramune)")}>Verify</button>
                <span id={`verify-${source.id}`} role="tooltip" className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-56 bg-[var(--foreground)] px-2.5 py-2 text-[12.5px] leading-snug text-[var(--background)] opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover/verify:opacity-100 group-focus-within/verify:opacity-100">
                  Verification is coming. Opening the source and recording who checked it will land here.
                </span>
              </span>
            </>
          )}
          <a href={source.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-sans text-[14px] font-semibold" style={{ color: "color-mix(in oklch, var(--ramune) 80%, var(--foreground))" }}>
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
          <span className="mt-0.5 block font-sans text-[15.5px] font-semibold leading-snug text-foreground">{cell.name}</span>
          {explanation ? <span className="mt-0.5 block text-[13.5px] leading-snug text-muted-foreground">{explanation}</span> : null}
        </span>
      </Row>
    </li>
  );
}

export function SheetBody({ cell, index, tab, onTab, onFocus }: { cell: EncyclopediaCell; index: GraphIndex; tab: SheetTab; onTab: (tab: SheetTab) => void; onFocus: (id: string) => void }) {
  const far = index.farJump(cell.id);
  const tabs: Array<{ id: SheetTab; label: string }> = [
    { id: "material", label: "Material" },
    { id: "connections", label: "Connections" },
    { id: "notes", label: "Notes" },
  ];
  return (
    <>
      <div role="tablist" aria-label="Cell sheet" className="mt-6 flex items-end gap-7">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`relative pb-2.5 font-sans text-[16px] ${tab === t.id ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {tab === t.id ? <span aria-hidden className="absolute inset-x-0 bottom-0 block h-[3px]" style={{ background: "var(--yuzu)" }} /> : null}
          </button>
        ))}
      </div>
      <span aria-hidden className="sticker-perforation block" />

      {tab === "material" ? (
        <div className="pt-5">
          <Manifestations cell={cell} />
          <Divider />
          <Narrower cell={cell} index={index} onFocus={onFocus} />
          <Divider />
          <Heading>Source snippet</Heading>
          <div className="mt-3">
            {cell.sources[0] ? <SourceRow source={cell.sources[0]} /> : <p className="text-[15px] leading-relaxed text-muted-foreground">No source. {cell.provenance.note ?? "Written from model training data."}</p>}
          </div>
        </div>
      ) : null}

      {tab === "connections" ? (
        <div className="pt-5">
          <Heading>Broader</Heading>
          {cell.broader.length ? (
            <ul className="mt-1">
              {cell.broader.map((link) => {
                const target = index.byId.get(link.cellId);
                return target ? <CellRow key={link.cellId} cell={target} word="broader" explanation={link.explanation} ink="var(--graphite)" onFocus={onFocus} /> : <li key={link.cellId} className="py-3 text-[14.5px] text-muted-foreground"><span className="font-mono text-[12px]">{link.cellId}</span> is not in the library yet.</li>;
              })}
            </ul>
          ) : <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">A top-level cell: nothing broader above it.</p>}
          <Divider />
          <Heading>Narrower</Heading>
          {index.childrenOf(cell.id).length ? (
            <ul className="mt-1">
              {index.childrenOf(cell.id).map((kid) => <CellRow key={kid.id} cell={kid} word="narrower cell" explanation={kid.broader.find((b) => b.cellId === cell.id)?.explanation ?? ""} ink="var(--graphite)" onFocus={onFocus} />)}
            </ul>
          ) : <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Nothing narrower yet.</p>}
          <Divider />
          <Heading>Relations</Heading>
          {index.neighbours(cell.id).filter((n) => n.via !== "broader" && n.via !== "narrower").length ? (
            <ul className="mt-1">
              {index.neighbours(cell.id).filter((n) => n.via !== "broader" && n.via !== "narrower").map((n) => <CellRow key={n.cell.id} cell={n.cell} word={n.via} explanation={n.explanation} ink={RELATION_INK_VAR[relationInk(n.via)]} onFocus={onFocus} />)}
            </ul>
          ) : <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">No typed relations recorded.</p>}
          <Divider />
          <Heading>Jump far</Heading>
          {far ? (
            <button type="button" onClick={() => onFocus(far.cell.id)} className="mt-3 block w-full text-left" style={{ background: "color-mix(in srgb, var(--sakura) 7%, var(--washi))", boxShadow: "var(--shadow-card)" }}>
              <span className="block p-4">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-[19px] font-bold tracking-[-0.02em]">{far.cell.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">{far.hops} hops</span>
                </span>
                <span className="mt-1 block text-[14px] leading-relaxed text-muted-foreground">{far.path.map((id) => index.byId.get(id)?.name ?? id).join(" → ")}</span>
              </span>
            </button>
          ) : <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Everything reachable is within one hop.</p>}
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="pt-5">
          <Heading>Provenance</Heading>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ProvenanceStamp basis={cell.provenance.basis} /><InkStamp ink="var(--graphite)" tilt={1}>{cell.state || "Draft"}</InkStamp></div>
          {cell.provenance.note ? <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{cell.provenance.note}</p> : null}
          <Divider />
          <Heading>Sources <span className="font-mono text-[11px] font-normal tracking-[0.14em] text-muted-foreground tabular-nums">{cell.sources.filter((s) => s.verifiedBy).length}/{cell.sources.length} verified</span></Heading>
          {cell.sources.length ? <div className="mt-3 grid gap-5">{cell.sources.map((s) => <SourceRow key={s.id} source={s} />)}</div> : <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">No sources yet.</p>}
          <Divider />
          <Heading>Maps</Heading>
          <ul className="mt-2 grid gap-2.5">
            {cell.maps.map((m) => (
              <li key={m.map}>
                <span className="font-sans text-[15.5px] font-semibold">{MAP_LABEL[m.map]}</span>
                <p className="mt-0.5 text-[14.5px] leading-relaxed text-muted-foreground">{m.explanation}</p>
              </li>
            ))}
          </ul>
          {cell.questions.length ? (
            <>
              <Divider />
              <Heading>Open questions</Heading>
              <ul className="mt-2 grid gap-1.5">{cell.questions.map((q) => <li key={q} className="text-[15px] leading-relaxed text-foreground/85">{q}</li>)}</ul>
            </>
          ) : null}
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 break-all">cell · {cell.id}</p>
        </div>
      ) : null}
    </>
  );
}

export function SheetTitle({ cell, size = "lg" }: { cell: EncyclopediaCell; size?: "lg" | "md" }) {
  return (
    <>
      <h2 className={`font-display font-bold leading-[1.02] tracking-[-0.03em] ${size === "lg" ? "text-[30px] sm:text-[34px]" : "text-[26px]"}`}>
        <span className="relative inline-block">
          {cell.name}
          <span aria-hidden className="absolute -bottom-1 left-0 h-[6px] w-full" style={{ background: "var(--yuzu)", opacity: 0.85, mixBlendMode: "var(--ink-blend)" as never, transform: "rotate(-0.4deg)" }} />
        </span>
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklch, var(--ramune) 82%, var(--foreground))" }}>{STATE_LABEL[cell.state] ?? cell.state}</span>
        <ProvenanceStamp basis={cell.provenance.basis} tilt={-1} />
      </div>
    </>
  );
}

export function OpenCellButton({ cell }: { cell: EncyclopediaCell }) {
  return (
    <a
      href={`/lab/encyclopedia?cell=${encodeURIComponent(cell.id)}`}
      target="_blank"
      rel="noreferrer"
      className="mt-6 flex h-12 items-center justify-between bg-foreground px-5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] hover:rotate-[-0.5deg] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0"
    >
      Open cell <ArrowUpRight size={18} aria-hidden />
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
