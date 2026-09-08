"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import type { CellManifestation, CellStudy, EncyclopediaCell } from "@/lib/encyclopedia";
import { GraphIndex, MAP_INK, MAP_LABEL, relationInk } from "@/lib/encyclopedia-graph";
import { Eyebrow, InkStamp, ProvenanceStamp, RELATION_INK_VAR, StatusStamp, Tape, inkChipStyle } from "./chrome";

// The cell sheet: everything a reader can learn about one cell, in the order
// the skill asks a reader to be able to check it — what it is, where the
// account came from, what it connects to, what made work expresses it, and
// where to go next. Side sheet on desktop, bottom sheet on phones; the
// parent decides the frame, this component owns the content.

const SET_LABEL: Record<CellManifestation["entitySet"], string> = {
  ArtStyles: "Art style",
  WritingStyles: "Writing style",
  PaletteSystems: "Palette",
  DesignLanguages: "Design language",
};

const STUDY_KIND_LABEL: Record<CellStudy["kind"], string> = {
  historical: "Historical",
  original: "Original",
  generated: "Generated",
};

function Section({ eyebrow, ink, children, aside }: { eyebrow: string; ink?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="pt-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow ink={ink}>{eyebrow}</Eyebrow>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-muted-foreground">{children}</p>;
}

function CellLinkRow({
  cell,
  via,
  explanation,
  ink,
  onSelect,
}: {
  cell: EncyclopediaCell;
  via: string;
  explanation: string;
  ink: string;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(cell.id)}
        className="group block w-full text-left"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: `color-mix(in oklch, ${ink} 72%, var(--foreground))` }}>
            {via}
          </span>
          <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-foreground group-hover:underline group-hover:decoration-[var(--yuzu)] group-hover:decoration-[3px] group-hover:underline-offset-[3px]">
            {cell.name}
          </span>
          <ChevronRight size={14} className="ml-auto shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
        {explanation ? <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{explanation}</p> : null}
      </button>
    </li>
  );
}

function Study({ study }: { study: CellStudy }) {
  const image = study.representations.find((rep) => rep.kind === "image");
  const text = study.representations.find((rep) => rep.kind === "text");
  const palette = study.representations.find((rep) => rep.kind === "palette");
  const kindInk = study.kind === "generated" ? "var(--sakura)" : study.kind === "original" ? "var(--yuzu)" : "var(--ramune)";
  return (
    <figure className="relative bg-[var(--paper-sticker)] p-3 shadow-[var(--shadow-card)]">
      {image && image.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.alt} className="block w-full bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] object-cover" loading="lazy" />
      ) : null}
      {text && text.kind === "text" ? (
        <blockquote className="whitespace-pre-line font-sans text-[16px] leading-relaxed text-foreground">{text.text}</blockquote>
      ) : null}
      {palette && palette.kind === "palette" ? (
        <div className="flex h-14 w-full">
          {palette.colors.map((color) => (
            <span key={color.name} title={`${color.name} ${color.value}`} className="flex-1" style={{ background: color.value }} />
          ))}
        </div>
      ) : null}
      <figcaption className="mt-3 flex flex-wrap items-center gap-2">
        <InkStamp ink={kindInk} tilt={-1}>
          {STUDY_KIND_LABEL[study.kind]}
          {study.kind === "generated" && study.generatedBy ? <span className="normal-case tracking-normal opacity-80">· {study.generatedBy}</span> : null}
        </InkStamp>
        <span className="font-display text-[15px] font-bold tracking-[-0.02em]">{study.title}</span>
      </figcaption>
      {study.description ? <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{study.description}</p> : null}
      {text && text.kind === "text" ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">{text.edition} · {text.language}</p>
      ) : null}
    </figure>
  );
}

