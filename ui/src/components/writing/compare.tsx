"use client";

import { X } from "lucide-react";
import type { WritingStyleSpecimen } from "@/lib/writing-styles";
import { Tape } from "@/components/encyclopedia/chrome";
import { BulletList, CreditLine, KeyValueTable, Passage, StatusStamp } from "./parts";

// Compare two or three styles side by side, row by row: the same field for
// each style on one line, so the difference is what you read.

const ROW_INKS = ["var(--sakura)", "var(--ramune)", "var(--yuzu)"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-6">
      <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))" }}>{children}</div>
    </div>
  );
}

export function CompareBoard({ specimens, onRemove, onClose }: { specimens: WritingStyleSpecimen[]; onRemove: (id: string) => void; onClose: () => void }) {
  const cols = specimens.length;
  return (
    <div className="relative bg-[var(--paper-sticker-hover)] px-5 pb-10 pt-6 shadow-[var(--shadow-card-hover)] sm:px-8" style={{ ["--cols" as string]: cols }}>
      <Tape ink="var(--yuzu)" className="-top-2 left-8" rotate={-3} width={84} />
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">Compare · {cols} {cols === 1 ? "style" : "styles"}</div>
        <button type="button" onClick={onClose} aria-label="Close compare" className="grid h-9 w-9 place-items-center bg-[var(--paper-sticker)] shadow-[var(--shadow-sticker)]">
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-5" style={{ gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))" }}>
        {specimens.map((s, i) => (
          <div key={s.id} className="relative">
            <span aria-hidden className="absolute -left-2 top-1 block h-full w-[4px]" style={{ background: ROW_INKS[i % 3], mixBlendMode: "var(--ink-blend)" as never }} />
            <div className="flex items-start justify-between gap-2 pl-3">
              <div>
                <h3 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em]">{s.name}</h3>
                <CreditLine specimen={s} className="mt-1" />
              </div>
              <div className="flex items-center gap-1.5">
                <StatusStamp status={s.status} />
                <button type="button" onClick={() => onRemove(s.id)} aria-label={`Remove ${s.name} from compare`} className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Row label="Persona">{specimens.map((s) => <p key={s.id} className="text-[16px] leading-relaxed text-foreground">{s.persona || <span className="text-muted-foreground">No persona written.</span>}</p>)}</Row>
      <Row label="Passage">{specimens.map((s) => (s.exemplars[0] ? <Passage key={s.id} exemplar={s.exemplars[0]} clamp={8} /> : <p key={s.id} className="text-[16px] text-muted-foreground">No exemplar on the record.</p>))}</Row>
      <Row label="Register">{specimens.map((s) => <KeyValueTable key={s.id} rows={s.register} empty="No register recorded." />)}</Row>
      <Row label="Moves">{specimens.map((s) => <BulletList key={s.id} items={s.moves} empty="No moves recorded." />)}</Row>
      <Row label="Refusals">{specimens.map((s) => <BulletList key={s.id} items={s.refusals} empty="No refusals recorded." strike />)}</Row>
      <Row label="Tone scales">{specimens.map((s) => <KeyValueTable key={s.id} rows={s.toneScales} empty="No tone scales recorded." />)}</Row>
      <Row label="Mechanical bands">{specimens.map((s) => <KeyValueTable key={s.id} rows={s.bands} empty="No bands recorded." />)}</Row>
      <Row label="Vocabulary">
        {specimens.map((s) => (
          <div key={s.id} className="grid gap-3">
            <div>
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">use</div>
              {s.vocabulary.use.length ? <p className="text-[16px] leading-relaxed">{s.vocabulary.use.join(", ")}</p> : <p className="text-[16px] text-muted-foreground">None listed.</p>}
            </div>
            <div>
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">ban</div>
              {s.vocabulary.ban.length ? <p className="text-[16px] leading-relaxed text-muted-foreground line-through decoration-[var(--sakura)] decoration-2">{s.vocabulary.ban.join(", ")}</p> : <p className="text-[16px] text-muted-foreground">None listed.</p>}
            </div>
          </div>
        ))}
      </Row>
    </div>
  );
}
