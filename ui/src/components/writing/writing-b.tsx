"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Pin, PinOff } from "lucide-react";
import { applyFilters, buildFacets, type FacetKey, type FacetSelection, type WritingStyleSpecimen } from "@/lib/writing-styles";
import { SearchBox, Tape, inkChipStyle } from "@/components/encyclopedia/chrome";
import { BulletList, CellLinks, CreditLine, CreditsList, FacetControls, KeyValueTable, Passage, Section, StatusStamp, TagChips, VoiceMdLink } from "./parts";
import { CompareBoard } from "./compare";

// Variation B — the specimen index. A dense list on the left, a persistent
// reading pane on the right. The list is for scanning nineteen names and
// personas in one glance; the pane reads one style in full — every exemplar,
// then the contract. Pin one and pick another to compare them in the pane.

function Reading({ specimen, pinned, onPin }: { specimen: WritingStyleSpecimen; pinned: boolean; onPin: () => void }) {
  return (
    <article className="relative bg-[var(--paper-sticker)] px-6 pb-10 pt-7 shadow-[var(--shadow-card)] sm:px-8">
      <Tape ink="var(--sakura)" className="-top-2 left-8" rotate={-4} width={72} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusStamp status={specimen.status} />
          <CreditLine specimen={specimen} />
        </div>
        <button
          type="button"
          onClick={onPin}
          aria-pressed={pinned}
          className="inline-flex h-8 items-center gap-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[var(--shadow-sticker)] transition-transform hover:-translate-y-[1px] motion-reduce:hover:translate-y-0"
          style={pinned ? inkChipStyle("var(--yuzu)", 55) : { background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}
        >
          {pinned ? <PinOff size={12} aria-hidden /> : <Pin size={12} aria-hidden />}
          {pinned ? "Pinned · pick another to compare" : "Pin to compare"}
        </button>
      </div>
      <h2 className="mt-5 font-display text-[32px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[38px]">{specimen.name}</h2>
      {specimen.persona ? <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-foreground">{specimen.persona}</p> : <p className="mt-3 text-[15px] text-muted-foreground">No persona written.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <CellLinks specimen={specimen} variant="b" />
        <VoiceMdLink url={specimen.voiceMdUrl} />
      </div>
      <div className="mt-3"><TagChips tags={specimen.tags} /></div>

      <span aria-hidden className="sticker-perforation mt-7 block" />

      <Section eyebrow={specimen.exemplars.length ? `${specimen.exemplars.length} ${specimen.exemplars.length === 1 ? "passage" : "passages"}` : "Passages"} ink="var(--sakura)">
        {specimen.exemplars.length ? (
          <div className="grid gap-8">
            {specimen.exemplars.map((exemplar, i) => <Passage key={i} exemplar={exemplar} size="lg" />)}
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground">No exemplar passage is on this record yet.</p>
        )}
      </Section>

      <div className="grid gap-x-10 sm:grid-cols-2">
        <Section eyebrow="Register" ink="var(--ramune)"><KeyValueTable rows={specimen.register} empty="No register recorded." /></Section>
        <Section eyebrow="Tone scales" ink="var(--ramune)"><KeyValueTable rows={specimen.toneScales} empty="No tone scales recorded." /></Section>
        <Section eyebrow="Moves" ink="var(--ramune)"><BulletList items={specimen.moves} empty="No moves recorded." /></Section>
        <Section eyebrow="Refusals" ink="var(--sakura)"><BulletList items={specimen.refusals} empty="No refusals recorded." strike /></Section>
        <Section eyebrow="Vocabulary · use" ink="var(--yuzu)">{specimen.vocabulary.use.length ? <p className="text-[15px] leading-relaxed">{specimen.vocabulary.use.join(", ")}</p> : <p className="text-[15px] text-muted-foreground">None listed.</p>}</Section>
        <Section eyebrow="Vocabulary · ban" ink="var(--yuzu)">{specimen.vocabulary.ban.length ? <p className="text-[15px] leading-relaxed text-muted-foreground line-through decoration-[var(--sakura)] decoration-2">{specimen.vocabulary.ban.join(", ")}</p> : <p className="text-[15px] text-muted-foreground">None listed.</p>}</Section>
      </div>
      <Section eyebrow="Mechanical bands" ink="var(--graphite)"><KeyValueTable rows={specimen.bands} empty="No bands recorded." /></Section>
      <Section eyebrow="Credits" ink="var(--graphite)"><CreditsList credits={specimen.credits} /></Section>
      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 break-all">style · {specimen.id}</p>
    </article>
  );
}

export function WritingB({ specimens }: { specimens: WritingStyleSpecimen[] }) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<FacetSelection>({});
  const [selected, setSelected] = useState<string | null>(specimens[0]?.id ?? null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const listRef = useRef<HTMLOListElement | null>(null);

  const facets = useMemo(() => buildFacets(specimens), [specimens]);
  const shown = useMemo(() => applyFilters(specimens, selection, query), [specimens, selection, query]);
  const byId = useMemo(() => new Map(specimens.map((s) => [s.id, s])), [specimens]);
  const current = selected ? byId.get(selected) ?? null : null;
  const pinnedSpecimen = pinned ? byId.get(pinned) ?? null : null;
  const comparing = Boolean(pinnedSpecimen && current && pinnedSpecimen.id !== current.id);

  const toggle = (key: FacetKey, value: string) =>
    setSelection((cur) => {
      const list = cur[key] ?? [];
      return { ...cur, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });

  // Keep the selection on something visible.
  useEffect(() => {
    if (shown.length && !shown.some((s) => s.id === selected)) setSelected(shown[0].id);
  }, [shown, selected]);

  const move = (delta: number) => {
    if (!shown.length) return;
    const i = Math.max(0, shown.findIndex((s) => s.id === selected));
    const next = shown[(i + delta + shown.length) % shown.length];
    setSelected(next.id);
    const row = listRef.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`);
    row?.scrollIntoView({ block: "nearest" });
  };
  const onListKey = (event: KeyboardEvent<HTMLOListElement>) => {
    if (event.key === "ArrowDown" || event.key === "j") { move(1); event.preventDefault(); }
    else if (event.key === "ArrowUp" || event.key === "k") { move(-1); event.preventDefault(); }
    else if (event.key === "Enter") { setMobileOpen(true); }
  };

  return (
    <div className="pb-16">
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={query} onChange={setQuery} placeholder="Search passages, names, tags, credits" className="w-full sm:max-w-md" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">{shown.length} of {specimens.length} styles · ↑↓ to move</span>
        </div>
        <FacetControls facets={facets} selection={selection} onToggle={toggle} onClear={() => setSelection({})} layout="row" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <ol
          ref={listRef}
          tabIndex={0}
          onKeyDown={onListKey}
          aria-label="Writing styles"
          className="max-h-[calc(100dvh-14rem)] overflow-y-auto bg-[var(--paper-sticker)] shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ramune)] lg:sticky lg:top-24"
        >
          {shown.length ? shown.map((s, i) => {
            const active = s.id === selected;
            const isPinned = s.id === pinned;
            return (
              <li key={s.id} data-id={s.id}>
                <button
                  type="button"
                  onClick={() => { setSelected(s.id); setMobileOpen(true); }}
                  aria-current={active ? "true" : undefined}
                  className="group relative block w-full px-5 py-4 text-left transition-colors"
                  style={{ background: active ? "color-mix(in srgb, var(--yuzu) 16%, transparent)" : undefined }}
                >
                  {i ? <span aria-hidden className="sticker-perforation absolute left-5 right-5 top-0 block" /> : null}
                  <span aria-hidden className="absolute left-0 top-3 bottom-3 block w-[4px]" style={{ background: active ? "var(--sakura)" : "transparent", mixBlendMode: "var(--ink-blend)" as never }} />
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-[18px] font-bold leading-tight tracking-[-0.02em] text-foreground">{s.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {isPinned ? <Pin size={11} className="text-muted-foreground" aria-label="Pinned" /> : null}
                      <StatusStamp status={s.status} tilt={0} />
                    </span>
                  </span>
                  {s.persona ? <span className="mt-1 line-clamp-2 block text-[14.5px] leading-snug text-muted-foreground">{s.persona}</span> : null}
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/80">
                    <CreditLine specimen={s} className="!text-[9.5px] !text-muted-foreground/80" />
                    <span className="tabular-nums">{s.exemplars.length} {s.exemplars.length === 1 ? "passage" : "passages"}</span>
                    {s.cells.length ? <span>· {s.cells.map((c) => c.cellName).join(", ")}</span> : null}
                  </span>
                </button>
              </li>
            );
          }) : (
            <li className="p-6 text-[15px] leading-relaxed text-muted-foreground">No style matches these filters.</li>
          )}
        </ol>

        {/* the reading pane: a column on desktop, a full sheet on phones */}
        <div className={`${mobileOpen ? "fixed inset-0 z-50 overflow-y-auto bg-[var(--washi)] p-3 pt-4" : "hidden"} lg:static lg:block lg:overflow-visible lg:bg-transparent lg:p-0`}>
          {mobileOpen ? (
            <button type="button" onClick={() => setMobileOpen(false)} className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
              <ArrowLeft size={13} aria-hidden /> back to the index
            </button>
          ) : null}
          {current ? (
            comparing && pinnedSpecimen ? (
              <div className="grid gap-4">
                <CompareBoard specimens={[pinnedSpecimen, current]} onRemove={(id) => { if (id === pinned) setPinned(null); else setSelected(pinned); }} onClose={() => setPinned(null)} />
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pick another style in the index to compare it against {pinnedSpecimen.name}. Unpin to return to reading.</p>
              </div>
            ) : (
              <Reading specimen={current} pinned={pinned === current.id} onPin={() => setPinned(pinned === current.id ? null : current.id)} />
            )
          ) : (
            <div className="sticker-card p-6"><p className="text-[16px] text-muted-foreground">Pick a style from the index to read it here.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