export function SpecimenCard({ manifestation, compact = false }: { manifestation: CellManifestation; compact?: boolean }) {
  const { record } = manifestation;
  const setLabel = SET_LABEL[manifestation.entitySet];
  if (!record) {
    return (
      <div className="bg-[var(--paper-sticker)] p-3 shadow-[var(--shadow-card)]">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{setLabel}</div>
        <div className="mt-1 font-display text-[15px] font-bold tracking-[-0.02em] text-muted-foreground">Record not found</div>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/80 break-all">{manifestation.entityId}</p>
      </div>
    );
  }
  return (
    <a
      href={record.href}
      target="_blank"
      rel="noreferrer"
      className="sticker-card group block overflow-hidden"
      style={{ ["--card-ink" as string]: "var(--ramune)" }}
    >
      {record.image ? (
        <div className={`relative ${compact ? "aspect-[5/3]" : "aspect-[4/3]"} overflow-hidden bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={record.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : record.swatches?.length ? (
        <div className={`flex ${compact ? "h-14" : "h-20"} w-full`}>
          {record.swatches.map((hex, i) => (
            <span key={`${hex}-${i}`} className="flex-1" style={{ background: hex }} />
          ))}
        </div>
      ) : (
        <div className={`${compact ? "h-14" : "h-20"} w-full`} style={{ background: "color-mix(in srgb, var(--ramune) 8%, var(--paper-tint-base))" }} />
      )}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">{setLabel}</span>
          <StatusStamp status={record.status} tilt={-1} />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1 font-display text-[16px] font-bold leading-tight tracking-[-0.02em]">
          {record.name}
          <ArrowUpRight size={14} className="shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </div>
        {!compact && record.line ? <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{record.line}</p> : null}
        {!compact ? <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/85">{manifestation.explanation}</p> : null}
      </div>
    </a>
  );
}

export function CellSheet({
  cell,
  index,
  onSelect,
  onClose,
  onLocate,
  frame,
}: {
  cell: EncyclopediaCell;
  index: GraphIndex;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Bring the cell into view on the field without changing selection. */
  onLocate?: (id: string) => void;
  frame: "side" | "bottom";
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [cell.id]);

  const parents = index.parentsOf(cell.id);
  const missingParents = cell.broader.filter((link) => !index.byId.has(link.cellId));
  const children = index.childrenOf(cell.id);
  const nearby = index.neighbours(cell.id);
  const far = index.farJump(cell.id);
  const verifiedCount = cell.sources.filter((source) => source.verifiedBy).length;
  const primaryInk = MAP_INK[index.primaryMap(cell)];

  return (
    <div
      className={`relative flex h-full flex-col bg-[var(--paper-sticker)] shadow-[var(--shadow-card-hover)] backdrop-blur-sm ${frame === "bottom" ? "" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cell-sheet-title"
    >
      <Tape ink={primaryInk} className="-top-2 left-6" rotate={-4} width={72} />
      <div className="flex items-center justify-between gap-3 px-6 pt-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {cell.maps.map((membership) => (
            <span key={membership.map} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: MAP_INK[membership.map] }} />
              {MAP_LABEL[membership.map]}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center bg-[var(--paper-sticker)] text-foreground shadow-[var(--shadow-sticker)] hover:-translate-y-[1px] motion-reduce:hover:translate-y-0"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        <h2 id="cell-sheet-title" className="mt-4 font-display text-[30px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[34px]">
          {cell.name}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ProvenanceStamp basis={cell.provenance.basis} />
          <InkStamp ink="var(--graphite)" tilt={1}>{cell.state || "Draft"}</InkStamp>
          {onLocate ? (
            <button type="button" onClick={() => onLocate(cell.id)} className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
              Show on field →
            </button>
          ) : null}
        </div>
        {cell.description ? (
          <p className="mt-4 text-[17px] leading-relaxed text-foreground">{cell.description}</p>
        ) : (
          <Empty>A name and a scope. No description has been written for this cell yet.</Empty>
        )}
        {cell.provenance.basis === "recollected" && cell.provenance.note ? (
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{cell.provenance.note}</p>
        ) : null}

        {cell.studies.length ? (
          <Section eyebrow={cell.studies.length === 1 ? "Study" : `${cell.studies.length} studies`} ink="var(--yuzu)">
            <div className="grid gap-3">
              {cell.studies.map((study) => <Study key={study.id} study={study} />)}
            </div>
          </Section>
        ) : (
          <Section eyebrow="Studies" ink="var(--yuzu)">
            <Empty>No studies yet. A study is a direct example inside the cell: a historical work, an original demonstration, or a generated one, labelled as such.</Empty>
          </Section>
        )}

        <Section
          eyebrow="Sources"
          ink="var(--ramune)"
          aside={<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">{verifiedCount}/{cell.sources.length} verified</span>}
        >
          {cell.sources.length ? (
            <ol className="grid gap-3">
              {cell.sources.map((source, i) => (
                <li key={source.id} className="flex gap-3">
                  <span className="mt-[3px] font-mono text-[10.5px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <a href={source.url} target="_blank" rel="noreferrer" className="font-sans text-[15.5px] font-semibold leading-snug text-foreground underline decoration-[color-mix(in_oklch,var(--ramune)_45%,transparent)] decoration-2 underline-offset-[3px] hover:decoration-[var(--yuzu)]">
                      {source.title}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {source.verifiedBy ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "color-mix(in oklch, var(--ramune) 72%, var(--foreground))" }}>
                          Verified by {source.verifiedBy} · {source.verifiedOn}
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Unverified</span>
                          <span className="group/verify relative">
                            <button
                              type="button"
                              disabled
                              aria-disabled="true"
                              aria-describedby={`verify-hint-${source.id}`}
                              className="cursor-not-allowed px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] opacity-60"
                              style={inkChipStyle("var(--ramune)")}
                            >
                              Verify
                            </button>
                            <span
                              id={`verify-hint-${source.id}`}
                              role="tooltip"
                              className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-56 bg-[var(--foreground)] px-2.5 py-2 text-[12.5px] leading-snug text-[var(--background)] opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover/verify:opacity-100 group-focus-within/verify:opacity-100"
                            >
                              Verification is coming. Opening the source and recording who checked it will land here.
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No sources. This cell's account was written from model training data and is waiting to be cited.</Empty>
          )}
        </Section>

        <Section eyebrow="Position" ink="var(--graphite)">
          {parents.length || children.length || missingParents.length ? (
            <ul className="grid gap-3">
              {parents.map((parent) => {
                const link = cell.broader.find((b) => b.cellId === parent.id)!;
                return <CellLinkRow key={parent.id} cell={parent} via="broader" explanation={link.explanation} ink="var(--graphite)" onSelect={onSelect} />;
              })}
              {missingParents.map((link) => (
                <li key={link.cellId} className="text-[15px] leading-relaxed text-muted-foreground">
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]">broader</span>{" "}
                  <span className="font-mono text-[12px]">{link.cellId}</span> is not in the library yet.
                </li>
              ))}
              {children.map((kid) => {
                const link = kid.broader.find((b) => b.cellId === cell.id);
                return <CellLinkRow key={kid.id} cell={kid} via="narrower" explanation={link?.explanation ?? ""} ink="var(--graphite)" onSelect={onSelect} />;
              })}
            </ul>
          ) : (
            <Empty>A top-level cell with nothing narrower under it yet.</Empty>
          )}
        </Section>

        <Section eyebrow="Relations" ink="var(--sakura)">
          {cell.relations.length ? (
            <ul className="grid gap-3">
              {cell.relations.map((relation) => {
                const target = index.byId.get(relation.cellId);
                const ink = RELATION_INK_VAR[relationInk(relation.label)];
                if (!target) {
                  return (
                    <li key={relation.cellId} className="text-[15px] leading-relaxed text-muted-foreground">
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: ink }}>{relation.label}</span>{" "}
                      <span className="font-mono text-[12px]">{relation.cellId}</span> is not in the library yet.
                    </li>
                  );
                }
                return <CellLinkRow key={relation.cellId} cell={target} via={relation.label} explanation={relation.explanation} ink={ink} onSelect={onSelect} />;
              })}
            </ul>
          ) : (
            <Empty>No typed relations recorded from this cell.</Empty>
          )}
        </Section>

        <Section eyebrow="Maps" ink="var(--yuzu)">
          <ul className="grid gap-2.5">
            {cell.maps.map((membership) => (
              <li key={membership.map} className="flex gap-3">
                <span aria-hidden className="mt-[7px] inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MAP_INK[membership.map] }} />
                <div>
                  <span className="font-display text-[16px] font-bold tracking-[-0.02em]">{MAP_LABEL[membership.map]}</span>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-muted-foreground">{membership.explanation}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow={cell.manifestations.length ? `${cell.manifestations.length} made ${cell.manifestations.length === 1 ? "thing" : "things"}` : "Made things"} ink="var(--ramune)">
          {cell.manifestations.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {cell.manifestations.map((m) => <SpecimenCard key={`${m.entitySet}:${m.entityId}`} manifestation={m} />)}
            </div>
          ) : (
            <Empty>No Katagami record expresses this cell yet. An empty seat is a real finding: it is a region with no made work.</Empty>
          )}
        </Section>

        {cell.questions.length ? (
          <Section eyebrow="Open questions" ink="var(--graphite)">
            <ul className="grid gap-2">
              {cell.questions.map((question) => (
                <li key={question} className="text-[15px] leading-relaxed text-foreground/85">{question}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section eyebrow="Nearby" ink="var(--graphite)" aside={<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">1 hop</span>}>
          {nearby.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {nearby.map((n) => (
                <li key={n.cell.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(n.cell.id)}
                    title={n.explanation}
                    className="inline-flex h-8 items-center gap-2 bg-[var(--paper-sticker)] px-3 shadow-[var(--shadow-sticker)] transition-transform hover:-translate-y-[1px] motion-reduce:hover:translate-y-0"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{n.via}</span>
                    <span className="font-display text-[14px] font-bold tracking-[-0.02em]">{n.cell.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing within one hop. This cell is not connected to any other yet.</Empty>
          )}
        </Section>

        <Section eyebrow="Jump far" ink="var(--sakura)" aside={far ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">{far.hops} hops</span> : null}>
          {far ? (
            <button
              type="button"
              onClick={() => onSelect(far.cell.id)}
              className="group relative block w-full text-left"
              style={{ background: "color-mix(in srgb, var(--sakura) 7%, var(--paper-tint-base))", boxShadow: "var(--shadow-card)" }}
            >
              <div className="p-4">
                <div className="font-display text-[20px] font-bold tracking-[-0.02em] group-hover:underline group-hover:decoration-[var(--sakura)] group-hover:decoration-[3px] group-hover:underline-offset-[3px]">{far.cell.name}</div>
                <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
                  {far.path.slice(0, -1).map((id) => index.byId.get(id)?.name ?? id).join(" → ")} → <span className="text-foreground">{far.cell.name}</span>
                </p>
              </div>
            </button>
          ) : (
            <Empty>No far cell to jump to from here. Everything reachable is within one hop.</Empty>
          )}
        </Section>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 break-all">cell · {cell.id}</p>
      </div>
    </div>
  );
}
